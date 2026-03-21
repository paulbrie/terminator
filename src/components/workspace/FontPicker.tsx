import { useState, useEffect, useRef, useMemo } from "react";
import { Search } from "lucide-react";
import { loadGoogleFont } from "../../stores/useSettingsStore";

// Popular monospace / coding fonts from Google Fonts
const GOOGLE_MONO_FONTS = [
  "Fira Code",
  "JetBrains Mono",
  "Source Code Pro",
  "IBM Plex Mono",
  "Roboto Mono",
  "Ubuntu Mono",
  "Inconsolata",
  "Space Mono",
  "Cousine",
  "PT Mono",
  "Noto Sans Mono",
  "Red Hat Mono",
  "DM Mono",
  "Overpass Mono",
  "Anonymous Pro",
  "Share Tech Mono",
  "Azeret Mono",
  "Martian Mono",
  "Geist Mono",
  "Commit Mono",
];

const SYSTEM_FONTS = [
  { label: "SF Mono (System)", value: "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace" },
  { label: "Menlo (System)", value: "'Menlo', 'Monaco', 'Courier New', monospace" },
  { label: "Monaco (System)", value: "'Monaco', 'Courier New', monospace" },
  { label: "Courier New (System)", value: "'Courier New', monospace" },
];

interface FontPickerProps {
  value: string;
  onChange: (fontFamily: string) => void;
}

export function FontPicker({ value, onChange }: FontPickerProps) {
  const [search, setSearch] = useState("");
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLDivElement>(null);

  // Determine the display label for the current value
  const currentLabel = useMemo(() => {
    const sys = SYSTEM_FONTS.find((f) => f.value === value);
    if (sys) return sys.label;
    return value.replace(/'/g, "");
  }, [value]);

  // Filter fonts by search
  const filteredSystem = useMemo(
    () => SYSTEM_FONTS.filter((f) => f.label.toLowerCase().includes(search.toLowerCase())),
    [search]
  );
  const filteredGoogle = useMemo(
    () => GOOGLE_MONO_FONTS.filter((f) => f.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  // Preload Google fonts that are visible for preview
  useEffect(() => {
    for (const font of filteredGoogle) {
      if (!loadedFonts.has(font)) {
        loadGoogleFont(font);
        setLoadedFonts((prev) => new Set(prev).add(font));
      }
    }
  }, [filteredGoogle, loadedFonts]);

  const handleSelect = (fontFamily: string) => {
    onChange(fontFamily);
  };

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
        Terminal Font
      </label>

      {/* Current font display */}
      <div
        style={{
          fontSize: 13,
          color: "#c0caf5",
          fontFamily: value,
          marginBottom: 8,
          padding: "6px 10px",
          backgroundColor: "#292e42",
          borderRadius: 4,
          border: "1px solid #414868",
        }}
      >
        {currentLabel}
        <span style={{ float: "right", color: "#565f89", fontSize: 11, fontFamily: "monospace" }}>
          The quick brown fox
        </span>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 8 }}>
        <Search
          size={14}
          style={{ position: "absolute", left: 8, top: 8, color: "#565f89" }}
        />
        <input
          type="text"
          placeholder="Search fonts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            padding: "6px 10px 6px 28px",
            backgroundColor: "#292e42",
            border: "1px solid #414868",
            borderRadius: 4,
            color: "#c0caf5",
            fontSize: 12,
            fontFamily: "monospace",
            outline: "none",
          }}
        />
      </div>

      {/* Font list */}
      <div
        ref={listRef}
        style={{
          maxHeight: 200,
          overflowY: "auto",
          border: "1px solid #292e42",
          borderRadius: 4,
          backgroundColor: "#16161e",
        }}
      >
        {/* System fonts */}
        {filteredSystem.length > 0 && (
          <>
            <div style={sectionHeaderStyle}>System</div>
            {filteredSystem.map((f) => (
              <FontItem
                key={f.value}
                label={f.label}
                fontFamily={f.value}
                selected={value === f.value}
                onClick={() => handleSelect(f.value)}
              />
            ))}
          </>
        )}

        {/* Google Fonts */}
        {filteredGoogle.length > 0 && (
          <>
            <div style={sectionHeaderStyle}>Google Fonts</div>
            {filteredGoogle.map((f) => (
              <FontItem
                key={f}
                label={f}
                fontFamily={`'${f}', monospace`}
                selected={value === `'${f}', monospace`}
                onClick={() => handleSelect(`'${f}', monospace`)}
              />
            ))}
          </>
        )}

        {filteredSystem.length === 0 && filteredGoogle.length === 0 && (
          <div style={{ padding: 12, textAlign: "center", color: "#565f89", fontSize: 12 }}>
            No fonts found
          </div>
        )}
      </div>
    </div>
  );
}

function FontItem({
  label,
  fontFamily,
  selected,
  onClick,
}: {
  label: string;
  fontFamily: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        padding: "6px 10px",
        backgroundColor: selected ? "#7aa2f720" : "transparent",
        border: "none",
        borderLeft: selected ? "2px solid #7aa2f7" : "2px solid transparent",
        color: selected ? "#7aa2f7" : "#a9b1d6",
        fontSize: 13,
        fontFamily,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {label}
      <span style={{ float: "right", color: "#565f89", fontSize: 11 }}>
        abcdef 0123
      </span>
    </button>
  );
}

const sectionHeaderStyle: React.CSSProperties = {
  padding: "6px 10px 4px",
  fontSize: 10,
  fontFamily: "monospace",
  color: "#565f89",
  textTransform: "uppercase",
  letterSpacing: 1,
  borderBottom: "1px solid #292e42",
};
