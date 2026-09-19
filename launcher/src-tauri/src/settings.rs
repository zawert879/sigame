use std::fs;
use std::io;
use std::path::Path;

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    #[serde(default)]
    pub selected_address: Option<String>,
}

pub fn load(path: &Path) -> Settings {
    fs::read(path)
        .ok()
        .and_then(|bytes| serde_json::from_slice(&bytes).ok())
        .unwrap_or_default()
}

pub fn save(path: &Path, settings: &Settings) -> io::Result<()> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir)?;
    }
    let json = serde_json::to_vec_pretty(settings).map_err(io::Error::other)?;
    let temp = path.with_extension("json.tmp");
    fs::write(&temp, json)?;
    fs::rename(&temp, path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn round_trips_and_tolerates_garbage() {
        let dir = std::env::temp_dir().join(format!("sigame-launcher-test-{}", std::process::id()));
        let path = dir.join("launcher.json");
        assert_eq!(load(&path), Settings::default());
        let settings = Settings {
            selected_address: Some("192.168.1.5".into()),
        };
        save(&path, &settings).unwrap();
        assert_eq!(load(&path), settings);
        fs::write(&path, b"not json").unwrap();
        assert_eq!(load(&path), Settings::default());
        fs::remove_dir_all(&dir).unwrap();
    }
}
