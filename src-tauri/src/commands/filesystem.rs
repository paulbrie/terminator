use serde::Serialize;
use std::fs;
use std::path::Path;

#[derive(Serialize, Clone)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub extension: Option<String>,
}

#[tauri::command]
pub async fn read_directory(path: String, show_hidden: Option<bool>) -> Result<Vec<DirEntry>, String> {
    let show_hidden = show_hidden.unwrap_or(false);
    let dir = fs::read_dir(&path).map_err(|e| e.to_string())?;

    let mut entries: Vec<DirEntry> = Vec::new();

    for entry in dir {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files unless requested
        if !show_hidden && name.starts_with('.') {
            continue;
        }

        // Always skip noisy/large directories
        if matches!(name.as_str(), "node_modules" | "target" | "__pycache__" | ".DS_Store") {
            continue;
        }

        let metadata = entry.metadata().map_err(|e| e.to_string())?;
        let is_dir = metadata.is_dir();
        let size = if is_dir { 0 } else { metadata.len() };
        let extension = if is_dir {
            None
        } else {
            Path::new(&name)
                .extension()
                .map(|e| e.to_string_lossy().to_string())
        };

        entries.push(DirEntry {
            name,
            path: entry.path().to_string_lossy().to_string(),
            is_dir,
            size,
            extension,
        });
    }

    // Sort: directories first, then alphabetically
    entries.sort_by(|a, b| {
        if a.is_dir == b.is_dir {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        } else if a.is_dir {
            std::cmp::Ordering::Less
        } else {
            std::cmp::Ordering::Greater
        }
    });

    Ok(entries)
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    // Check for binary content
    let bytes = fs::read(&path).map_err(|e| e.to_string())?;
    if bytes.len() > 512 {
        if bytes[..512].contains(&0) {
            return Err("Cannot open binary file".to_string());
        }
    } else if bytes.contains(&0) {
        return Err("Cannot open binary file".to_string());
    }

    String::from_utf8(bytes).map_err(|_| "File is not valid UTF-8".to_string())
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    fs::write(&path, &content).map_err(|e| e.to_string())
}
