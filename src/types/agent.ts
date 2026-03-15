export type AgentState = "idle" | "running" | "streaming" | "done" | "error";
export type AgentType = "shell" | "claude" | "gpt" | "custom";
export type ViewMode = "tabs" | "grid";

export interface AgentConfig {
  agent_type: AgentType;
  label: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  working_directory?: string;
}

export interface AgentSession {
  id: string;
  config: AgentConfig;
  state: AgentState;
  backendId: string | null; // the PTY process ID from Tauri
  createdAt: number;
}
