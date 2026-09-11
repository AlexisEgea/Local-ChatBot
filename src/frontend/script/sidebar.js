/**
 * Expandable workspace and left-hand conversation-layout menu.
 */

const app = document.getElementById("app");
const toggle = document.getElementById("app-toggle");
const sidebar = document.getElementById("sidebar");
const defaultLayoutSection = document.getElementById("default-layout-section");

/** @returns {boolean} True when the Local ChatBot workspace is expanded. */
export function isExpanded() {
  return app.classList.contains("is-expanded");
}

/**
 * Expand or collapse the workspace and left menu.
 * @param {boolean} expanded
 */
export function setExpanded(expanded) {
  app.classList.toggle("is-expanded", expanded);
  toggle.setAttribute("aria-expanded", String(expanded));
  sidebar.hidden = !expanded;
}

/**
 * Bind a click handler on the Local ChatBot title.
 * @param {() => void} handler
 */
export function onToggle(handler) {
  toggle.addEventListener("click", handler);
}

/** @returns {"default" | "picker"} How the user picks a conversation layout. */
export function getChooseMode() {
  return sidebar.querySelector('input[name="choose-mode"]:checked')?.value ?? "default";
}

/**
 * Set the choose-mode radios and disable default-layout buttons in picker mode.
 * @param {"default" | "picker"} mode
 */
export function setChooseMode(mode) {
  const input = sidebar.querySelector(`input[name="choose-mode"][value="${mode}"]`);
  if (input) {
    input.checked = true;
  }
  defaultLayoutSection.classList.toggle("is-disabled", mode === "picker");
}

/**
 * Highlight the sidebar button that matches the active layout.
 * @param {string} layoutId
 */
export function setActiveLayoutButton(layoutId) {
  for (const button of sidebar.querySelectorAll(".sidebar-layout")) {
    button.classList.toggle("is-active", button.dataset.layout === layoutId);
  }
}

/**
 * Bind changes on the "How to choose" radios.
 * @param {(mode: string) => void} handler
 */
export function onChooseModeChange(handler) {
  sidebar.addEventListener("change", (event) => {
    if (event.target.name === "choose-mode") {
      defaultLayoutSection.classList.toggle("is-disabled", event.target.value === "picker");
      handler(event.target.value);
    }
  });
}

/**
 * Bind clicks on default-layout buttons (ignored while picker mode is on).
 * @param {(layoutId: string) => void} handler
 */
export function onDefaultLayoutClick(handler) {
  sidebar.addEventListener("click", (event) => {
    const button = event.target.closest(".sidebar-layout");
    if (!button || getChooseMode() === "picker") {
      return;
    }
    handler(button.dataset.layout);
  });
}
