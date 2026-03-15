import type { AgentSession } from "../../types/agent";

interface AgentStatusBarProps {
  agent: AgentSession;
}

export function AgentStatusBar({ agent }: AgentStatusBarProps) {
  const elapsed = Math.floor((Date.now() - agent.createdAt) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "2px 8px",
        backgroundColor: "#16161e",
        borderTop: "1px solid #292e42",
        fontSize: 15,
        fontFamily: "monospace",
        color: "#565f89",
        minHeight: 20,
      }}
    >
      <span>pid: {agent.backendId?.slice(0, 8) ?? "—"}</span>
      <span>{timeStr}</span>
    </div>
  );
}
