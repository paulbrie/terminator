import { useState } from "react";
import type { AgentType, AgentConfig } from "../../types/agent";
import { AGENT_REGISTRY, createAgentConfig } from "../../lib/agent-registry";

interface AgentConfigModalProps {
  onSubmit: (config: AgentConfig) => void;
  onCancel: () => void;
}

export function AgentConfigModal({ onSubmit, onCancel }: AgentConfigModalProps) {
  const [selectedType, setSelectedType] = useState<AgentType>("shell");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [label, setLabel] = useState("");
  const [cwd, setCwd] = useState("");

  const def = AGENT_REGISTRY[selectedType];
  const needsConfig = def.configurable;

  const handleSubmit = () => {
    const config = createAgentConfig(selectedType, {
      label: label || def.label,
      command: command || def.defaultCommand,
      args: args ? args.split(" ") : def.defaultArgs,
      working_directory: cwd || undefined,
    });
    onSubmit(config);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

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
        onKeyDown={handleKeyDown}
        style={{
          backgroundColor: "#1a1b26",
          border: "1px solid #292e42",
          borderRadius: 8,
          padding: 20,
          width: 420,
          maxWidth: "90vw",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px",
            fontSize: 15,
            fontWeight: 600,
            color: "#c0caf5",
          }}
        >
          New Agent
        </h3>

        {/* Agent type selector */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {(Object.keys(AGENT_REGISTRY) as AgentType[]).map((type) => {
            const r = AGENT_REGISTRY[type];
            const isSelected = type === selectedType;
            return (
              <button
                key={type}
                onClick={() => {
                  setSelectedType(type);
                  setCommand("");
                  setArgs("");
                  setLabel("");
                }}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  backgroundColor: isSelected ? "#292e42" : "transparent",
                  border: `1px solid ${isSelected ? r.color : "#292e42"}`,
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: "monospace",
                    color: r.color,
                  }}
                >
                  {r.icon}
                </span>
                <span style={{ fontSize: 15, color: "#a9b1d6" }}>
                  {r.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Description */}
        <p
          style={{
            fontSize: 15,
            color: "#565f89",
            margin: "0 0 12px",
          }}
        >
          {def.description}
        </p>

        {/* Config fields */}
        {needsConfig && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Field
              label="Command"
              value={command}
              onChange={setCommand}
              placeholder={def.defaultCommand || "e.g., python agent.py"}
            />
            <Field
              label="Arguments"
              value={args}
              onChange={setArgs}
              placeholder={def.defaultArgs.join(" ") || "optional arguments"}
            />
          </div>
        )}

        <Field
          label="Label"
          value={label}
          onChange={setLabel}
          placeholder={def.label}
        />

        <Field
          label="Working Directory"
          value={cwd}
          onChange={setCwd}
          placeholder="optional path"
        />

        {/* Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 16,
          }}
        >
          <button onClick={onCancel} style={buttonStyle}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            style={{
              ...buttonStyle,
              backgroundColor: "#7aa2f7",
              color: "#1a1b26",
              fontWeight: 600,
            }}
          >
            Spawn
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div style={{ marginBottom: 4 }}>
      <label
        style={{
          fontSize: 15,
          color: "#565f89",
          display: "block",
          marginBottom: 3,
          fontFamily: "monospace",
        }}
      >
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "6px 8px",
          backgroundColor: "#16161e",
          border: "1px solid #292e42",
          borderRadius: 4,
          color: "#a9b1d6",
          fontSize: 15,
          fontFamily: "monospace",
          outline: "none",
        }}
      />
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "6px 16px",
  backgroundColor: "transparent",
  border: "1px solid #292e42",
  borderRadius: 4,
  color: "#a9b1d6",
  fontSize: 15,
  fontFamily: "monospace",
  cursor: "pointer",
};
