import { Subject } from "subjecto";
import { useSubject } from "subjecto/react";

const SETTINGS_KEY = "terminator:settings";

function loadSavedSettings(): { uiFontSize: number; termFontSize: number; termFontFamily: string; themeName: string } {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { themeName: "Tokyo Night", ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { uiFontSize: 12, termFontSize: 14, termFontFamily: "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace", themeName: "Tokyo Night" };
}

function persistSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({
      uiFontSize: $uiFontSize.getValue(),
      termFontSize: $termFontSize.getValue(),
      termFontFamily: $termFontFamily.getValue(),
      themeName: $themeName.getValue(),
    }));
  } catch { /* ignore */ }
}

const saved = loadSavedSettings();

export const $uiFontSize = new Subject(saved.uiFontSize, { name: "uiFontSize" });
export const $termFontSize = new Subject(saved.termFontSize, { name: "termFontSize" });
export const $termFontFamily = new Subject(saved.termFontFamily, { name: "termFontFamily" });
export const $themeName = new Subject(saved.themeName, { name: "themeName" });

export function increaseFont() {
  $uiFontSize.next(Math.min(24, $uiFontSize.getValue() + 1));
  $termFontSize.next(Math.min(32, $termFontSize.getValue() + 1));
  persistSettings();
}

export function decreaseFont() {
  $uiFontSize.next(Math.max(8, $uiFontSize.getValue() - 1));
  $termFontSize.next(Math.max(8, $termFontSize.getValue() - 1));
  persistSettings();
}

export function setTermFontFamily(family: string) {
  $termFontFamily.next(family);
  persistSettings();
}

export function setThemeName(name: string) {
  $themeName.next(name);
  persistSettings();
}

/** Load a Google Font by injecting a <link> tag */
export function loadGoogleFont(fontFamily: string) {
  const id = `gfont-${fontFamily.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

// React hook for components
export function useSettingsStore() {
  const [uiFontSize, setUIFontSizeRaw] = useSubject($uiFontSize);
  const [termFontSize, setTermFontSizeRaw] = useSubject($termFontSize);
  const [termFontFamily] = useSubject($termFontFamily);
  const [themeName] = useSubject($themeName);
  return {
    uiFontSize,
    termFontSize,
    termFontFamily,
    themeName,
    setUIFontSize: (v: number) => { setUIFontSizeRaw(Math.max(8, Math.min(24, v))); persistSettings(); },
    setTermFontSize: (v: number) => { setTermFontSizeRaw(Math.max(8, Math.min(32, v))); persistSettings(); },
    setTermFontFamily,
    setThemeName,
    increaseFont,
    decreaseFont,
  };
}
