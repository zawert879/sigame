mod browser;
mod commands;
mod firewall;
mod paths;
mod platform;
mod protocol;
mod qr;
mod server;
mod settings;
mod state;
mod urls;

use std::path::Path;

use log::LevelFilter;
use tauri::plugin::TauriPlugin;
use tauri::{AppHandle, Manager, RunEvent, Runtime};
use tauri_plugin_log::{RotationStrategy, Target, TargetKind, TimezoneStrategy};

use crate::paths::Paths;
use crate::state::Launcher;

const MAIN_WINDOW: &str = "main";
const SETTINGS_FILE: &str = "launcher.json";

fn log_plugin<R: Runtime>(dir: &Path) -> TauriPlugin<R> {
    let mut builder = tauri_plugin_log::Builder::new()
        .clear_targets()
        .target(Target::new(TargetKind::Folder {
            path: dir.to_path_buf(),
            file_name: Some("launcher".to_string()),
        }))
        .level(LevelFilter::Info)
        .level_for("tao", LevelFilter::Warn)
        .level_for("wry", LevelFilter::Warn)
        .max_file_size(2_000_000)
        .rotation_strategy(RotationStrategy::KeepSome(3))
        .timezone_strategy(TimezoneStrategy::UseLocal);
    if cfg!(debug_assertions) {
        builder = builder.target(Target::new(TargetKind::Stdout));
    }
    builder.build()
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

pub fn run() {
    let paths = Paths::resolve();
    let logs = paths.logs.clone();
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(log_plugin(&logs))
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_state,
            commands::select_address,
            commands::qr_svg,
            commands::open_admin,
            commands::open_tv,
            commands::copy_text,
            commands::open_packs_folder,
            commands::open_logs_folder,
            commands::allow_firewall,
            commands::restart_server,
            commands::quit,
        ])
        .setup(move |app| {
            let settings_path = app
                .path()
                .app_config_dir()
                .map(|dir| dir.join(SETTINGS_FILE))
                .unwrap_or_else(|_| paths.data.join(SETTINGS_FILE));
            let version = app.package_info().version.to_string();
            let tv_browser = browser::find().map(|browser| browser.name.to_string());
            log::info!(
                "SI Game {version}: данные {}, журнал {}",
                paths.data.display(),
                paths.logs.display()
            );
            app.manage(Launcher::new(
                paths.clone(),
                settings_path,
                version,
                tv_browser,
            ));
            let handle = app.handle();
            server::start(handle);
            commands::refresh_firewall(handle);
            Ok(())
        })
        .build(tauri::generate_context!());
    let app = match app {
        Ok(app) => app,
        Err(error) => {
            log::error!("Не удалось запустить окно: {error}");
            eprintln!("SI Game: {error}");
            std::process::exit(1);
        }
    };
    app.run(|app, event| match event {
        RunEvent::ExitRequested { .. } | RunEvent::Exit => server::stop(app, true),
        #[cfg(target_os = "macos")]
        RunEvent::Reopen { .. } => show_main_window(app),
        _ => {}
    });
}
