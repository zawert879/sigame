use std::collections::VecDeque;
use std::time::Duration;

use tauri::async_runtime::Receiver;
use tauri::{AppHandle, Manager};
use tauri_plugin_shell::process::{Command, CommandEvent, TerminatedPayload};
use tauri_plugin_shell::ShellExt;

use crate::paths::Paths;
use crate::platform;
use crate::protocol::{self, Connections, Message};
use crate::state::{Launcher, Status};

pub const SIDECAR: &str = "sigame-server";

const STDERR_TAIL: usize = 8;
const GRACEFUL_STOP: Duration = Duration::from_secs(2);
const FORCED_STOP: Duration = Duration::from_secs(1);

pub fn start(app: &AppHandle) {
    let Some(launcher) = app.try_state::<Launcher>() else {
        return;
    };
    let _guard = launcher.lifecycle();
    start_locked(app, &launcher);
}

pub fn stop(app: &AppHandle, mark_stopped: bool) {
    let Some(launcher) = app.try_state::<Launcher>() else {
        return;
    };
    let _guard = launcher.lifecycle();
    stop_locked(app, &launcher, mark_stopped);
}

pub fn restart(app: &AppHandle) {
    let Some(launcher) = app.try_state::<Launcher>() else {
        return;
    };
    let _guard = launcher.lifecycle();
    log::info!("Перезапуск сервера");
    stop_locked(app, &launcher, false);
    start_locked(app, &launcher);
}

#[cfg(feature = "embedded-server")]
pub fn expected_program_path(paths: &Paths) -> Option<std::path::PathBuf> {
    Some(crate::embedded::server_path(&paths.internal))
}

#[cfg(not(feature = "embedded-server"))]
pub fn expected_program_path(_paths: &Paths) -> Option<std::path::PathBuf> {
    crate::paths::sidecar_path().ok()
}

#[cfg(feature = "embedded-server")]
pub fn program_path(paths: &Paths) -> std::io::Result<std::path::PathBuf> {
    crate::embedded::ensure_server(&paths.internal, env!("CARGO_PKG_VERSION"))
}

#[cfg(not(feature = "embedded-server"))]
pub fn program_path(_paths: &Paths) -> std::io::Result<std::path::PathBuf> {
    crate::paths::sidecar_path()
}

#[cfg(feature = "embedded-server")]
fn server_command(app: &AppHandle, paths: &Paths) -> Result<Command, String> {
    let path = program_path(paths).map_err(|error| error.to_string())?;
    Ok(app.shell().command(path))
}

#[cfg(not(feature = "embedded-server"))]
fn server_command(app: &AppHandle, _paths: &Paths) -> Result<Command, String> {
    app.shell()
        .sidecar(SIDECAR)
        .map_err(|error| error.to_string())
}

fn start_locked(app: &AppHandle, launcher: &Launcher) {
    let generation = {
        let mut slot = launcher.server();
        slot.generation += 1;
        slot.stopping = false;
        slot.generation
    };
    launcher.update(app, |state| {
        state.status = Status::Starting;
        state.message = None;
        state.port = None;
        state.addresses.clear();
        state.selected_address = None;
        state.game_id = None;
        state.admin_token = None;
        state.connections = Connections::default();
    });
    let paths = &launcher.paths;
    if let Err(error) = paths.ensure() {
        log::warn!("Не удалось создать каталоги данных: {error}");
    }
    let spawned = server_command(app, paths).and_then(|command| {
        command
            .env_clear()
            .envs(std::env::vars_os().filter(|(key, _)| !is_reserved_env(key)))
            .env("SIGAME_LAUNCHER", "1")
            .env("SIQ_DIR", &paths.siq)
            .env("PACKAGES_DIR", &paths.packages)
            .current_dir(&paths.data)
            .spawn()
            .map_err(|error| error.to_string())
    });
    match spawned {
        Ok((events, child)) => {
            let pid = child.pid();
            platform::attach_to_job(pid);
            {
                let mut slot = launcher.server();
                slot.child = Some(child);
                slot.running = Some(generation);
            }
            log::info!("Сервер запущен, pid {pid}");
            tauri::async_runtime::spawn(read_events(app.clone(), events, generation));
        }
        Err(error) => {
            log::error!("Не удалось запустить сервер: {error}");
            launcher.update(app, |state| {
                state.status = Status::Failed;
                state.message = Some(format!("Не удалось запустить сервер: {error}"));
            });
        }
    }
}

fn stop_locked(app: &AppHandle, launcher: &Launcher, mark_stopped: bool) {
    let (child, running) = {
        let mut slot = launcher.server();
        slot.stopping = true;
        (slot.child.take(), slot.running)
    };
    if let Some(child) = child {
        let pid = child.pid();
        drop(child);
        if wait_exit(launcher, running, GRACEFUL_STOP) {
            log::info!("Сервер остановлен");
        } else {
            log::warn!("Сервер не завершился сам, принудительная остановка pid {pid}");
            platform::kill(pid);
            if !wait_exit(launcher, running, FORCED_STOP) {
                log::warn!("Не дождались завершения сервера pid {pid}");
            }
        }
    }
    if mark_stopped {
        launcher.update(app, |state| {
            state.status = Status::Stopped;
            state.message = None;
            state.connections = Connections::default();
        });
    }
}

fn wait_exit(launcher: &Launcher, running: Option<u64>, timeout: Duration) -> bool {
    let Some(generation) = running else {
        return true;
    };
    let slot = launcher.server();
    let (slot, _) = launcher
        .server_exited
        .wait_timeout_while(slot, timeout, |slot| slot.running == Some(generation))
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    slot.running != Some(generation)
}

async fn read_events(app: AppHandle, mut events: Receiver<CommandEvent>, generation: u64) {
    let mut stderr_tail: VecDeque<String> = VecDeque::with_capacity(STDERR_TAIL);
    let mut failure: Option<String> = None;
    while let Some(event) = events.recv().await {
        match event {
            CommandEvent::Stdout(bytes) => {
                handle_stdout(&app, generation, &decode(&bytes), &mut failure);
            }
            CommandEvent::Stderr(bytes) => {
                let line = decode(&bytes);
                if line.is_empty() {
                    continue;
                }
                log::warn!(target: "server", "{line}");
                if stderr_tail.len() == STDERR_TAIL {
                    stderr_tail.pop_front();
                }
                stderr_tail.push_back(line);
            }
            CommandEvent::Error(error) => {
                log::error!(target: "server", "{error}");
            }
            CommandEvent::Terminated(payload) => {
                terminated(&app, generation, &payload, &stderr_tail, failure.take());
            }
            _ => {}
        }
    }
}

fn decode(bytes: &[u8]) -> String {
    String::from_utf8_lossy(bytes)
        .trim_end_matches(['\r', '\n'])
        .to_string()
}

fn handle_stdout(app: &AppHandle, generation: u64, line: &str, failure: &mut Option<String>) {
    if line.trim().is_empty() {
        return;
    }
    let message = match protocol::parse_line(line) {
        None => {
            log::info!(target: "server", "{line}");
            return;
        }
        Some(Err(error)) => {
            log::warn!("Не удалось разобрать строку сервера ({error}): {line}");
            return;
        }
        Some(Ok(message)) => message,
    };
    let Some(launcher) = app.try_state::<Launcher>() else {
        return;
    };
    if !launcher.is_current(generation) {
        return;
    }
    match message {
        Message::Ready(ready) => {
            log::info!(
                "Сервер {} готов: порт {}, адресов в сети {}",
                ready.version.as_deref().unwrap_or("?"),
                ready.port,
                ready.addresses.len()
            );
            let remembered = launcher.remembered_address();
            launcher.update(app, |state| {
                state.status = Status::Ready;
                state.message = None;
                state.port = Some(ready.port);
                state.selected_address =
                    protocol::best_address(&ready.addresses, remembered.as_deref());
                state.addresses = ready.addresses;
                state.game_id = ready.game_id;
                state.admin_token = ready.admin_token;
                if let Some(dir) = ready.siq_dir {
                    state.siq_dir = dir;
                }
                if let Some(count) = ready.packs_count {
                    state.packs_count = count;
                }
            });
        }
        Message::Status(status) => {
            launcher.update(app, |state| {
                if let Some(connections) = status.connections {
                    state.connections = connections;
                }
                if let Some(count) = status.packs_count {
                    state.packs_count = count;
                }
            });
        }
        Message::Failed(failed) => {
            let text = if failed.message.trim().is_empty() {
                "Сервер не смог запуститься".to_string()
            } else {
                failed.message
            };
            log::error!("Сервер сообщил об ошибке: {text}");
            *failure = Some(text.clone());
            launcher.update(app, |state| {
                state.status = Status::Failed;
                state.message = Some(text);
                state.connections = Connections::default();
            });
        }
    }
}

fn terminated(
    app: &AppHandle,
    generation: u64,
    payload: &TerminatedPayload,
    stderr_tail: &VecDeque<String>,
    failure: Option<String>,
) {
    let exit = describe_exit(payload);
    log::info!("Процесс сервера завершился: {exit}");
    let Some(launcher) = app.try_state::<Launcher>() else {
        return;
    };
    let expected = {
        let mut slot = launcher.server();
        if slot.running == Some(generation) {
            slot.running = None;
        }
        let current = slot.generation == generation;
        let expected = !current || slot.stopping;
        if current && !slot.stopping {
            slot.child = None;
        }
        launcher.server_exited.notify_all();
        expected
    };
    if expected {
        return;
    }
    let message = failure.unwrap_or_else(|| {
        let mut text = format!("Сервер неожиданно завершился ({exit}).");
        for line in stderr_tail {
            text.push('\n');
            text.push_str(line);
        }
        text
    });
    launcher.update(app, |state| {
        state.status = Status::Failed;
        state.message = Some(message);
        state.connections = Connections::default();
    });
}

fn describe_exit(payload: &TerminatedPayload) -> String {
    match (payload.code, payload.signal) {
        (Some(code), _) => format!("код {code}"),
        (None, Some(signal)) => format!("сигнал {signal}"),
        (None, None) => "причина неизвестна".to_string(),
    }
}

const RESERVED_ENV: [&str; 4] = ["PORT", "FRONTEND_STATIC_DIR", "SIQ_DIR", "PACKAGES_DIR"];

fn is_reserved_env(key: &std::ffi::OsStr) -> bool {
    let key = key.to_string_lossy();
    RESERVED_ENV
        .iter()
        .any(|reserved| key.eq_ignore_ascii_case(reserved))
}
