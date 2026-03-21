use crate::state::{AgentConfig, AgentHandle, AppState};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::Read;
use tauri::{AppHandle, Emitter, State};
use uuid::Uuid;

#[derive(Clone, serde::Serialize)]
struct OutputPayload {
    data: String,
}

#[derive(Clone, serde::Serialize)]
struct ExitPayload {
    code: Option<u32>,
}

#[derive(Clone, serde::Serialize)]
struct ErrorPayload {
    message: String,
}

#[tauri::command]
pub async fn spawn_agent(
    app: AppHandle,
    state: State<'_, AppState>,
    config: AgentConfig,
) -> Result<String, String> {
    let agent_id = Uuid::new_v4().to_string();

    let pty_system = native_pty_system();

    let pty_pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let mut cmd = CommandBuilder::new(&config.command);
    cmd.args(&config.args);

    for (key, value) in &config.env {
        cmd.env(key, value);
    }

    // Ensure TERM and locale are set for proper key handling and Unicode rendering
    if !config.env.contains_key("TERM") {
        cmd.env("TERM", "xterm-256color");
    }
    if !config.env.contains_key("LANG") {
        cmd.env("LANG", "en_US.UTF-8");
    }
    if !config.env.contains_key("LC_ALL") {
        cmd.env("LC_ALL", "en_US.UTF-8");
    }

    // Add data dir bin/ to PATH so agents can use terminator-tasks CLI
    {
        let home = dirs::home_dir().unwrap_or_else(|| std::path::PathBuf::from("."));
        let folder = if cfg!(debug_assertions) { ".terminator-dev" } else { ".terminator" };
        let terminator_bin = home.join(folder).join("bin");
        let current_path = std::env::var("PATH").unwrap_or_default();
        cmd.env("PATH", format!("{}:{}", terminator_bin.display(), current_path));
    }

    if let Some(ref cwd) = config.working_directory {
        cmd.cwd(cwd);
    }

    let child = pty_pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;

    // Drop the slave — we only need the master side
    drop(pty_pair.slave);

    // Get the writer before moving master into handle
    let writer = pty_pair.master.take_writer().map_err(|e| e.to_string())?;

    // Clone what we need for the reader thread
    let mut reader = pty_pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let output_event = format!("agent:output:{}", agent_id);
    let exit_event = format!("agent:exit:{}", agent_id);
    let error_event = format!("agent:error:{}", agent_id);

    // Spawn a thread to read PTY output and emit events
    let app_clone = app.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 16384];
        // Buffer for incomplete UTF-8 sequences carried across reads
        let mut utf8_remainder: Vec<u8> = Vec::new();
        loop {
            match reader.read(&mut buf) {
                Ok(0) => {
                    let _ = app_clone.emit(&exit_event, ExitPayload { code: None });
                    break;
                }
                Ok(n) => {
                    // Prepend any leftover bytes from previous read
                    let chunk = if utf8_remainder.is_empty() {
                        &buf[..n]
                    } else {
                        utf8_remainder.extend_from_slice(&buf[..n]);
                        utf8_remainder.as_slice()
                    };

                    // Find the last valid UTF-8 boundary
                    match std::str::from_utf8(chunk) {
                        Ok(s) => {
                            let _ = app_clone.emit(&output_event, OutputPayload { data: s.to_string() });
                            utf8_remainder.clear();
                        }
                        Err(e) => {
                            let valid_up_to = e.valid_up_to();
                            if valid_up_to > 0 {
                                // Safety: we just validated this range
                                let valid = unsafe { std::str::from_utf8_unchecked(&chunk[..valid_up_to]) };
                                let _ = app_clone.emit(&output_event, OutputPayload { data: valid.to_string() });
                            }
                            // Save incomplete bytes for next read
                            let remaining = chunk[valid_up_to..].to_vec();
                            utf8_remainder = remaining;
                        }
                    }
                }
                Err(e) => {
                    let _ = app_clone.emit(
                        &error_event,
                        ErrorPayload {
                            message: e.to_string(),
                        },
                    );
                    break;
                }
            }
        }
    });

    let handle = AgentHandle {
        id: agent_id.clone(),
        config,
        child,
        master: pty_pair.master,
        writer,
    };

    state
        .agents
        .lock()
        .map_err(|e| e.to_string())?
        .insert(agent_id.clone(), handle);

    Ok(agent_id)
}

#[tauri::command]
pub async fn send_input(
    state: State<'_, AppState>,
    agent_id: String,
    data: String,
) -> Result<(), String> {
    let mut agents = state.agents.lock().map_err(|e| e.to_string())?;
    let handle = agents
        .get_mut(&agent_id)
        .ok_or_else(|| format!("Agent {} not found", agent_id))?;

    use std::io::Write;
    handle
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())?;
    handle.writer.flush().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn resize_pty(
    state: State<'_, AppState>,
    agent_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let agents = state.agents.lock().map_err(|e| e.to_string())?;
    let handle = agents
        .get(&agent_id)
        .ok_or_else(|| format!("Agent {} not found", agent_id))?;

    handle
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn kill_agent(state: State<'_, AppState>, agent_id: String) -> Result<(), String> {
    let mut agents = state.agents.lock().map_err(|e| e.to_string())?;
    if let Some(mut handle) = agents.remove(&agent_id) {
        handle.child.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}
