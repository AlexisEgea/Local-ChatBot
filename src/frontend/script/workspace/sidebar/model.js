/** Model panel and workspace expand from the Local ChatBot title. */

const app = document.getElementById("app");
const toggle = document.getElementById("app-toggle");
const sidebar = document.getElementById("sidebar");

/** Return whether the Local ChatBot workspace is expanded. */
export function isExpanded() {
  return app.classList.contains("is-expanded");
}

/** Expand or collapse the workspace and Model panel. */
export function setExpanded(expanded) {
  app.classList.toggle("is-expanded", expanded);
  toggle.setAttribute("aria-expanded", String(expanded));
  sidebar.hidden = !expanded;
}

/** Bind a click handler on the Local ChatBot title. */
export function onToggle(handler) {
  toggle.addEventListener("click", handler);
}
