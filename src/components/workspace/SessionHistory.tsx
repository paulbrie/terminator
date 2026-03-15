import { useState, useEffect, useCallback } from "react";
import {
  listSessions,
  readSessionLog,
  deleteSession,
  type SessionEntry,
} from "../../lib/tauri-commands";
import { getAgentDef } from "../../lib/agent-registry";
import type { AgentType } from "../../types/agent";

interface SessionHistoryProps {
  onClose: () => void;
}

export function SessionHistory({ onClose }: SessionHistoryProps) {
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logContent, setLogContent] = useState<string | null>(null);
  const [loadingLog, setLoadingLog] = useState(false);

  const refresh = useCallback(async () => {
    const list = await listSessions();
    setSessions(list);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSelect = async (id: string) => {
    setSelectedId(id);
    setLoadingLog(true);
    try {
      const log = await readSessionLog(id);
      setLogContent(log);
    } catch {
      setLogContent("[No log file found]");
    } finally {
      setLoadingLog(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteSession(id);
    if (selectedId === id) {
      setSelectedId(null);
      setLogContent(null);
    }
    refresh();
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
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        style={{
          backgroundColor: "#1a1b26",
          border: "1px solid #292e42",
          borderRadius: 8,
          width: 700,
          maxWidth: "90vw",
          height: 500,
          maxHeight: "80vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: "1px solid #292e42",
          }}
        >
          <h3 style={{ margin: 0, fontSize: 15, color: "#c0caf5" }}>
            Session History
          </h3>
          <button onClick={onClose} style={closeBtnStyle}>
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Session list */}
          <div
            style={{
              width: 240,
              borderRight: "1px solid #292e42",
              overflowY: "auto",
              padding: 8,
            }}
          >
            {sessions.length === 0 ? (
              <p
                style={{
                  fontSize: 15,
                  color: "#565f89",
                  textAlign: "center",
                  padding: 20,
                }}
              >
                No sessions recorded yet.
              </p>
            ) : (
              sessions.map((s) => {
                const isSelected = selectedId === s.id;
                const agentType = s.agent_type as AgentType;
                const def =
                  agentType in
                  ({ shell: 1, claude: 1, gpt: 1, custom: 1 } as Record<string, number>)
                    ? getAgentDef(agentType)
                    : null;

                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelect(s.id)}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 4,
                      marginBottom: 2,
                      cursor: "pointer",
                      backgroundColor: isSelected ? "#292e42" : "transparent",
                      border: `1px solid ${isSelected ? "#7aa2f740" : "transparent"}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 15,
                        color: "#c0caf5",
                        fontFamily: "monospace",
                      }}
                    >
                      <span style={{ color: def?.color ?? "#565f89" }}>
                        {def?.icon ?? "??"}
                      </span>
                      <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.label}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(s.id);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#565f89",
                          fontSize: 15,
                          cursor: "pointer",
                          padding: "0 2px",
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <div style={{ fontSize: 15, color: "#565f89", marginTop: 2 }}>
                      {new Date(s.started_at * 1000).toLocaleString()}
                      {s.ended_at && (
                        <span>
                          {" "}
                          · {Math.round((s.ended_at - s.started_at) / 60)}m
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Log viewer */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: 12,
              fontFamily: "'SF Mono', 'Menlo', monospace",
              fontSize: 15,
              color: "#a9b1d6",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              backgroundColor: "#16161e",
            }}
          >
            {loadingLog ? (
              <span style={{ color: "#565f89" }}>Loading...</span>
            ) : logContent ? (
              logContent
            ) : (
              <span style={{ color: "#565f89" }}>
                Select a session to view its log.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const closeBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#565f89",
  fontSize: 19,
  cursor: "pointer",
  lineHeight: 1,
};
