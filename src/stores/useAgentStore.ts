import { DeepSubject, batch } from "subjecto";
import { useDeepSubject } from "subjecto/react";
import type { AgentSession, AgentConfig, AgentState } from "../types/agent";
import { spawnAgent, killAgent, saveSession } from "../lib/tauri-commands";
import { persistCurrentState } from "./useWorkspaceStore";

interface AgentStoreState {
  agents: Record<string, AgentSession>;
}

export const agentStore$ = new DeepSubject<AgentStoreState>({
  agents: {},
});

let paneCounter = (() => {
  // Recover counter from persisted pane IDs to avoid collisions
  try {
    const raw = localStorage.getItem("terminator:workspace");
    if (raw) {
      const parsed = JSON.parse(raw);
      let max = 0;
      for (const a of parsed.agents ?? []) {
        const m = a.paneId?.match(/^pane-(\d+)$/);
        if (m) max = Math.max(max, parseInt(m[1], 10));
      }
      return max;
    }
  } catch { /* ignore */ }
  return 0;
})();

export async function createAgent(config: AgentConfig): Promise<AgentSession> {
  const paneId = `pane-${++paneCounter}`;

  const session: AgentSession = {
    id: paneId,
    config,
    state: "idle",
    backendId: null,
    createdAt: Date.now(),
  };

  agentStore$.getValue().agents[paneId] = session;

  try {
    const backendId = await spawnAgent(config);
    batch(() => {
      const agent = agentStore$.getValue().agents[paneId];
      if (agent) {
        agent.backendId = backendId;
        agent.state = "running";
      }
    });

    // Log session to history
    const nowSecs = Math.floor(Date.now() / 1000);
    saveSession({
      id: backendId,
      agent_type: config.agent_type,
      label: config.label,
      started_at: nowSecs,
      ended_at: null,
      output_file: null,
    }).catch(console.error);

    persistCurrentState();
    return { ...session, backendId, state: "running" as const };
  } catch (err) {
    agentStore$.getValue().agents[paneId].state = "error";
    throw err;
  }
}

export function removeAgent(paneId: string) {
  const agents = agentStore$.getValue().agents;
  const agent = agents[paneId];
  if (agent?.backendId) {
    const nowSecs = Math.floor(Date.now() / 1000);
    const startSecs = Math.floor(agent.createdAt / 1000);
    saveSession({
      id: agent.backendId,
      agent_type: agent.config.agent_type,
      label: agent.config.label,
      started_at: startSecs,
      ended_at: nowSecs,
      output_file: null,
    }).catch(console.error);
    killAgent(agent.backendId).catch(console.error);
  }
  delete agents[paneId];
  persistCurrentState();
}

export function setAgentState(paneId: string, state: AgentState) {
  const agent = agentStore$.getValue().agents[paneId];
  if (agent) {
    agent.state = state;
  }
}

export function getAgent(paneId: string): AgentSession | undefined {
  return agentStore$.getValue().agents[paneId];
}

// React hooks
export function useAgent(paneId: string) {
  const [agents] = useDeepSubject(agentStore$, "agents");
  return agents[paneId] as AgentSession | undefined;
}

export function useAgents() {
  const [agents] = useDeepSubject(agentStore$, "agents");
  return agents;
}
