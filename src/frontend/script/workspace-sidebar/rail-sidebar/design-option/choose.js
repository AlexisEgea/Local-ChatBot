/** Chat Mode: Chat Bar vs Default. */

import { enhanceSelect, syncChoiceLabel } from "../../header/model/choice.js";

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

/** Bind changes on the Chat Mode dropdown. */
export function onChooseModeChange(handler) {
  chooseModeSelect.addEventListener("change", (event) => {
    defaultLayoutSection.hidden = event.target.value !== "default";
    handler(event.target.value);
  });
}
