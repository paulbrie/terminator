import { useCallback, useRef } from "react";
import { Minus, Maximize2, Pin } from "lucide-react";
import { PaneContainer } from "./PaneContainer";
import { useAgent } from "../../stores/useAgentStore";
import {
  collapseFloatingPane,
  redockPane,
  updateFloatingPosition,
  updateFloatingSize,
  bringFloatingToFront,
  setActivePane,
} from "../../stores/useWorkspaceStore";
import type { FloatingPaneState } from "../../types/layout";

interface FloatingPaneProps {
  state: FloatingPaneState;
}

export function FloatingPane({ state }: FloatingPaneProps) {
  const { paneId, x, y, width, height, zIndex } = state;
  const agent = useAgent(paneId);
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleTitleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      isDragging.current = true;
      dragOffset.current = { x: e.clientX - x, y: e.clientY - y };
      bringFloatingToFront(paneId);
      setActivePane(paneId);

      const onMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const newX = Math.max(0, ev.clientX - dragOffset.current.x);
        const newY = Math.max(0, ev.clientY - dragOffset.current.y);
        updateFloatingPosition(paneId, newX, newY);
      };
      const onMouseUp = () => {
        isDragging.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "move";
      document.body.style.userSelect = "none";
    },
    [paneId, x, y]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing.current = true;
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = width;
      const startH = height;

      const onMouseMove = (ev: MouseEvent) => {
        if (!isResizing.current) return;
        updateFloatingSize(
          paneId,
          startW + (ev.clientX - startX),
          startH + (ev.clientY - startY)
        );
      };
      const onMouseUp = () => {
        isResizing.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "nwse-resize";
      document.body.style.userSelect = "none";
    },
    [paneId, width, height]
  );

  return (
    <div
      onMouseDown={() => {
        bringFloatingToFront(paneId);
        setActivePane(paneId);
      }}
      style={{
        position: "fixed",
        left: x,
        top: y,
        width,
        height,
        zIndex,
        display: "flex",
        flexDirection: "column",
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px #292e42",
      }}
    >
      {/* Floating title bar */}
      <div
        onMouseDown={handleTitleMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          padding: "4px 8px",
          backgroundColor: "#16161e",
          borderBottom: "1px solid #292e42",
          cursor: "move",
          userSelect: "none",
          minHeight: 30,
          gap: 6,
        }}
      >
        <span
          style={{
            flex: 1,
            fontSize: 12,
            color: "#a9b1d6",
            fontFamily: "monospace",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {agent?.config.label ?? paneId}
        </span>
        <FloatBtn title="Minimize" onClick={() => collapseFloatingPane(paneId)}>
          <Minus size={14} />
        </FloatBtn>
        <FloatBtn title="Dock into layout" onClick={() => redockPane(paneId)}>
          <Pin size={14} />
        </FloatBtn>
      </div>

      {/* Terminal content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        <PaneContainer paneId={paneId} isFloating />
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={handleResizeMouseDown}
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: 16,
          height: 16,
          cursor: "nwse-resize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Maximize2
          size={10}
          style={{ color: "#565f89", transform: "rotate(90deg)" }}
        />
      </div>
    </div>
  );
}

function FloatBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: "none",
        border: "none",
        color: "#565f89",
        cursor: "pointer",
        padding: "2px 4px",
        display: "flex",
        alignItems: "center",
      }}
    >
      {children}
    </button>
  );
}
