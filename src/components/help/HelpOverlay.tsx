import { useState, useEffect, useRef } from "react";
import { HELP_ENTRIES, CATEGORIES, searchHelp, type HelpEntry } from "../../lib/help-content";

interface HelpOverlayProps {
  onClose: () => void;
}

export function HelpOverlay({ onClose }: HelpOverlayProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const entries = query
    ? searchHelp(query)
    : activeCategory
      ? HELP_ENTRIES.filter((e) => e.category === activeCategory)
      : HELP_ENTRIES;

  const grouped = !query && !activeCategory;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 60,
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
          borderRadius: 12,
          width: 560,
          maxWidth: "90vw",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
        }}
      >
        {/* Search bar */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #292e42",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: "#565f89", fontSize: 14 }}>?</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveCategory(null);
            }}
            placeholder="Search help... (e.g. 'split', 'broadcast', '⌘K')"
            style={{
              flex: 1,
              backgroundColor: "transparent",
              border: "none",
              color: "#c0caf5",
              fontSize: 14,
              fontFamily: "'SF Mono', 'Menlo', monospace",
              outline: "none",
            }}
          />
          <kbd style={kbdStyle}>Esc</kbd>
        </div>

        {/* Category pills */}
        {!query && (
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: "8px 16px",
              borderBottom: "1px solid #292e42",
              flexWrap: "wrap",
            }}
          >
            <CategoryPill
              label="All"
              active={activeCategory === null}
              onClick={() => setActiveCategory(null)}
            />
            {CATEGORIES.map((cat) => (
              <CategoryPill
                key={cat}
                label={cat}
                active={activeCategory === cat}
                onClick={() => setActiveCategory(cat)}
              />
            ))}
          </div>
        )}

        {/* Results */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {grouped
            ? CATEGORIES.map((cat) => (
                <div key={cat}>
                  <div
                    style={{
                      padding: "8px 16px 4px",
                      fontSize: 10,
                      fontWeight: 600,
                      color: "#7aa2f7",
                      fontFamily: "monospace",
                      textTransform: "uppercase",
                      letterSpacing: 1,
                    }}
                  >
                    {cat}
                  </div>
                  {HELP_ENTRIES.filter((e) => e.category === cat).map((entry) => (
                    <HelpItem key={entry.id} entry={entry} query={query} />
                  ))}
                </div>
              ))
            : entries.map((entry) => (
                <HelpItem key={entry.id} entry={entry} query={query} />
              ))}
          {entries.length === 0 && (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "#565f89",
                fontSize: 13,
                fontFamily: "monospace",
              }}
            >
              No results for "{query}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "8px 16px",
            borderTop: "1px solid #292e42",
            fontSize: 11,
            color: "#565f89",
            fontFamily: "monospace",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Terminator v0.1.0</span>
          <span>⌘? to toggle help</span>
        </div>
      </div>
    </div>
  );
}

function HelpItem({ entry, query }: { entry: HelpEntry; query: string }) {
  return (
    <div
      style={{
        padding: "6px 16px",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 13,
            color: "#c0caf5",
            fontFamily: "monospace",
            marginBottom: 2,
          }}
        >
          {highlightMatch(entry.title, query)}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#565f89",
            lineHeight: 1.4,
          }}
        >
          {highlightMatch(entry.description, query)}
        </div>
      </div>
      {entry.shortcut && (
        <div style={{ display: "flex", gap: 4, flexShrink: 0, marginTop: 2 }}>
          {entry.shortcut.split(" / ").map((k, i) => (
            <kbd key={i} style={kbdStyle}>
              {k}
            </kbd>
          ))}
        </div>
      )}
    </div>
  );
}

function highlightMatch(text: string, query: string) {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: "#e0af68", fontWeight: 600 }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}

function CategoryPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "3px 10px",
        borderRadius: 10,
        border: `1px solid ${active ? "#7aa2f7" : "#292e42"}`,
        backgroundColor: active ? "#7aa2f720" : "transparent",
        color: active ? "#7aa2f7" : "#565f89",
        fontSize: 11,
        fontFamily: "monospace",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

const kbdStyle: React.CSSProperties = {
  padding: "2px 6px",
  backgroundColor: "#292e42",
  border: "1px solid #414868",
  borderRadius: 4,
  color: "#a9b1d6",
  fontSize: 10,
  fontFamily: "monospace",
  whiteSpace: "nowrap",
};
