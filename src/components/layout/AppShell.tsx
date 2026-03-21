import { useCallback, useEffect, useState, type ReactNode } from "react";
import { GridView } from "./GridView";
import { FloatingPane } from "./FloatingPane";
import { CollapsedBar } from "./CollapsedBar";
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
import { SettingsModal } from "../workspace/SettingsModal";
import { HelpOverlay } from "../help/HelpOverlay";
import { DebugBar } from "./DebugBar";
import { ProjectSidebar } from "./ProjectSidebar";
import { ProcessesView } from "./ProcessesView";

import {
  useActivePaneId,
  useFloatingPanes,
  closePane,
  addTab,
  splitPane,
  getAllActivePaneIds,
  getAllPaneIdsAcrossTabs,
  setActivePane,
  useSidebarOpen,
  toggleSidebar,
} from "../../stores/useWorkspaceStore";
import { increaseFont, decreaseFont } from "../../stores/useSettingsStore";
import {
  createAgent,
  removeAgent,
  $agentStore,
  useAgents,
} from "../../stores/useAgentStore";
import { addPipe } from "../../stores/usePipeStore";
import { spawnAgent } from "../../lib/tauri-commands";
import { createAgentConfig, AGENT_REGISTRY, AGENT_ICONS } from "../../lib/agent-registry";
import { loadState } from "../../lib/persistence";
import { installCli } from "../../lib/tauri-commands";
import { listen } from "@tauri-apps/api/event";
import type { AgentConfig } from "../../types/agent";
export function AppShell() {
  const activePaneId = useActivePaneId();
  const floatingPanes = useFloatingPanes();
  const sidebarOpen = useSidebarOpen();
  const agents = useAgents();
  const hasAgents = Object.keys(agents).length > 0;

  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showCommandBar, setShowCommandBar] = useState(false);
  const [showPipeModal, setShowPipeModal] = useState(false);
  const [showWorkspaceManager, setShowWorkspaceManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showProcesses, setShowProcesses] = useState(false);

  // Listen for reattach events from detached windows
  useEffect(() => {
    const unlisten = listen<{
      paneId: string;
      backendId: string;
      agentConfig: AgentConfig;
      bgColor: string | null;
    }>("detached:reattach", (event) => {
      const { paneId, backendId, agentConfig, bgColor } = event.payload;
      // Re-register agent in the store
      $agentStore.getValue().agents[paneId] = {
        id: paneId,
        config: agentConfig,
        state: "running",
        backendId,
        createdAt: Date.now(),
        ptyActivity: "idle",
      };
      // Restore bg color
      if (bgColor) {
        import("../../stores/useWorkspaceStore").then(({ setPaneBgColor }) => {
          setPaneBgColor(paneId, bgColor);
        });
      }
      // Add as a split on the active pane
      const newPaneId = paneId;
      const currentActive = $agentStore.getValue().agents[activePaneId]
        ? activePaneId
        : getAllActivePaneIds()[0];
      if (currentActive && currentActive !== newPaneId) {
        splitPane(currentActive, "horizontal", newPaneId);
      } else {
        addTab(newPaneId);
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [activePaneId]);

  // Listen for project reattach events from detached project windows
  useEffect(() => {
    const unlisten = listen<{
      projectId: string;
      panes: Array<{
        paneId: string;
        backendId: string;
        agentConfig: AgentConfig;
        bgColor: string;
      }>;
    }>("detached-project:reattach", (event) => {
      const { panes } = event.payload;
      for (const pane of panes) {
        // Re-register agent in the store
        $agentStore.getValue().agents[pane.paneId] = {
          id: pane.paneId,
          config: pane.agentConfig,
          state: "running",
          backendId: pane.backendId,
          createdAt: Date.now(),
          ptyActivity: "idle",
        };
        // Restore bg color
        if (pane.bgColor) {
          import("../../stores/useWorkspaceStore").then(({ setPaneBgColor }) => {
            setPaneBgColor(pane.paneId, pane.bgColor);
          });
        }
        // Add pane to layout
        const currentActive = $agentStore.getValue().agents[activePaneId]
          ? activePaneId
          : getAllActivePaneIds()[0];
        if (currentActive && currentActive !== pane.paneId) {
          splitPane(currentActive, "horizontal", pane.paneId);
        } else {
          addTab(pane.paneId);
        }
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [activePaneId]);

  // Install CLI helper and sync project tasks to disk on mount
  useEffect(() => {
    installCli().catch(() => {});
    // Re-sync all project tasks to disk (ensures name-based folders)
    import("../../stores/useWorkspaceStore").then(({ syncAllProjectsToDisk }) => {
      syncAllProjectsToDisk();
    });
  }, []);

  // Restore persisted agents on mount, or spawn a fresh shell
  useEffect(() => {
    const persisted = loadState();
    const agents = $agentStore.getValue().agents;

    if (persisted && persisted.agents.length > 0) {
      const layoutPaneIds = new Set(getAllPaneIdsAcrossTabs());
      const persistedByPaneId = new Map(persisted.agents.map((pa) => [pa.paneId, pa]));

      // Restore agents whose paneId exists in the current layout
      for (const pa of persisted.agents) {
        if (agents[pa.paneId]) continue; // already alive
        if (!layoutPaneIds.has(pa.paneId)) continue; // stale — pane no longer in layout
        const config = pa.config;
        agents[pa.paneId] = {
          id: pa.paneId,
          config,
          state: "idle",
          backendId: null,
          createdAt: Date.now(),
          ptyActivity: "idle",
        };
        spawnAgent(config).then((backendId) => {
          const agent = $agentStore.getValue().agents[pa.paneId];
          if (agent) {
            agent.backendId = backendId;
            agent.state = "running";
          }
        }).catch(() => {
          const agent = $agentStore.getValue().agents[pa.paneId];
          if (agent) agent.state = "error";
        });
      }

      // Spawn a fresh shell for any layout pane that has no persisted agent
      for (const paneId of layoutPaneIds) {
        if (agents[paneId] || persistedByPaneId.has(paneId)) continue;
        const config = createAgentConfig("shell");
        agents[paneId] = {
          id: paneId,
          config,
          state: "idle",
          backendId: null,
          createdAt: Date.now(),
          ptyActivity: "idle",
        };
        spawnAgent(config).then((backendId) => {
          const agent = $agentStore.getValue().agents[paneId];
          if (agent) {
            agent.backendId = backendId;
            agent.state = "running";
          }
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
          ptyActivity: "idle",
        };
        spawnAgent(config).then((backendId) => {
          const agent = $agentStore.getValue().agents[initialPaneId];
          if (agent) {
            agent.backendId = backendId;
            agent.state = "running";
          }
        });
      }
    }
  }, []);

  const handleAgentSubmit = useCallback(
    async (config: AgentConfig) => {
      setShowAgentModal(false);
      const session = await createAgent(config);
      addTab(session.id);
    },
    []
  );

  const handleNewShell = useCallback(async () => {
    const config = createAgentConfig("shell");
    const session = await createAgent(config);
    addTab(session.id);
  }, []);

  const handleClosePane = useCallback(() => {
    closePane(activePaneId);
    removeAgent(activePaneId);
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
      // Cmd+B: toggle sidebar
      if (e.metaKey && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      // Cmd+,: settings
      if (e.metaKey && e.key === ",") {
        e.preventDefault();
        setShowSettings((v) => !v);
        return;
      }
      // Don't process other shortcuts when command bar or modals are open
      if (showCommandBar || showAgentModal || showPipeModal || showWorkspaceManager || showSettings || showHelp) return;

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
      // Cmd+W: close pane
      if (e.metaKey && e.key === "w") {
        e.preventDefault();
        handleClosePane();
      }
      // Cmd+T / Cmd+D: new shell agent
      if (e.metaKey && (e.key === "t" || e.key === "d")) {
        e.preventDefault();
        handleNewShell();
      }
      // Cmd+N: open agent picker
      if (e.metaKey && e.key === "n") {
        e.preventDefault();
        setShowAgentModal(true);
      }
      // Cmd+Shift+P: toggle processes view
      if (e.metaKey && e.shiftKey && e.key === "p") {
        e.preventDefault();
        setShowProcesses((v) => !v);
        return;
      }
      // Cmd+P: open pipe modal
      if (e.metaKey && e.key === "p") {
        e.preventDefault();
        setShowPipeModal(true);
      }
      // Cmd+[ / Cmd+]: cycle panes
      if (e.metaKey && (e.key === "[" || e.key === "]")) {
        e.preventDefault();
        const paneIds = getAllActivePaneIds();
        const currentIdx = paneIds.indexOf(activePaneId);
        if (paneIds.length > 1) {
          const delta = e.key === "]" ? 1 : -1;
          const nextIdx = (currentIdx + delta + paneIds.length) % paneIds.length;
          setActivePane(paneIds[nextIdx]);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleClosePane,
    handleNewShell,
    activePaneId,
    showCommandBar,
    showAgentModal,
    showPipeModal,
    showWorkspaceManager,
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
          label="Projects"
          shortcut="⌘B"
          onClick={() => toggleSidebar()}
        />
        <div style={{ width: 1, height: 16, backgroundColor: "#292e42" }} />
        <ToolButton
          label="+ Agent"
          shortcut="⌘N"
          accent
          onClick={() => setShowAgentModal(true)}
        />
        <ToolButton
          label="Pipe"
          shortcut="⌘P"
          onClick={() => setShowPipeModal(true)}
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
          label="Processes"
          shortcut="⌘⇧P"
          onClick={() => setShowProcesses((v) => !v)}
        />
        <div style={{ width: 1, height: 16, backgroundColor: "#292e42" }} />
        <ToolButton
          label="Settings"
          shortcut="⌘,"
          onClick={() => setShowSettings(true)}
        />
        <div style={{ flex: 1 }} />
        <ToolButton
          label="?"
          shortcut="⌘?"
          onClick={() => setShowHelp(true)}
        />
      </div>

      {/* Main content: sidebar + layout */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {sidebarOpen && <ProjectSidebar />}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {hasAgents ? <GridView /> : <GlobalWelcome />}
          {showProcesses && (
            <div style={{
              position: "absolute",
              inset: 0,
              zIndex: 10,
              backgroundColor: "#1a1b26",
            }}>
              <ProcessesView onClose={() => setShowProcesses(false)} />
            </div>
          )}
        </div>
      </div>

      {/* Floating panes */}
      {floatingPanes
        .filter((fp) => !fp.collapsed)
        .map((fp) => (
          <FloatingPane key={fp.paneId} state={fp} />
        ))}

      <CollapsedBar />
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
          onCancel={() => setShowAgentModal(false)}
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

      {/* Settings */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {/* Help */}
      {showHelp && (
        <HelpOverlay onClose={() => setShowHelp(false)} />
      )}

      {/* Dev debug bar */}
      <DebugBar />
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
      <ShadTooltipContent side="bottom" sideOffset={8}>
        {shortcut}
      </ShadTooltipContent>
    </ShadTooltip>
  );
}

const welcomeIcons: Record<string, ReactNode> = Object.fromEntries(
  Object.entries(AGENT_ICONS).map(([type, Icon]) => [type, <Icon key={type} size={20} />])
);

function GlobalWelcome() {
  const handleSpawn = async (type: string) => {
    const config = createAgentConfig(type as any);
    const session = await createAgent(config);
    const { addTab } = await import("../../stores/useWorkspaceStore");
    addTab(session.id);
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        backgroundColor: "#1a1b26",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 600,
            color: "#c0caf5",
            margin: "0 0 8px",
            fontFamily: "monospace",
          }}
        >
          Terminator
        </h2>
        <p style={{ fontSize: 13, color: "#565f89", margin: 0, fontFamily: "monospace" }}>
          Launch a session to get started
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 10,
          width: "100%",
          maxWidth: 360,
        }}
      >
        {Object.values(AGENT_REGISTRY).map((def) => (
          <button
            key={def.type}
            onClick={() => handleSpawn(def.type)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              backgroundColor: "#16161e",
              border: "1px solid #292e42",
              borderRadius: 8,
              color: "#a9b1d6",
              fontSize: 13,
              fontFamily: "monospace",
              cursor: "pointer",
              textAlign: "left",
              transition: "border-color 0.15s, background-color 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = def.color;
              (e.currentTarget as HTMLElement).style.backgroundColor = "#1a1b26";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = "#292e42";
              (e.currentTarget as HTMLElement).style.backgroundColor = "#16161e";
            }}
          >
            <span style={{ color: def.color }}>
              {welcomeIcons[def.type]}
            </span>
            <div>
              <div style={{ fontWeight: 600, color: "#c0caf5" }}>{def.label}</div>
              <div style={{ fontSize: 11, color: "#565f89", marginTop: 2 }}>{def.description}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: "#414868", fontFamily: "monospace" }}>
        <span style={{ color: "#565f89" }}>Tip:</span> ⌘D split · ⇧⌘D vertical · ⌘T new tab
      </div>
    </div>
  );
}
