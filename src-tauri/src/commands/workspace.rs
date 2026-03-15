use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

fn workspaces_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let dir = home.join(".terminator").join("workspaces");
    fs::create_dir_all(&dir).ok();
    dir
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceFile {
    pub name: String,
    pub data: String, // JSON string of the layout
    pub created_at: u64,
}

#[tauri::command]
pub async fn save_workspace(name: String, data: String) -> Result<(), String> {
    let path = workspaces_dir().join(format!("{}.json", sanitize_name(&name)));
    let file = WorkspaceFile {
        name,
        data,
        created_at: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0),
    };
    let json = serde_json::to_string_pretty(&file).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn load_workspace(name: String) -> Result<String, String> {
    let path = workspaces_dir().join(format!("{}.json", sanitize_name(&name)));
    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let file: WorkspaceFile = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(file.data)
}

#[tauri::command]
pub async fn list_workspaces() -> Result<Vec<WorkspaceFile>, String> {
    let dir = workspaces_dir();
    let mut workspaces = Vec::new();

    let entries = fs::read_dir(&dir).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("json") {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(file) = serde_json::from_str::<WorkspaceFile>(&content) {
                    workspaces.push(file);
                }
            }
        }
    }

    workspaces.sort_by(|a, b| b.created_at.cmp(&a.created_at));
    Ok(workspaces)
}

#[tauri::command]
pub async fn delete_workspace(name: String) -> Result<(), String> {
    let path = workspaces_dir().join(format!("{}.json", sanitize_name(&name)));
    fs::remove_file(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn export_output(path: String, content: String) -> Result<(), String> {
    fs::write(&path, &content).map_err(|e| e.to_string())
}

// Session history

fn sessions_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let dir = home.join(".terminator").join("sessions");
    fs::create_dir_all(&dir).ok();
    dir
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionEntry {
    pub id: String,
    pub agent_type: String,
    pub label: String,
    pub started_at: u64,
    pub ended_at: Option<u64>,
    pub output_file: Option<String>,
}

#[tauri::command]
pub async fn save_session(entry: SessionEntry) -> Result<(), String> {
    let path = sessions_dir().join(format!("{}.json", entry.id));
    let json = serde_json::to_string_pretty(&entry).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn append_session_output(session_id: String, data: String) -> Result<(), String> {
    let dir = sessions_dir();
    let path = dir.join(format!("{}.log", session_id));
    use std::io::Write;
    let mut file = fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open(path)
        .map_err(|e| e.to_string())?;
    file.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn list_sessions() -> Result<Vec<SessionEntry>, String> {
    let dir = sessions_dir();
    let mut sessions = Vec::new();

    if let Ok(entries) = fs::read_dir(&dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("json") {
                if let Ok(content) = fs::read_to_string(&path) {
                    if let Ok(session) = serde_json::from_str::<SessionEntry>(&content) {
                        sessions.push(session);
                    }
                }
            }
        }
    }

    sessions.sort_by(|a, b| b.started_at.cmp(&a.started_at));
    Ok(sessions)
}

#[tauri::command]
pub async fn read_session_log(session_id: String) -> Result<String, String> {
    let path = sessions_dir().join(format!("{}.log", session_id));
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_session(session_id: String) -> Result<(), String> {
    let dir = sessions_dir();
    let _ = fs::remove_file(dir.join(format!("{}.json", session_id)));
    let _ = fs::remove_file(dir.join(format!("{}.log", session_id)));
    Ok(())
}

fn sanitize_name(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect()
}
