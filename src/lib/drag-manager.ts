// Drag-and-drop state for pane rearrangement
// Uses HTML5 drag-and-drop API with custom drop zone highlighting

export type DropZone = "left" | "right" | "top" | "bottom" | "center";

export interface DragData {
  sourcePaneId: string;
}

const DRAG_MIME = "application/x-terminator-pane";

export function setDragData(e: DragEvent, data: DragData) {
  e.dataTransfer?.setData(DRAG_MIME, JSON.stringify(data));
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = "move";
  }
}

export function getDragData(e: DragEvent): DragData | null {
  const raw = e.dataTransfer?.getData(DRAG_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DragData;
  } catch {
    return null;
  }
}

export function hasDragData(e: DragEvent): boolean {
  return e.dataTransfer?.types.includes(DRAG_MIME) ?? false;
}

export function computeDropZone(
  e: DragEvent,
  rect: DOMRect
): DropZone {
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;

  // Edge threshold: 25% from each edge
  const threshold = 0.25;

  if (x < threshold) return "left";
  if (x > 1 - threshold) return "right";
  if (y < threshold) return "top";
  if (y > 1 - threshold) return "bottom";
  return "center";
}

export function dropZoneToDirection(zone: DropZone): "horizontal" | "vertical" | null {
  switch (zone) {
    case "left":
    case "right":
      return "horizontal";
    case "top":
    case "bottom":
      return "vertical";
    case "center":
      return null;
  }
}

export function shouldInsertBefore(zone: DropZone): boolean {
  return zone === "left" || zone === "top";
}
