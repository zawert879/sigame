use std::fmt::Write;

pub const LOCAL_HOST: &str = "127.0.0.1";

pub fn base(host: &str, port: u16) -> String {
    if host.contains(':') && !host.starts_with('[') {
        format!("http://[{host}]:{port}")
    } else {
        format!("http://{host}:{port}")
    }
}

pub fn admin(host: &str, port: u16, token: Option<&str>) -> String {
    let mut url = format!("{}/admin/", base(host, port));
    if let Some(token) = token.filter(|token| !token.is_empty()) {
        url.push_str("?token=");
        url.push_str(&encode_component(token));
    }
    url
}

pub fn player(host: &str, port: u16) -> String {
    format!("{}/player/", base(host, port))
}

pub fn encode_component(value: &str) -> String {
    let mut encoded = String::with_capacity(value.len());
    for byte in value.bytes() {
        if byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b'~') {
            encoded.push(char::from(byte));
        } else {
            let _ = write!(encoded, "%{byte:02X}");
        }
    }
    encoded
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builds_local_urls() {
        assert_eq!(
            admin(LOCAL_HOST, 4000, None),
            "http://127.0.0.1:4000/admin/"
        );
        assert_eq!(
            admin(LOCAL_HOST, 4001, Some("a b&c/д")),
            "http://127.0.0.1:4001/admin/?token=a%20b%26c%2F%D0%B4"
        );
        assert_eq!(
            admin(LOCAL_HOST, 4000, Some("")),
            "http://127.0.0.1:4000/admin/"
        );
        assert_eq!(player(LOCAL_HOST, 4002), "http://127.0.0.1:4002/player/");
        assert_eq!(player("fe80::1", 4000), "http://[fe80::1]:4000/player/");
    }
}
