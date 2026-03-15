import { useState, useEffect, useCallback } from "react";
import {
  saveWorkspace,
  loadWorkspace,
  listWorkspaces,
  deleteWorkspace,
  type WorkspaceFile,
} from "../../lib/tauri-commands";
import { workspaceStore$ } from "../../stores/useWorkspaceStore";
import { agentStore$ } from "../../stores/useAgentStore";
import { spawnAgent } from "../../lib/tauri-commands";
import { createAgentConfig } from "../../lib/agent-registry";
import { generateId, getAllPaneIds } from "../../lib/layout-engine";
import type { LayoutNode } from "../../types/layout";
import type { AgentType } from "../../types/agent";

interface WorkspaceManagerProps {
  onClose: () => void;
}

interface SavedLayout {
  tabs: SavedTab[];
}

interface SavedTab {
  label: string;
  rootNode: LayoutNode;
  agents: Record<string, { agentType: AgentType; label: string }>;
}

export function WorkspaceManager({ onClose }: WorkspaceManagerProps) {
  const [workspaces, setWorkspaces] = useState<WorkspaceFile[]>([]);
  const [saveName, setSaveName] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"list" | "save">("list");

  const refresh = useCallback(async () => {
    const list = await listWorkspaces();
    setWorkspaces(list);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSave = async () => {
    if (!saveName.trim()) return;
    const store = workspaceStore$.getValue();
    const agents = agentStore$.getValue().agents;

    const savedLayout: SavedLayout = {
      tabs: store.tabs.map((tab) => {
        const paneIds = getAllPaneIds(tab.rootNode);
        const agentMap: Record<string, { agentType: AgentType; label: string }> = {};
        for (const pid of paneIds) {
          const a = agents[pid];
          if (a) {
            agentMap[pid] = {
              agentType: a.config.agent_type,
              label: a.config.label,
            };
          }
        }
        return {
          label: tab.label,
          rootNode: tab.rootNode,
          agents: agentMap,
        };
      }),
    };

    await saveWorkspace(saveName, JSON.stringify(savedLayout));
    setSaveName("");
    setMode("list");
    refresh();
  };

  const handleLoad = async (name: string) => {
    setLoading(true);
    try {
      const data = await loadWorkspace(name);
      const saved: SavedLayout = JSON.parse(data);

      // Rebuild: for each tab, spawn agents for each pane and remap IDs
      for (let i = 0; i < saved.tabs.length; i++) {
        const savedTab = saved.tabs[i];
        const paneIds = getAllPaneIds(savedTab.rootNode);

        // Spawn agents for each pane
        for (const oldPaneId of paneIds) {
          const agentInfo = savedTab.agents[oldPaneId];
          const agentType = agentInfo?.agentType ?? "shell";
          const label = agentInfo?.label ?? "Shell";
          const config = createAgentConfig(agentType, { label });

          const backendId = await spawnAgent(config);
          agentStore$.getValue().agents[oldPaneId] = {
            id: oldPaneId,
            config,
            state: "running",
            backendId,
            createdAt: Date.now(),
          };
        }

        if (i === 0) {
          // Replace current tab's layout
          const ws = workspaceStore$.getValue();
          ws.tabs = ws.tabs.map((t, idx) =>
            idx === 0
              ? { ...t, label: savedTab.label, rootNode: savedTab.rootNode }
              : t
          );
        } else {
          // Add new tabs
          const ws = workspaceStore$.getValue();
          ws.tabs = [
            ...ws.tabs,
            {
              id: generateId(),
              label: savedTab.label,
              rootNode: savedTab.rootNode,
            },
          ];
        }
      }

      onClose();
    } catch (err) {
      console.error("Failed to load workspace:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (name: string) => {
    await deleteWorkspace(name);
    refresh();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    if (e.key === "Enter" && mode === "save") handleSave();
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
        onKeyDown={handleKeyDown}
        style={{
          backgroundColor: "#1a1b26",
          border: "1px solid #292e42",
          borderRadius: 8,
          padding: 20,
          width: 440,
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 15, color: "#c0caf5" }}>
            Workspaces
          </h3>
          <div style={{ display: "flex", gap: 4 }}>
            <TabBtn
              label="Load"
              active={mode === "list"}
              onClick={() => setMode("list")}
            />
            <TabBtn
              label="Save"
              active={mode === "save"}
              onClick={() => setMode("save")}
            />
          </div>
        </div>

        {mode === "save" && (
          <div style={{ marginBottom: 12 }}>
            <input
              autoFocus
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Workspace name..."
              style={inputStyle}
            />
            <button
              onClick={handleSave}
              disabled={!saveName.trim()}
              style={{
                ...btnStyle,
                marginTop: 8,
                width: "100%",
                backgroundColor: saveName.trim() ? "#7aa2f7" : "#292e42",
                color: saveName.trim() ? "#1a1b26" : "#565f89",
                fontWeight: 600,
              }}
            >
              Save Current Layout
            </button>
          </div>
        )}

        {mode === "list" && (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {workspaces.length === 0 ? (
              <p style={{ fontSize: 15, color: "#565f89", textAlign: "center", padding: 20 }}>
                No saved workspaces yet.
              </p>
            ) : (
              workspaces.map((ws) => (
                <div
                  key={ws.name}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    backgroundColor: "#16161e",
                    borderRadius: 4,
                    border: "1px solid #292e42",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 15,
                        color: "#c0caf5",
                        fontFamily: "monospace",
                      }}
                    >
                      {ws.name}
                    </div>
                    <div style={{ fontSize: 15, color: "#565f89" }}>
                      {new Date(ws.created_at * 1000).toLocaleString()}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      onClick={() => handleLoad(ws.name)}
                      disabled={loading}
                      style={{
                        ...btnStyle,
                        backgroundColor: "#7aa2f720",
                        color: "#7aa2f7",
                        border: "1px solid #7aa2f740",
                      }}
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleDelete(ws.name)}
                      style={{
                        ...btnStyle,
                        color: "#f7768e",
                        border: "1px solid #f7768e30",
                      }}
                    >
                      Del
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button onClick={onClose} style={btnStyle}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "3px 10px",
        borderRadius: 4,
        border: `1px solid ${active ? "#7aa2f7" : "#292e42"}`,
        backgroundColor: active ? "#7aa2f720" : "transparent",
        color: active ? "#7aa2f7" : "#565f89",
        fontSize: 15,
        fontFamily: "monospace",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  backgroundColor: "#16161e",
  border: "1px solid #292e42",
  borderRadius: 4,
  color: "#a9b1d6",
  fontSize: 15,
  fontFamily: "monospace",
  outline: "none",
};

const btnStyle: React.CSSProperties = {
  padding: "5px 12px",
  backgroundColor: "transparent",
  border: "1px solid #292e42",
  borderRadius: 4,
  color: "#a9b1d6",
  fontSize: 15,
  fontFamily: "monospace",
  cursor: "pointer",
};
