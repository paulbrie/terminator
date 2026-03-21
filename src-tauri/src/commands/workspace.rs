use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// Returns the base data directory: `~/.terminator` in prod, `~/.terminator-dev` in dev.
fn base_dir() -> PathBuf {
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let folder = if cfg!(debug_assertions) {
        ".terminator-dev"
    } else {
        ".terminator"
    };
    home.join(folder)
}

fn workspaces_dir() -> PathBuf {
    let dir = base_dir().join("workspaces");
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

// Project tasks — written to disk so agents can access them

fn projects_dir() -> PathBuf {
    let dir = base_dir().join("projects");
    fs::create_dir_all(&dir).ok();
    dir
}

#[tauri::command]
pub async fn write_project_tasks(project_id: String, content: String) -> Result<(), String> {
    let dir = projects_dir().join(sanitize_name(&project_id));
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("tasks.md");
    fs::write(path, content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn pick_folder() -> Result<Option<String>, String> {
    let folder = rfd::FileDialog::new()
        .set_title("Select project folder")
        .pick_folder();
    Ok(folder.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn read_project_tasks(project_name: String) -> Result<String, String> {
    let dir = projects_dir().join(sanitize_name(&project_name));
    let path = dir.join("tasks.md");
    if path.exists() {
        fs::read_to_string(path).map_err(|e| e.to_string())
    } else {
        Ok(String::new())
    }
}

#[tauri::command]
pub async fn install_cli() -> Result<String, String> {
    let bin_dir = base_dir().join("bin");
    fs::create_dir_all(&bin_dir).map_err(|e| e.to_string())?;
    let script_path = bin_dir.join("terminator");
    let data_folder = if cfg!(debug_assertions) { ".terminator-dev" } else { ".terminator" };
    let script = r##"#!/usr/bin/env bash
# Terminator CLI
# Usage:
#   terminator tasks list [project]
#   terminator tasks add <project> <title>
#   terminator tasks done <project> <N>
#   terminator tasks undone <project> <N>
#   terminator tasks remove <project> <N>
#   terminator projects
#   terminator browser <subcommand> [args...]

DATA_DIR="$HOME/__DATA_FOLDER__"
PROJECTS_DIR="$DATA_DIR/projects"

usage() {
  echo "Terminator CLI"
  echo ""
  echo "Usage:"
  echo "  terminator projects                        List all projects"
  echo "  terminator tasks list [project]             List tasks"
  echo "  terminator tasks add <project> <title>      Add a task"
  echo "  terminator tasks done <project> <N>         Mark task N as done"
  echo "  terminator tasks undone <project> <N>       Mark task N as not done"
  echo "  terminator tasks remove <project> <N>       Remove task N"
  echo ""
  echo "  terminator browser list                     List open browser panes"
  echo "  terminator browser navigate <url> [label]   Navigate to URL"
  echo "  terminator browser eval <js> [label]        Evaluate JavaScript"
  echo "  terminator browser back [label]             Go back"
  echo "  terminator browser forward [label]          Go forward"
  echo "  terminator browser reload [label]           Reload page"
  echo "  terminator browser url [label]              Get current URL"
  exit 1
}

# --- Browser API helpers ---

_api_url() {
  local port_file="$DATA_DIR/api.port"
  if [ ! -f "$port_file" ]; then
    echo "Error: Terminator is not running (no API port file)." >&2
    exit 1
  fi
  local port
  port=$(cat "$port_file")
  echo "http://127.0.0.1:$port"
}

_api_get() {
  local path="$1"
  curl -sf "$(_api_url)$path" 2>/dev/null
  if [ $? -ne 0 ]; then
    echo "Error: Could not connect to Terminator API. Is the app running?" >&2
    exit 1
  fi
}

_api_post() {
  local path="$1"
  local body="$2"
  curl -sf -X POST "$(_api_url)$path" \
    -H "Content-Type: application/json" \
    -d "$body" 2>/dev/null
  if [ $? -ne 0 ]; then
    echo "Error: Could not connect to Terminator API. Is the app running?" >&2
    exit 1
  fi
}

_json_label() {
  # Build JSON with optional label field
  local label="$1"
  if [ -n "$label" ]; then
    echo "{\"label\":\"$label\"}"
  else
    echo "{}"
  fi
}

browser_cmd() {
  local sub="${1:-}"
  shift 2>/dev/null || true
  case "$sub" in
    list)
      _api_get "/browser/list" | _format_browser_list
      ;;
    navigate)
      local url="${1:-}"
      local label="${2:-}"
      [ -z "$url" ] && { echo "Usage: terminator browser navigate <url> [label]" >&2; exit 1; }
      local body="{\"url\":\"$url\""
      [ -n "$label" ] && body="$body,\"label\":\"$label\""
      body="$body}"
      _api_post "/browser/navigate" "$body"
      echo "Navigated to $url"
      ;;
    eval)
      local js="${1:-}"
      local label="${2:-}"
      [ -z "$js" ] && { echo "Usage: terminator browser eval <js> [label]" >&2; exit 1; }
      # Escape the JS for JSON
      local escaped_js
      escaped_js=$(printf '%s' "$js" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')
      local body="{\"js\":$escaped_js"
      [ -n "$label" ] && body="$body,\"label\":\"$label\""
      body="$body}"
      _api_post "/browser/eval" "$body"
      ;;
    back)
      _api_post "/browser/back" "$(_json_label "${1:-}")"
      echo "Back"
      ;;
    forward)
      _api_post "/browser/forward" "$(_json_label "${1:-}")"
      echo "Forward"
      ;;
    reload)
      _api_post "/browser/reload" "$(_json_label "${1:-}")"
      echo "Reloaded"
      ;;
    url)
      _api_post "/browser/url" "$(_json_label "${1:-}")"
      ;;
    *)
      echo "Usage: terminator browser <list|navigate|eval|back|forward|reload|url>" >&2
      exit 1
      ;;
  esac
}

_format_browser_list() {
  # Parse JSON list and print nicely
  python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
    browsers = data.get("browsers", [])
    if not browsers:
        print("No browser panes open.")
    else:
        for b in browsers:
            print(f"  {b}")
except:
    print("No browser panes open.")
' 2>/dev/null || echo "(could not parse response)"
}

list_projects() {
  if [ ! -d "$PROJECTS_DIR" ]; then
    echo "No projects found."
    return
  fi
  for dir in "$PROJECTS_DIR"/*/; do
    [ -d "$dir" ] || continue
    local name=$(basename "$dir")
    local info=""
    [ -f "$dir/tasks.md" ] && info=" ($(grep -c '^\- \[' "$dir/tasks.md" 2>/dev/null || echo 0) tasks)"
    echo "$name$info"
  done
}

get_tasks_file() {
  local project="$1"
  echo "$PROJECTS_DIR/$project/tasks.md"
}

list_tasks() {
  local project="$1"
  if [ -z "$project" ]; then
    for dir in "$PROJECTS_DIR"/*/; do
      [ -d "$dir" ] || continue
      local name=$(basename "$dir")
      local file="$dir/tasks.md"
      [ -f "$file" ] || continue
      echo "=== $name ==="
      local n=0
      while IFS= read -r line; do
        if [[ "$line" =~ ^-\ \[.\]\ (.+)$ ]]; then
          n=$((n + 1))
          echo "  $n. $line"
        fi
      done < "$file"
      echo ""
    done
  else
    local file=$(get_tasks_file "$project")
    if [ ! -f "$file" ]; then
      echo "No tasks for project '$project'."
      return 1
    fi
    local n=0
    while IFS= read -r line; do
      if [[ "$line" =~ ^-\ \[.\]\ (.+)$ ]]; then
        n=$((n + 1))
        echo "$n. $line"
      fi
    done < "$file"
  fi
}

add_task() {
  local project="$1"
  local title="$2"
  local file=$(get_tasks_file "$project")
  mkdir -p "$(dirname "$file")"
  if [ ! -f "$file" ]; then
    echo "# Tasks - $project" > "$file"
    echo "" >> "$file"
  fi
  echo "- [ ] $title" >> "$file"
  echo "Added: $title"
}

toggle_task() {
  local project="$1"
  local num="$2"
  local mark="$3"
  local file=$(get_tasks_file "$project")
  [ -f "$file" ] || { echo "No tasks for '$project'."; return 1; }

  local n=0
  local tmpfile=$(mktemp)
  while IFS= read -r line; do
    if [[ "$line" =~ ^-\ \[.\]\ (.+)$ ]]; then
      n=$((n + 1))
      if [ "$n" -eq "$num" ]; then
        local title="${BASH_REMATCH[1]}"
        echo "- [$mark] $title" >> "$tmpfile"
        continue
      fi
    fi
    echo "$line" >> "$tmpfile"
  done < "$file"
  mv "$tmpfile" "$file"
}

remove_task() {
  local project="$1"
  local num="$2"
  local file=$(get_tasks_file "$project")
  [ -f "$file" ] || { echo "No tasks for '$project'."; return 1; }

  local n=0
  local tmpfile=$(mktemp)
  while IFS= read -r line; do
    if [[ "$line" =~ ^-\ \[.\]\ (.+)$ ]]; then
      n=$((n + 1))
      if [ "$n" -eq "$num" ]; then
        echo "Removed: ${BASH_REMATCH[1]}"
        continue
      fi
    fi
    echo "$line" >> "$tmpfile"
  done < "$file"
  mv "$tmpfile" "$file"
}

cmd="${1:-}"
subcmd="${2:-}"

case "$cmd" in
  projects) list_projects ;;
  browser) shift; browser_cmd "$@" ;;
  tasks)
    case "$subcmd" in
      list) list_tasks "$3" ;;
      add)
        [ -z "${3:-}" ] || [ -z "${4:-}" ] && usage
        add_task "$3" "$4"
        ;;
      done)
        [ -z "${3:-}" ] || [ -z "${4:-}" ] && usage
        toggle_task "$3" "$4" "x"
        echo "Marked task $4 as done."
        ;;
      undone)
        [ -z "${3:-}" ] || [ -z "${4:-}" ] && usage
        toggle_task "$3" "$4" " "
        echo "Marked task $4 as not done."
        ;;
      remove)
        [ -z "${3:-}" ] || [ -z "${4:-}" ] && usage
        remove_task "$3" "$4"
        ;;
      *) usage ;;
    esac
    ;;
  *) usage ;;
esac
"##.replace("__DATA_FOLDER__", data_folder);
    fs::write(&script_path, script).map_err(|e| e.to_string())?;

    // Make executable
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&script_path)
            .map_err(|e| e.to_string())?
            .permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&script_path, perms).map_err(|e| e.to_string())?;
    }

    // Install MCP server script
    let mcp_script = include_str!("../../../scripts/terminator-mcp.mjs");
    let mcp_path = bin_dir.join("terminator-mcp.mjs");
    fs::write(&mcp_path, mcp_script).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        let mut perms = fs::metadata(&mcp_path)
            .map_err(|e| e.to_string())?
            .permissions();
        perms.set_mode(0o755);
        fs::set_permissions(&mcp_path, perms).map_err(|e| e.to_string())?;
    }

    // Auto-inject MCP server into ~/.claude.json if not already present
    inject_mcp_config(&mcp_path);

    Ok(bin_dir.to_string_lossy().to_string())
}

fn inject_mcp_config(mcp_script_path: &std::path::Path) {
    let home = dirs::home_dir().unwrap_or_default();
    let claude_json_path = home.join(".claude.json");
    let mcp_path_str = mcp_script_path.to_string_lossy().to_string();

    let mut config: serde_json::Value = if claude_json_path.exists() {
        match fs::read_to_string(&claude_json_path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_else(|_| serde_json::json!({})),
            Err(_) => serde_json::json!({}),
        }
    } else {
        serde_json::json!({})
    };

    let servers = config
        .as_object_mut()
        .unwrap()
        .entry("mcpServers")
        .or_insert_with(|| serde_json::json!({}));

    if let Some(obj) = servers.as_object_mut() {
        if !obj.contains_key("terminator-browser") {
            obj.insert(
                "terminator-browser".to_string(),
                serde_json::json!({
                    "command": "node",
                    "args": [mcp_path_str]
                }),
            );
            if let Ok(json) = serde_json::to_string_pretty(&config) {
                let _ = fs::write(&claude_json_path, json);
            }
        }
    }
}

fn sanitize_name(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect()
}
