/** Chat Mode: Light, Dark, or Custom. */

import { enhanceSelect, syncChoiceLabel } from "../../../header/model/choice.js";
import {
  applyCustomColors,
  bgInput,
  clearCustomVars,
  glassInput,
  luminance,
  onThemeColorsChange,
} from "./theme-color.js";

const STORAGE_KEY = "local-chatbot-theme";
const root = document.documentElement;
const themeSelect = document.getElementById("theme-mode");
const customSection = document.getElementById("theme-custom-section");

enhanceSelect(themeSelect);

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
  onThemeColorsChange(applyTheme);
  applyTheme();
}
