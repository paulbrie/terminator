export type Direction = "horizontal" | "vertical";

export interface SplitNode {
  type: "split";
  id: string;
  direction: Direction;
  ratio: number;
  children: [LayoutNode, LayoutNode];
}

export interface LeafNode {
  type: "leaf";
  id: string;
  paneId: string;
}

export type LayoutNode = SplitNode | LeafNode;

export interface Tab {
  id: string;
  label: string;
  rootNode: LayoutNode;
}
