use std::path::PathBuf;
use std::sync::{Condvar, Mutex, MutexGuard};
use std::time::{Duration, Instant};

use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::process::CommandChild;

use crate::paths::{self, Paths};
use crate::protocol::{Address, Connections};
use crate::settings::{self, Settings};

pub const STATE_EVENT: &str = "launcher-state";
pub const CONFIRM_QUIT_EVENT: &str = "confirm-quit";

const CLOSE_CONFIRM_WINDOW: Duration = Duration::from_secs(4);
const FIREWALL_REFRESH_INTERVAL: Duration = Duration::from_secs(15);

#[derive(Clone, Copy, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Starting,
    Ready,
    Failed,
    Stopped,
}

#[derive(Clone, Copy, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Platform {
    Macos,
    Windows,
    Linux,
}

impl Platform {
    pub fn current() -> Self {
        if cfg!(target_os = "macos") {
            Self::Macos
        } else if cfg!(windows) {
            Self::Windows
        } else {
            Self::Linux
        }
    }
}

#[derive(Clone, Copy, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Firewall {
    Allowed,
    #[cfg_attr(not(windows), allow(dead_code))]
    Missing,
    Unknown,
    Unsupported,
}

#[derive(Clone, Debug, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct LauncherState {
    pub status: Status,
    pub message: Option<String>,
    pub port: Option<u16>,
    pub addresses: Vec<Address>,
    pub selected_address: Option<String>,
    pub game_id: Option<String>,
    pub admin_token: Option<String>,
    pub connections: Connections,
    pub packs_count: u32,
    pub siq_dir: String,
    pub log_dir: String,
    pub version: String,
    pub platform: Platform,
    pub tv_browser: Option<String>,
    pub firewall: Firewall,
    pub server_path: Option<String>,
}

#[derive(Default)]
struct CloseGuard {
    deadline: Option<Instant>,
    confirmed: bool,
}

#[derive(Default)]
pub struct ServerSlot {
    pub child: Option<CommandChild>,
    pub generation: u64,
    pub running: Option<u64>,
    pub stopping: bool,
}

pub struct Launcher {
    pub paths: Paths,
    settings_path: PathBuf,
    settings: Mutex<Settings>,
    state: Mutex<LauncherState>,
    server: Mutex<ServerSlot>,
    pub server_exited: Condvar,
    pub lifecycle: Mutex<()>,
    close_guard: Mutex<CloseGuard>,
    firewall_checked: Mutex<Option<Instant>>,
}

fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

impl Launcher {
    pub fn new(
        paths: Paths,
        settings_path: PathBuf,
        version: String,
        tv_browser: Option<String>,
    ) -> Self {
        let firewall = if cfg!(windows) {
            Firewall::Unknown
        } else {
            Firewall::Unsupported
        };
        let state = LauncherState {
            status: Status::Starting,
            message: None,
            port: None,
            addresses: Vec::new(),
            selected_address: None,
            game_id: None,
            admin_token: None,
            connections: Connections::default(),
            packs_count: 0,
            siq_dir: paths::display(&paths.siq),
            log_dir: paths::display(&paths.logs),
            version,
            platform: Platform::current(),
            tv_browser,
            firewall,
            server_path: paths::sidecar_path().ok().map(|path| paths::display(&path)),
        };
        Self {
            settings: Mutex::new(settings::load(&settings_path)),
            settings_path,
            paths,
            state: Mutex::new(state),
            server: Mutex::new(ServerSlot::default()),
            server_exited: Condvar::new(),
            lifecycle: Mutex::new(()),
            close_guard: Mutex::new(CloseGuard::default()),
            firewall_checked: Mutex::new(None),
        }
    }

    pub fn needs_close_confirmation(&self) -> bool {
        let busy = {
            let state = lock(&self.state);
            state.status == Status::Ready && state.connections.player + state.connections.admin > 0
        };
        let mut guard = lock(&self.close_guard);
        if guard.confirmed || !busy {
            guard.confirmed = true;
            return false;
        }
        let now = Instant::now();
        if guard.deadline.is_some_and(|deadline| now < deadline) {
            guard.confirmed = true;
            return false;
        }
        guard.deadline = Some(now + CLOSE_CONFIRM_WINDOW);
        true
    }

    pub fn firewall_check_due(&self) -> bool {
        let mut checked = lock(&self.firewall_checked);
        let now = Instant::now();
        if checked.is_some_and(|last| now.duration_since(last) < FIREWALL_REFRESH_INTERVAL) {
            return false;
        }
        *checked = Some(now);
        true
    }

    pub fn snapshot(&self) -> LauncherState {
        lock(&self.state).clone()
    }

    pub fn server(&self) -> MutexGuard<'_, ServerSlot> {
        lock(&self.server)
    }

    pub fn lifecycle(&self) -> MutexGuard<'_, ()> {
        lock(&self.lifecycle)
    }

    pub fn is_current(&self, generation: u64) -> bool {
        self.server().generation == generation
    }

    pub fn remembered_address(&self) -> Option<String> {
        lock(&self.settings).selected_address.clone()
    }

    pub fn remember_address(&self, address: &str) {
        let mut settings = lock(&self.settings);
        settings.selected_address = Some(address.to_string());
        if let Err(error) = settings::save(&self.settings_path, &settings) {
            log::warn!("Не удалось сохранить настройки лаунчера: {error}");
        }
    }

    pub fn update<F>(&self, app: &AppHandle, change: F)
    where
        F: FnOnce(&mut LauncherState),
    {
        let snapshot = {
            let mut state = lock(&self.state);
            let before = state.clone();
            change(&mut state);
            if *state == before {
                return;
            }
            state.clone()
        };
        if let Err(error) = app.emit(STATE_EVENT, snapshot) {
            log::warn!("Не удалось отправить состояние окну: {error}");
        }
    }
}
