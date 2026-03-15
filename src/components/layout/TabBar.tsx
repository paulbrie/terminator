import { useState, useRef, useEffect } from "react";
import {
  useTabs,
  useActiveTabId,
  setActiveTab,
  removeTab,
  renameTab,
} from "../../stores/useWorkspaceStore";
import { removeAgent } from "../../stores/useAgentStore";

interface TabBarProps {
  onNewTab: () => void;
}

export function TabBar({ onNewTab }: TabBarProps) {
  const tabs = useTabs();
  const activeTabId = useActiveTabId();
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTabId) inputRef.current?.focus();
  }, [editingTabId]);

  const handleCloseTab = (tabId: string) => {
    const paneIds = removeTab(tabId);
    paneIds.forEach(removeAgent);
  };

  const startRename = (tabId: string, currentLabel: string) => {
    setEditingTabId(tabId);
    setEditValue(currentLabel);
  };

  const commitRename = () => {
    if (editingTabId && editValue.trim()) {
      renameTab(editingTabId, editValue.trim());
    }
    setEditingTabId(null);
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        padding: "0 8px",
        height: 36,
        backgroundColor: "#16161e",
        borderBottom: "1px solid #292e42",
        WebkitAppRegion: "drag",
        overflow: "hidden",
      } as React.CSSProperties}
    >
      {tabs.map((tab) => (
        <div
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          onDoubleClick={() => startRename(tab.id, tab.label)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 12px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
            fontFamily: "monospace",
            color: activeTabId === tab.id ? "#c0caf5" : "#565f89",
            backgroundColor:
              activeTabId === tab.id ? "#1a1b26" : "transparent",
            WebkitAppRegion: "no-drag",
          } as React.CSSProperties}
        >
          {editingTabId === tab.id ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditingTabId(null);
              }}
              style={{
                width: 80,
                padding: "0 2px",
                backgroundColor: "#292e42",
                border: "1px solid #7aa2f7",
                borderRadius: 3,
                color: "#c0caf5",
                fontSize: 13,
                fontFamily: "monospace",
                outline: "none",
              }}
            />
          ) : (
            <span>{tab.label}</span>
          )}
          {tabs.length > 1 && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                handleCloseTab(tab.id);
              }}
              style={{
                fontSize: 14,
                lineHeight: 1,
                color: "#565f89",
                cursor: "pointer",
              }}
            >
              ×
            </span>
          )}
        </div>
      ))}

      <button
        onClick={onNewTab}
        style={{
          background: "none",
          border: "none",
          color: "#565f89",
          fontSize: 16,
          cursor: "pointer",
          padding: "2px 8px",
          borderRadius: 4,
          WebkitAppRegion: "no-drag",
        } as React.CSSProperties}
      >
        +
      </button>
    </div>
  );
}
