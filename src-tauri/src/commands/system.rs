use std::env;
use std::process::Command;
use serde::Serialize;
use sysinfo::{System, Disks};

#[derive(Serialize)]
pub struct SystemStats {
    pub cpu_percent: f32,
    pub mem_percent: f32,
    pub disk_percent: f32,
}

#[tauri::command]
pub async fn get_system_stats() -> Result<SystemStats, String> {
    let mut sys = System::new();
    sys.refresh_cpu_usage();
    // Brief pause to get a meaningful CPU reading (sysinfo needs two samples)
    tokio::time::sleep(std::time::Duration::from_millis(200)).await;
    sys.refresh_cpu_usage();
    sys.refresh_memory();

    let cpu_percent = sys.global_cpu_usage();

    let total_mem = sys.total_memory();
    let used_mem = sys.used_memory();
    let mem_percent = if total_mem > 0 {
        (used_mem as f64 / total_mem as f64 * 100.0) as f32
    } else {
        0.0
    };

    let disks = Disks::new_with_refreshed_list();
    let (total_disk, available_disk) = disks.iter().fold((0u64, 0u64), |(t, a), d| {
        (t + d.total_space(), a + d.available_space())
    });
    let disk_percent = if total_disk > 0 {
        ((total_disk - available_disk) as f64 / total_disk as f64 * 100.0) as f32
    } else {
        0.0
    };

    Ok(SystemStats {
        cpu_percent,
        mem_percent,
        disk_percent,
    })
}

#[tauri::command]
pub async fn get_default_shell() -> Result<String, String> {
    env::var("SHELL").or_else(|_| Ok("/bin/zsh".to_string()))
}

#[tauri::command]
pub async fn get_git_branch(path: String) -> Result<Option<String>, String> {
    let output = Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Ok(None);
    }

    let branch = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if branch.is_empty() {
        Ok(None)
    } else {
        Ok(Some(branch))
    }
}
