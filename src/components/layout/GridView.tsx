import { useMemo } from "react";
import { PaneContainer } from "./PaneContainer";
import {
  useTabs,
  getAllPaneIdsAcrossTabs,
} from "../../stores/useWorkspaceStore";

export function GridView() {
  const tabs = useTabs();

  const allPaneIds = useMemo(() => {
    return getAllPaneIdsAcrossTabs();
  }, [tabs]);

  const count = allPaneIds.length;
  const cols = count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 4,
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {allPaneIds.map((paneId) => (
        <div key={paneId} style={{ overflow: "hidden", minHeight: 0 }}>
          <PaneContainer paneId={paneId} />
        </div>
      ))}
    </div>
  );
}
