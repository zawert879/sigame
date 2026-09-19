use std::fmt::Write;

use qrcode::{Color, QrCode};

const QUIET_ZONE: usize = 2;
const DARK: &str = "#0d2169";
const LIGHT: &str = "#ffffff";

pub fn svg(text: &str) -> Result<String, String> {
    let code = QrCode::new(text.as_bytes())
        .map_err(|error| format!("Не удалось построить QR-код: {error}"))?;
    let width = code.width();
    let colors = code.to_colors();
    let size = width + QUIET_ZONE * 2;
    let mut path = String::new();
    for (y, row) in colors.chunks(width).enumerate() {
        let mut x = 0;
        while x < width {
            if row[x] != Color::Dark {
                x += 1;
                continue;
            }
            let start = x;
            while x < width && row[x] == Color::Dark {
                x += 1;
            }
            let run = x - start;
            let _ = write!(
                path,
                "M{} {}h{run}v1h-{run}z",
                start + QUIET_ZONE,
                y + QUIET_ZONE
            );
        }
    }
    Ok(format!(
        "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {size} {size}\" shape-rendering=\"crispEdges\"><rect width=\"{size}\" height=\"{size}\" fill=\"{LIGHT}\"/><path fill=\"{DARK}\" d=\"{path}\"/></svg>"
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renders_square_svg_with_quiet_zone() {
        let svg = svg("http://192.168.1.135:4000/").unwrap();
        assert!(svg.starts_with("<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 29 29\""));
        assert!(svg.contains("<rect width=\"29\" height=\"29\" fill=\"#ffffff\"/>"));
        assert!(svg.contains("M2 2h7v1h-7z"));
        assert!(svg.ends_with("\"/></svg>"));
    }
}
