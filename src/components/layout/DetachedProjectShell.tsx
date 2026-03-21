import { useEffect, useRef } from "react";
import { batch } from "subjecto";
import { MonitorDown } from "lucide-react";
import { TerminalView } from "../terminal/TerminalView";
import { $agentStore } from "../../stores/useAgentStore";
import { $themeName } from "../../stores/useSettingsStore";
import { getThemeByName, applyThemeToDOM } from "../../lib/themes";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";
import type { AgentConfig } from "../../types/agent";

interface PaneDescriptor {
  paneId: string;
  backendId: string;
  agentConfig: AgentConfig;
  bgColor: string;
}

export interface DetachedProjectParams {
  projectId: string;
  projectName: string;
  projectColor: string;
  panes: PaneDescriptor[];
}

export function parseDetachedProjectParams(): DetachedProjectParams | null {
  const params = new URLSearchParams(window.location.search);
  if (params.get("detachedProject") !== "true") return null;

  const projectId = params.get("projectId");
  const projectName = params.get("projectName");
  const panesStr = params.get("panes");
  if (!projectId || !projectName || !panesStr) return null;

  try {
    const panes = JSON.parse(panesStr) as PaneDescriptor[];
    return {
      projectId,
      projectName,
      projectColor: params.get("projectColor") || "",
      panes,
    };
  } catch {
    return null;
  }
}

export function DetachedProjectShell({ params }: { params: DetachedProjectParams }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const themeName = $themeName.getValue();
    const theme = getThemeByName(themeName);
    applyThemeToDOM(theme);

    batch(() => {
      for (const pane of params.panes) {
        $agentStore.getValue().agents[pane.paneId] = {
          id: pane.paneId,
          config: pane.agentConfig,
          state: "running",
          backendId: pane.backendId,
          createdAt: Date.now(),
          ptyActivity: "idle",
        };
      }
    });
  }, [params]);

  const handleReattach = async () => {
    await emit("detached-project:reattach", {
      projectId: params.projectId,
      panes: params.panes,
    });
    const agents = $agentStore.getValue().agents;
    for (const pane of params.panes) {
      delete agents[pane.paneId];
    }
    await getCurrentWindow().close();
  };

  const count = params.panes.length;
  const cols = count <= 1 ? 1 : count <= 4 ? 2 : count <= 9 ? 3 : 4;

  return (
    <div style={{
      width: "100vw", height: "100vh",
      backgroundColor: "#1a1b26", overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center",
        padding: "4px 12px", backgroundColor: "#16161e",
        borderBottom: "1px solid #292e42", minHeight: 28,
        fontSize: 12, fontFamily: "monospace", color: "#565f89",
        WebkitAppRegion: "drag", userSelect: "none",
      } as React.CSSProperties}>
        {params.projectColor && (
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            backgroundColor: params.projectColor, marginRight: 8,
          }} />
        )}
        <span style={{ color: "#7aa2f7" }}>{params.projectName}</span>
        <span style={{ marginLeft: 8, color: "#414868" }}>
          {count} pane{count !== 1 ? "s" : ""} — detached project
        </span>
        <div style={{ flex: 1 }} />
        <button
          title="Reattach project to main window"
          onClick={handleReattach}
          style={{
            background: "none", border: "none", color: "#565f89",
            cursor: "pointer", padding: "0 4px", lineHeight: 1,
            display: "flex", alignItems: "center",
            WebkitAppRegion: "no-drag",
          } as React.CSSProperties}
        >
          <MonitorDown size={14} />
          <span style={{ marginLeft: 4, fontSize: 11 }}>Reattach</span>
        </button>
      </div>

      {/* Grid of terminals */}
      <div style={{
        flex: 1, display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: 1, overflow: "hidden",
      }}>
        {params.panes.map((pane) => (
          <div key={pane.paneId} style={{
            overflow: "hidden", display: "flex", flexDirection: "column",
            borderRight: "1px solid #292e42",
          }}>
            <div style={{
              padding: "2px 8px", fontSize: 11, fontFamily: "monospace",
              color: "#565f89", backgroundColor: "#16161e",
              borderBottom: "1px solid #292e42",
            }}>
              {pane.agentConfig.label}
            </div>
            <div style={{ flex: 1, overflow: "hidden", padding: "2px 4px" }}>
              <TerminalView
                paneId={pane.paneId}
                agentBackendId={pane.backendId}
                agentType={pane.agentConfig.agent_type}
                bgColor={pane.bgColor || undefined}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
