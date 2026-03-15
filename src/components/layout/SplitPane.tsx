import { useCallback, useRef } from "react";
import type { LayoutNode } from "../../types/layout";
import { PaneContainer } from "./PaneContainer";
import { resizeSplit } from "../../stores/useWorkspaceStore";

interface SplitPaneProps {
  node: LayoutNode;
}

export function SplitPane({ node }: SplitPaneProps) {
  if (node.type === "leaf") {
    return <PaneContainer paneId={node.paneId} />;
  }

  const { direction, ratio, children } = node;
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const isHorizontal = direction === "horizontal";

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;

      const onMouseMove = (e: MouseEvent) => {
        if (!isDragging.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const newRatio = isHorizontal
          ? (e.clientX - rect.left) / rect.width
          : (e.clientY - rect.top) / rect.height;
        resizeSplit(node.id, newRatio);
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
      document.body.style.cursor = isHorizontal ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
    },
    [node.id, isHorizontal]
  );

  const firstSize = `${ratio * 100}%`;
  const secondSize = `${(1 - ratio) * 100}%`;

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: isHorizontal ? "row" : "column",
        width: "100%",
        height: "100%",
      }}
    >
      <div
        style={{
          [isHorizontal ? "width" : "height"]: firstSize,
          overflow: "hidden",
        }}
      >
        <SplitPane node={children[0]} />
      </div>

      {/* Divider */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          [isHorizontal ? "width" : "height"]: 4,
          [isHorizontal ? "minWidth" : "minHeight"]: 4,
          cursor: isHorizontal ? "col-resize" : "row-resize",
          backgroundColor: "#292e42",
          transition: "background-color 0.15s",
        }}
        onMouseEnter={(e) =>
          ((e.target as HTMLElement).style.backgroundColor = "#7aa2f7")
        }
        onMouseLeave={(e) =>
          ((e.target as HTMLElement).style.backgroundColor = "#292e42")
        }
      />

      <div
        style={{
          [isHorizontal ? "width" : "height"]: secondSize,
          overflow: "hidden",
        }}
      >
        <SplitPane node={children[1]} />
      </div>
    </div>
  );
}
