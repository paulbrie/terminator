import { useRef, useCallback, useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { useTerminal } from "./useTerminal";
import { setAgentState } from "../../stores/useAgentStore";
import { $themeName } from "../../stores/useSettingsStore";
import { getThemeByName } from "../../lib/themes";
import { forwardOutput } from "../../stores/usePipeStore";
import { TerminalSearch } from "./TerminalSearch";
import type { SearchAddon } from "@xterm/addon-search";

interface TerminalViewProps {
  paneId: string;
  agentBackendId: string | null;
  agentType?: string;
  bgColor?: string;
}

export interface TerminalViewHandle {
  toggleSearch: () => void;
  getBufferContent: () => string;
}

export const TerminalView = forwardRef<TerminalViewHandle, TerminalViewProps>(
  function TerminalView({ paneId, agentBackendId, agentType, bgColor }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [searchVisible, setSearchVisible] = useState(false);

    const scheduleIdle = useCallback(() => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        setAgentState(paneId, "idle");
      }, 3000);
    }, [paneId]);

    const handleOutput = useCallback(
      (data: string) => {
        setAgentState(paneId, "running");
        scheduleIdle();
        forwardOutput(paneId, data);
      },
      [paneId, scheduleIdle]
    );

    const handleExit = useCallback(() => {
      setAgentState(paneId, "done");
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    }, [paneId]);

    const { terminal, searchAddon } = useTerminal(containerRef, {
      agentBackendId,
      paneId,
      agentType,
      onOutput: handleOutput,
      onExit: handleExit,
    });

    // Apply per-pane background color override
    useEffect(() => {
      const term = terminal.current;
      if (!term) return;
      if (bgColor) {
        term.options.theme = { ...term.options.theme, background: bgColor };
      } else {
        // Reset to theme default
        const theme = getThemeByName($themeName.getValue());
        term.options.theme = { ...term.options.theme, background: theme.terminal.background };
      }
    }, [bgColor, terminal]);

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
