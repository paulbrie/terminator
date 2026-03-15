import { DeepSubject } from "subjecto";
import { useDeepSubject } from "subjecto/react";
import { sendInput } from "../lib/tauri-commands";
import { agentStore$ } from "./useAgentStore";

export interface Pipe {
  id: string;
  sourcePaneId: string;
  targetPaneId: string;
  active: boolean;
}

interface PipeStoreState {
  pipes: Pipe[];
}

export const pipeStore$ = new DeepSubject<PipeStoreState>({
  pipes: [],
});

let pipeCounter = 0;

export function addPipe(sourcePaneId: string, targetPaneId: string): string {
  const id = `pipe-${++pipeCounter}`;
  pipeStore$.getValue().pipes.push({ id, sourcePaneId, targetPaneId, active: true });
  return id;
}

export function removePipe(pipeId: string) {
  const state = pipeStore$.getValue();
  const idx = state.pipes.findIndex((p) => p.id === pipeId);
  if (idx !== -1) state.pipes.splice(idx, 1);
}

export function togglePipe(pipeId: string) {
  const pipe = pipeStore$.getValue().pipes.find((p) => p.id === pipeId);
  if (pipe) pipe.active = !pipe.active;
}

export function forwardOutput(sourcePaneId: string, data: string) {
  const { pipes } = pipeStore$.getValue();
  const agents = agentStore$.getValue().agents;

  for (const pipe of pipes) {
    if (pipe.active && pipe.sourcePaneId === sourcePaneId) {
      const targetAgent = agents[pipe.targetPaneId];
      if (targetAgent?.backendId) {
        sendInput(targetAgent.backendId, data).catch(console.error);
      }
    }
  }
}

// React hooks
export function usePipes() {
  const [pipes] = useDeepSubject(pipeStore$, "pipes");
  return pipes;
}
