import { useRef, useCallback, useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { useTerminal } from "./useTerminal";
import { setAgentState, agentStore$ } from "../../stores/useAgentStore";
import { forwardOutput } from "../../stores/usePipeStore";
import { appendSessionOutput } from "../../lib/tauri-commands";
import { TerminalSearch } from "./TerminalSearch";
import type { SearchAddon } from "@xterm/addon-search";

interface TerminalViewProps {
  paneId: string;
  agentBackendId: string | null;
}

export interface TerminalViewHandle {
  toggleSearch: () => void;
  getBufferContent: () => string;
}

export const TerminalView = forwardRef<TerminalViewHandle, TerminalViewProps>(
  function TerminalView({ paneId, agentBackendId }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [searchVisible, setSearchVisible] = useState(false);

    const scheduleIdle = useCallback(() => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setAgentState(paneId, "idle");
      }, 3000);
    }, [paneId]);

    // Batch session log writes
    const logBufferRef = useRef("");
    const logTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const flushLog = useCallback(() => {
      const agent = agentStore$.getValue().agents[paneId];
      if (agent?.backendId && logBufferRef.current) {
        appendSessionOutput(agent.backendId, logBufferRef.current).catch(() => {});
        logBufferRef.current = "";
      }
    }, [paneId]);

    const handleOutput = useCallback(
      (data: string) => {
        setAgentState(paneId, "running");
        scheduleIdle();
        forwardOutput(paneId, data);

        // Buffer log writes (flush every 500ms)
        logBufferRef.current += data;
        if (!logTimerRef.current) {
          logTimerRef.current = setTimeout(() => {
            flushLog();
            logTimerRef.current = null;
          }, 500);
        }
      },
      [paneId, scheduleIdle, flushLog]
    );

    const handleExit = useCallback(() => {
      setAgentState(paneId, "done");
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    }, [paneId]);

    const { terminal, searchAddon } = useTerminal(containerRef, {
      agentBackendId,
      paneId,
      onOutput: handleOutput,
      onExit: handleExit,
    });

    useImperativeHandle(ref, () => ({
      toggleSearch: () => setSearchVisible((v) => !v),
      getBufferContent: () => {
        const term = terminal.current;
        if (!term) return "";
        const lines: string[] = [];
        const buf = term.buffer.active;
        for (let i = 0; i < buf.length; i++) {
          const line = buf.getLine(i);
          if (line) lines.push(line.translateToString(true));
        }
        return lines.join("\n");
      },
    }));

    // Listen for search toggle event from AppShell
    useEffect(() => {
      const handler = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail?.paneId === paneId) {
          setSearchVisible((v) => !v);
        }
      };
      window.addEventListener("terminator:search", handler);
      return () => {
        window.removeEventListener("terminator:search", handler);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      };
    }, [paneId]);

    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          overflow: "hidden",
          position: "relative",
        }}
      >
        <TerminalSearch
          searchAddon={searchAddon as React.RefObject<SearchAddon | null>}
          visible={searchVisible}
          onClose={() => setSearchVisible(false)}
        />
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "100%",
            overflow: "hidden",
          }}
        />
      </div>
    );
  }
);
