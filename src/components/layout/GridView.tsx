import { useRef, useState, useCallback } from "react";
import { PaneContainer } from "./PaneContainer";
import {
  useTabs,
  getDockedPaneIdsAcrossTabs,
  swapPanesGlobal,
} from "../../stores/useWorkspaceStore";

interface DragState {
  paneId: string;
  startX: number;
  startY: number;
  active: boolean;
}

export function GridView() {
  const tabs = useTabs();
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const dropTargetRef = useRef<string | null>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const cursorLabelRef = useRef<HTMLDivElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Cheap — no need to memoize. Reading tabs triggers re-render on store changes.
  void tabs;
  const allPaneIds = getDockedPaneIdsAcrossTabs();

  const count = allPaneIds.length;
  const cols = count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;
  const rows = Math.ceil(count / cols);

  const updateHighlight = useCallback((targetId: string | null) => {
    const el = targetId ? cellRefs.current.get(targetId) : null;
    if (highlightRef.current) {
      if (el) {
        const parentRect = el.offsetParent?.getBoundingClientRect() ?? { left: 0, top: 0 };
        const rect = el.getBoundingClientRect();
        highlightRef.current.style.display = "block";
        highlightRef.current.style.left = `${rect.left - parentRect.left}px`;
        highlightRef.current.style.top = `${rect.top - parentRect.top}px`;
        highlightRef.current.style.width = `${rect.width}px`;
        highlightRef.current.style.height = `${rect.height}px`;
      } else {
        highlightRef.current.style.display = "none";
      }
    }
    if (cursorLabelRef.current) {
      const labelEl = cursorLabelRef.current;
      labelEl.style.backgroundColor = targetId ? "#7aa2f7" : "#1a1b26";
      labelEl.style.borderColor = targetId ? "#7aa2f7" : "#414868";
      labelEl.style.color = targetId ? "#1a1b26" : "#565f89";
      labelEl.style.fontWeight = targetId ? "600" : "400";
      labelEl.textContent = targetId ? "↕ Drop to swap" : "Drag to panel...";
    }
  }, []);

  const handleOverlayMouseMove = useCallback((e: React.MouseEvent) => {
    const drag = dragRef.current;
    if (!drag) return;

    if (!drag.active) {
      const dx = Math.abs(e.clientX - drag.startX);
      const dy = Math.abs(e.clientY - drag.startY);
      if (dx < 5 && dy < 5) return;
      drag.active = true;
    }

    // Update cursor label position via DOM (no re-render)
    if (cursorLabelRef.current) {
      cursorLabelRef.current.style.left = `${e.clientX + 14}px`;
      cursorLabelRef.current.style.top = `${e.clientY - 14}px`;
    }

    // Hit-test which cell we're over
    let foundTarget: string | null = null;
    for (const [id, el] of cellRefs.current) {
      if (id === drag.paneId) continue;
      const rect = el.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        foundTarget = id;
        break;
      }
    }

    // Only update state when target changes
    if (foundTarget !== dropTargetRef.current) {
      dropTargetRef.current = foundTarget;
      setDropTargetId(foundTarget);
      updateHighlight(foundTarget);
    }
  }, [updateHighlight]);

  const handleOverlayMouseUp = useCallback(() => {
    const drag = dragRef.current;
    const target = dropTargetRef.current;
    if (drag?.active && target) {
      swapPanesGlobal(drag.paneId, target);
    }
    dragRef.current = null;
    dropTargetRef.current = null;
    setDraggingId(null);
    setDropTargetId(null);
  }, []);

  const startDrag = useCallback((paneId: string, x: number, y: number) => {
    dragRef.current = { paneId, startX: x, startY: y, active: false };
    setDraggingId(paneId);
  }, []);

  const setCellRef = useCallback((paneId: string, el: HTMLDivElement | null) => {
    if (el) {
      cellRefs.current.set(paneId, el);
    } else {
      cellRefs.current.delete(paneId);
    }
  }, []);

  const isDragging = draggingId !== null;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          gap: 0,
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {allPaneIds.map((paneId, idx) => {
          const colPos = idx % cols;
          const rowPos = Math.floor(idx / cols);
          const itemsInThisCol = Math.floor((count - colPos - 1) / cols) + 1;
          const spanRows = (rowPos === 0 && itemsInThisCol === 1 && rows > 1) ? rows : 1;
          const isDropTarget = dropTargetId === paneId;
          const isPaneDragging = draggingId === paneId;

          return (
            <div
              key={paneId}
              ref={(el) => setCellRef(paneId, el)}
              style={{
                overflow: "hidden",
                minHeight: 0,
                minWidth: 0,
                gridRow: spanRows > 1 ? `span ${spanRows}` : undefined,
                outline: isDropTarget ? "2px solid #7aa2f7" : undefined,
                outlineOffset: "-2px",
                borderRadius: 4,
                transition: "outline 0.15s ease",
                opacity: isPaneDragging ? 0.4 : 1,
              }}
            >
              <PaneContainer paneId={paneId} onDragStart={startDrag} />
            </div>
          );
        })}
      </div>

      {/* Transparent overlay to capture mouse events while dragging */}
      {isDragging && (
        <div
          onMouseMove={handleOverlayMouseMove}
          onMouseUp={handleOverlayMouseUp}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 9999,
            cursor: "grabbing",
          }}
        >
          {/* Drop target highlight — positioned via ref, no re-render */}
          <div
            ref={highlightRef}
            style={{
              display: "none",
              position: "absolute",
              border: "2px solid #7aa2f7",
              borderRadius: 4,
              backgroundColor: "rgba(122, 162, 247, 0.08)",
              pointerEvents: "none",
              transition: "all 0.15s ease",
              boxShadow: "0 0 12px rgba(122, 162, 247, 0.25)",
            }}
          />

          {/* Cursor label — positioned via ref, no re-render */}
          <div
            ref={cursorLabelRef}
            style={{
              position: "fixed",
              backgroundColor: "#1a1b26",
              border: "1px solid #414868",
              borderRadius: 4,
              padding: "3px 8px",
              fontSize: 11,
              fontFamily: "monospace",
              color: "#565f89",
              pointerEvents: "none",
              whiteSpace: "nowrap",
              zIndex: 10000,
              transition: "background-color 0.1s, color 0.1s",
            }}
          >
            Drag to panel...
          </div>
        </div>
      )}
    </div>
  );
}
