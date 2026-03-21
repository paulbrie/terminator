import { THEMES, type TerminalTheme } from "../../lib/themes";
import { Check } from "lucide-react";

interface ThemePickerProps {
  value: string;
  onChange: (themeName: string) => void;
}

export function ThemePicker({ value, onChange }: ThemePickerProps) {
  return (
    <div>
      <label
        style={{
          fontSize: 11,
          color: "#565f89",
          fontFamily: "monospace",
          display: "block",
          marginBottom: 8,
        }}
      >
        Color Theme
      </label>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 6,
          maxHeight: 280,
          overflowY: "auto",
          paddingRight: 4,
        }}
      >
        {THEMES.map((theme) => (
          <ThemeCard
            key={theme.name}
            theme={theme}
            selected={value === theme.name}
            onClick={() => onChange(theme.name)}
          />
        ))}
      </div>
    </div>
  );
}

function ThemeCard({
  theme,
  selected,
  onClick,
}: {
  theme: TerminalTheme;
  selected: boolean;
  onClick: () => void;
}) {
  const t = theme.terminal;
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: 8,
        backgroundColor: theme.bg,
        border: `2px solid ${selected ? theme.accent : theme.border}`,
        borderRadius: 6,
        cursor: "pointer",
        textAlign: "left",
        position: "relative",
        transition: "border-color 0.15s",
      }}
    >
      {selected && (
        <div
          style={{
            position: "absolute",
            top: 4,
            right: 4,
            width: 16,
            height: 16,
            borderRadius: "50%",
            backgroundColor: theme.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Check size={10} style={{ color: theme.bg }} />
        </div>
      )}
      <span
        style={{
          fontSize: 10,
          fontFamily: "monospace",
          fontWeight: 600,
          color: theme.fg,
        }}
      >
        {theme.name}
      </span>
      {/* Color swatches preview */}
      <div style={{ display: "flex", gap: 2 }}>
        <Swatch color={t.red} />
        <Swatch color={t.green} />
        <Swatch color={t.yellow} />
        <Swatch color={t.blue} />
        <Swatch color={t.magenta} />
        <Swatch color={t.cyan} />
      </div>
      {/* Mini terminal preview */}
      <div
        style={{
          backgroundColor: t.background,
          borderRadius: 3,
          padding: "3px 5px",
          fontSize: 8,
          fontFamily: "monospace",
          lineHeight: 1.4,
          color: t.foreground,
          overflow: "hidden",
        }}
      >
        <span style={{ color: t.green }}>$</span>{" "}
        <span style={{ color: t.foreground }}>ls</span>{" "}
        <span style={{ color: t.blue }}>src/</span>
        <br />
        <span style={{ color: t.yellow }}>main.ts</span>{" "}
        <span style={{ color: t.magenta }}>App.tsx</span>
      </div>
    </button>
  );
}

function Swatch({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 10,
        height: 10,
        borderRadius: 2,
        backgroundColor: color,
      }}
    />
  );
}
