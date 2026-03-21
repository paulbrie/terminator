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

export interface Task {
  id: string;
  title: string;
  done: boolean;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  color?: string;
  folder?: string;
  defaultCommand?: string;
  defaultBgColor?: string;
  paneIds: string[];
  tasks: Task[];
}

export interface FloatingPaneState {
  paneId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
  zIndex: number;
}
