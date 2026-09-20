use std::env;
#[cfg(not(feature = "embedded-server"))]
use std::ffi::OsString;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};

const WRITE_TEST: &str = ".sigame-write-test";

#[derive(Clone, Debug)]
pub struct Paths {
    pub data: PathBuf,
    pub siq: PathBuf,
    pub packages: PathBuf,
    pub logs: PathBuf,
    pub tv_profile: PathBuf,
    pub internal: PathBuf,
}

impl Paths {
    pub fn resolve() -> Self {
        let data = data_dir();
        let internal = data.join("data");
        Self {
            siq: data.join("siq"),
            packages: internal.join("packages"),
            logs: log_dir(&internal),
            tv_profile: internal.join("tv-browser"),
            internal,
            data,
        }
    }

    pub fn ensure(&self) -> io::Result<()> {
        for dir in [
            &self.data,
            &self.internal,
            &self.siq,
            &self.packages,
            &self.logs,
        ] {
            fs::create_dir_all(dir)?;
        }
        Ok(())
    }

    pub fn adopt_legacy_packs(&self) {
        let Some(legacy) = legacy_dir() else {
            return;
        };
        let legacy_siq = legacy.join("siq");
        if legacy_siq == self.siq || !has_packs(&legacy_siq) || has_packs(&self.siq) {
            return;
        }

        match move_packs(&legacy_siq, &self.siq) {
            Ok(0) => {}
            Ok(moved) => log::info!("Паки перенесены из {}: {moved}", display(&legacy_siq)),
            Err(error) => log::warn!(
                "Не удалось перенести паки из {}: {error}",
                display(&legacy_siq)
            ),
        }
    }
}

fn is_pack(path: &Path) -> bool {
    path.extension()
        .and_then(|value| value.to_str())
        .is_some_and(|value| value.eq_ignore_ascii_case("siq"))
}

fn has_packs(dir: &Path) -> bool {
    let Ok(entries) = fs::read_dir(dir) else {
        return false;
    };
    entries.flatten().any(|entry| is_pack(&entry.path()))
}

fn move_packs(from: &Path, to: &Path) -> io::Result<usize> {
    fs::create_dir_all(to)?;
    let mut moved = 0;
    for entry in fs::read_dir(from)?.flatten() {
        let source = entry.path();
        if !is_pack(&source) {
            continue;
        }

        let target = to.join(entry.file_name());
        if target.exists() {
            continue;
        }

        if fs::rename(&source, &target).is_err() {
            fs::copy(&source, &target)?;
            let _ = fs::remove_file(&source);
        }

        moved += 1;
    }

    Ok(moved)
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

#[cfg(any(not(target_os = "macos"), not(feature = "embedded-server")))]
fn app_dir() -> Option<PathBuf> {
    let exe = env::current_exe().ok()?;
    exe.parent().map(Path::to_path_buf)
}

fn is_writable(dir: &Path) -> bool {
    if fs::create_dir_all(dir).is_err() {
        return false;
    }

    let probe = dir.join(WRITE_TEST);
    if fs::write(&probe, b"").is_err() {
        return false;
    }

    let _ = fs::remove_file(&probe);
    true
}

fn data_dir() -> PathBuf {
    if let Some(dir) = env_path("SIGAME_DATA_DIR") {
        return dir;
    }

    let fallback = system_dir();
    for candidate in preferred_dirs() {
        if is_writable(&candidate) {
            return candidate;
        }
    }

    fallback
}

#[cfg(target_os = "macos")]
fn preferred_dirs() -> Vec<PathBuf> {
    vec![home_dir().join("SI Game")]
}

#[cfg(not(target_os = "macos"))]
fn preferred_dirs() -> Vec<PathBuf> {
    app_dir().into_iter().collect()
}

#[cfg(target_os = "macos")]
fn system_dir() -> PathBuf {
    home_dir()
        .join("Library")
        .join("Application Support")
        .join("SIGame")
}

#[cfg(windows)]
fn system_dir() -> PathBuf {
    env_path("LOCALAPPDATA")
        .unwrap_or_else(|| home_dir().join("AppData").join("Local"))
        .join("SIGame")
}

#[cfg(all(unix, not(target_os = "macos")))]
fn system_dir() -> PathBuf {
    env_path("XDG_DATA_HOME")
        .unwrap_or_else(|| home_dir().join(".local").join("share"))
        .join("sigame")
}

fn legacy_dir() -> Option<PathBuf> {
    let legacy = system_dir();
    legacy.is_dir().then_some(legacy)
}

#[cfg(target_os = "macos")]
fn log_dir(_internal: &Path) -> PathBuf {
    home_dir().join("Library").join("Logs").join("SIGame")
}

#[cfg(not(target_os = "macos"))]
fn log_dir(internal: &Path) -> PathBuf {
    internal.join("logs")
}

#[cfg(not(feature = "embedded-server"))]
pub fn sidecar_path() -> io::Result<PathBuf> {
    let dir = app_dir()
        .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "нет каталога приложения"))?;
    let mut name = OsString::from(crate::server::SIDECAR);
    if cfg!(windows) {
        name.push(".exe");
    }
    Ok(dir.join(name))
}

pub fn display(path: &Path) -> String {
    path.to_string_lossy().into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn temp_dir(name: &str) -> PathBuf {
        let dir = env::temp_dir().join(format!("sigame-paths-{name}-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn packs_are_recognised_by_extension() {
        assert!(is_pack(Path::new("/tmp/pack.siq")));
        assert!(is_pack(Path::new("/tmp/PACK.SIQ")));
        assert!(!is_pack(Path::new("/tmp/pack.zip")));
        assert!(!is_pack(Path::new("/tmp/pack")));
    }

    #[test]
    fn packs_move_without_touching_other_files() {
        let root = temp_dir("move");
        let from = root.join("old");
        let to = root.join("new");
        fs::create_dir_all(&from).unwrap();
        fs::write(from.join("one.siq"), b"one").unwrap();
        fs::write(from.join("two.SIQ"), b"two").unwrap();
        fs::write(from.join("notes.txt"), b"keep").unwrap();

        assert_eq!(move_packs(&from, &to).unwrap(), 2);
        assert!(to.join("one.siq").is_file());
        assert!(to.join("two.SIQ").is_file());
        assert!(!from.join("one.siq").exists());
        assert!(from.join("notes.txt").is_file());
        assert!(has_packs(&to));
        assert!(!has_packs(&from));

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn a_pack_that_is_already_there_is_kept() {
        let root = temp_dir("keep");
        let from = root.join("old");
        let to = root.join("new");
        fs::create_dir_all(&from).unwrap();
        fs::create_dir_all(&to).unwrap();
        fs::write(from.join("one.siq"), b"old").unwrap();
        fs::write(to.join("one.siq"), b"new").unwrap();

        assert_eq!(move_packs(&from, &to).unwrap(), 0);
        assert_eq!(fs::read(to.join("one.siq")).unwrap(), b"new");
        assert!(from.join("one.siq").is_file());

        let _ = fs::remove_dir_all(&root);
    }

    #[test]
    fn a_writable_directory_is_detected() {
        let root = temp_dir("writable");
        assert!(is_writable(&root.join("nested")));
        assert!(!root.join("nested").join(WRITE_TEST).exists());
        let _ = fs::remove_dir_all(&root);
    }
}
