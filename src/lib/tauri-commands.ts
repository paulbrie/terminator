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

export interface SystemStats {
  cpu_percent: number;
  mem_percent: number;
  disk_percent: number;
}

export async function getSystemStats(): Promise<SystemStats> {
  return invoke<SystemStats>("get_system_stats");
}

export async function getGitBranch(path: string): Promise<string | null> {
  return invoke<string | null>("get_git_branch", { path });
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

// Project tasks

export async function writeProjectTasks(projectId: string, content: string): Promise<void> {
  return invoke("write_project_tasks", { projectId, content });
}

export async function readProjectTasks(projectName: string): Promise<string> {
  return invoke<string>("read_project_tasks", { projectName });
}

export async function pickFolder(): Promise<string | null> {
  return invoke<string | null>("pick_folder");
}

export async function installCli(): Promise<string> {
  return invoke<string>("install_cli");
}

// Process management

export interface ProcessInfo {
  pid: number;
  ppid: number | null;
  name: string;
  cpu_usage: number;
  memory_bytes: number;
  status: string;
  command: string;
  ports: number[];
}

export interface ListeningPort {
  port: number;
  pid: number | null;
  process_name: string | null;
  protocol: string;
}

export interface SystemSnapshot {
  processes: ProcessInfo[];
  listening_ports: ListeningPort[];
}

export async function listProcesses(): Promise<SystemSnapshot> {
  return invoke<SystemSnapshot>("list_processes");
}

export async function killProcess(pid: number): Promise<void> {
  return invoke("kill_process", { pid });
}

// Filesystem commands

export interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  extension: string | null;
}

export async function readDirectory(path: string, showHidden?: boolean): Promise<DirEntry[]> {
  return invoke<DirEntry[]>("read_directory", { path, showHidden: showHidden ?? null });
}

export async function readFile(path: string): Promise<string> {
  return invoke<string>("read_file", { path });
}

export async function writeFile(path: string, content: string): Promise<void> {
  return invoke("write_file", { path, content });
}

// Git commands

export interface GitFileStatus {
  path: string;
  status: string;
  staged: boolean;
}

export interface GitStatusResult {
  branch: string;
  files: GitFileStatus[];
}

export async function gitStatus(path: string): Promise<GitStatusResult> {
  return invoke<GitStatusResult>("git_status", { path });
}

export async function gitStage(path: string, files: string[]): Promise<void> {
  return invoke("git_stage", { path, files });
}

export async function gitUnstage(path: string, files: string[]): Promise<void> {
  return invoke("git_unstage", { path, files });
}

export async function gitCommit(path: string, message: string): Promise<void> {
  return invoke("git_commit", { path, message });
}

export async function gitPull(path: string): Promise<string> {
  return invoke<string>("git_pull", { path });
}

export async function gitPush(path: string): Promise<string> {
  return invoke<string>("git_push", { path });
}

export interface GitBranchInfo {
  name: string;
  is_remote: boolean;
  is_current: boolean;
}

export async function gitBranches(path: string): Promise<GitBranchInfo[]> {
  return invoke<GitBranchInfo[]>("git_branches", { path });
}

export async function gitCheckout(path: string, branch: string): Promise<void> {
  return invoke("git_checkout", { path, branch });
}

export interface GitLogEntry {
  hash: string;
  short_hash: string;
  author: string;
  date: string;
  message: string;
}

export async function gitLog(path: string, count?: number): Promise<GitLogEntry[]> {
  return invoke<GitLogEntry[]>("git_log", { path, count: count ?? null });
}

export async function gitDiff(path: string, target?: string): Promise<string> {
  return invoke<string>("git_diff", { path, target: target ?? null });
}

export async function gitShow(path: string, commit: string): Promise<string> {
  return invoke<string>("git_show", { path, commit });
}

