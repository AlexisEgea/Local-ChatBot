/** Chat Mode panel: how to pick a layout and the default-layout buttons. */

import { enhanceSelect, syncChoiceLabel } from "./model-options.js";

const chatMode = document.getElementById("chat-mode");
const chooseModeSelect = document.getElementById("choose-mode");
const defaultLayoutSection = document.getElementById("default-layout-section");

enhanceSelect(chooseModeSelect);

/** Return how the user picks a conversation layout. */
export function getChooseMode() {
  return chooseModeSelect.value || "default";
}

/** Set the choose-mode select and show default-layout options only in default mode. */
export function setChooseMode(mode) {
  chooseModeSelect.value = mode;
  syncChoiceLabel(chooseModeSelect);
  defaultLayoutSection.hidden = mode !== "default";
}

/** Highlight the Chat Mode button that matches the active layout. */
export function setActiveLayoutButton(layoutId) {
  for (const button of chatMode.querySelectorAll(".sidebar-layout")) {
    button.classList.toggle("is-active", button.dataset.layout === layoutId);
  }
}

/** Bind changes on the Chat Mode dropdown. */
export function onChooseModeChange(handler) {
  chooseModeSelect.addEventListener("change", (event) => {
    defaultLayoutSection.hidden = event.target.value !== "default";
    handler(event.target.value);
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
