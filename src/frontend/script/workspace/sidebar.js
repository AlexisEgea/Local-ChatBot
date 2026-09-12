/** Expandable workspace and left-hand conversation-layout menu. */

const app = document.getElementById("app");
const toggle = document.getElementById("app-toggle");
const sidebar = document.getElementById("sidebar");
const chatMode = document.getElementById("chat-mode");
const outerLeft = document.getElementById("sidebar-outer-left");
const outerRight = document.getElementById("sidebar-outer-right");
const defaultLayoutSection = document.getElementById("default-layout-section");

/** Return whether the Local ChatBot workspace is expanded. */
export function isExpanded() {
  return app.classList.contains("is-expanded");
}

/** Expand or collapse the workspace and left menu. */
export function setExpanded(expanded) {
  app.classList.toggle("is-expanded", expanded);
  toggle.setAttribute("aria-expanded", String(expanded));
  sidebar.hidden = !expanded;
}

/** Show or hide one of the outer side panels. */
export function setSidePanelOpen(side, open) {
  const panel = side === "left" ? outerLeft : outerRight;
  panel.classList.toggle("is-open", open);
  panel.classList.toggle("glass", open);
  panel.setAttribute("aria-expanded", String(open));
}

/** Bind clicks on the left and right side zones. */
export function onSidePanelToggle(handler) {
  const onRailClick = (side) => (event) => {
    if (event.target.closest("label, input, button")) {
      return;
    }
    handler(side);
  };
  outerLeft.addEventListener("click", onRailClick("left"));
  outerRight.addEventListener("click", onRailClick("right"));
}

/** Bind a click handler on the Local ChatBot title. */
export function onToggle(handler) {
  toggle.addEventListener("click", handler);
}

/** Return how the user picks a conversation layout. */
export function getChooseMode() {
  return chatMode.querySelector('input[name="choose-mode"]:checked')?.value ?? "default";
}

/** Set the choose-mode radios and show default-layout options only in default mode. */
export function setChooseMode(mode) {
  const input = chatMode.querySelector(`input[name="choose-mode"][value="${mode}"]`);
  if (input) {
    input.checked = true;
  }
  defaultLayoutSection.hidden = mode !== "default";
}

/** Highlight the sidebar button that matches the active layout. */
export function setActiveLayoutButton(layoutId) {
  for (const button of chatMode.querySelectorAll(".sidebar-layout")) {
    button.classList.toggle("is-active", button.dataset.layout === layoutId);
  }
}

/** Bind changes on the "How to choose" radios. */
export function onChooseModeChange(handler) {
  chatMode.addEventListener("change", (event) => {
    if (event.target.name === "choose-mode") {
      defaultLayoutSection.hidden = event.target.value !== "default";
      handler(event.target.value);
    }
  });
}

/** Bind clicks on default-layout buttons (ignored while picker mode is on). */
export function onDefaultLayoutClick(handler) {
  chatMode.addEventListener("click", (event) => {
    const button = event.target.closest(".sidebar-layout");
    if (!button || getChooseMode() === "picker") {
      return;
    }
    handler(button.dataset.layout);
  });
}
