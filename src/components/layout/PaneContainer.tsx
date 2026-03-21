import { useRef, useState, useEffect, type ReactNode } from "react";
import { Search, Download, X, ExternalLink, MonitorUp } from "lucide-react";
import { TerminalView, type TerminalViewHandle } from "../terminal/TerminalView";
import { EditorPane } from "../editor/EditorPane";
import { AgentBadge } from "../agent/AgentBadge";

import { PipeIndicator } from "../input/PipeIndicator";
import { ExportDialog } from "../workspace/ExportDialog";
import { useAgent, useAgents, removeAgent, spawnAgentInPane } from "../../stores/useAgentStore";
import {
  useActivePaneId,
  setActivePane,
  closePane,
  detachPane,
  detachPaneToWindow,
  getAllPaneIdsAcrossTabs,
  usePaneBgColors,
  useProjects,
  useEditorPane,
} from "../../stores/useWorkspaceStore";
import { PaneBgColorPicker } from "./PaneBgColorPicker";
import { createAgentConfig, AGENT_REGISTRY, AGENT_ICONS } from "../../lib/agent-registry";
interface PaneContainerProps {
  paneId: string;
  isFloating?: boolean;
  onDragStart?: (paneId: string, x: number, y: number) => void;
}

export function PaneContainer({ paneId, isFloating, onDragStart }: PaneContainerProps) {
  const agent = useAgent(paneId);
  const agents = useAgents();
  const activePaneId = useActivePaneId();
  const isActive = activePaneId === paneId;
  const paneBgColors = usePaneBgColors();
  const projects = useProjects();
  const projectBgColor = projects.find((p) => p.paneIds.includes(paneId))?.defaultBgColor;
  const paneBgColor = paneBgColors[paneId] || projectBgColor;
  const terminalRef = useRef<TerminalViewHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [exportContent, setExportContent] = useState<string | null>(null);
  const editorInfo = useEditorPane(paneId);

  // Auto-spawn shell in empty pane when other agents are running
  useEffect(() => {
    if (editorInfo) return; // Editor pane — don't auto-spawn
    if (agent) return; // This pane has an agent, nothing to do
    // Don't spawn if this pane has been removed from the layout (closing in progress)
    if (!getAllPaneIdsAcrossTabs().includes(paneId)) return;
    const otherAgents = Object.keys(agents).filter((id) => id !== paneId);
    if (otherAgents.length === 0) return; // No other agents, keep the welcome screen
    // Instead of showing welcome screen, auto-spawn a shell
    const config = createAgentConfig("shell");
    spawnAgentInPane(paneId, config);
  }, [agent, agents, paneId, editorInfo]);

  // Auto-close pane when agent process exits
  useEffect(() => {
    if (agent?.state !== "done") return;
    const allPaneIds = getAllPaneIdsAcrossTabs();
    if (allPaneIds.length > 1) {
      // Other panes exist — close this one
      closePane(paneId);
      removeAgent(paneId);
    } else {
      // Last pane — just remove the agent to show welcome screen
      removeAgent(paneId);
    }
  }, [agent?.state, paneId]);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    closePane(paneId);
    removeAgent(paneId);
  };

  const handleSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    terminalRef.current?.toggleSearch();
  };

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    const content = terminalRef.current?.getBufferContent() ?? "";
    setExportContent(content);
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={() => setActivePane(paneId)}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        border: `1px solid ${isActive && agent ? "#7aa2f7" : "#292e42"}`,
        borderRadius: isFloating ? 0 : 4,
        overflow: "hidden",
        backgroundColor: paneBgColor || "#1a1b26",
        position: "relative",
      }}
    >

      {/* Pane header — only shown when an agent is running */}
      {!isFloating && agent && (
        <div
          onMouseDown={(e) => {
            if (e.button !== 0 || !onDragStart) return;
            // Don't start drag if clicking on a button/icon
            const target = e.target as HTMLElement;
            if (target.closest("button")) return;
            e.preventDefault();
            e.stopPropagation();
            onDragStart(paneId, e.clientX, e.clientY);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "4px 8px",
            backgroundColor: "#16161e",
            borderBottom: "1px solid #292e42",
            minHeight: 28,
            userSelect: "none",
            cursor: onDragStart ? "grab" : undefined,
          }}
        >
          <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
            {agent ? (
              <AgentBadge
                state={agent.state}
                label={agent.config.label}
                ptyActivity={agent.ptyActivity}
              />
            ) : (
              <span style={{ fontSize: 12, color: "#565f89", fontFamily: "monospace" }}>Terminator</span>
            )}
            <PipeIndicator paneId={paneId} />
          </div>
          <div
            onMouseDown={(e) => { e.stopPropagation(); }}
            style={{ display: "flex", gap: 0, alignItems: "center", cursor: "default" }}
          >
            <PaneBgColorPicker paneId={paneId} currentColor={paneBgColor} />
            <HeaderBtn title="Detach to floating window" onClick={(e) => { e.stopPropagation(); detachPane(paneId); }}><ExternalLink size={14} /></HeaderBtn>
            <HeaderBtn title="Detach to new window" onClick={(e) => { e.stopPropagation(); detachPaneToWindow(paneId); }}><MonitorUp size={14} /></HeaderBtn>
            <HeaderBtn title="Search (⌘F)" onClick={handleSearch}><Search size={16} /></HeaderBtn>
            <HeaderBtn title="Export output" onClick={handleExport}><Download size={16} /></HeaderBtn>
            <HeaderBtn title="Close pane" onClick={handleClose}><X size={16} /></HeaderBtn>
          </div>
        </div>
      )}

      {/* Editor / Terminal / Welcome */}
      {editorInfo ? (
        <EditorPane paneId={paneId} filePath={editorInfo.filePath} />
      ) : agent ? (
        <div style={{ flex: 1, overflow: "hidden", padding: "4px 6px" }}>
          <TerminalView
            ref={terminalRef}
            paneId={paneId}
            agentBackendId={agent.backendId}
            agentType={agent.config.agent_type}
            bgColor={paneBgColor}
          />
        </div>
      ) : (
        <WelcomeScreen paneId={paneId} />
      )}

      {/* Export dialog */}
      {exportContent !== null && (
        <ExportDialog
          content={exportContent}
          defaultName={`${agent?.config.label ?? "output"}-${paneId}`}
          onClose={() => setExportContent(null)}
        />
      )}
    </div>
  );
}


function HeaderBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: (e: React.MouseEvent) => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#a9b1d6"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#565f89"; }}
      style={{
        background: "none",
        border: "none",
        color: "#565f89",
        cursor: "pointer",
        padding: "0 4px",
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        transition: "color 0.15s ease",
      }}
    >
      {children}
    </button>
  );
}

const agentIcons: Record<string, ReactNode> = Object.fromEntries(
  Object.entries(AGENT_ICONS).map(([type, Icon]) => [type, <Icon key={type} size={20} />])
);

function WelcomeScreen({ paneId }: { paneId: string }) {
  const handleSpawn = async (type: string) => {
    const config = createAgentConfig(type as keyof typeof AGENT_REGISTRY);
    await spawnAgentInPane(paneId, config);
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        backgroundColor: "#1a1b26",
        padding: 32,
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: "#c0caf5",
            margin: "0 0 6px",
            fontFamily: "monospace",
          }}
        >
          Terminator
        </h2>
        <p style={{ fontSize: 12, color: "#565f89", margin: 0, fontFamily: "monospace" }}>
          Launch a session to get started
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 8,
          width: "100%",
          maxWidth: 320,
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
              padding: "10px 14px",
              backgroundColor: "#16161e",
              border: "1px solid #292e42",
              borderRadius: 6,
              color: "#a9b1d6",
              fontSize: 12,
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
              {agentIcons[def.type]}
            </span>
            <div>
              <div style={{ fontWeight: 600, color: "#c0caf5", fontSize: 13 }}>{def.label}</div>
              <div style={{ fontSize: 10, color: "#565f89", marginTop: 2 }}>{def.description}</div>
            </div>
          </button>
        ))}
      </div>

      <div style={{ fontSize: 10, color: "#414868", fontFamily: "monospace", textAlign: "center" }}>
        <span style={{ color: "#565f89" }}>Tip:</span> ⌘D split horizontal · ⇧⌘D split vertical · ⌘T new tab
      </div>
    </div>
  );
}
