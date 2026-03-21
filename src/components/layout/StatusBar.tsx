import { useEffect, useState, useCallback } from "react";
import { useAgents } from "../../stores/useAgentStore";
import { usePipes } from "../../stores/usePipeStore";
import { getAgentDef } from "../../lib/agent-registry";
import { getSystemStats, type SystemStats } from "../../lib/tauri-commands";
import type { AgentType } from "../../types/agent";

export function StatusBar() {
  const agents = useAgents();
  const pipes = usePipes();
  const agentList = Object.values(agents);
  const running = agentList.filter((a) => a.state === "running" || a.state === "streaming").length;
  const total = agentList.length;
  const pipeCount = pipes.filter((p) => p.active).length;

  const [stats, setStats] = useState<SystemStats | null>(null);

  const refreshStats = useCallback(() => {
    getSystemStats().then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    refreshStats();
    const interval = setInterval(refreshStats, 3000);
    return () => clearInterval(interval);
  }, [refreshStats]);

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
        height: 28,
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

      {/* System gauges */}
      {stats && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Gauge label="CPU" percent={stats.cpu_percent} color="#7aa2f7" onClick={refreshStats} />
          <Gauge label="MEM" percent={stats.mem_percent} color="#bb9af7" onClick={refreshStats} />
          <Gauge label="HD" percent={stats.disk_percent} color="#9ece6a" onClick={refreshStats} />
        </div>
      )}
    </div>
  );
}

function Gauge({ label, percent, color, onClick }: { label: string; percent: number; color: string; onClick?: () => void }) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }} onClick={onClick}>
      <span style={{ fontSize: 9, color, lineHeight: 1, fontWeight: 600, minWidth: 20 }}>{label}</span>
      <div
        style={{
          width: 40,
          height: 4,
          backgroundColor: "#292e42",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${clamped}%`,
            height: "100%",
            backgroundColor: color,
            borderRadius: 2,
            transition: "width 0.3s ease",
          }}
        />
      </div>
      <span style={{ fontSize: 9, color: "#565f89", lineHeight: 1, minWidth: 22, textAlign: "right" }}>
        {Math.round(clamped)}%
      </span>
    </div>
  );
}
