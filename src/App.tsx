import { Component, type ReactNode, useEffect } from "react";
import { AppShell } from "./components/layout/AppShell";
import { DetachedPaneShell, parseDetachedParams } from "./components/layout/DetachedPaneShell";
import { DetachedProjectShell, parseDetachedProjectParams } from "./components/layout/DetachedProjectShell";
import { getCurrentWindow } from "@tauri-apps/api/window";

declare const __BUILD_TIMESTAMP__: string;

const detachedParams = parseDetachedParams();
const detachedProjectParams = parseDetachedProjectParams();

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };
  static getDerivedStateFromError(err: Error) {
    return { error: err.message + "\n" + err.stack };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 20, color: "#f7768e", fontFamily: "monospace", fontSize: 15, whiteSpace: "pre-wrap", backgroundColor: "#1a1b26", height: "100vh", overflow: "auto" }}>
          <h2 style={{ color: "#c0caf5" }}>Terminator Error</h2>
          <pre>{this.state.error}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  useEffect(() => {
    if (detachedProjectParams) {
      getCurrentWindow().setTitle(`${detachedProjectParams.projectName} — project`);
    } else if (detachedParams) {
      getCurrentWindow().setTitle(`${detachedParams.agentConfig.label} — detached`);
    } else {
      getCurrentWindow().setTitle(`Terminator — ${__BUILD_TIMESTAMP__}`);
    }
  }, []);

  if (detachedProjectParams) {
    return (
      <ErrorBoundary>
        <DetachedProjectShell params={detachedProjectParams} />
      </ErrorBoundary>
    );
  }

  if (detachedParams) {
    return (
      <ErrorBoundary>
        <DetachedPaneShell params={detachedParams} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
