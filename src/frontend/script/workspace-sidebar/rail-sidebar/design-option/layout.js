/** Chat Mode: Default layout buttons. */

import { getChooseMode } from "./choose.js";
import { CUSTOM_LAYOUT_PICKER } from "../../../conversation/chat/chat-mode/layouts/configuration.js";
import { openCustomLayoutOverlay } from "../../../conversation/chat/chat-mode/layouts/overlay.js";

const chatMode = document.getElementById("chat-mode");

/** Highlight the Chat Mode button that matches the active layout. */
export function setActiveLayoutButton(layoutId) {
  for (const button of chatMode.querySelectorAll(".sidebar-layout")) {
    button.classList.toggle("is-active", button.dataset.layout === layoutId);
  }
}

/** Bind clicks on default-layout buttons (layout apply is ignored while picker mode is on). */
export function onDefaultLayoutClick(handler) {
  chatMode.addEventListener("click", (event) => {
    const button = event.target.closest(".sidebar-layout");
    if (!button) {
      return;
    }
    if (button.dataset.layout === CUSTOM_LAYOUT_PICKER) {
      openCustomLayoutOverlay();
      return;
    }
    if (getChooseMode() === "picker") {
      return;
    }
    handler(button.dataset.layout);
  });
}
