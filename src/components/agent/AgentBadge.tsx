import type { AgentState, AgentType } from "../../types/agent";
import { getAgentDef } from "../../lib/agent-registry";

const stateColors: Record<AgentState, string> = {
  idle: "#565f89",
  running: "#9ece6a",
  streaming: "#7aa2f7",
  done: "#565f89",
  error: "#f7768e",
};

const stateLabels: Record<AgentState, string> = {
  idle: "idle",
  running: "running",
  streaming: "streaming",
  done: "done",
  error: "error",
};

interface AgentBadgeProps {
  agentType: AgentType;
  state: AgentState;
  label: string;
}

export function AgentBadge({ agentType, state, label }: AgentBadgeProps) {
  const def = getAgentDef(agentType);
  const isActive = state === "running" || state === "streaming";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {/* Pulsing state dot */}
      <div style={{ position: "relative", width: 8, height: 8 }}>
        {isActive && (
          <div
            style={{
              position: "absolute",
              inset: -2,
              borderRadius: "50%",
              backgroundColor: stateColors[state],
              opacity: 0.3,
              animation: "pulse 2s ease-in-out infinite",
            }}
          />
        )}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: stateColors[state],
            position: "relative",
          }}
        />
      </div>

      {/* Agent type badge */}
      <span
        style={{
          fontSize: 15,
          fontWeight: 700,
          color: def.color,
          backgroundColor: `${def.color}15`,
          padding: "1px 5px",
          borderRadius: 3,
          fontFamily: "monospace",
          border: `1px solid ${def.color}30`,
        }}
      >
        {def.icon}
      </span>

      {/* Label */}
      <span
        style={{
          fontSize: 15,
          color: "#a9b1d6",
          fontFamily: "monospace",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: 120,
        }}
      >
        {label}
      </span>

      {/* State label */}
      <span
        style={{
          fontSize: 15,
          color: stateColors[state],
          fontFamily: "monospace",
          opacity: 0.8,
        }}
      >
        {stateLabels[state]}
      </span>
    </div>
  );
}
