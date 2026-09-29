/** Chat Mode: Default layout buttons. */

import { getChooseMode } from "./choose.js";

const chatMode = document.getElementById("chat-mode");

/** Highlight the Chat Mode button that matches the active layout. */
export function setActiveLayoutButton(layoutId) {
  for (const button of chatMode.querySelectorAll(".sidebar-layout")) {
    button.classList.toggle("is-active", button.dataset.layout === layoutId);
  }
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
