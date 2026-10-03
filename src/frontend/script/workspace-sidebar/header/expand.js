/** Header: expand the workspace (rails + Model panel). */

import { setModelPanelOpen } from "./model/panel.js";

const app = document.getElementById("app");
const toggle = document.getElementById("app-toggle");

/** Return whether the Local LLM Chat User Interface workspace is expanded. */
export function isExpanded() {
  return app.classList.contains("is-expanded");
}

/** Expand or collapse the workspace and Model panel. */
export function setExpanded(expanded) {
  app.classList.toggle("is-expanded", expanded);
  toggle.setAttribute("aria-expanded", String(expanded));
  setModelPanelOpen(expanded);
}

/** Bind a click handler on the Local LLM Chat User Interface title. */
export function onToggle(handler) {
  toggle.addEventListener("click", handler);
}
