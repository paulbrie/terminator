import { Loader2 } from "lucide-react";
import type { AgentState, PtyActivity } from "../../types/agent";

const activityColors: Record<PtyActivity, string> = {
  busy: "#ff9e64",
  prompt: "#9ece6a",
  idle: "#565f89",
  waiting_input: "#e0af68",
};

interface AgentBadgeProps {
  state: AgentState;
  label: string;
  ptyActivity?: PtyActivity;
}

export function AgentBadge({ state, label, ptyActivity }: AgentBadgeProps) {
  const isProcessAlive = state === "running" || state === "streaming";

  // Use ptyActivity for display when the process is alive, otherwise fall back to agent state
  const dotColor = isProcessAlive && ptyActivity
    ? activityColors[ptyActivity]
    : state === "error" ? "#f7768e" : "#565f89";
  const isBusy = isProcessAlive && ptyActivity === "busy";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {/* State indicator: fixed-size box to prevent layout shifts */}
      <div style={{ width: 14, height: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {isBusy ? (
          <Loader2
            size={14}
            style={{
              color: dotColor,
              animation: "spin 1s linear infinite",
            }}
          />
        ) : (
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: dotColor,
            }}
          />
        )}
      </div>

      {/* Label */}
      <span
        style={{
          fontSize: 15,
          color: "#a9b1d6",
          fontFamily: "monospace",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: 200,
        }}
        title={label}
      >
        {label}
      </span>
    </div>
  );
}
