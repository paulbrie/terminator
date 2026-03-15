import { invoke } from "@tauri-apps/api/core";
import type { AgentConfig } from "../types/agent";

export async function spawnAgent(config: AgentConfig): Promise<string> {
  return invoke<string>("spawn_agent", { config });
}

export async function sendInput(agentId: string, data: string): Promise<void> {
  return invoke("send_input", { agentId, data });
}

export async function resizePty(
  agentId: string,
  cols: number,
  rows: number
): Promise<void> {
  return invoke("resize_pty", { agentId, cols, rows });
}

export async function killAgent(agentId: string): Promise<void> {
  return invoke("kill_agent", { agentId });
}

export async function getDefaultShell(): Promise<string> {
  return invoke<string>("get_default_shell");
}

// Workspace commands

export interface WorkspaceFile {
  name: string;
  data: string;
  created_at: number;
}

export async function saveWorkspace(name: string, data: string): Promise<void> {
  return invoke("save_workspace", { name, data });
}

export async function loadWorkspace(name: string): Promise<string> {
  return invoke<string>("load_workspace", { name });
}

export async function listWorkspaces(): Promise<WorkspaceFile[]> {
  return invoke<WorkspaceFile[]>("list_workspaces");
}

export async function deleteWorkspace(name: string): Promise<void> {
  return invoke("delete_workspace", { name });
}

export async function exportOutput(path: string, content: string): Promise<void> {
  return invoke("export_output", { path, content });
}

// Session history

export interface SessionEntry {
  id: string;
  agent_type: string;
  label: string;
  started_at: number;
  ended_at: number | null;
  output_file: string | null;
}

export async function saveSession(entry: SessionEntry): Promise<void> {
  return invoke("save_session", { entry });
}

export async function appendSessionOutput(sessionId: string, data: string): Promise<void> {
  return invoke("append_session_output", { sessionId, data });
}

export async function listSessions(): Promise<SessionEntry[]> {
  return invoke<SessionEntry[]>("list_sessions");
}

export async function readSessionLog(sessionId: string): Promise<string> {
  return invoke<string>("read_session_log", { sessionId });
}

export async function deleteSession(sessionId: string): Promise<void> {
  return invoke("delete_session", { sessionId });
}
