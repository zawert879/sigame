use std::path::PathBuf;

use tauri::{AppHandle, Manager, State};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_opener::OpenerExt;

use crate::browser;
use crate::firewall;
use crate::paths;
use crate::qr;
use crate::server;
use crate::state::{Firewall, Launcher, LauncherState, Status};
use crate::urls;

type CommandResult<T> = Result<T, String>;

fn ready_port(state: &LauncherState) -> CommandResult<u16> {
    match (state.status, state.port) {
        (Status::Ready, Some(port)) => Ok(port),
        _ => Err("Игра ещё не запущена".to_string()),
    }
}

fn open_url(app: &AppHandle, url: &str) -> CommandResult<()> {
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|error| format!("Не удалось открыть браузер: {error}"))
}

fn open_folder(app: &AppHandle, dir: PathBuf) -> CommandResult<()> {
    std::fs::create_dir_all(&dir)
        .map_err(|error| format!("Не удалось создать папку {}: {error}", dir.display()))?;
    app.opener()
        .open_path(paths::display(&dir), None::<&str>)
        .map_err(|error| format!("Не удалось открыть папку: {error}"))
}

fn server_program(app: &AppHandle) -> std::io::Result<PathBuf> {
    let paths = app
        .try_state::<Launcher>()
        .map(|launcher| launcher.paths.clone())
        .ok_or_else(|| std::io::Error::other("окно ещё не готово"))?;
    server::program_path(&paths)
}

async fn blocking<T, F>(task: F) -> CommandResult<T>
where
    T: Send + 'static,
    F: FnOnce() -> T + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(task)
        .await
        .map_err(|error| format!("Внутренняя ошибка: {error}"))
}

#[tauri::command]
pub fn get_state(launcher: State<'_, Launcher>) -> LauncherState {
    launcher.snapshot()
}

#[tauri::command]
pub fn select_address(
    app: AppHandle,
    launcher: State<'_, Launcher>,
    address: String,
) -> CommandResult<()> {
    let known = launcher
        .snapshot()
        .addresses
        .iter()
        .any(|item| item.address == address);
    if !known {
        return Err("Этого адреса нет в списке сетей".to_string());
    }
    launcher.remember_address(&address);
    launcher.update(&app, |state| state.selected_address = Some(address));
    Ok(())
}

#[tauri::command]
pub fn qr_svg(text: String) -> CommandResult<String> {
    qr::svg(&text)
}

#[tauri::command]
pub fn open_admin(app: AppHandle, launcher: State<'_, Launcher>) -> CommandResult<()> {
    let state = launcher.snapshot();
    let port = ready_port(&state)?;
    let url = urls::admin(urls::LOCAL_HOST, port, state.admin_token.as_deref());
    open_url(&app, &url)
}

#[tauri::command]
pub fn open_tv(app: AppHandle, launcher: State<'_, Launcher>) -> CommandResult<()> {
    let port = ready_port(&launcher.snapshot())?;
    let url = urls::player(urls::LOCAL_HOST, port);
    let found = browser::find();
    launcher.update(&app, |state| {
        state.tv_browser = found.as_ref().map(|browser| browser.name.to_string());
    });
    if let Some(found) = found {
        match browser::launch(&found, &url, &launcher.paths.tv_profile) {
            Ok(()) => {
                log::info!("Экран игроков открыт в {}", found.name);
                return Ok(());
            }
            Err(error) => {
                log::warn!("Не удалось запустить {}: {error}", found.name);
            }
        }
    }
    open_url(&app, &url)
}

#[tauri::command]
pub fn copy_text(app: AppHandle, text: String) -> CommandResult<()> {
    app.clipboard()
        .write_text(text)
        .map_err(|error| format!("Не удалось скопировать: {error}"))
}

#[tauri::command]
pub fn open_packs_folder(app: AppHandle, launcher: State<'_, Launcher>) -> CommandResult<()> {
    let dir = PathBuf::from(launcher.snapshot().siq_dir);
    open_folder(&app, dir)
}

#[tauri::command]
pub fn open_logs_folder(app: AppHandle, launcher: State<'_, Launcher>) -> CommandResult<()> {
    open_folder(&app, launcher.paths.logs.clone())
}

#[tauri::command]
pub async fn allow_firewall(app: AppHandle) -> CommandResult<()> {
    let program =
        server_program(&app).map_err(|error| format!("Не найден файл сервера: {error}"))?;
    let checked = program.clone();
    let result = blocking(move || firewall::allow(&program)).await?;
    let status = blocking(move || firewall::status(&checked)).await?;
    if let Some(launcher) = app.try_state::<Launcher>() {
        launcher.update(&app, |state| state.firewall = status);
    }
    result?;
    if status == Firewall::Allowed {
        log::info!("Правило брандмауэра добавлено");
        Ok(())
    } else {
        Err("Правило брандмауэра не появилось".to_string())
    }
}

#[tauri::command]
pub async fn restart_server(app: AppHandle) -> CommandResult<()> {
    blocking(move || server::restart(&app)).await
}

#[tauri::command]
pub async fn quit(app: AppHandle) -> CommandResult<()> {
    blocking(move || {
        server::stop(&app, true);
        app.exit(0);
    })
    .await
}

pub fn refresh_firewall(app: &AppHandle) {
    if !cfg!(windows) {
        return;
    }
    let app = app.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let Ok(program) = server_program(&app) else {
            return;
        };
        let status = firewall::status(&program);
        log::info!("Брандмауэр: {status:?}");
        if let Some(launcher) = app.try_state::<Launcher>() {
            launcher.update(&app, |state| state.firewall = status);
        }
    });
}
