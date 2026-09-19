use std::env;
use std::ffi::OsString;
use std::fs;
use std::io;
use std::path::PathBuf;

#[derive(Clone, Debug)]
pub struct Paths {
    pub data: PathBuf,
    pub siq: PathBuf,
    pub packages: PathBuf,
    pub logs: PathBuf,
    pub tv_profile: PathBuf,
}

impl Paths {
    pub fn resolve() -> Self {
        let data = data_dir();
        Self {
            siq: data.join("siq"),
            packages: data.join("packages"),
            logs: log_dir(&data),
            tv_profile: data.join("tv-browser"),
            data,
        }
    }

    pub fn ensure(&self) -> io::Result<()> {
        for dir in [&self.data, &self.siq, &self.packages, &self.logs] {
            fs::create_dir_all(dir)?;
        }
        Ok(())
    }
}

fn env_path(name: &str) -> Option<PathBuf> {
    env::var_os(name)
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
}

fn home_dir() -> PathBuf {
    let name = if cfg!(windows) { "USERPROFILE" } else { "HOME" };
    env_path(name).unwrap_or_else(env::temp_dir)
}

#[cfg(target_os = "macos")]
fn data_dir() -> PathBuf {
    home_dir()
        .join("Library")
        .join("Application Support")
        .join("SIGame")
}

#[cfg(windows)]
fn data_dir() -> PathBuf {
    env_path("LOCALAPPDATA")
        .unwrap_or_else(|| home_dir().join("AppData").join("Local"))
        .join("SIGame")
}

#[cfg(all(unix, not(target_os = "macos")))]
fn data_dir() -> PathBuf {
    env_path("XDG_DATA_HOME")
        .unwrap_or_else(|| home_dir().join(".local").join("share"))
        .join("sigame")
}

#[cfg(target_os = "macos")]
fn log_dir(_data: &std::path::Path) -> PathBuf {
    home_dir().join("Library").join("Logs").join("SIGame")
}

#[cfg(not(target_os = "macos"))]
fn log_dir(data: &std::path::Path) -> PathBuf {
    data.join("logs")
}

pub fn sidecar_path() -> io::Result<PathBuf> {
    let exe = env::current_exe()?;
    let dir = exe
        .parent()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "нет каталога приложения"))?;
    let mut name = OsString::from(crate::server::SIDECAR);
    if cfg!(windows) {
        name.push(".exe");
    }
    Ok(dir.join(name))
}

pub fn display(path: &std::path::Path) -> String {
    path.to_string_lossy().into_owned()
}
