import { Subject } from "subjecto";
import { useSubject } from "subjecto/react";

export const uiFontSize$ = new Subject(12, { name: "uiFontSize" });
export const termFontSize$ = new Subject(14, { name: "termFontSize" });

export function increaseFont() {
  uiFontSize$.next(Math.min(24, uiFontSize$.getValue() + 1));
  termFontSize$.next(Math.min(32, termFontSize$.getValue() + 1));
}

export function decreaseFont() {
  uiFontSize$.next(Math.max(8, uiFontSize$.getValue() - 1));
  termFontSize$.next(Math.max(8, termFontSize$.getValue() - 1));
}

// React hook for components
export function useSettingsStore() {
  const [uiFontSize, setUIFontSize] = useSubject(uiFontSize$);
  const [termFontSize, setTermFontSize] = useSubject(termFontSize$);
  return {
    uiFontSize,
    termFontSize,
    setUIFontSize: (v: number) => setUIFontSize(Math.max(8, Math.min(24, v))),
    setTermFontSize: (v: number) => setTermFontSize(Math.max(8, Math.min(32, v))),
    increaseFont,
    decreaseFont,
  };
}
