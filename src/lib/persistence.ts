import type { Tab, FloatingPaneState, Project } from "../types/layout";
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
  floatingPanes?: FloatingPaneState[];
  paneBgColors?: Record<string, string>;
  projects?: Project[];
  sidebarOpen?: boolean;
  editorPanes?: Record<string, { filePath: string; dirty: boolean }>;
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
    // Check for duplicate pane IDs in layout — if found, state is corrupt
    const allPaneIds: string[] = [];
    const walkTree = (node: any) => {
      if (!node) return;
      if (node.type === "leaf") allPaneIds.push(node.paneId);
      else if (node.children) node.children.forEach(walkTree);
    };
    for (const tab of parsed.tabs) walkTree(tab.rootNode);
    for (const fp of parsed.floatingPanes ?? []) allPaneIds.push(fp.paneId);
    if (new Set(allPaneIds).size !== allPaneIds.length) {
      // Corrupt state — discard it
      localStorage.removeItem(STORAGE_KEY);
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
