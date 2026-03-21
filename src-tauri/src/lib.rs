mod agent;
mod api_server;
mod commands;
mod error;
mod state;

use state::AppState;
use tauri::Manager;

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
            commands::system::get_git_branch,
            commands::system::get_system_stats,
            commands::workspace::save_workspace,
            commands::workspace::load_workspace,
            commands::workspace::list_workspaces,
            commands::workspace::delete_workspace,
            commands::workspace::export_output,
            commands::workspace::write_project_tasks,
            commands::workspace::read_project_tasks,
            commands::workspace::pick_folder,
            commands::workspace::install_cli,
            commands::processes::list_processes,
            commands::processes::kill_process,
            commands::filesystem::read_directory,
            commands::filesystem::read_file,
            commands::filesystem::write_file,
            commands::git::git_status,
            commands::git::git_stage,
            commands::git::git_unstage,
            commands::git::git_commit,
            commands::git::git_pull,
            commands::git::git_push,
            commands::git::git_branches,
            commands::git::git_checkout,
            commands::git::git_log,
            commands::git::git_diff,
            commands::git::git_show,
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let build_time = env!("BUILD_TIME");
                let title = if cfg!(debug_assertions) {
                    format!("Terminator (Dev) — built {}", build_time)
                } else {
                    format!("Terminator — built {}", build_time)
                };
                let _ = window.set_title(&title);
            }

            // Start the local HTTP API server for CLI/agent browser control
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                api_server::start(handle).await;
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Terminator");
}
