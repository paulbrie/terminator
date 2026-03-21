use serde::Serialize;
use sysinfo::System;
use std::collections::HashMap;
use std::process::Command;

#[derive(Clone, Serialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub ppid: Option<u32>,
    pub name: String,
    pub cpu_usage: f32,
    pub memory_bytes: u64,
    pub status: String,
    pub command: String,
    pub ports: Vec<u16>,
}

#[derive(Clone, Serialize)]
pub struct ListeningPort {
    pub port: u16,
    pub pid: Option<u32>,
    pub process_name: Option<String>,
    pub protocol: String,
}

#[derive(Clone, Serialize)]
pub struct SystemSnapshot {
    pub processes: Vec<ProcessInfo>,
    pub listening_ports: Vec<ListeningPort>,
}

/// Parse `lsof -iTCP -sTCP:LISTEN -nP` to find listening ports and their PIDs.
fn get_listening_ports() -> Vec<ListeningPort> {
    let output = Command::new("/usr/sbin/lsof")
        .args(["-iTCP", "-sTCP:LISTEN", "-nP"])
        .output();

    let output = match output {
        Ok(o) => o,
        Err(_) => return Vec::new(),
    };

    let text = String::from_utf8_lossy(&output.stdout);
    let mut ports = Vec::new();
    let mut seen = std::collections::HashSet::new();

    for line in text.lines().skip(1) {
        // lsof columns: COMMAND PID USER FD TYPE DEVICE SIZE/OFF NODE NAME
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 9 {
            continue;
        }
        let process_name = parts[0].to_string();
        let pid: u32 = match parts[1].parse() {
            Ok(p) => p,
            Err(_) => continue,
        };
        // NAME is second-to-last; last field is the state e.g. "(LISTEN)"
        let name_field = parts[parts.len() - 2]; // e.g. "*:8080" or "127.0.0.1:3000"
        if let Some(colon_pos) = name_field.rfind(':') {
            if let Ok(port) = name_field[colon_pos + 1..].parse::<u16>() {
                let key = (port, pid);
                if seen.insert(key) {
                    ports.push(ListeningPort {
                        port,
                        pid: Some(pid),
                        process_name: Some(process_name),
                        protocol: "TCP".to_string(),
                    });
                }
            }
        }
    }

    ports.sort_by_key(|p| p.port);
    ports
}

#[tauri::command]
pub async fn list_processes() -> Result<SystemSnapshot, String> {
    let mut sys = System::new_all();
    sys.refresh_all();

    // Build port→pid mapping
    let listening_ports = get_listening_ports();
    let mut pid_ports: HashMap<u32, Vec<u16>> = HashMap::new();
    for lp in &listening_ports {
        if let Some(pid) = lp.pid {
            pid_ports.entry(pid).or_default().push(lp.port);
        }
    }

    let mut processes: Vec<ProcessInfo> = sys
        .processes()
        .values()
        .map(|p| {
            let pid = p.pid().as_u32();
            let cmd_parts: Vec<String> = p.cmd().iter().map(|s| s.to_string_lossy().to_string()).collect();
            ProcessInfo {
                pid,
                ppid: p.parent().map(|p| p.as_u32()),
                name: p.name().to_string_lossy().to_string(),
                cpu_usage: p.cpu_usage(),
                memory_bytes: p.memory(),
                status: format!("{:?}", p.status()),
                command: if cmd_parts.is_empty() {
                    p.name().to_string_lossy().to_string()
                } else {
                    cmd_parts.join(" ")
                },
                ports: pid_ports.remove(&pid).unwrap_or_default(),
            }
        })
        .collect();

    // Sort: processes with ports first, then by CPU usage descending
    processes.sort_by(|a, b| {
        let a_has_ports = !a.ports.is_empty();
        let b_has_ports = !b.ports.is_empty();
        b_has_ports
            .cmp(&a_has_ports)
            .then(b.cpu_usage.partial_cmp(&a.cpu_usage).unwrap_or(std::cmp::Ordering::Equal))
    });

    Ok(SystemSnapshot {
        processes,
        listening_ports,
    })
}

#[tauri::command]
pub async fn kill_process(pid: u32) -> Result<(), String> {
    let output = Command::new("/bin/kill")
        .arg("-15") // SIGTERM
        .arg(pid.to_string())
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Failed to kill process {}: {}", pid, stderr));
    }

    Ok(())
}
