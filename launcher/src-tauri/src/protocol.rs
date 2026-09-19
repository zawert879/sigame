use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq)]
pub struct Address {
    pub address: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub score: f64,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
pub struct Connections {
    #[serde(default)]
    pub player: u32,
    #[serde(default)]
    pub admin: u32,
}

#[derive(Debug, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Ready {
    pub version: Option<String>,
    pub port: u16,
    #[serde(default)]
    pub addresses: Vec<Address>,
    pub game_id: Option<String>,
    pub admin_token: Option<String>,
    pub siq_dir: Option<String>,
    pub packs_count: Option<u32>,
}

#[derive(Debug, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub connections: Option<Connections>,
    pub packs_count: Option<u32>,
}

#[derive(Debug, Deserialize, PartialEq)]
pub struct Failed {
    #[serde(default)]
    pub message: String,
}

#[derive(Debug, PartialEq)]
pub enum Message {
    Ready(Ready),
    Status(Status),
    Failed(Failed),
}

pub fn parse_line(line: &str) -> Option<Result<Message, serde_json::Error>> {
    let line = line.trim_start_matches('\u{feff}').trim();
    let (prefix, json) = match line.split_once(char::is_whitespace) {
        Some((prefix, json)) => (prefix, json.trim()),
        None => (line, ""),
    };
    let message = match prefix {
        "SIGAME_READY" => serde_json::from_str(json).map(Message::Ready),
        "SIGAME_STATUS" => serde_json::from_str(json).map(Message::Status),
        "SIGAME_FAILED" => serde_json::from_str(json).map(Message::Failed),
        _ => return None,
    };
    Some(message)
}

pub fn best_address(addresses: &[Address], remembered: Option<&str>) -> Option<String> {
    if let Some(remembered) = remembered {
        if addresses.iter().any(|item| item.address == remembered) {
            return Some(remembered.to_string());
        }
    }
    let mut best: Option<&Address> = None;
    for item in addresses {
        if best.is_none_or(|current| item.score > current.score) {
            best = Some(item);
        }
    }
    best.map(|item| item.address.clone())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_ready() {
        let line = r#"SIGAME_READY {"version":"1.0.0","port":4000,"addresses":[{"address":"192.168.1.135","name":"en0","score":350}],"gameId":"abc","adminToken":null,"siqDir":"/tmp/siq","packsCount":3}"#;
        let message = parse_line(line).unwrap().unwrap();
        assert_eq!(
            message,
            Message::Ready(Ready {
                version: Some("1.0.0".into()),
                port: 4000,
                addresses: vec![Address {
                    address: "192.168.1.135".into(),
                    name: "en0".into(),
                    score: 350.0,
                }],
                game_id: Some("abc".into()),
                admin_token: None,
                siq_dir: Some("/tmp/siq".into()),
                packs_count: Some(3),
            })
        );
    }

    #[test]
    fn parses_status_and_failed() {
        let status = parse_line(
            "SIGAME_STATUS {\"connections\":{\"player\":1,\"admin\":2},\"packsCount\":5}\r",
        )
        .unwrap()
        .unwrap();
        assert_eq!(
            status,
            Message::Status(Status {
                connections: Some(Connections {
                    player: 1,
                    admin: 2
                }),
                packs_count: Some(5),
            })
        );
        let failed = parse_line("SIGAME_FAILED {\"message\":\"порт занят\"}")
            .unwrap()
            .unwrap();
        assert_eq!(
            failed,
            Message::Failed(Failed {
                message: "порт занят".into()
            })
        );
    }

    #[test]
    fn ignores_log_lines_and_reports_bad_json() {
        assert!(parse_line("Сервер слушает порт 4000").is_none());
        assert!(parse_line("").is_none());
        assert!(parse_line("SIGAME_READY {broken").unwrap().is_err());
    }

    #[test]
    fn picks_remembered_or_best_address() {
        let addresses = vec![
            Address {
                address: "10.0.0.2".into(),
                name: "bridge100".into(),
                score: 10.0,
            },
            Address {
                address: "192.168.1.5".into(),
                name: "en0".into(),
                score: 300.0,
            },
        ];
        assert_eq!(
            best_address(&addresses, Some("10.0.0.2")),
            Some("10.0.0.2".into())
        );
        assert_eq!(
            best_address(&addresses, Some("172.16.0.1")),
            Some("192.168.1.5".into())
        );
        assert_eq!(best_address(&addresses, None), Some("192.168.1.5".into()));
        assert_eq!(best_address(&[], Some("10.0.0.2")), None);
    }
}
