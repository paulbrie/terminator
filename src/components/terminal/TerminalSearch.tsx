import { useState, useRef, useEffect, useCallback } from "react";
import type { SearchAddon } from "@xterm/addon-search";

interface TerminalSearchProps {
  searchAddon: React.RefObject<SearchAddon | null>;
  visible: boolean;
  onClose: () => void;
}

export function TerminalSearch({ searchAddon, visible, onClose }: TerminalSearchProps) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      searchAddon.current?.clearDecorations();
      setQuery("");

    }
  }, [visible, searchAddon]);

  const doSearch = useCallback(
    (q: string, direction: "next" | "prev") => {
      if (!searchAddon.current || !q) {
  
        return;
      }
      const opts = {
        regex: false,
        caseSensitive: false,
        decorations: {
          matchBackground: "#e0af68",
          matchBorder: "#e0af68",
          matchOverviewRuler: "#e0af68",
          activeMatchBackground: "#ff9e64",
          activeMatchBorder: "#ff9e64",
          activeMatchColorOverviewRuler: "#ff9e64",
        },
      };
      if (direction === "next") {
        searchAddon.current.findNext(q, opts);
      } else {
        searchAddon.current.findPrevious(q, opts);
      }
    },
    [searchAddon]
  );

  const handleChange = (value: string) => {
    setQuery(value);
    if (value) {
      doSearch(value, "next");
    } else {
      searchAddon.current?.clearDecorations();

    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
    if (e.key === "Enter") {
      e.preventDefault();
      doSearch(query, e.shiftKey ? "prev" : "next");
    }
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 8,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 8px",
        backgroundColor: "#1a1b26",
        border: "1px solid #7aa2f7",
        borderTop: "none",
        borderRadius: "0 0 6px 6px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      }}
    >
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search..."
        style={{
          width: 180,
          padding: "4px 6px",
          backgroundColor: "#16161e",
          border: "1px solid #292e42",
          borderRadius: 3,
          color: "#a9b1d6",
          fontSize: 15,
          fontFamily: "monospace",
          outline: "none",
        }}
      />
      <button onClick={() => doSearch(query, "prev")} style={navBtnStyle} title="Previous (Shift+Enter)">
        ↑
      </button>
      <button onClick={() => doSearch(query, "next")} style={navBtnStyle} title="Next (Enter)">
        ↓
      </button>
      <button onClick={onClose} style={navBtnStyle} title="Close (Esc)">
        ×
      </button>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#a9b1d6",
  fontSize: 15,
  cursor: "pointer",
  padding: "2px 4px",
  fontFamily: "monospace",
};
