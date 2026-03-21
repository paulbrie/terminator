import { ChevronUp, X } from "lucide-react";
import { useFloatingPanes, expandFloatingPane, closePane } from "../../stores/useWorkspaceStore";
import { useAgent, removeAgent } from "../../stores/useAgentStore";
import { getAgentDef } from "../../lib/agent-registry";

export function CollapsedBar() {
  const floatingPanes = useFloatingPanes();
  const collapsed = floatingPanes.filter((fp) => fp.collapsed);

  if (collapsed.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        backgroundColor: "#16161e",
        borderTop: "1px solid #292e42",
        overflowX: "auto",
      }}
    >
      {collapsed.map((fp) => (
        <CollapsedChip key={fp.paneId} paneId={fp.paneId} />
      ))}
    </div>
  );
}

function CollapsedChip({ paneId }: { paneId: string }) {
  const agent = useAgent(paneId);
  const def = agent ? getAgentDef(agent.config.agent_type) : null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        backgroundColor: "#292e42",
        border: "1px solid #414868",
        borderRadius: 4,
        cursor: "pointer",
        fontSize: 11,
        fontFamily: "monospace",
        color: "#a9b1d6",
      }}
      onClick={() => expandFloatingPane(paneId)}
    >
      <span style={{ color: def?.color ?? "#565f89" }}>{def?.icon ?? "?"}</span>
      <span>{agent?.config.label ?? paneId}</span>
      <button
        title="Expand"
        onClick={(e) => {
          e.stopPropagation();
          expandFloatingPane(paneId);
        }}
        style={{
          background: "none",
          border: "none",
          color: "#565f89",
          cursor: "pointer",
          padding: 0,
          display: "flex",
          alignItems: "center",
        }}
      >
        <ChevronUp size={12} />
      </button>
      <button
        title="Close"
        onClick={(e) => {
          e.stopPropagation();
          closePane(paneId);
          removeAgent(paneId);
        }}
        style={{
          background: "none",
          border: "none",
          color: "#565f89",
          cursor: "pointer",
          padding: 0,
          display: "flex",
          alignItems: "center",
        }}
      >
        <X size={12} />
      </button>
    </div>
  );
}
