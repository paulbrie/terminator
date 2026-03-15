import { useAgents } from "../../stores/useAgentStore";
import { usePipes } from "../../stores/usePipeStore";
import { getAgentDef } from "../../lib/agent-registry";
import type { AgentType } from "../../types/agent";

export function StatusBar() {
  const agents = useAgents();
  const pipes = usePipes();
  const agentList = Object.values(agents);
  const running = agentList.filter((a) => a.state === "running" || a.state === "streaming").length;
  const total = agentList.length;
  const pipeCount = pipes.filter((p) => p.active).length;

  // Count by type
  const typeCounts = agentList.reduce<Partial<Record<AgentType, number>>>(
    (acc, a) => {
      const t = a.config.agent_type;
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    },
    {}
  );

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        height: 24,
        backgroundColor: "#16161e",
        borderTop: "1px solid #292e42",
        fontSize: 15,
        fontFamily: "monospace",
        color: "#565f89",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span>
          {total} agent{total !== 1 ? "s" : ""} · {running} active
          {pipeCount > 0 && ` · ${pipeCount} pipe${pipeCount !== 1 ? "s" : ""}`}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {(Object.entries(typeCounts) as [AgentType, number][]).map(
            ([type, count]) => {
              const def = getAgentDef(type);
              return (
                <span
                  key={type}
                  style={{
                    color: def.color,
                    fontSize: 15,
                  }}
                >
                  {def.icon}:{count}
                </span>
              );
            }
          )}
        </div>
      </div>
      <span>Terminator v0.1.0</span>
    </div>
  );
}
