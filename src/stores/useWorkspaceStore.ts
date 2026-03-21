import { DeepSubject } from "subjecto";
import { useDeepSubject } from "subjecto/react";
import type { Tab, LayoutNode, Direction, FloatingPaneState, Project, Task } from "../types/layout";
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
import { saveState } from "../lib/persistence";
import { writeProjectTasks, readProjectTasks, sendInput } from "../lib/tauri-commands";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

export type { ViewMode };

export interface EditorPaneInfo {
  filePath: string;
  dirty: boolean;
}

interface WorkspaceState {
  tabs: Tab[];
  activeTabId: string;
  activePaneId: string;
  viewMode: ViewMode;
  floatingPanes: FloatingPaneState[];
  paneBgColors: Record<string, string>;
  projects: Project[];
  sidebarOpen: boolean;
  editorPanes: Record<string, EditorPaneInfo>;
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
    viewMode: "grid",
    floatingPanes: [],
    paneBgColors: {},
    projects: [],
    sidebarOpen: false,
    editorPanes: {},
  };
}

function buildInitialState(): WorkspaceState {
  // Always start fresh with the default welcome state.
  // Persisted settings (like projects) are still available via loadState() if needed,
  // but we don't restore the previous panel layout.
  return buildDefaultState();
}

export const $workspaceStore = new DeepSubject<WorkspaceState>(buildInitialState());

// Auto-save on every state change (debounced)
let saveTimer: ReturnType<typeof setTimeout> | null = null;
$workspaceStore.subscribe("**", () => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    persistCurrentState();
  }, 500);
});

let topZIndex = 100;

/** Persists the workspace layout + agent configs to localStorage. Imported lazily to avoid circular deps. */
export function persistCurrentState() {
  const s = $workspaceStore.getValue();
  import("./useAgentStore").then(({ $agentStore }) => {
    const agents = $agentStore.getValue().agents;
    const persistedAgents = Object.values(agents).map((a) => ({
      paneId: a.id,
      config: a.config,
    }));
    saveState({
      tabs: s.tabs,
      activeTabId: s.activeTabId,
      activePaneId: s.activePaneId,
      viewMode: s.viewMode,
      floatingPanes: s.floatingPanes,
      paneBgColors: s.paneBgColors,
      projects: s.projects,
      sidebarOpen: s.sidebarOpen,
      editorPanes: s.editorPanes,
      agents: persistedAgents,
    });
  });
}

// --- Actions ---

function getActiveTab(): Tab | undefined {
  const s = $workspaceStore.getValue();
  return s.tabs.find((t) => t.id === s.activeTabId);
}

export function addTab(newPaneId: string) {
  const s = $workspaceStore.getValue();
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
  const s = $workspaceStore.getValue();
  const tab = s.tabs.find((t) => t.id === tabId);
  const paneIds = tab ? getAllPaneIds(tab.rootNode) : [];
  if (s.tabs.length <= 1) return [];
  const idx = s.tabs.findIndex((t) => t.id === tabId);
  if (idx >= 0) s.tabs.splice(idx, 1);
  if (s.activeTabId === tabId) {
    s.activeTabId = s.tabs[0].id;
  }
  return paneIds;
}

export function renameTab(tabId: string, label: string) {
  const tab = $workspaceStore.getValue().tabs.find((t) => t.id === tabId);
  if (tab) tab.label = label;
}

export function setActiveTab(tabId: string) {
  $workspaceStore.getValue().activeTabId = tabId;
}

export function splitPane(paneId: string, direction: Direction, newPaneId: string) {
  const s = $workspaceStore.getValue();
  for (const tab of s.tabs) {
    const ids = getAllPaneIds(tab.rootNode);
    if (!ids.includes(paneId)) continue;
    tab.rootNode = splitNode(tab.rootNode, paneId, direction, newPaneId);
    s.activePaneId = newPaneId;
    return;
  }
}

export function closePane(paneId: string) {
  const s = $workspaceStore.getValue();

  // Remove from any project
  removePaneFromAllProjects(paneId);

  // Check if it's a floating pane
  const floatIdx = s.floatingPanes.findIndex((fp) => fp.paneId === paneId);
  if (floatIdx >= 0) {
    s.floatingPanes.splice(floatIdx, 1);
    return;
  }

  // Search all tabs for this pane
  for (let i = 0; i < s.tabs.length; i++) {
    const tab = s.tabs[i];
    const ids = getAllPaneIds(tab.rootNode);
    if (!ids.includes(paneId)) continue;

    const newRoot = removeNode(tab.rootNode, paneId);
    if (!newRoot) {
      if (s.tabs.length > 1) {
        s.tabs.splice(i, 1);
        if (s.activeTabId === tab.id) {
          s.activeTabId = s.tabs[0].id;
          s.activePaneId = getAllPaneIds(s.tabs[0].rootNode)[0];
        }
      }
      return;
    }

    tab.rootNode = newRoot;
    const remainingPanes = getAllPaneIds(newRoot);
    if (!remainingPanes.includes(s.activePaneId)) {
      s.activePaneId = remainingPanes[0];
    }
    return;
  }
}

export function resizeSplit(splitId: string, ratio: number) {
  const tab = getActiveTab();
  if (tab) {
    tab.rootNode = updateRatio(tab.rootNode, splitId, ratio);
  }
}

export function setActivePane(paneId: string) {
  $workspaceStore.getValue().activePaneId = paneId;
}

export function movePaneTo(
  sourcePaneId: string,
  targetPaneId: string,
  direction: Direction,
  insertBefore: boolean
) {
  const s = $workspaceStore.getValue();
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

/** Swap two panes, even if they belong to different tabs */
export function swapPanesGlobal(paneIdA: string, paneIdB: string) {
  if (paneIdA === paneIdB) return;
  const s = $workspaceStore.getValue();
  let tabA: Tab | undefined;
  let tabB: Tab | undefined;
  for (const tab of s.tabs) {
    const ids = getAllPaneIds(tab.rootNode);
    if (ids.includes(paneIdA)) tabA = tab;
    if (ids.includes(paneIdB)) tabB = tab;
  }
  if (!tabA || !tabB) return;
  if (tabA === tabB) {
    tabA.rootNode = swapPanes(tabA.rootNode, paneIdA, paneIdB);
  } else {
    // Cross-tab: swap the paneIds in each tree's leaf node
    swapPaneIdInTree(tabA, paneIdA, paneIdB);
    swapPaneIdInTree(tabB, paneIdB, paneIdA);
  }
}

function swapPaneIdInTree(tab: Tab, from: string, to: string) {
  function walk(node: LayoutNode): LayoutNode {
    if (node.type === "leaf") {
      return node.paneId === from ? { ...node, paneId: to } : node;
    }
    return { ...node, children: [walk(node.children[0]), walk(node.children[1])] };
  }
  tab.rootNode = walk(tab.rootNode);
}

export function toggleViewMode() {
  const s = $workspaceStore.getValue();
  s.viewMode = s.viewMode === "tabs" ? "grid" : "tabs";
}

export function setViewMode(mode: ViewMode) {
  $workspaceStore.getValue().viewMode = mode;
}

/** Collapse layout to a single pane when multiple empty (agent-less) panes exist */
export function collapseEmptyPanes() {
  // Lazy import to avoid circular dep
  import("./useAgentStore").then(({ $agentStore }) => {
    const s = $workspaceStore.getValue();
    const agents = $agentStore.getValue().agents;

    // First: within each tab, remove empty panes if active ones exist
    for (const tab of s.tabs) {
      const paneIds = getAllPaneIds(tab.rootNode);
      if (paneIds.length <= 1) continue;
      const activePanes = paneIds.filter((id) => !!agents[id]);
      const emptyPanes = paneIds.filter((id) => !agents[id]);
      if (emptyPanes.length > 1) {
        for (let i = 1; i < emptyPanes.length; i++) {
          const newRoot = removeNode(tab.rootNode, emptyPanes[i]);
          if (newRoot) tab.rootNode = newRoot;
        }
      }
      if (activePanes.length > 0 && emptyPanes.length > 0) {
        for (const emptyId of emptyPanes) {
          const newRoot = removeNode(tab.rootNode, emptyId);
          if (newRoot) tab.rootNode = newRoot;
        }
      }
    }

    // Second: remove entirely-empty tabs if there are tabs with agents
    const hasAnyAgent = s.tabs.some((tab) =>
      getAllPaneIds(tab.rootNode).some((id) => !!agents[id])
    );
    if (hasAnyAgent && s.tabs.length > 1) {
      const toRemove: number[] = [];
      for (let i = 0; i < s.tabs.length; i++) {
        const paneIds = getAllPaneIds(s.tabs[i].rootNode);
        if (paneIds.every((id) => !agents[id])) {
          toRemove.push(i);
        }
      }
      for (let i = toRemove.length - 1; i >= 0; i--) {
        s.tabs.splice(toRemove[i], 1);
      }
    }

    // Fix activeTabId / activePaneId if stale
    if (!s.tabs.find((t) => t.id === s.activeTabId) && s.tabs.length > 0) {
      s.activeTabId = s.tabs[0].id;
    }
    const allRemaining = s.tabs.flatMap((t) => getAllPaneIds(t.rootNode));
    if (!allRemaining.includes(s.activePaneId) && allRemaining.length > 0) {
      s.activePaneId = allRemaining[0];
    }
  });
}

// --- Floating pane actions ---

export function detachPane(paneId: string) {
  const s = $workspaceStore.getValue();

  // Already floating?
  if (s.floatingPanes.some((fp) => fp.paneId === paneId)) return;

  // Remove from layout tree (find in any tab)
  for (let i = 0; i < s.tabs.length; i++) {
    const tab = s.tabs[i];
    const paneIds = getAllPaneIds(tab.rootNode);
    if (!paneIds.includes(paneId)) continue;

    const newRoot = removeNode(tab.rootNode, paneId);
    if (newRoot) {
      tab.rootNode = newRoot;
    } else if (s.tabs.length > 1) {
      // Remove the now-empty tab
      s.tabs.splice(i, 1);
      if (s.activeTabId === tab.id) {
        s.activeTabId = s.tabs[0].id;
      }
    } else {
      // Last pane in the only tab — replace with an empty pane so the welcome screen shows
      const emptyPaneId = generateId();
      tab.rootNode = createLeaf(emptyPaneId);
      s.activePaneId = emptyPaneId;
    }
    break;
  }

  topZIndex++;
  s.floatingPanes.push({
    paneId,
    x: 100 + (s.floatingPanes.length * 30) % 200,
    y: 100 + (s.floatingPanes.length * 30) % 150,
    width: 600,
    height: 400,
    collapsed: false,
    zIndex: topZIndex,
  });
  s.activePaneId = paneId;
}

export function detachPaneToWindow(paneId: string) {
  // Look up agent info before removing from stores
  import("./useAgentStore").then(({ $agentStore }) => {
    const agents = $agentStore.getValue().agents;
    const agent = agents[paneId];
    if (!agent?.backendId) return;

    const backendId = agent.backendId;
    const config = { ...agent.config };
    const s = $workspaceStore.getValue();
    const bgColor = s.paneBgColors[paneId] || "";

    // Remove pane from layout tree (same logic as detachPane, but don't add as floating)
    for (let i = 0; i < s.tabs.length; i++) {
      const tab = s.tabs[i];
      const paneIds = getAllPaneIds(tab.rootNode);
      if (!paneIds.includes(paneId)) continue;

      const newRoot = removeNode(tab.rootNode, paneId);
      if (newRoot) {
        tab.rootNode = newRoot;
      } else if (s.tabs.length > 1) {
        s.tabs.splice(i, 1);
        if (s.activeTabId === tab.id) {
          s.activeTabId = s.tabs[0].id;
        }
      } else {
        const emptyPaneId = generateId();
        tab.rootNode = createLeaf(emptyPaneId);
        s.activePaneId = emptyPaneId;
      }
      break;
    }

    // Also check floating panes
    const floatIdx = s.floatingPanes.findIndex((fp) => fp.paneId === paneId);
    if (floatIdx >= 0) {
      s.floatingPanes.splice(floatIdx, 1);
    }

    // Remove agent from this window's store WITHOUT killing the PTY
    delete agents[paneId];

    // Open a new OS window pointing at the same index.html with detached params
    const label = `detached-${paneId}-${Date.now()}`;
    const params = new URLSearchParams({
      detached: "true",
      paneId,
      backendId,
      agentConfig: JSON.stringify(config),
    });
    if (bgColor) {
      params.set("bgColor", bgColor);
    }

    new WebviewWindow(label, {
      url: `index.html?${params.toString()}`,
      title: `${config.label} — detached`,
      width: 800,
      height: 600,
      decorations: true,
    });
  });
}

export function detachProjectToWindow(projectId: string) {
  import("./useAgentStore").then(({ $agentStore }) => {
    const s = $workspaceStore.getValue();
    const agents = $agentStore.getValue().agents;
    const project = s.projects.find((p) => p.id === projectId);
    if (!project || project.paneIds.length === 0) return;

    // Collect pane descriptors for all project panes that have active agents
    const paneDescriptors: Array<{
      paneId: string;
      backendId: string;
      agentConfig: { agent_type: string; label: string; command?: string; cwd?: string };
      bgColor: string;
    }> = [];

    for (const paneId of [...project.paneIds]) {
      const agent = agents[paneId];
      if (!agent?.backendId) continue;

      paneDescriptors.push({
        paneId,
        backendId: agent.backendId,
        agentConfig: { ...agent.config },
        bgColor: s.paneBgColors[paneId] || "",
      });

      // Remove pane from layout tree
      for (let i = 0; i < s.tabs.length; i++) {
        const tab = s.tabs[i];
        const ids = getAllPaneIds(tab.rootNode);
        if (!ids.includes(paneId)) continue;
        const newRoot = removeNode(tab.rootNode, paneId);
        if (newRoot) {
          tab.rootNode = newRoot;
        } else if (s.tabs.length > 1) {
          s.tabs.splice(i, 1);
          if (s.activeTabId === tab.id) {
            s.activeTabId = s.tabs[0].id;
          }
        } else {
          const emptyPaneId = generateId();
          tab.rootNode = createLeaf(emptyPaneId);
          s.activePaneId = emptyPaneId;
        }
        break;
      }

      // Remove from floating panes
      const floatIdx = s.floatingPanes.findIndex((fp) => fp.paneId === paneId);
      if (floatIdx >= 0) s.floatingPanes.splice(floatIdx, 1);

      // Remove agent from store WITHOUT killing the PTY
      delete agents[paneId];
    }

    if (paneDescriptors.length === 0) return;

    const label = `detached-project-${projectId}-${Date.now()}`;
    const params = new URLSearchParams({
      detachedProject: "true",
      projectId: project.id,
      projectName: project.name,
      projectColor: project.color || "",
      panes: JSON.stringify(paneDescriptors),
    });

    new WebviewWindow(label, {
      url: `index.html?${params.toString()}`,
      title: `${project.name} — project`,
      width: 1200,
      height: 800,
      decorations: true,
    });
  });
}

export function collapseFloatingPane(paneId: string) {
  const s = $workspaceStore.getValue();
  const fp = s.floatingPanes.find((f) => f.paneId === paneId);
  if (fp) fp.collapsed = true;
}

export function expandFloatingPane(paneId: string) {
  const s = $workspaceStore.getValue();
  const fp = s.floatingPanes.find((f) => f.paneId === paneId);
  if (fp) {
    fp.collapsed = false;
    topZIndex++;
    fp.zIndex = topZIndex;
    s.activePaneId = paneId;
  }
}

export function redockPane(paneId: string) {
  const s = $workspaceStore.getValue();
  const idx = s.floatingPanes.findIndex((fp) => fp.paneId === paneId);
  if (idx < 0) return;
  s.floatingPanes.splice(idx, 1);

  const tab = s.tabs.find((t) => t.id === s.activeTabId);
  if (tab) {
    const treePaneIds = getAllPaneIds(tab.rootNode);
    // Find a target pane actually in the layout tree (activePaneId may be the floating pane itself)
    const targetId = treePaneIds.includes(s.activePaneId)
      ? s.activePaneId
      : treePaneIds[0];
    if (targetId) {
      tab.rootNode = splitNode(tab.rootNode, targetId, "horizontal", paneId);
    } else {
      // Tab is empty — replace root with the redocked pane
      tab.rootNode = createLeaf(paneId);
    }
  } else if (s.tabs.length > 0) {
    s.tabs[0].rootNode = splitNode(s.tabs[0].rootNode, getAllPaneIds(s.tabs[0].rootNode)[0], "horizontal", paneId);
  } else {
    s.tabs.push({
      id: generateId(),
      label: "Tab 1",
      rootNode: createLeaf(paneId),
    });
    s.activeTabId = s.tabs[0].id;
  }
  s.activePaneId = paneId;
}

export function updateFloatingPosition(paneId: string, x: number, y: number) {
  const fp = $workspaceStore.getValue().floatingPanes.find((f) => f.paneId === paneId);
  if (fp) {
    fp.x = x;
    fp.y = y;
  }
}

export function updateFloatingSize(paneId: string, width: number, height: number) {
  const fp = $workspaceStore.getValue().floatingPanes.find((f) => f.paneId === paneId);
  if (fp) {
    fp.width = Math.max(300, width);
    fp.height = Math.max(200, height);
  }
}

export function bringFloatingToFront(paneId: string) {
  const fp = $workspaceStore.getValue().floatingPanes.find((f) => f.paneId === paneId);
  if (fp) {
    topZIndex++;
    fp.zIndex = topZIndex;
  }
}

// --- Project actions ---

export function createProject(name: string, color?: string): string {
  const s = $workspaceStore.getValue();
  const id = `proj-${Date.now()}`;
  s.projects.push({ id, name, color, paneIds: [], tasks: [] });
  return id;
}

export function renameProject(projectId: string, name: string) {
  const proj = $workspaceStore.getValue().projects.find((p) => p.id === projectId);
  if (proj) proj.name = name;
}

export function deleteProject(projectId: string) {
  const s = $workspaceStore.getValue();
  const idx = s.projects.findIndex((p) => p.id === projectId);
  if (idx >= 0) s.projects.splice(idx, 1);
}

export function setProjectColor(projectId: string, color: string | null) {
  const proj = $workspaceStore.getValue().projects.find((p) => p.id === projectId);
  if (proj) proj.color = color ?? undefined;
}

export function setProjectDefaultCommand(projectId: string, command: string | null) {
  const proj = $workspaceStore.getValue().projects.find((p) => p.id === projectId);
  if (proj) proj.defaultCommand = command ?? undefined;
}

export function setProjectFolder(projectId: string, folder: string | null) {
  const proj = $workspaceStore.getValue().projects.find((p) => p.id === projectId);
  if (proj) proj.folder = folder ?? undefined;
}

export function setProjectDefaultBgColor(projectId: string, color: string | null) {
  const proj = $workspaceStore.getValue().projects.find((p) => p.id === projectId);
  if (proj) proj.defaultBgColor = color ?? undefined;
}

/** Get the project default bg color for a pane (if it belongs to a project) */
export function getProjectBgColorForPane(paneId: string): string | undefined {
  const s = $workspaceStore.getValue();
  const proj = s.projects.find((p) => p.paneIds.includes(paneId));
  return proj?.defaultBgColor;
}

export function addPaneToProject(projectId: string, paneId: string) {
  const s = $workspaceStore.getValue();
  // Remove from any other project first
  for (const p of s.projects) {
    const idx = p.paneIds.indexOf(paneId);
    if (idx >= 0) p.paneIds.splice(idx, 1);
  }
  const proj = s.projects.find((p) => p.id === projectId);
  if (proj) {
    proj.paneIds.push(paneId);
    // cd to project folder if set
    if (proj.folder) {
      import("./useAgentStore").then(({ $agentStore }) => {
        const agent = $agentStore.getValue().agents[paneId];
        if (agent?.backendId) {
          sendInput(agent.backendId, `cd ${JSON.stringify(proj.folder)}\n`).catch(() => {});
        }
      });
    }
  }
}

export function removePaneFromProject(projectId: string, paneId: string) {
  const proj = $workspaceStore.getValue().projects.find((p) => p.id === projectId);
  if (proj) {
    const idx = proj.paneIds.indexOf(paneId);
    if (idx >= 0) proj.paneIds.splice(idx, 1);
  }
}

function removePaneFromAllProjects(paneId: string) {
  for (const p of $workspaceStore.getValue().projects) {
    const idx = p.paneIds.indexOf(paneId);
    if (idx >= 0) p.paneIds.splice(idx, 1);
  }
}

export function toggleSidebar() {
  const s = $workspaceStore.getValue();
  s.sidebarOpen = !s.sidebarOpen;
}

export function setSidebarOpen(open: boolean) {
  $workspaceStore.getValue().sidebarOpen = open;
}

// --- Editor pane actions ---

export function openFileInEditor(filePath: string) {
  const s = $workspaceStore.getValue();

  // Check if already open — focus it
  for (const [paneId, info] of Object.entries(s.editorPanes)) {
    if (info.filePath === filePath) {
      s.activePaneId = paneId;
      return paneId;
    }
  }

  // Create new pane via split on active pane
  const newPaneId = `pane-${Date.now()}`;
  const activeTab = s.tabs.find((t) => t.id === s.activeTabId);
  if (activeTab) {
    activeTab.rootNode = splitNode(activeTab.rootNode, s.activePaneId, "horizontal", newPaneId);
  }
  s.editorPanes[newPaneId] = { filePath, dirty: false };
  s.activePaneId = newPaneId;
  return newPaneId;
}

export function closeEditorPane(paneId: string) {
  const s = $workspaceStore.getValue();
  delete s.editorPanes[paneId];
  closePane(paneId);
}

export function setEditorDirty(paneId: string, dirty: boolean) {
  const info = $workspaceStore.getValue().editorPanes[paneId];
  if (info) info.dirty = dirty;
}

export function useEditorPane(paneId: string): EditorPaneInfo | undefined {
  const [ep] = useDeepSubject($workspaceStore, "editorPanes");
  return ep[paneId];
}

// --- Task actions ---

function syncTasksToDisk(project: Project) {
  const lines = [`# Tasks — ${project.name}`, ""];
  for (const t of project.tasks) {
    lines.push(`- [${t.done ? "x" : " "}] ${t.title}`);
  }
  // Use project name as folder (sanitized) so agents can discover it
  writeProjectTasks(project.name, lines.join("\n") + "\n").catch(() => {});
}

/** Parse tasks.md content into Task[] */
function parseTasksFromMarkdown(content: string): { title: string; done: boolean }[] {
  const tasks: { title: string; done: boolean }[] = [];
  for (const line of content.split("\n")) {
    const m = line.match(/^- \[([ x])\] (.+)$/);
    if (m) {
      tasks.push({ title: m[2], done: m[1] === "x" });
    }
  }
  return tasks;
}

/** Sync tasks from disk into the store (called periodically to pick up agent changes) */
export async function syncTasksFromDisk() {
  const s = $workspaceStore.getValue();
  for (const proj of s.projects) {
    try {
      const content = await readProjectTasks(proj.name);
      if (!content) continue;
      const diskTasks = parseTasksFromMarkdown(content);
      // Build a quick signature to compare
      const diskSig = diskTasks.map((t) => `${t.done ? "x" : " "}:${t.title}`).join("|");
      const storeSig = proj.tasks.map((t) => `${t.done ? "x" : " "}:${t.title}`).join("|");
      if (diskSig === storeSig) continue;
      // Disk has changed — update store tasks
      // Preserve existing IDs where titles match, create new ones otherwise
      const existingByTitle = new Map(proj.tasks.map((t) => [t.title, t]));
      proj.tasks = diskTasks.map((dt) => {
        const existing = existingByTitle.get(dt.title);
        if (existing) {
          existing.done = dt.done;
          return existing;
        }
        return { id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: dt.title, done: dt.done, createdAt: Date.now() };
      });
    } catch {
      // ignore read errors
    }
  }
}

// Poll for task file changes every 3 seconds
setInterval(() => {
  syncTasksFromDisk();
}, 3000);

export function syncAllProjectsToDisk() {
  const s = $workspaceStore.getValue();
  for (const proj of s.projects) {
    if (proj.tasks.length > 0) syncTasksToDisk(proj);
  }
}

export function addTask(projectId: string, title: string): Task {
  const s = $workspaceStore.getValue();
  const proj = s.projects.find((p) => p.id === projectId);
  const task: Task = { id: `task-${Date.now()}`, title, done: false, createdAt: Date.now() };
  if (proj) {
    proj.tasks.push(task);
    syncTasksToDisk(proj);
  }
  return task;
}

export function toggleTask(projectId: string, taskId: string) {
  const proj = $workspaceStore.getValue().projects.find((p) => p.id === projectId);
  if (!proj) return;
  const task = proj.tasks.find((t) => t.id === taskId);
  if (task) {
    task.done = !task.done;
    syncTasksToDisk(proj);
  }
}

export function deleteTask(projectId: string, taskId: string) {
  const proj = $workspaceStore.getValue().projects.find((p) => p.id === projectId);
  if (!proj) return;
  const idx = proj.tasks.findIndex((t) => t.id === taskId);
  if (idx >= 0) {
    proj.tasks.splice(idx, 1);
    syncTasksToDisk(proj);
  }
}

// --- Pane background color ---

export function setPaneBgColor(paneId: string, color: string | null) {
  const s = $workspaceStore.getValue();
  if (color) {
    s.paneBgColors[paneId] = color;
  } else {
    delete s.paneBgColors[paneId];
  }
}

export function getPaneBgColor(paneId: string): string | undefined {
  return $workspaceStore.getValue().paneBgColors[paneId];
}

export function usePaneBgColors() {
  const [paneBgColors] = useDeepSubject($workspaceStore, "paneBgColors");
  return paneBgColors;
}

// --- Read helpers ---

export function getActiveLayout(): LayoutNode | null {
  const s = $workspaceStore.getValue();
  const tab = s.tabs.find((t) => t.id === s.activeTabId);
  return tab?.rootNode ?? null;
}

export function getAllActivePaneIds(): string[] {
  const s = $workspaceStore.getValue();
  const layout = getActiveLayout();
  const treeIds = layout ? getAllPaneIds(layout) : [];
  const floatIds = s.floatingPanes.map((fp) => fp.paneId);
  return [...treeIds, ...floatIds];
}

export function getAllPaneIdsAcrossTabs(): string[] {
  const s = $workspaceStore.getValue();
  const ids: string[] = [];
  for (const tab of s.tabs) {
    ids.push(...getAllPaneIds(tab.rootNode));
  }
  for (const fp of s.floatingPanes) {
    ids.push(fp.paneId);
  }
  return ids;
}

/** Only panes docked in the layout tree (excludes floating) */
export function getDockedPaneIdsAcrossTabs(): string[] {
  const s = $workspaceStore.getValue();
  const ids: string[] = [];
  for (const tab of s.tabs) {
    ids.push(...getAllPaneIds(tab.rootNode));
  }
  return ids;
}

// --- React hooks ---

export function useActivePaneId() {
  const [activePaneId] = useDeepSubject($workspaceStore, "activePaneId");
  return activePaneId;
}

export function useActiveTabId() {
  const [activeTabId] = useDeepSubject($workspaceStore, "activeTabId");
  return activeTabId;
}

export function useTabs() {
  const [tabs] = useDeepSubject($workspaceStore, "tabs");
  return tabs;
}

export function useViewMode() {
  const [viewMode] = useDeepSubject($workspaceStore, "viewMode");
  return viewMode;
}

export function useFloatingPanes() {
  const [floatingPanes] = useDeepSubject($workspaceStore, "floatingPanes");
  return floatingPanes;
}

export function useProjects() {
  const [projects] = useDeepSubject($workspaceStore, "projects");
  return projects;
}

export function useSidebarOpen() {
  const [sidebarOpen] = useDeepSubject($workspaceStore, "sidebarOpen");
  return sidebarOpen;
}
