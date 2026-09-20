use std::fs;
use std::io;
use std::path::{Path, PathBuf};

const PAYLOAD: &[u8] = include_bytes!(concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/embedded/sigame-server.zst"
));

const STAMP_FILE: &str = "sigame-server.stamp";
const PART_FILE: &str = "sigame-server.part";
const OLD_FILE: &str = "sigame-server.old";

fn unpacked_path(dir: &Path) -> PathBuf {
    let mut name = std::ffi::OsString::from(crate::server::SIDECAR);
    if cfg!(windows) {
        name.push(".exe");
    }
    dir.join(name)
}

pub fn server_path(dir: &Path) -> PathBuf {
    unpacked_path(dir)
}

#[cfg(unix)]
fn allow_execution(path: &Path) -> io::Result<()> {
    use std::os::unix::fs::PermissionsExt;
    fs::set_permissions(path, fs::Permissions::from_mode(0o755))
}

#[cfg(not(unix))]
fn allow_execution(_path: &Path) -> io::Result<()> {
    Ok(())
}

fn replace(temp: &Path, target: &Path, dir: &Path) -> io::Result<()> {
    if fs::rename(temp, target).is_ok() {
        return Ok(());
    }

    let old = dir.join(OLD_FILE);
    let _ = fs::remove_file(&old);
    if target.exists() {
        fs::rename(target, &old)?;
    }

    let result = fs::rename(temp, target);
    let _ = fs::remove_file(&old);
    result
}

pub fn ensure_server(dir: &Path, version: &str) -> io::Result<PathBuf> {
    let target = unpacked_path(dir);
    let stamp_path = dir.join(STAMP_FILE);
    let stamp = format!("{version} {}", PAYLOAD.len());
    if target.is_file()
        && fs::read_to_string(&stamp_path).is_ok_and(|current| current.trim() == stamp)
    {
        return Ok(target);
    }

    fs::create_dir_all(dir)?;
    let temp = dir.join(PART_FILE);
    let _ = fs::remove_file(&temp);
    let mut decoder = ruzstd::decoding::StreamingDecoder::new(PAYLOAD)
        .map_err(|error| io::Error::other(format!("не удалось прочитать сервер: {error}")))?;
    let mut file = fs::File::create(&temp)?;
    io::copy(&mut decoder, &mut file)?;
    file.sync_all()?;
    drop(file);
    allow_execution(&temp)?;
    let _ = fs::remove_file(&stamp_path);
    replace(&temp, &target, dir)?;
    fs::write(&stamp_path, stamp)?;
    log::info!("Сервер распакован: {}", super::paths::display(&target));
    Ok(target)
}
