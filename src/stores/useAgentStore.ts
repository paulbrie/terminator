import { DeepSubject, batch } from "subjecto";
import { useSyncExternalStore, useCallback } from "react";
import type { AgentSession, AgentConfig, AgentState, PtyActivity } from "../types/agent";
import { spawnAgent, killAgent } from "../lib/tauri-commands";
import { persistCurrentState } from "./useWorkspaceStore";

interface AgentStoreState {
  agents: Record<string, AgentSession>;
}

export const $agentStore = new DeepSubject<AgentStoreState>({
  agents: {},
});

let paneCounter = (() => {
  // Recover counter from persisted pane IDs to avoid collisions
  try {
    const raw = localStorage.getItem("terminator:workspace");
    if (raw) {
      const parsed = JSON.parse(raw);
      let max = 0;
      const checkId = (id: string | undefined) => {
        const m = id?.match(/^pane-(\d+)$/);
        if (m) max = Math.max(max, parseInt(m[1], 10));
      };
      // Scan agent pane IDs
      for (const a of parsed.agents ?? []) {
        checkId(a.paneId);
      }
      // Scan layout tree pane IDs (handles panes not in agents array)
      const walkTree = (node: any) => {
        if (!node) return;
        if (node.type === "leaf") {
          checkId(node.paneId);
        } else if (node.children) {
          for (const child of node.children) walkTree(child);
        }
      };
      for (const tab of parsed.tabs ?? []) {
        walkTree(tab.rootNode);
      }
      // Also scan floating panes
      for (const fp of parsed.floatingPanes ?? []) {
        checkId(fp.paneId);
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
    ptyActivity: "idle",
  };

  $agentStore.getValue().agents[paneId] = session;

  try {
    const backendId = await spawnAgent(config);
    batch(() => {
      const agent = $agentStore.getValue().agents[paneId];
      if (agent) {
        agent.backendId = backendId;
        agent.state = "running";
      }
    });

    persistCurrentState();
    return { ...session, backendId, state: "running" as const };
  } catch (err) {
    $agentStore.getValue().agents[paneId].state = "error";
    throw err;
  }
}

export function removeAgent(paneId: string) {
  const store = $agentStore.getValue();
  const agent = store.agents[paneId];
  if (agent?.backendId) {
    killAgent(agent.backendId).catch(console.error);
  }
  delete store.agents[paneId];
  persistCurrentState();
  // Collapse empty panes after agent removal
  import("./useWorkspaceStore").then(({ collapseEmptyPanes }) => {
    collapseEmptyPanes();
  });
}

/** Spawn an agent into an existing pane (e.g. from the welcome screen) */
export async function spawnAgentInPane(paneId: string, config: AgentConfig): Promise<void> {
  const session: AgentSession = {
    id: paneId,
    config,
    state: "idle",
    backendId: null,
    createdAt: Date.now(),
    ptyActivity: "idle",
  };
  $agentStore.getValue().agents[paneId] = session;

  try {
    const backendId = await spawnAgent(config);
    batch(() => {
      const agent = $agentStore.getValue().agents[paneId];
      if (agent) {
        agent.backendId = backendId;
        agent.state = "running";
      }
    });
    persistCurrentState();
  } catch {
    $agentStore.getValue().agents[paneId].state = "error";
  }
}

export function setAgentState(paneId: string, state: AgentState) {
  const agent = $agentStore.getValue().agents[paneId];
  if (agent) {
    agent.state = state;
  }
}

export function setPtyActivity(paneId: string, activity: PtyActivity) {
  const agent = $agentStore.getValue().agents[paneId];
  if (agent && agent.ptyActivity !== activity) {
    agent.ptyActivity = activity;
  }
}

export function setAgentTitle(paneId: string, title: string) {
  const agent = $agentStore.getValue().agents[paneId];
  if (agent && agent.title !== title) {
    agent.title = title;
  }
}

export function setAgentCwd(paneId: string, cwd: string) {
  const agent = $agentStore.getValue().agents[paneId];
  if (agent && agent.config.working_directory !== cwd) {
    agent.config.working_directory = cwd;
    persistCurrentState();
  }
}

export function getAgent(paneId: string): AgentSession | undefined {
  return $agentStore.getValue().agents[paneId];
}

// React hooks

// Version counter bumped on any agents/** change, used to trigger re-renders
let agentsVersion = 0;
$agentStore.subscribe("agents/**", () => { agentsVersion++; }, { skipInitialCall: true });

export function useAgent(paneId: string) {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const handle = $agentStore.subscribe("agents/**", onStoreChange, { skipInitialCall: true });
    return () => handle.unsubscribe();
  }, []);
  const getSnapshot = useCallback(() => {
    const agent = $agentStore.getValue().agents[paneId];
    // Return a primitive snapshot so React detects changes
    return agent ? `${agentsVersion}:${agent.state}:${agent.backendId}:${agent.ptyActivity}:${agent.title ?? ""}` : "";
  }, [paneId]);

  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  if (!snapshot) return undefined;
  return $agentStore.getValue().agents[paneId] as AgentSession | undefined;
}

export function useAgents() {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const handle = $agentStore.subscribe("agents/**", onStoreChange, { skipInitialCall: true });
    return () => handle.unsubscribe();
  }, []);
  const getSnapshot = useCallback(() => agentsVersion, []);
  useSyncExternalStore(subscribe, getSnapshot);
  return $agentStore.getValue().agents;
}
