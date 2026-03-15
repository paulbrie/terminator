import type { AgentState, AgentType } from "../types/agent";

// Heuristic state detection from terminal output
// This watches output patterns to infer agent state

export interface StateDetector {
  onOutput(data: string): AgentState | null;
  onIdle(): AgentState;
}

export function createStateDetector(agentType: AgentType): StateDetector {
  let lastOutputTime = Date.now();
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let currentState: AgentState = "running";
  let onStateChange: ((state: AgentState) => void) | null = null;

  function scheduleIdleCheck() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      // If no output for 2 seconds, might be idle (waiting for input)
      if (Date.now() - lastOutputTime > 2000) {
        currentState = "idle";
        onStateChange?.("idle");
      }
    }, 2000);
  }

  return {
    onOutput(data: string): AgentState | null {
      lastOutputTime = Date.now();

      // Detect streaming: rapid data arrival
      const prevState = currentState;

      if (agentType === "claude" || agentType === "gpt") {
        // AI agents: detect thinking/streaming patterns
        if (data.includes("Thinking") || data.includes("thinking")) {
          currentState = "streaming";
        } else if (data.length > 20) {
          currentState = "streaming";
        }
      } else {
        currentState = "running";
      }

      scheduleIdleCheck();
      return prevState !== currentState ? currentState : null;
    },

    onIdle(): AgentState {
      currentState = "idle";
      return "idle";
    },
  };
}
