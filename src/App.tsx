import { Component, type ReactNode } from "react";
import { AppShell } from "./components/layout/AppShell";

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
  return (
    <ErrorBoundary>
      <AppShell />
    </ErrorBoundary>
  );
}
