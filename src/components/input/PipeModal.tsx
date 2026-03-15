import { useState } from "react";
import { useAgents } from "../../stores/useAgentStore";
import { useActivePaneId, getAllActivePaneIds } from "../../stores/useWorkspaceStore";
import { getAgentDef } from "../../lib/agent-registry";

interface PipeModalProps {
  onSubmit: (sourcePaneId: string, targetPaneId: string) => void;
  onCancel: () => void;
}

export function PipeModal({ onSubmit, onCancel }: PipeModalProps) {
  const agents = useAgents();
  const activePaneId = useActivePaneId();
  const allPaneIds = getAllActivePaneIds();

  const [source, setSource] = useState(activePaneId);
  const [target, setTarget] = useState("");

  const agentPanes = allPaneIds.filter((id) => agents[id]?.backendId);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#1a1b26",
          border: "1px solid #292e42",
          borderRadius: 8,
          padding: 20,
          width: 380,
        }}
      >
        <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "#c0caf5" }}>
          Pipe Output
        </h3>
        <p style={{ fontSize: 15, color: "#565f89", margin: "0 0 12px" }}>
          Send the next output from source agent as input to target agent.
        </p>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Source</label>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {agentPanes.map((id) => {
              const a = agents[id];
              const def = getAgentDef(a.config.agent_type);
              return (
                <button
                  key={id}
                  onClick={() => setSource(id)}
                  style={{
                    ...pillStyle,
                    borderColor: source === id ? def.color : "#292e42",
                    color: source === id ? def.color : "#565f89",
                    backgroundColor: source === id ? `${def.color}15` : "transparent",
                  }}
                >
                  {def.icon} {a.config.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ textAlign: "center", color: "#565f89", fontSize: 17, margin: "8px 0" }}>
          ↓
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Target</label>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {agentPanes
              .filter((id) => id !== source)
              .map((id) => {
                const a = agents[id];
                const def = getAgentDef(a.config.agent_type);
                return (
                  <button
                    key={id}
                    onClick={() => setTarget(id)}
                    style={{
                      ...pillStyle,
                      borderColor: target === id ? def.color : "#292e42",
                      color: target === id ? def.color : "#565f89",
                      backgroundColor: target === id ? `${def.color}15` : "transparent",
                    }}
                  >
                    {def.icon} {a.config.label}
                  </button>
                );
              })}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={onCancel} style={btnStyle}>Cancel</button>
          <button
            onClick={() => target && onSubmit(source, target)}
            disabled={!target}
            style={{
              ...btnStyle,
              backgroundColor: target ? "#7aa2f7" : "#292e42",
              color: target ? "#1a1b26" : "#565f89",
              fontWeight: 600,
            }}
          >
            Connect
          </button>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 15,
  color: "#565f89",
  fontFamily: "monospace",
  display: "block",
  marginBottom: 6,
};

const pillStyle: React.CSSProperties = {
  padding: "4px 10px",
  borderRadius: 6,
  border: "1px solid #292e42",
  backgroundColor: "transparent",
  color: "#565f89",
  fontSize: 15,
  fontFamily: "monospace",
  cursor: "pointer",
};

const btnStyle: React.CSSProperties = {
  padding: "6px 16px",
  backgroundColor: "transparent",
  border: "1px solid #292e42",
  borderRadius: 4,
  color: "#a9b1d6",
  fontSize: 15,
  fontFamily: "monospace",
  cursor: "pointer",
};
