import { useCallback, useEffect, useMemo, useState } from "react";
import { TabBar } from "./TabBar";
import { SplitPane } from "./SplitPane";
import { GridView } from "./GridView";
import { StatusBar } from "./StatusBar";
import {
  Tooltip as ShadTooltip,
  TooltipTrigger as ShadTooltipTrigger,
  TooltipContent as ShadTooltipContent,
} from "@/components/ui/tooltip";
import { AgentConfigModal } from "../agent/AgentConfigModal";
import { CommandBar } from "../input/CommandBar";
import { PipeModal } from "../input/PipeModal";
import { WorkspaceManager } from "../workspace/WorkspaceManager";
import { SessionHistory } from "../workspace/SessionHistory";
import { SettingsModal } from "../workspace/SettingsModal";
import { HelpOverlay } from "../help/HelpOverlay";
import { Tooltip } from "../help/Tooltip";
import {
  useActivePaneId,
  useTabs,
  useActiveTabId,
  useViewMode,
  splitPane,
  closePane,
  addTab,
  getAllActivePaneIds,
  setActivePane,
  setActiveTab,
  toggleViewMode,
  workspaceStore$,
} from "../../stores/useWorkspaceStore";
import { increaseFont, decreaseFont } from "../../stores/useSettingsStore";
import {
  createAgent,
  removeAgent,
  agentStore$,
} from "../../stores/useAgentStore";
import { addPipe } from "../../stores/usePipeStore";
import { spawnAgent } from "../../lib/tauri-commands";
import { createAgentConfig } from "../../lib/agent-registry";
import { loadState } from "../../lib/persistence";
import type { AgentConfig } from "../../types/agent";
import type { Direction } from "../../types/layout";

type PendingAction =
  | { kind: "split"; direction: Direction }
  | { kind: "tab" }
  | null;

export function AppShell() {
  const tabs = useTabs();
  const activeTabId = useActiveTabId();
  const layout = useMemo(() => {
    const tab = tabs.find((t) => t.id === activeTabId);
    return tab?.rootNode ?? null;
  }, [tabs, activeTabId]);
  const activePaneId = useActivePaneId();
  const viewMode = useViewMode();

  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showCommandBar, setShowCommandBar] = useState(false);
  const [showPipeModal, setShowPipeModal] = useState(false);
  const [showWorkspaceManager, setShowWorkspaceManager] = useState(false);
  const [showSessionHistory, setShowSessionHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  // Restore persisted agents on mount, or spawn a fresh shell
  useEffect(() => {
    const persisted = loadState();
    const agents = agentStore$.getValue().agents;

    if (persisted && persisted.agents.length > 0) {
      // Re-spawn all persisted agents
      for (const pa of persisted.agents) {
        if (agents[pa.paneId]) continue; // already alive
        const config = pa.config;
        agents[pa.paneId] = {
          id: pa.paneId,
          config,
          state: "idle",
          backendId: null,
          createdAt: Date.now(),
        };
        spawnAgent(config).then((backendId) => {
          const agent = agentStore$.getValue().agents[pa.paneId];
          if (agent) {
            agent.backendId = backendId;
            agent.state = "running";
          }
        }).catch(() => {
          const agent = agentStore$.getValue().agents[pa.paneId];
          if (agent) agent.state = "error";
        });
      }
    } else {
      // First launch — spawn a single shell
      const initialPaneId = "pane-initial";
      if (!agents[initialPaneId]) {
        const config = createAgentConfig("shell");
        agents[initialPaneId] = {
          id: initialPaneId,
          config,
          state: "idle",
          backendId: null,
          createdAt: Date.now(),
        };
        spawnAgent(config).then((backendId) => {
          const agent = agentStore$.getValue().agents[initialPaneId];
          if (agent) {
            agent.backendId = backendId;
            agent.state = "running";
          }
        });
      }
    }
  }, []);

  const openAgentModalFor = useCallback((action: PendingAction) => {
    setPendingAction(action);
    setShowAgentModal(true);
  }, []);

  const handleAgentSubmit = useCallback(
    async (config: AgentConfig) => {
      setShowAgentModal(false);
      const session = await createAgent(config);
      if (pendingAction?.kind === "split") {
        splitPane(activePaneId, pendingAction.direction, session.id);
      } else if (pendingAction?.kind === "tab") {
        addTab(session.id);
      }
      setPendingAction(null);
    },
    [pendingAction, activePaneId]
  );

  const handleQuickShell = useCallback(
    async (direction: Direction) => {
      const config = createAgentConfig("shell");
      const session = await createAgent(config);
      splitPane(activePaneId, direction, session.id);
    },
    [activePaneId]
  );

  const handleNewShellTab = useCallback(async () => {
    const config = createAgentConfig("shell");
    const session = await createAgent(config);
    addTab(session.id);
  }, []);

  const handleClosePane = useCallback(() => {
    removeAgent(activePaneId);
    closePane(activePaneId);
  }, [activePaneId]);

  const handlePipeSubmit = useCallback(
    (sourcePaneId: string, targetPaneId: string) => {
      addPipe(sourcePaneId, targetPaneId);
      setShowPipeModal(false);
    },
    []
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+?: toggle help
      if (e.metaKey && (e.key === "?" || (e.shiftKey && e.key === "/"))) {
        e.preventDefault();
        setShowHelp((v) => !v);
        return;
      }
      // Cmd+K: toggle command bar
      if (e.metaKey && e.key === "k") {
        e.preventDefault();
        setShowCommandBar((v) => !v);
        return;
      }
      // Cmd+= / Cmd+-: font size
      if (e.metaKey && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        increaseFont();
        return;
      }
      if (e.metaKey && e.key === "-") {
        e.preventDefault();
        decreaseFont();
        return;
      }
      // Cmd+,: settings
      if (e.metaKey && e.key === ",") {
        e.preventDefault();
        setShowSettings((v) => !v);
        return;
      }
      // Don't process other shortcuts when command bar or modals are open
      if (showCommandBar || showAgentModal || showPipeModal || showWorkspaceManager || showSessionHistory || showSettings || showHelp) return;

      // Cmd+F: search in active terminal (dispatched via custom event)
      if (e.metaKey && e.key === "f") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("terminator:search", { detail: { paneId: activePaneId } }));
        return;
      }
      // Cmd+S: workspace manager
      if (e.metaKey && e.key === "s") {
        e.preventDefault();
        setShowWorkspaceManager(true);
        return;
      }
      // Cmd+H: session history
      if (e.metaKey && e.key === "h") {
        e.preventDefault();
        setShowSessionHistory(true);
        return;
      }

      // Cmd+G: toggle grid view
      if (e.metaKey && e.key === "g") {
        e.preventDefault();
        toggleViewMode();
        return;
      }
      // Cmd+D: quick split shell horizontal, Cmd+Shift+D: vertical
      if (e.metaKey && e.key === "d") {
        e.preventDefault();
        handleQuickShell(e.shiftKey ? "vertical" : "horizontal");
      }
      // Cmd+W: close pane
      if (e.metaKey && e.key === "w") {
        e.preventDefault();
        handleClosePane();
      }
      // Cmd+T: new shell tab
      if (e.metaKey && e.key === "t") {
        e.preventDefault();
        handleNewShellTab();
      }
      // Cmd+N: open agent picker
      if (e.metaKey && e.key === "n") {
        e.preventDefault();
        openAgentModalFor({ kind: "split", direction: "horizontal" });
      }
      // Cmd+P: open pipe modal
      if (e.metaKey && e.key === "p") {
        e.preventDefault();
        setShowPipeModal(true);
      }
      // Cmd+[ / Cmd+]: cycle panes
      if (e.metaKey && !e.shiftKey && (e.key === "[" || e.key === "]")) {
        e.preventDefault();
        const paneIds = getAllActivePaneIds();
        const currentIdx = paneIds.indexOf(activePaneId);
        if (paneIds.length > 1) {
          const delta = e.key === "]" ? 1 : -1;
          const nextIdx = (currentIdx + delta + paneIds.length) % paneIds.length;
          setActivePane(paneIds[nextIdx]);
        }
      }
      // Cmd+Shift+[ / Cmd+Shift+]: cycle tabs
      if (e.metaKey && e.shiftKey && (e.key === "{" || e.key === "}")) {
        e.preventDefault();
        const storeTabs = workspaceStore$.getValue().tabs;
        const storeActiveTabId = workspaceStore$.getValue().activeTabId;
        const currentIdx = storeTabs.findIndex((t) => t.id === storeActiveTabId);
        if (storeTabs.length > 1) {
          const delta = e.key === "}" ? 1 : -1;
          const nextIdx = (currentIdx + delta + storeTabs.length) % storeTabs.length;
          setActiveTab(storeTabs[nextIdx].id);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleQuickShell,
    handleClosePane,
    handleNewShellTab,
    openAgentModalFor,
    activePaneId,
    showCommandBar,
    showAgentModal,
    showPipeModal,
    showWorkspaceManager,
    showSessionHistory,
    showSettings,
    showHelp,
  ]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
        backgroundColor: "#1a1b26",
        overflow: "hidden",
      }}
    >
      {viewMode === "tabs" && <TabBar onNewTab={handleNewShellTab} />}

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          backgroundColor: "#16161e",
          borderBottom: "1px solid #292e42",
        }}
      >
        <ToolButton
          label="Split ―"
          shortcut="⌘D"
          onClick={() => handleQuickShell("horizontal")}
        />
        <ToolButton
          label="Split |"
          shortcut="⇧⌘D"
          onClick={() => handleQuickShell("vertical")}
        />
        <div style={{ width: 1, height: 16, backgroundColor: "#292e42" }} />
        <ToolButton
          label="+ Agent"
          shortcut="⌘N"
          accent
          onClick={() => openAgentModalFor({ kind: "split", direction: "horizontal" })}
        />
        <ToolButton
          label="Pipe"
          shortcut="⌘P"
          onClick={() => setShowPipeModal(true)}
        />
        <ToolButton
          label={viewMode === "grid" ? "Tabs" : "Grid"}
          shortcut="⌘G"
          accent={viewMode === "grid"}
          onClick={toggleViewMode}
        />
        <ToolButton
          label="Cmd Bar"
          shortcut="⌘K"
          onClick={() => setShowCommandBar((v) => !v)}
        />
        <div style={{ width: 1, height: 16, backgroundColor: "#292e42" }} />
        <ToolButton
          label="Spaces"
          shortcut="⌘S"
          onClick={() => setShowWorkspaceManager(true)}
        />
        <ToolButton
          label="History"
          shortcut="⌘H"
          onClick={() => setShowSessionHistory(true)}
        />
        <div style={{ width: 1, height: 16, backgroundColor: "#292e42" }} />
        <ToolButton
          label="Settings"
          shortcut="⌘,"
          onClick={() => setShowSettings(true)}
        />
        <div style={{ flex: 1 }} />
        <Tooltip helpId="close-pane">
          <ToolButton label="Close" shortcut="⌘W" onClick={handleClosePane} />
        </Tooltip>
        <ToolButton
          label="?"
          shortcut="⌘?"
          onClick={() => setShowHelp(true)}
        />
      </div>

      {/* Layout area */}
      <div style={{ flex: 1, overflow: "hidden", padding: 2 }}>
        {viewMode === "grid" ? (
          <GridView />
        ) : (
          layout && <SplitPane node={layout} />
        )}
      </div>

      <StatusBar />

      {/* Command bar */}
      <CommandBar
        visible={showCommandBar}
        onClose={() => setShowCommandBar(false)}
      />

      {/* Agent config modal */}
      {showAgentModal && (
        <AgentConfigModal
          onSubmit={handleAgentSubmit}
          onCancel={() => {
            setShowAgentModal(false);
            setPendingAction(null);
          }}
        />
      )}

      {/* Pipe modal */}
      {showPipeModal && (
        <PipeModal
          onSubmit={handlePipeSubmit}
          onCancel={() => setShowPipeModal(false)}
        />
      )}

      {/* Workspace manager */}
      {showWorkspaceManager && (
        <WorkspaceManager onClose={() => setShowWorkspaceManager(false)} />
      )}

      {/* Session history */}
      {showSessionHistory && (
        <SessionHistory onClose={() => setShowSessionHistory(false)} />
      )}

      {/* Settings */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {/* Help */}
      {showHelp && (
        <HelpOverlay onClose={() => setShowHelp(false)} />
      )}
    </div>
  );
}

function ToolButton({
  label,
  shortcut,
  accent,
  onClick,
}: {
  label: string;
  shortcut?: string;
  accent?: boolean;
  onClick: () => void;
}) {
  const btnStyle: React.CSSProperties = {
    background: accent ? "#7aa2f720" : "none",
    border: `1px solid ${accent ? "#7aa2f740" : "#292e42"}`,
    color: accent ? "#7aa2f7" : "#a9b1d6",
    fontSize: 15,
    fontFamily: "monospace",
    padding: "3px 10px",
    borderRadius: 4,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 6,
  };

  if (!shortcut) {
    return (
      <button onClick={onClick} style={btnStyle}>
        {label}
      </button>
    );
  }

  return (
    <ShadTooltip>
      <ShadTooltipTrigger render={<button onClick={onClick} style={btnStyle} />}>
        {label}
      </ShadTooltipTrigger>
      <ShadTooltipContent side="bottom">
        <kbd data-slot="kbd" className="inline-flex items-center rounded border border-border bg-muted px-2 py-1 font-mono text-xs font-medium text-muted-foreground">
          {shortcut}
        </kbd>
      </ShadTooltipContent>
    </ShadTooltip>
  );
}
