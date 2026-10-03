/** Custom Prompt overlay: open, bind, and close like the API key dialog. */

import { addCustomLayoutField } from "./action/add.js";
import { hideCustomLayoutOverlay, openCustomLayoutOverlay } from "./action/open.js";
import { removeCustomLayoutField } from "./action/remove.js";
import { saveCustomLayoutForm } from "./action/save.js";

const overlay = document.getElementById("custom-layout-overlay");
const fieldsRoot = document.getElementById("custom-layout-fields");

export { hideCustomLayoutOverlay, openCustomLayoutOverlay };

/** Bind backdrop, form actions, and Escape. */
export function initCustomLayouts() {
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      hideCustomLayoutOverlay();
    }
  });

  document.getElementById("custom-layout-add").addEventListener("click", addCustomLayoutField);
  document.getElementById("custom-layout-save").addEventListener("click", () => {
    saveCustomLayoutForm();
  });

  fieldsRoot.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-action='remove']");
    if (!remove) {
      return;
    }
    const row = remove.closest(".custom-layout-row");
    if (row) {
      removeCustomLayoutField(row);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !overlay.hidden) {
      hideCustomLayoutOverlay();
    }
  });
}
