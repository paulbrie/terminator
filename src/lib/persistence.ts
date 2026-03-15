import type { Tab } from "../types/layout";
import type { AgentConfig, ViewMode } from "../types/agent";

const STORAGE_KEY = "terminator:workspace";

export interface PersistedAgent {
  paneId: string;
  config: AgentConfig;
}

export interface PersistedState {
  tabs: Tab[];
  activeTabId: string;
  activePaneId: string;
  viewMode: ViewMode;
  agents: PersistedAgent[];
}

export function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silently ignore storage errors (quota, etc.)
  }
}

export function loadState(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedState;
    // Basic validation
    if (!parsed.tabs?.length || !parsed.activeTabId || !parsed.agents) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
