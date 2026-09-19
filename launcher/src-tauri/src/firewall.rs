#[cfg(not(windows))]
pub use self::other::{allow, status};
#[cfg(windows)]
pub use self::windows::{allow, status};

#[cfg(not(windows))]
mod other {
    use std::path::Path;

    use crate::state::Firewall;

    pub fn status(_program: &Path) -> Firewall {
        Firewall::Unsupported
    }

    pub fn allow(_program: &Path) -> Result<(), String> {
        Err("Правило брандмауэра добавляется только в Windows".to_string())
    }
}

#[cfg(windows)]
mod windows {
    use std::ffi::{OsStr, OsString};
    use std::os::windows::ffi::OsStrExt;
    use std::os::windows::process::CommandExt;
    use std::path::{Path, PathBuf};
    use std::process::{Command, Stdio};

    use windows_sys::Win32::Foundation::{CloseHandle, GetLastError, ERROR_CANCELLED};
    use windows_sys::Win32::Globalization::{
        MultiByteToWideChar, WideCharToMultiByte, CP_ACP, CP_OEMCP,
    };
    use windows_sys::Win32::System::Threading::{
        GetExitCodeProcess, WaitForSingleObject, CREATE_NO_WINDOW,
    };
    use windows_sys::Win32::UI::Shell::{
        ShellExecuteExW, SEE_MASK_NOASYNC, SEE_MASK_NOCLOSEPROCESS, SHELLEXECUTEINFOW,
    };
    use windows_sys::Win32::UI::WindowsAndMessaging::SW_HIDE;

    use crate::state::Firewall;

    const RULE: &str = "SI Game";
    const NO_RIGHTS: &str = "Нет прав администратора";
    const WAIT_MS: u32 = 120_000;

    fn system32(program: &str) -> PathBuf {
        std::env::var_os("SystemRoot")
            .filter(|root| !root.is_empty())
            .map(|root| PathBuf::from(root).join("System32").join(program))
            .unwrap_or_else(|| PathBuf::from(program))
    }

    fn decode(bytes: &[u8], code_page: u32) -> Option<String> {
        if bytes.is_empty() {
            return Some(String::new());
        }
        let length = i32::try_from(bytes.len()).ok()?;
        unsafe {
            let size = MultiByteToWideChar(
                code_page,
                0,
                bytes.as_ptr(),
                length,
                std::ptr::null_mut(),
                0,
            );
            if size <= 0 {
                return None;
            }
            let mut wide = vec![0u16; size as usize];
            let written = MultiByteToWideChar(
                code_page,
                0,
                bytes.as_ptr(),
                length,
                wide.as_mut_ptr(),
                size,
            );
            if written <= 0 {
                return None;
            }
            Some(String::from_utf16_lossy(&wide[..written as usize]))
        }
    }

    fn encode(text: &str, code_page: u32) -> Option<Vec<u8>> {
        let wide: Vec<u16> = text.encode_utf16().collect();
        if wide.is_empty() {
            return Some(Vec::new());
        }
        let length = i32::try_from(wide.len()).ok()?;
        unsafe {
            let size = WideCharToMultiByte(
                code_page,
                0,
                wide.as_ptr(),
                length,
                std::ptr::null_mut(),
                0,
                std::ptr::null(),
                std::ptr::null_mut(),
            );
            if size <= 0 {
                return None;
            }
            let mut bytes = vec![0u8; size as usize];
            let written = WideCharToMultiByte(
                code_page,
                0,
                wide.as_ptr(),
                length,
                bytes.as_mut_ptr(),
                size,
                std::ptr::null(),
                std::ptr::null_mut(),
            );
            if written <= 0 {
                return None;
            }
            bytes.truncate(written as usize);
            Some(bytes)
        }
    }

    fn netsh_show(filter: &str) -> Option<std::process::Output> {
        let output = Command::new(system32("netsh.exe"))
            .args(["advfirewall", "firewall", "show", "rule"])
            .raw_arg(filter)
            .args(["dir=in", "verbose"])
            .stdin(Stdio::null())
            .creation_flags(CREATE_NO_WINDOW)
            .output();
        match output {
            Ok(output) => Some(output),
            Err(error) => {
                log::warn!("Не удалось запустить netsh: {error}");
                None
            }
        }
    }

    fn occurrences(output: &[u8], program: &Path) -> usize {
        let path = program.to_string_lossy();
        let decoded = [CP_OEMCP, CP_ACP].into_iter().filter_map(|code_page| {
            let needle = encode(&path, code_page).and_then(|bytes| decode(&bytes, code_page))?;
            Some((decode(output, code_page)?, needle))
        });
        let utf8 = (
            String::from_utf8_lossy(output).into_owned(),
            path.to_string(),
        );
        decoded
            .chain(std::iter::once(utf8))
            .map(|(text, needle)| text.to_lowercase().matches(&needle.to_lowercase()).count())
            .max()
            .unwrap_or(0)
    }

    pub fn status(program: &Path) -> Firewall {
        let Some(own) = netsh_show(&format!("name=\"{RULE}\"")) else {
            return Firewall::Unknown;
        };
        if !own.status.success() {
            return Firewall::Missing;
        }
        let in_own = occurrences(&own.stdout, program);
        if in_own == 0 {
            return Firewall::Missing;
        }
        let Some(all) = netsh_show("name=all") else {
            return Firewall::Unknown;
        };
        if occurrences(&all.stdout, program) > in_own {
            return Firewall::Missing;
        }
        Firewall::Allowed
    }

    fn wide(value: &OsStr) -> Vec<u16> {
        value.encode_wide().chain(std::iter::once(0)).collect()
    }

    pub fn allow(program: &Path) -> Result<(), String> {
        let mut parameters =
            OsString::from("/c netsh advfirewall firewall delete rule name=all program=\"");
        parameters.push(program.as_os_str());
        parameters.push(format!(
            "\" & netsh advfirewall firewall delete rule name=\"{RULE}\" & netsh advfirewall firewall add rule name=\"{RULE}\" dir=in action=allow program=\""
        ));
        parameters.push(program.as_os_str());
        parameters.push("\" enable=yes profile=any");
        let verb = wide(OsStr::new("runas"));
        let file = wide(system32("cmd.exe").as_os_str());
        let parameters = wide(&parameters);
        let mut info = SHELLEXECUTEINFOW {
            cbSize: std::mem::size_of::<SHELLEXECUTEINFOW>() as u32,
            fMask: SEE_MASK_NOCLOSEPROCESS | SEE_MASK_NOASYNC,
            lpVerb: verb.as_ptr(),
            lpFile: file.as_ptr(),
            lpParameters: parameters.as_ptr(),
            nShow: SW_HIDE,
            ..Default::default()
        };
        let launched = unsafe { ShellExecuteExW(&mut info) };
        if launched == 0 {
            let error = unsafe { GetLastError() };
            if error == ERROR_CANCELLED {
                return Err(NO_RIGHTS.to_string());
            }
            return Err(format!("Не удалось запустить netsh (ошибка {error})"));
        }
        if info.hProcess.is_null() {
            return Ok(());
        }
        let mut code = 0u32;
        unsafe {
            WaitForSingleObject(info.hProcess, WAIT_MS);
            GetExitCodeProcess(info.hProcess, &mut code);
            CloseHandle(info.hProcess);
        }
        if code == 0 {
            Ok(())
        } else {
            Err(format!("netsh завершился с кодом {code}"))
        }
    }
}
