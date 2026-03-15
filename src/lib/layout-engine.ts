import { LayoutNode, SplitNode, LeafNode, Direction } from "../types/layout";

let nodeIdCounter = 0;
export function generateId(): string {
  return `node-${Date.now()}-${++nodeIdCounter}`;
}

export function createLeaf(paneId: string): LeafNode {
  return { type: "leaf", id: generateId(), paneId };
}

export function findNode(
  root: LayoutNode,
  nodeId: string
): LayoutNode | null {
  if (root.id === nodeId) return root;
  if (root.type === "split") {
    return findNode(root.children[0], nodeId) || findNode(root.children[1], nodeId);
  }
  return null;
}

export function findLeafByPaneId(
  root: LayoutNode,
  paneId: string
): LeafNode | null {
  if (root.type === "leaf") {
    return root.paneId === paneId ? root : null;
  }
  return (
    findLeafByPaneId(root.children[0], paneId) ||
    findLeafByPaneId(root.children[1], paneId)
  );
}

export function splitNode(
  root: LayoutNode,
  targetPaneId: string,
  direction: Direction,
  newPaneId: string
): LayoutNode {
  if (root.type === "leaf") {
    if (root.paneId === targetPaneId) {
      const newSplit: SplitNode = {
        type: "split",
        id: generateId(),
        direction,
        ratio: 0.5,
        children: [root, createLeaf(newPaneId)],
      };
      return newSplit;
    }
    return root;
  }

  return {
    ...root,
    children: [
      splitNode(root.children[0], targetPaneId, direction, newPaneId),
      splitNode(root.children[1], targetPaneId, direction, newPaneId),
    ],
  };
}

export function removeNode(
  root: LayoutNode,
  targetPaneId: string
): LayoutNode | null {
  if (root.type === "leaf") {
    return root.paneId === targetPaneId ? null : root;
  }

  const left = removeNode(root.children[0], targetPaneId);
  const right = removeNode(root.children[1], targetPaneId);

  if (left === null) return right;
  if (right === null) return left;

  return { ...root, children: [left, right] };
}

export function updateRatio(
  root: LayoutNode,
  splitId: string,
  ratio: number
): LayoutNode {
  if (root.type === "leaf") return root;
  if (root.id === splitId) {
    return { ...root, ratio: Math.max(0.1, Math.min(0.9, ratio)) };
  }
  return {
    ...root,
    children: [
      updateRatio(root.children[0], splitId, ratio),
      updateRatio(root.children[1], splitId, ratio),
    ],
  };
}

export function getAllPaneIds(root: LayoutNode): string[] {
  if (root.type === "leaf") return [root.paneId];
  return [
    ...getAllPaneIds(root.children[0]),
    ...getAllPaneIds(root.children[1]),
  ];
}

// Move a pane: remove from current position, insert at target with a split
// insertBefore: true = source goes first (left/top), false = source goes second (right/bottom)
export function movePane(
  root: LayoutNode,
  sourcePaneId: string,
  targetPaneId: string,
  direction: Direction,
  insertBefore: boolean
): LayoutNode | null {
  if (sourcePaneId === targetPaneId) return root;

  // Step 1: Remove source from tree
  const withoutSource = removeNode(root, sourcePaneId);
  if (!withoutSource) return root;

  // Step 2: Insert source at target position with a split
  const sourceLeaf = createLeaf(sourcePaneId);
  return insertAtPane(withoutSource, targetPaneId, direction, sourceLeaf, insertBefore);
}

function insertAtPane(
  root: LayoutNode,
  targetPaneId: string,
  direction: Direction,
  newLeaf: LeafNode,
  insertBefore: boolean
): LayoutNode {
  if (root.type === "leaf") {
    if (root.paneId === targetPaneId) {
      const children: [LayoutNode, LayoutNode] = insertBefore
        ? [newLeaf, root]
        : [root, newLeaf];
      return {
        type: "split",
        id: generateId(),
        direction,
        ratio: 0.5,
        children,
      };
    }
    return root;
  }

  return {
    ...root,
    children: [
      insertAtPane(root.children[0], targetPaneId, direction, newLeaf, insertBefore),
      insertAtPane(root.children[1], targetPaneId, direction, newLeaf, insertBefore),
    ],
  };
}

// Swap two panes in-place
export function swapPanes(
  root: LayoutNode,
  paneIdA: string,
  paneIdB: string
): LayoutNode {
  if (root.type === "leaf") {
    if (root.paneId === paneIdA) return { ...root, paneId: paneIdB };
    if (root.paneId === paneIdB) return { ...root, paneId: paneIdA };
    return root;
  }
  return {
    ...root,
    children: [
      swapPanes(root.children[0], paneIdA, paneIdB),
      swapPanes(root.children[1], paneIdA, paneIdB),
    ],
  };
}
