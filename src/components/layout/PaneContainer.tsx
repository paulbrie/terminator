import { useRef, useState, useCallback } from "react";
import { TerminalView, type TerminalViewHandle } from "../terminal/TerminalView";
import { AgentBadge } from "../agent/AgentBadge";
import { AgentStatusBar } from "../agent/AgentStatusBar";
import { PipeIndicator } from "../input/PipeIndicator";
import { ExportDialog } from "../workspace/ExportDialog";
import { useAgent, removeAgent } from "../../stores/useAgentStore";
import {
  useActivePaneId,
  setActivePane,
  closePane,
  movePaneTo,
  swapPanesAction,
} from "../../stores/useWorkspaceStore";
import {
  setDragData,
  getDragData,
  computeDropZone,
  dropZoneToDirection,
  shouldInsertBefore,
  type DropZone,
} from "../../lib/drag-manager";

interface PaneContainerProps {
  paneId: string;
}

const dropZoneStyles: Record<DropZone, React.CSSProperties> = {
  left: { left: 0, top: 0, width: "50%", height: "100%" },
  right: { right: 0, top: 0, width: "50%", height: "100%" },
  top: { left: 0, top: 0, width: "100%", height: "50%" },
  bottom: { left: 0, bottom: 0, width: "100%", height: "50%" },
  center: { inset: 0 },
};

export function PaneContainer({ paneId }: PaneContainerProps) {
  const agent = useAgent(paneId);
  const activePaneId = useActivePaneId();
  const isActive = activePaneId === paneId;
  const terminalRef = useRef<TerminalViewHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [exportContent, setExportContent] = useState<string | null>(null);
  const [dropZone, setDropZone] = useState<DropZone | null>(null);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    removeAgent(paneId);
    closePane(paneId);
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

  // Drag source: the header is the drag handle
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      setDragData(e.nativeEvent, { sourcePaneId: paneId });
      // Ghost image
      if (e.dataTransfer) {
        const ghost = document.createElement("div");
        ghost.textContent = agent?.config.label ?? paneId;
        ghost.style.cssText =
          "padding:4px 12px;background:#7aa2f7;color:#1a1b26;border-radius:4px;font-size:12px;font-family:monospace;position:fixed;top:-100px";
        document.body.appendChild(ghost);
        e.dataTransfer.setDragImage(ghost, 0, 0);
        setTimeout(() => document.body.removeChild(ghost), 0);
      }
    },
    [paneId, agent]
  );

  // Drop target: the whole pane
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        setDropZone(computeDropZone(e.nativeEvent, rect));
      }
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDropZone(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDropZone(null);

      const data = getDragData(e.nativeEvent);
      if (!data || data.sourcePaneId === paneId) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const zone = computeDropZone(e.nativeEvent, rect);
      const direction = dropZoneToDirection(zone);

      if (direction) {
        movePaneTo(data.sourcePaneId, paneId, direction, shouldInsertBefore(zone));
      } else {
        // Center drop = swap
        swapPanesAction(data.sourcePaneId, paneId);
      }
    },
    [paneId]
  );

  return (
    <div
      ref={containerRef}
      onMouseDown={() => setActivePane(paneId)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        border: `1px solid ${isActive ? "#7aa2f7" : "#292e42"}`,
        borderRadius: 4,
        overflow: "hidden",
        backgroundColor: "#1a1b26",
        position: "relative",
      }}
    >
      {/* Drop zone highlight */}
      {dropZone && (
        <div
          style={{
            position: "absolute",
            ...dropZoneStyles[dropZone],
            backgroundColor: dropZone === "center" ? "#7aa2f715" : "#7aa2f720",
            border: "2px dashed #7aa2f7",
            borderRadius: 4,
            zIndex: 5,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              fontSize: 15,
              color: "#7aa2f7",
              fontFamily: "monospace",
              backgroundColor: "#1a1b26cc",
              padding: "2px 8px",
              borderRadius: 4,
            }}
          >
            {dropZone === "center" ? "Swap" : `Split ${dropZone}`}
          </span>
        </div>
      )}

      {/* Pane header — draggable */}
      <div
        draggable
        onDragStart={handleDragStart}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "4px 8px",
          backgroundColor: "#16161e",
          borderBottom: "1px solid #292e42",
          minHeight: 28,
          userSelect: "none",
          cursor: "grab",
        }}
      >
        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          {agent ? (
            <AgentBadge
              agentType={agent.config.agent_type}
              state={agent.state}
              label={agent.config.label}
            />
          ) : (
            <span style={{ fontSize: 15, color: "#565f89" }}>Empty</span>
          )}
          <PipeIndicator paneId={paneId} />
        </div>
        <div style={{ display: "flex", gap: 2 }}>
          <HeaderBtn icon="⌕" title="Search (⌘F)" onClick={handleSearch} />
          <HeaderBtn icon="↓" title="Export output" onClick={handleExport} />
          <HeaderBtn icon="×" title="Close pane" onClick={handleClose} />
        </div>
      </div>

      {/* Terminal */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <TerminalView
          ref={terminalRef}
          paneId={paneId}
          agentBackendId={agent?.backendId ?? null}
        />
      </div>

      {/* Per-pane status bar */}
      {agent && <AgentStatusBar agent={agent} />}

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
  icon,
  title,
  onClick,
}: {
  icon: string;
  title: string;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: "none",
        border: "none",
        color: "#565f89",
        fontSize: 15,
        cursor: "pointer",
        padding: "0 4px",
        lineHeight: 1,
      }}
    >
      {icon}
    </button>
  );
}
