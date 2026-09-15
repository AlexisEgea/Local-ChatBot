/** Light, dark, and custom page/glass colors from the Chat Mode panel. */

import { enhanceSelect, syncChoiceLabel } from "./model-options.js";

const STORAGE_KEY = "local-chatbot-theme";
const CUSTOM_VARS = [
  "--page-bg",
  "--page-fg",
  "--page-muted",
  "--page-placeholder",
  "--glass-from",
  "--glass-to",
  "--glass-border",
  "--glass-inset-top",
  "--glass-inset-bottom",
  "--glass-drop",
  "--center-glow",
  "--blob-1",
  "--blob-2",
  "--blob-3",
  "--blob-4",
  "--choice-bg",
  "--choice-border",
];

const root = document.documentElement;
const themeSelect = document.getElementById("theme-mode");
const customSection = document.getElementById("theme-custom-section");
const bgInput = document.getElementById("theme-bg-color");
const glassInput = document.getElementById("theme-glass-color");

enhanceSelect(themeSelect);

/** Parse a hex color into RGB channels. */
function hexToRgb(hex) {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map((char) => char + char).join("") : raw;
  const value = Number.parseInt(full, 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

/** Build an rgba() CSS color from a hex value. */
function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** Return relative luminance of a hex color, 0 (dark) to 1 (light). */
function luminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Remove inline custom-theme CSS variables from the document. */
function clearCustomVars() {
  for (const name of CUSTOM_VARS) {
    root.style.removeProperty(name);
  }
}

/** Read the last theme choice from localStorage. */
function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** Persist the current theme choice to localStorage. */
function writeStore(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Return the selected appearance. */
function selectedMode() {
  return themeSelect.value || "light";
}

/** Apply custom background and glass colors as CSS variables. */
function applyCustomColors(background, glass) {
  const lightPage = luminance(background) > 0.55;
  const lightGlass = luminance(glass) > 0.55;
  root.style.setProperty("--page-bg", background);
  root.style.setProperty("--page-fg", lightPage ? "#1c1c1e" : "#f2f4f8");
  root.style.setProperty("--page-muted", lightPage ? "#5c616a" : "#9aa0aa");
  root.style.setProperty("--page-placeholder", lightPage ? "#7a808a" : "#8b909a");
  root.style.setProperty("--glass-from", rgba(glass, lightGlass ? 0.58 : 0.72));
  root.style.setProperty("--glass-to", rgba(glass, lightGlass ? 0.16 : 0.32));
  root.style.setProperty("--glass-border", rgba(glass, lightGlass ? 0.7 : 0.45));
  root.style.setProperty("--glass-inset-top", rgba("#ffffff", lightGlass ? 0.9 : 0.22));
  root.style.setProperty("--glass-inset-bottom", rgba(glass, lightGlass ? 0.08 : 0.2));
  root.style.setProperty("--glass-drop", lightPage ? "rgba(80, 90, 110, 0.12)" : "rgba(0, 0, 0, 0.38)");
  root.style.setProperty("--center-glow", rgba("#ffffff", lightPage ? 0.45 : 0.08));
  root.style.setProperty("--blob-1", rgba(glass, 0.4));
  root.style.setProperty("--blob-2", rgba(glass, 0.28));
  root.style.setProperty("--blob-3", rgba(background, 0.35));
  root.style.setProperty("--blob-4", rgba(glass, 0.22));
  root.style.setProperty("--choice-bg", rgba(glass, lightGlass ? 0.28 : 0.08));
  root.style.setProperty("--choice-border", rgba(glass, lightGlass ? 0.45 : 0.16));
}

/** Apply Light, Dark, or Custom from the Chat Mode radios and color inputs. */
function applyTheme() {
  const mode = selectedMode();
  const background = bgInput.value;
  const glass = glassInput.value;
  root.dataset.theme = mode;
  customSection.hidden = mode !== "custom";

  if (mode === "custom") {
    applyCustomColors(background, glass);
    root.style.colorScheme = luminance(background) > 0.55 ? "light" : "dark";
  } else {
    clearCustomVars();
    root.style.removeProperty("color-scheme");
  }

  writeStore({ mode, background, glass });
}

/** Restore the last theme and bind the Chat Mode color controls. */
export function initTheme() {
  const saved = readStore();
  const mode = saved.mode === "dark" || saved.mode === "custom" ? saved.mode : "light";
  themeSelect.value = mode;
  syncChoiceLabel(themeSelect);
  if (saved.background) {
    bgInput.value = saved.background;
  }
  if (saved.glass) {
    glassInput.value = saved.glass;
  }

  themeSelect.addEventListener("change", applyTheme);
  document.getElementById("chat-mode").addEventListener("change", (event) => {
    if (event.target.id === "theme-bg-color" || event.target.id === "theme-glass-color") {
      applyTheme();
    }
  });
  document.getElementById("chat-mode").addEventListener("input", (event) => {
    if (event.target.id === "theme-bg-color" || event.target.id === "theme-glass-color") {
      applyTheme();
    }
  });

  applyTheme();
}
