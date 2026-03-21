import { useState, useRef, useEffect } from "react";
import { Palette } from "lucide-react";
import { setPaneBgColor } from "../../stores/useWorkspaceStore";

export const PANE_BG_COLORS = [
  { name: "Default",      value: "" },
  { name: "Midnight",     value: "#252645" },
  { name: "Deep Ocean",   value: "#1e3a5f" },
  { name: "Slate",        value: "#3a3d4e" },
  { name: "Charcoal",     value: "#383842" },
  { name: "Navy",         value: "#253a52" },
  { name: "Forest",       value: "#1e4538" },
  { name: "Evergreen",    value: "#284532" },
  { name: "Moss",         value: "#354528" },
  { name: "Plum",         value: "#3e2848" },
  { name: "Grape",        value: "#352854" },
  { name: "Wine",         value: "#452832" },
  { name: "Rose",         value: "#45283a" },
  { name: "Ember",        value: "#453520" },
  { name: "Rust",         value: "#453228" },
  { name: "Teal",         value: "#1e4545" },
  { name: "Storm",        value: "#2e3850" },
  { name: "Ash",          value: "#383838" },
  { name: "Obsidian",     value: "#2a2a38" },
  { name: "Coffee",       value: "#3a3025" },
  { name: "Ink",          value: "#222230" },
];

interface PaneBgColorPickerProps {
  paneId: string;
  currentColor: string | undefined;
  onColorChange?: (color: string | undefined) => void;
}

export function PaneBgColorPicker({ paneId, currentColor, onColorChange }: PaneBgColorPickerProps) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="Pane background color"
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#a9b1d6"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "#565f89"; }}
        style={{
          background: "none",
          border: "none",
          color: "#565f89",
          cursor: "pointer",
          padding: "0 4px",
          lineHeight: 1,
          display: "flex",
          alignItems: "center",
          transition: "color 0.15s ease",
        }}
      >
        <Palette size={16} />
      </button>

      {open && (
        <div
          ref={popoverRef}
          style={{
            position: "absolute",
            top: "100%",
            right: 0,
            marginTop: 4,
            zIndex: 1000,
            background: "#1a1b26",
            border: "1px solid #292e42",
            borderRadius: 8,
            padding: 10,
            width: 220,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#565f89",
              fontFamily: "monospace",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Background
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 4,
            }}
          >
            {PANE_BG_COLORS.map((c) => {
              const isActive = c.value === (currentColor ?? "");
              const displayColor = c.value || "#1a1b26";
              return (
                <button
                  key={c.name}
                  title={c.name}
                  onClick={(e) => {
                    e.stopPropagation();
                    const newColor = c.value || null;
                    setPaneBgColor(paneId, newColor);
                    onColorChange?.(newColor ?? undefined);
                    setOpen(false);
                  }}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    border: isActive ? "2px solid #7aa2f7" : "1px solid #3b3f54",
                    background: displayColor,
                    cursor: "pointer",
                    padding: 0,
                    transition: "border-color 0.15s",
                  }}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
