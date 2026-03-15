use std::env;

#[tauri::command]
pub async fn get_default_shell() -> Result<String, String> {
    env::var("SHELL").or_else(|_| Ok("/bin/zsh".to_string()))
}
