use serde::Serialize;
use std::process::Command;

#[derive(Serialize, Clone)]
pub struct GitFileStatus {
    pub path: String,
    pub status: String,
    pub staged: bool,
}

#[derive(Serialize)]
pub struct GitStatusResult {
    pub branch: String,
    pub files: Vec<GitFileStatus>,
}

#[tauri::command]
pub async fn git_status(path: String) -> Result<GitStatusResult, String> {
    let output = Command::new("git")
        .args(["status", "--porcelain=v1", "-b"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(err);
    }

    let text = String::from_utf8_lossy(&output.stdout).to_string();
    let mut lines = text.lines();

    // First line: ## branch...tracking
    let branch = lines
        .next()
        .unwrap_or("")
        .trim_start_matches("## ")
        .split("...")
        .next()
        .unwrap_or("HEAD")
        .to_string();

    let mut files = Vec::new();
    for line in lines {
        if line.len() < 4 {
            continue;
        }
        let index = line.as_bytes()[0] as char;
        let worktree = line.as_bytes()[1] as char;
        let raw_path = line[3..].to_string();

        // Handle renames: "R  old -> new"
        let display_path = if raw_path.contains(" -> ") {
            raw_path.split(" -> ").last().unwrap_or(&raw_path).to_string()
        } else {
            raw_path
        };

        // Staged change
        if index != ' ' && index != '?' {
            files.push(GitFileStatus {
                path: display_path.clone(),
                status: index.to_string(),
                staged: true,
            });
        }

        // Unstaged change
        if worktree != ' ' {
            let status = if index == '?' {
                "?".to_string()
            } else {
                worktree.to_string()
            };
            files.push(GitFileStatus {
                path: display_path.clone(),
                status,
                staged: false,
            });
        }
    }

    Ok(GitStatusResult { branch, files })
}

#[tauri::command]
pub async fn git_stage(path: String, files: Vec<String>) -> Result<(), String> {
    let mut args = vec!["add".to_string(), "--".to_string()];
    args.extend(files);
    let output = Command::new("git")
        .args(&args)
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn git_unstage(path: String, files: Vec<String>) -> Result<(), String> {
    let mut args = vec!["reset".to_string(), "HEAD".to_string(), "--".to_string()];
    args.extend(files);
    let output = Command::new("git")
        .args(&args)
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn git_commit(path: String, message: String) -> Result<(), String> {
    let output = Command::new("git")
        .args(["commit", "-m", &message])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(())
}

#[tauri::command]
pub async fn git_pull(path: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["pull"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    let combined = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );

    if !output.status.success() {
        return Err(combined);
    }
    Ok(combined)
}

#[tauri::command]
pub async fn git_push(path: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["push"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    let combined = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );

    if !output.status.success() {
        return Err(combined);
    }
    Ok(combined)
}

// --- Branch management ---

#[derive(Serialize)]
pub struct GitBranchInfo {
    pub name: String,
    pub is_remote: bool,
    pub is_current: bool,
}

#[tauri::command]
pub async fn git_branches(path: String) -> Result<Vec<GitBranchInfo>, String> {
    let output = Command::new("git")
        .args(["branch", "-a", "--no-color"])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let text = String::from_utf8_lossy(&output.stdout);
    let mut branches = Vec::new();

    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.contains(" -> ") {
            continue;
        }
        let is_current = trimmed.starts_with('*');
        let name_raw = trimmed.trim_start_matches("* ").trim_start_matches("  ");
        let is_remote = name_raw.starts_with("remotes/");
        let name = name_raw.trim_start_matches("remotes/").to_string();

        branches.push(GitBranchInfo {
            name,
            is_remote,
            is_current,
        });
    }

    Ok(branches)
}

#[tauri::command]
pub async fn git_checkout(path: String, branch: String) -> Result<(), String> {
    let output = Command::new("git")
        .args(["checkout", &branch])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }
    Ok(())
}

// --- Log ---

#[derive(Serialize)]
pub struct GitLogEntry {
    pub hash: String,
    pub short_hash: String,
    pub author: String,
    pub date: String,
    pub message: String,
}

#[tauri::command]
pub async fn git_log(path: String, count: Option<u32>) -> Result<Vec<GitLogEntry>, String> {
    let n = count.unwrap_or(50).to_string();
    let output = Command::new("git")
        .args([
            "log",
            &format!("-{}", n),
            "--pretty=format:%H%n%h%n%an%n%ar%n%s",
        ])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let text = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = text.lines().collect();
    let mut entries = Vec::new();

    for chunk in lines.chunks(5) {
        if chunk.len() < 5 {
            break;
        }
        entries.push(GitLogEntry {
            hash: chunk[0].to_string(),
            short_hash: chunk[1].to_string(),
            author: chunk[2].to_string(),
            date: chunk[3].to_string(),
            message: chunk[4].to_string(),
        });
    }

    Ok(entries)
}

// --- Diff ---

#[tauri::command]
pub async fn git_diff(path: String, target: Option<String>) -> Result<String, String> {
    let mut args = vec!["diff".to_string(), "--stat".to_string(), "--patch".to_string()];
    if let Some(ref t) = target {
        args.push(t.clone());
    }
    let output = Command::new("git")
        .args(&args)
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub async fn git_show(path: String, commit: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["show", "--stat", "--patch", &commit])
        .current_dir(&path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}
