import { useEffect, useRef, useState } from "react";
import { batch } from "subjecto";
import { MonitorDown, Search, Download } from "lucide-react";
import { TerminalView } from "../terminal/TerminalView";
import { PaneBgColorPicker } from "./PaneBgColorPicker";
import { $agentStore } from "../../stores/useAgentStore";
import { $themeName } from "../../stores/useSettingsStore";
import { getThemeByName, applyThemeToDOM } from "../../lib/themes";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { emit } from "@tauri-apps/api/event";
import type { AgentConfig } from "../../types/agent";

interface DetachedParams {
  paneId: string;
  backendId: string;
  agentConfig: AgentConfig;
  bgColor?: string;
}

export function parseDetachedParams(): DetachedParams | null {
  const params = new URLSearchParams(window.location.search);
  if (params.get("detached") !== "true") return null;

  const paneId = params.get("paneId");
  const backendId = params.get("backendId");
  const configStr = params.get("agentConfig");
  if (!paneId || !backendId || !configStr) return null;

  try {
    const agentConfig = JSON.parse(configStr) as AgentConfig;
    return {
      paneId,
      backendId,
      agentConfig,
      bgColor: params.get("bgColor") ?? undefined,
    };
  } catch {
    return null;
  }
}

import type { TerminalViewHandle } from "../terminal/TerminalView";
import { ExportDialog } from "../workspace/ExportDialog";

export function DetachedPaneShell({ params }: { params: DetachedParams }) {
  const initialized = useRef(false);
  const terminalRef = useRef<TerminalViewHandle>(null);
  const [bgColor, setBgColor] = useState<string | undefined>(params.bgColor);
  const [exportContent, setExportContent] = useState<string | null>(null);

  // Register the agent in the local store and apply theme
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Apply theme
    const themeName = $themeName.getValue();
    const theme = getThemeByName(themeName);
    applyThemeToDOM(theme);

    // Register the existing PTY session in this window's agent store
    batch(() => {
      $agentStore.getValue().agents[params.paneId] = {
        id: params.paneId,
        config: params.agentConfig,
        state: "running",
        backendId: params.backendId,
        createdAt: Date.now(),
        ptyActivity: "idle",
      };
    });
  }, [params]);

  const headerBtnStyle = {
    background: "none",
    border: "none",
    color: "#565f89",
    cursor: "pointer",
    padding: "0 4px",
    lineHeight: 1,
    display: "flex",
    alignItems: "center",
    WebkitAppRegion: "no-drag",
  } as React.CSSProperties;

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: bgColor || "#1a1b26",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Minimal header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "4px 12px",
          backgroundColor: "#16161e",
          borderBottom: "1px solid #292e42",
          minHeight: 28,
          fontSize: 12,
          fontFamily: "monospace",
          color: "#565f89",
          WebkitAppRegion: "drag",
          userSelect: "none",
        } as React.CSSProperties}
      >
        <span style={{ color: "#7aa2f7" }}>{params.agentConfig.label}</span>
        <span style={{ marginLeft: 8, color: "#414868" }}>detached</span>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 2, alignItems: "center", WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <PaneBgColorPicker
            paneId={params.paneId}
            currentColor={bgColor}
            onColorChange={setBgColor}
          />
          <button
            title="Search (⌘F)"
            onClick={() => terminalRef.current?.toggleSearch()}
            style={headerBtnStyle}
          >
            <Search size={14} />
          </button>
          <button
            title="Export output"
            onClick={() => {
              const content = terminalRef.current?.getBufferContent() ?? "";
              setExportContent(content);
            }}
            style={headerBtnStyle}
          >
            <Download size={14} />
          </button>
          <button
            title="Reattach to main window"
            onClick={async () => {
              await emit("detached:reattach", {
                paneId: params.paneId,
                backendId: params.backendId,
                agentConfig: params.agentConfig,
                bgColor: bgColor || null,
              });
              // Remove from local store so the PTY isn't killed on close
              delete $agentStore.getValue().agents[params.paneId];
              await getCurrentWindow().close();
            }}
            style={headerBtnStyle}
          >
            <MonitorDown size={14} />
          </button>
        </div>
      </div>

      {/* Full-screen terminal */}
      <div style={{ flex: 1, overflow: "hidden", padding: "4px 6px" }}>
        <TerminalView
          ref={terminalRef}
          paneId={params.paneId}
          agentBackendId={params.backendId}
          agentType={params.agentConfig.agent_type}
          bgColor={bgColor}
        />
      </div>

      {/* Export dialog */}
      {exportContent !== null && (
        <ExportDialog
          content={exportContent}
          defaultName={`${params.agentConfig.label}-${params.paneId}`}
          onClose={() => setExportContent(null)}
        />
      )}
    </div>
  );
}

