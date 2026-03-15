import { useState, useRef, useEffect, useCallback } from "react";
import { useAgents } from "../../stores/useAgentStore";
import { useActivePaneId, getAllActivePaneIds } from "../../stores/useWorkspaceStore";
import { sendInput } from "../../lib/tauri-commands";
import { getAgentDef } from "../../lib/agent-registry";
import type { AgentSession } from "../../types/agent";

type TargetMode = "active" | "all" | string; // string = specific paneId

interface CommandBarProps {
  visible: boolean;
  onClose: () => void;
}

export function CommandBar({ visible, onClose }: CommandBarProps) {
  const [input, setInput] = useState("");
  const [targetMode, setTargetMode] = useState<TargetMode>("active");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const agents = useAgents();
  const activePaneId = useActivePaneId();
  const allPaneIds = getAllActivePaneIds();

  useEffect(() => {
    if (visible) {
      inputRef.current?.focus();
      setInput("");
      setHistoryIdx(-1);
    }
  }, [visible]);

  const getTargetAgents = useCallback((): AgentSession[] => {
    if (targetMode === "all") {
      return allPaneIds
        .map((id) => agents[id])
        .filter((a): a is AgentSession => !!a?.backendId);
    }
    if (targetMode === "active") {
      const agent = agents[activePaneId];
      return agent?.backendId ? [agent] : [];
    }
    // Specific pane
    const agent = agents[targetMode];
    return agent?.backendId ? [agent] : [];
  }, [targetMode, agents, activePaneId, allPaneIds]);

  const handleSubmit = useCallback(() => {
    if (!input.trim()) return;

    const targets = getTargetAgents();
    const data = input + "\n";

    for (const agent of targets) {
      if (agent.backendId) {
        sendInput(agent.backendId, data).catch(console.error);
      }
    }

    setHistory((h) => [input, ...h.slice(0, 99)]);
    setInput("");
    setHistoryIdx(-1);
  }, [input, getTargetAgents]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (history.length > 0) {
        const next = Math.min(historyIdx + 1, history.length - 1);
        setHistoryIdx(next);
        setInput(history[next]);
      }
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIdx > 0) {
        const next = historyIdx - 1;
        setHistoryIdx(next);
        setInput(history[next]);
      } else {
        setHistoryIdx(-1);
        setInput("");
      }
    }
    // Tab to cycle target mode
    if (e.key === "Tab") {
      e.preventDefault();
      const agentPaneIds = allPaneIds.filter((id) => agents[id]?.backendId);
      const modes: TargetMode[] = ["active", "all", ...agentPaneIds];
      const currentIdx = modes.indexOf(targetMode);
      const nextIdx = e.shiftKey
        ? (currentIdx - 1 + modes.length) % modes.length
        : (currentIdx + 1) % modes.length;
      setTargetMode(modes[nextIdx]);
    }
  };

  if (!visible) return null;

  const targetLabel = getTargetLabel(targetMode, agents, activePaneId);
  const targetCount = getTargetAgents().length;
  const isBroadcast = targetMode === "all";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(640px, 90vw)",
        zIndex: 900,
      }}
    >
      {/* Target selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 12px",
          fontSize: 15,
          fontFamily: "monospace",
          color: "#565f89",
        }}
      >
        <span>Target:</span>
        <TargetPill
          label="Active"
          active={targetMode === "active"}
          onClick={() => setTargetMode("active")}
        />
        <TargetPill
          label={`Broadcast (${allPaneIds.filter((id) => agents[id]?.backendId).length})`}
          active={targetMode === "all"}
          color="#f7768e"
          onClick={() => setTargetMode("all")}
        />
        {allPaneIds
          .filter((id) => agents[id]?.backendId && id !== activePaneId)
          .map((id) => {
            const a = agents[id];
            const def = getAgentDef(a.config.agent_type);
            return (
              <TargetPill
                key={id}
                label={`${def.icon} ${a.config.label}`}
                active={targetMode === id}
                color={def.color}
                onClick={() => setTargetMode(id)}
              />
            );
          })}
        <span style={{ marginLeft: "auto", fontSize: 15 }}>
          Tab to cycle · Enter to send · Esc to close
        </span>
      </div>

      {/* Input bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          backgroundColor: "#1a1b26",
          border: `1px solid ${isBroadcast ? "#f7768e" : "#7aa2f7"}`,
          borderRadius: 8,
          padding: "0 12px",
          boxShadow: `0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px ${isBroadcast ? "#f7768e20" : "#7aa2f720"}`,
        }}
      >
        {/* Target badge */}
        <span
          style={{
            fontSize: 15,
            fontWeight: 600,
            fontFamily: "monospace",
            color: isBroadcast ? "#f7768e" : "#7aa2f7",
            whiteSpace: "nowrap",
            marginRight: 8,
          }}
        >
          {targetLabel}
          {targetCount > 1 && ` (${targetCount})`}
        </span>

        <span style={{ color: "#565f89", marginRight: 8 }}>›</span>

        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isBroadcast
              ? "Send to all agents..."
              : "Send command..."
          }
          style={{
            flex: 1,
            padding: "10px 0",
            backgroundColor: "transparent",
            border: "none",
            color: "#c0caf5",
            fontSize: 15,
            fontFamily: "'SF Mono', 'Menlo', monospace",
            outline: "none",
          }}
        />

        <button
          onClick={handleSubmit}
          style={{
            background: "none",
            border: "none",
            color: input.trim() ? "#7aa2f7" : "#565f89",
            fontSize: 15,
            fontFamily: "monospace",
            cursor: input.trim() ? "pointer" : "default",
            padding: "4px 8px",
          }}
        >
          ⏎
        </button>
      </div>
    </div>
  );
}

function TargetPill({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
}) {
  const c = color || "#7aa2f7";
  return (
    <button
      onClick={onClick}
      style={{
        padding: "2px 8px",
        borderRadius: 10,
        border: `1px solid ${active ? c : "#292e42"}`,
        backgroundColor: active ? `${c}20` : "transparent",
        color: active ? c : "#565f89",
        fontSize: 15,
        fontFamily: "monospace",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function getTargetLabel(
  mode: TargetMode,
  agents: Record<string, AgentSession>,
  activePaneId: string
): string {
  if (mode === "all") return "ALL";
  if (mode === "active") {
    const a = agents[activePaneId];
    if (!a) return "none";
    const def = getAgentDef(a.config.agent_type);
    return `${def.icon} ${a.config.label}`;
  }
  const a = agents[mode];
  if (!a) return "?";
  const def = getAgentDef(a.config.agent_type);
  return `${def.icon} ${a.config.label}`;
}
