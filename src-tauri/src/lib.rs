mod agent;
mod commands;
mod error;
mod state;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            agent::process::spawn_agent,
            agent::process::send_input,
            agent::process::resize_pty,
            agent::process::kill_agent,
            commands::system::get_default_shell,
            commands::workspace::save_workspace,
            commands::workspace::load_workspace,
            commands::workspace::list_workspaces,
            commands::workspace::delete_workspace,
            commands::workspace::export_output,
            commands::workspace::save_session,
            commands::workspace::append_session_output,
            commands::workspace::list_sessions,
            commands::workspace::read_session_log,
            commands::workspace::delete_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Terminator");
}
