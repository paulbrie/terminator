import { useSettingsStore } from "../../stores/useSettingsStore";
import { FontPicker } from "./FontPicker";
import { ThemePicker } from "./ThemePicker";

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { uiFontSize, termFontSize, termFontFamily, themeName, setUIFontSize, setTermFontSize, setTermFontFamily, setThemeName } = useSettingsStore();

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
        onKeyDown={(e) => e.key === "Escape" && onClose()}
        style={{
          backgroundColor: "#1a1b26",
          border: "1px solid #292e42",
          borderRadius: 8,
          padding: 24,
          width: 480,
          maxHeight: "85vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <h3 style={{ margin: "0 0 20px", fontSize: 15, color: "#c0caf5" }}>
          Settings
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", flex: 1 }}>
          <FontSizeControl
            label="UI Font Size"
            value={uiFontSize}
            onChange={setUIFontSize}
            min={8}
            max={24}
          />
          <FontSizeControl
            label="Terminal Font Size"
            value={termFontSize}
            onChange={setTermFontSize}
            min={8}
            max={32}
          />

          <FontPicker value={termFontFamily} onChange={setTermFontFamily} />

          <ThemePicker value={themeName} onChange={setThemeName} />
        </div>

        <p style={{ fontSize: 11, color: "#565f89", margin: "16px 0 0", fontFamily: "monospace", flexShrink: 0 }}>
          Tip: Use Cmd+= / Cmd+- to quickly adjust all font sizes.
        </p>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20, flexShrink: 0 }}>
          <button onClick={onClose} style={btnStyle}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function FontSizeControl({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div>
      <label
        style={{
          fontSize: 11,
          color: "#565f89",
          fontFamily: "monospace",
          display: "block",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          style={stepBtnStyle}
        >
          -
        </button>
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ flex: 1, accentColor: "#7aa2f7" }}
        />
        <button
          onClick={() => onChange(value + 1)}
          disabled={value >= max}
          style={stepBtnStyle}
        >
          +
        </button>
        <span
          style={{
            fontSize: 13,
            color: "#c0caf5",
            fontFamily: "monospace",
            minWidth: 32,
            textAlign: "right",
          }}
        >
          {value}px
        </span>
      </div>
    </div>
  );
}

const stepBtnStyle: React.CSSProperties = {
  width: 28,
  height: 28,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "#292e42",
  border: "1px solid #414868",
  borderRadius: 4,
  color: "#c0caf5",
  fontSize: 16,
  fontFamily: "monospace",
  cursor: "pointer",
};

const btnStyle: React.CSSProperties = {
  padding: "6px 20px",
  backgroundColor: "#7aa2f7",
  border: "none",
  borderRadius: 4,
  color: "#1a1b26",
  fontSize: 12,
  fontFamily: "monospace",
  fontWeight: 600,
  cursor: "pointer",
};
