import { useState, useRef, type ReactNode } from "react";
import { getHelpForContext } from "../../lib/help-content";

interface TooltipProps {
  helpId?: string;
  text?: string;
  shortcut?: string;
  children: ReactNode;
  position?: "top" | "bottom";
}

export function Tooltip({
  helpId,
  text,
  shortcut,
  children,
  position = "bottom",
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const entry = helpId ? getHelpForContext(helpId) : null;
  const label = text || entry?.description || "";
  const kbd = shortcut || entry?.shortcut;

  if (!label && !kbd) return <>{children}</>;

  const show = () => {
    timeoutRef.current = setTimeout(() => setVisible(true), 500);
  };
  const hide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  };

  return (
    <div
      onMouseEnter={show}
      onMouseLeave={hide}
      style={{ position: "relative", display: "inline-flex" }}
    >
      {children}
      {visible && (
        <div
          style={{
            position: "absolute",
            [position === "bottom" ? "top" : "bottom"]: "calc(100% + 6px)",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#16161e",
            border: "1px solid #292e42",
            borderRadius: 6,
            padding: "6px 10px",
            zIndex: 1100,
            whiteSpace: "nowrap",
            maxWidth: 280,
            pointerEvents: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              color: "#a9b1d6",
              whiteSpace: "normal",
              lineHeight: 1.3,
            }}
          >
            {label}
          </div>
          {kbd && (
            <div style={{ marginTop: 4, display: "flex", gap: 4 }}>
              {kbd.split(" / ").map((k, i) => (
                <kbd
                  key={i}
                  style={{
                    padding: "1px 5px",
                    backgroundColor: "#292e42",
                    border: "1px solid #414868",
                    borderRadius: 3,
                    color: "#7aa2f7",
                    fontSize: 10,
                    fontFamily: "monospace",
                  }}
                >
                  {k}
                </kbd>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
