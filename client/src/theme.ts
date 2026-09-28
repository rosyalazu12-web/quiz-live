import type { Theme } from "./types";

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}
