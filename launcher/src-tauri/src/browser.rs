use std::ffi::OsString;
use std::io;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};

#[derive(Clone, Debug)]
pub struct Browser {
    pub name: &'static str,
    pub path: PathBuf,
}

pub fn find() -> Option<Browser> {
    candidates()
        .into_iter()
        .find(|browser| browser.path.is_file())
}

pub fn launch(browser: &Browser, url: &str, profile: &Path) -> io::Result<()> {
    std::fs::create_dir_all(profile)?;
    let mut user_data_dir = OsString::from("--user-data-dir=");
    user_data_dir.push(profile);
    let mut child = Command::new(&browser.path)
        .arg(format!("--app={url}"))
        .arg("--start-fullscreen")
        .arg("--autoplay-policy=no-user-gesture-required")
        .arg(user_data_dir)
        .arg("--no-first-run")
        .arg("--no-default-browser-check")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()?;
    std::thread::spawn(move || {
        let _ = child.wait();
    });
    Ok(())
}

#[cfg(target_os = "macos")]
fn candidates() -> Vec<Browser> {
    const APPS: [(&str, &str, &str); 5] = [
        ("Google Chrome.app", "Google Chrome", "Google Chrome"),
        ("Microsoft Edge.app", "Microsoft Edge", "Microsoft Edge"),
        ("Chromium.app", "Chromium", "Chromium"),
        ("Brave Browser.app", "Brave Browser", "Brave"),
        ("Yandex.app", "Yandex", "Яндекс Браузер"),
    ];
    let mut roots = vec![PathBuf::from("/Applications")];
    if let Some(home) = std::env::var_os("HOME").filter(|home| !home.is_empty()) {
        roots.push(PathBuf::from(home).join("Applications"));
    }
    APPS.into_iter()
        .flat_map(|(bundle, executable, name)| {
            roots.iter().map(move |root| Browser {
                name,
                path: root
                    .join(bundle)
                    .join("Contents")
                    .join("MacOS")
                    .join(executable),
            })
        })
        .collect()
}

#[cfg(windows)]
fn candidates() -> Vec<Browser> {
    const APPS: [(&str, &str); 2] = [
        ("Google\\Chrome\\Application\\chrome.exe", "Google Chrome"),
        ("Microsoft\\Edge\\Application\\msedge.exe", "Microsoft Edge"),
    ];
    let roots: Vec<PathBuf> = ["ProgramFiles", "ProgramFiles(x86)", "LOCALAPPDATA"]
        .iter()
        .filter_map(std::env::var_os)
        .filter(|root| !root.is_empty())
        .map(PathBuf::from)
        .collect();
    APPS.into_iter()
        .flat_map(|(relative, name)| {
            roots.iter().map(move |root| Browser {
                name,
                path: root.join(relative),
            })
        })
        .collect()
}

#[cfg(all(unix, not(target_os = "macos")))]
fn candidates() -> Vec<Browser> {
    const APPS: [(&str, &str); 5] = [
        ("/usr/bin/google-chrome", "Google Chrome"),
        ("/usr/bin/google-chrome-stable", "Google Chrome"),
        ("/usr/bin/microsoft-edge", "Microsoft Edge"),
        ("/usr/bin/chromium", "Chromium"),
        ("/usr/bin/chromium-browser", "Chromium"),
    ];
    APPS.into_iter()
        .map(|(path, name)| Browser {
            name,
            path: PathBuf::from(path),
        })
        .collect()
}
