import { DeepSubject } from "subjecto";
import { useDeepSubject } from "subjecto/react";
import type { Tab, LayoutNode, Direction } from "../types/layout";
import type { ViewMode } from "../types/agent";
import {
  createLeaf,
  splitNode,
  removeNode,
  updateRatio,
  generateId,
  getAllPaneIds,
  movePane,
  swapPanes,
} from "../lib/layout-engine";
import { loadState, saveState } from "../lib/persistence";

export type { ViewMode };

interface WorkspaceState {
  tabs: Tab[];
  activeTabId: string;
  activePaneId: string;
  viewMode: ViewMode;
}

const initialPaneId = "pane-initial";
const initialTabId = generateId();

function buildDefaultState(): WorkspaceState {
  return {
    tabs: [
      {
        id: initialTabId,
        label: "Tab 1",
        rootNode: createLeaf(initialPaneId),
      },
    ],
    activeTabId: initialTabId,
    activePaneId: initialPaneId,
    viewMode: "tabs",
  };
}

function buildInitialState(): WorkspaceState {
  const persisted = loadState();
  if (persisted) {
    return {
      tabs: persisted.tabs,
      activeTabId: persisted.activeTabId,
      activePaneId: persisted.activePaneId,
      viewMode: persisted.viewMode ?? "tabs",
    };
  }
  return buildDefaultState();
}

export const workspaceStore$ = new DeepSubject<WorkspaceState>(buildInitialState());

// Auto-save on every state change (debounced)
let saveTimer: ReturnType<typeof setTimeout> | null = null;
workspaceStore$.subscribe("**", () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persistCurrentState();
  }, 500);
});

/** Persists the workspace layout + agent configs to localStorage. Imported lazily to avoid circular deps. */
export function persistCurrentState() {
  const s = workspaceStore$.getValue();
  // Lazy import to avoid circular dependency with agentStore
  import("./useAgentStore").then(({ agentStore$ }) => {
    const agents = agentStore$.getValue().agents;
    const persistedAgents = Object.values(agents).map((a) => ({
      paneId: a.id,
      config: a.config,
    }));
    saveState({
      tabs: s.tabs,
      activeTabId: s.activeTabId,
      activePaneId: s.activePaneId,
      viewMode: s.viewMode,
      agents: persistedAgents,
    });
  });
}

// --- Actions ---

function getActiveTab(): Tab | undefined {
  const s = workspaceStore$.getValue();
  return s.tabs.find((t) => t.id === s.activeTabId);
}

export function addTab(newPaneId: string) {
  const s = workspaceStore$.getValue();
  const tab: Tab = {
    id: generateId(),
    label: `Tab ${s.tabs.length + 1}`,
    rootNode: createLeaf(newPaneId),
  };
  s.tabs.push(tab);
  s.activeTabId = tab.id;
  s.activePaneId = newPaneId;
}

export function removeTab(tabId: string): string[] {
  const s = workspaceStore$.getValue();
  const tab = s.tabs.find((t) => t.id === tabId);
  const paneIds = tab ? getAllPaneIds(tab.rootNode) : [];
  const remaining = s.tabs.filter((t) => t.id !== tabId);
  if (remaining.length === 0) return [];
  workspaceStore$.next({
    tabs: remaining,
    activeTabId: s.activeTabId === tabId ? remaining[0].id : s.activeTabId,
    activePaneId: s.activePaneId,
    viewMode: s.viewMode,
  });
  return paneIds;
}

export function renameTab(tabId: string, label: string) {
  const tab = workspaceStore$.getValue().tabs.find((t) => t.id === tabId);
  if (tab) tab.label = label;
}

export function setActiveTab(tabId: string) {
  workspaceStore$.getValue().activeTabId = tabId;
}

export function splitPane(paneId: string, direction: Direction, newPaneId: string) {
  const s = workspaceStore$.getValue();
  const tab = s.tabs.find((t) => t.id === s.activeTabId);
  if (tab) {
    tab.rootNode = splitNode(tab.rootNode, paneId, direction, newPaneId);
    s.activePaneId = newPaneId;
  }
}

export function closePane(paneId: string) {
  const s = workspaceStore$.getValue();
  const tab = s.tabs.find((t) => t.id === s.activeTabId);
  if (!tab) return;
  const newRoot = removeNode(tab.rootNode, paneId);
  if (!newRoot) return;
  tab.rootNode = newRoot;
  const remainingPanes = getAllPaneIds(newRoot);
  if (!remainingPanes.includes(s.activePaneId)) {
    s.activePaneId = remainingPanes[0];
  }
}

export function resizeSplit(splitId: string, ratio: number) {
  const tab = getActiveTab();
  if (tab) {
    tab.rootNode = updateRatio(tab.rootNode, splitId, ratio);
  }
}

export function setActivePane(paneId: string) {
  workspaceStore$.getValue().activePaneId = paneId;
}

export function movePaneTo(
  sourcePaneId: string,
  targetPaneId: string,
  direction: Direction,
  insertBefore: boolean
) {
  const s = workspaceStore$.getValue();
  const tab = s.tabs.find((t) => t.id === s.activeTabId);
  if (!tab) return;
  const newRoot = movePane(tab.rootNode, sourcePaneId, targetPaneId, direction, insertBefore);
  if (newRoot) {
    tab.rootNode = newRoot;
    s.activePaneId = sourcePaneId;
  }
}

export function swapPanesAction(paneIdA: string, paneIdB: string) {
  const tab = getActiveTab();
  if (tab) {
    tab.rootNode = swapPanes(tab.rootNode, paneIdA, paneIdB);
  }
}

export function toggleViewMode() {
  const s = workspaceStore$.getValue();
  s.viewMode = s.viewMode === "tabs" ? "grid" : "tabs";
}

export function setViewMode(mode: ViewMode) {
  workspaceStore$.getValue().viewMode = mode;
}

// --- Read helpers ---

export function getActiveLayout(): LayoutNode | null {
  const s = workspaceStore$.getValue();
  const tab = s.tabs.find((t) => t.id === s.activeTabId);
  return tab?.rootNode ?? null;
}

export function getAllActivePaneIds(): string[] {
  const layout = getActiveLayout();
  return layout ? getAllPaneIds(layout) : [];
}

export function getAllPaneIdsAcrossTabs(): string[] {
  const s = workspaceStore$.getValue();
  const ids: string[] = [];
  for (const tab of s.tabs) {
    ids.push(...getAllPaneIds(tab.rootNode));
  }
  return ids;
}

// --- React hooks ---

export function useActivePaneId() {
  const [activePaneId] = useDeepSubject(workspaceStore$, "activePaneId");
  return activePaneId;
}

export function useActiveTabId() {
  const [activeTabId] = useDeepSubject(workspaceStore$, "activeTabId");
  return activeTabId;
}

export function useTabs() {
  const [tabs] = useDeepSubject(workspaceStore$, "tabs");
  return tabs;
}

export function useViewMode() {
  const [viewMode] = useDeepSubject(workspaceStore$, "viewMode");
  return viewMode;
}
