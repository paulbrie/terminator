import { usePipes, removePipe } from "../../stores/usePipeStore";
import { useAgents } from "../../stores/useAgentStore";
import { getAgentDef } from "../../lib/agent-registry";

interface PipeIndicatorProps {
  paneId: string;
}

export function PipeIndicator({ paneId }: PipeIndicatorProps) {
  const pipes = usePipes();
  const agents = useAgents();

  const outgoing = pipes.filter((p) => p.sourcePaneId === paneId && p.active);
  const incoming = pipes.filter((p) => p.targetPaneId === paneId && p.active);

  if (outgoing.length === 0 && incoming.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        marginLeft: 8,
      }}
    >
      {outgoing.map((pipe) => {
        const target = agents[pipe.targetPaneId];
        if (!target) return null;
        const def = getAgentDef(target.config.agent_type);
        return (
          <span
            key={pipe.id}
            onClick={() => removePipe(pipe.id)}
            title={`Piping to ${target.config.label} (click to remove)`}
            style={{
              fontSize: 15,
              fontFamily: "monospace",
              color: def.color,
              backgroundColor: `${def.color}15`,
              padding: "1px 5px",
              borderRadius: 3,
              cursor: "pointer",
              border: `1px solid ${def.color}30`,
            }}
          >
            → {def.icon}
          </span>
        );
      })}
      {incoming.map((pipe) => {
        const source = agents[pipe.sourcePaneId];
        if (!source) return null;
        const def = getAgentDef(source.config.agent_type);
        return (
          <span
            key={pipe.id}
            onClick={() => removePipe(pipe.id)}
            title={`Receiving from ${source.config.label} (click to remove)`}
            style={{
              fontSize: 15,
              fontFamily: "monospace",
              color: "#7dcfff",
              backgroundColor: "#7dcfff15",
              padding: "1px 5px",
              borderRadius: 3,
              cursor: "pointer",
              border: "1px solid #7dcfff30",
            }}
          >
            ← {def.icon}
          </span>
        );
      })}
    </div>
  );
}
