/** Mode choice: Default / Role-Based / CGSE cards on the prompt bar (Chat Bar). */

import { conversation, form, stack } from "../prompt-bar.js";
import { CUSTOM_LAYOUT_PICKER } from "./layouts/configuration.js";
import { openCustomLayoutOverlay } from "./layouts/overlay.js";

const picker = document.getElementById("composer-picker");

let pickerMode = false;

/** Grow the prompt bar into the center choices, or collapse it back. */
function setChoosing(isChoosing) {
  conversation.classList.toggle("is-picking", isChoosing);
  picker.hidden = !isChoosing;
}

/** Enable or disable "click the glass panel to choose a bar mode". */
export function setModeChoiceEnabled(isEnabled) {
  pickerMode = isEnabled;
  conversation.classList.toggle("is-picker-mode", isEnabled);
  if (!isEnabled) {
    setChoosing(false);
  }
}

/**
 * Wire Chat Bar interactions: glass click opens choices, a choice applies a mode,
 * clicking the dimmed backdrop closes the cards without changing mode.
 */
export function onModeChoice(handler) {
  stack.addEventListener("click", (event) => {
    if (!pickerMode || conversation.classList.contains("is-picking")) {
      return;
    }
    if (
      event.target.closest("textarea") ||
      event.target.closest(".composer-field") ||
      event.target.closest("#chat-send") ||
      event.target.closest("#composer-picker")
    ) {
      return;
    }
    setChoosing(true);
  });

  picker.addEventListener("click", (event) => {
    const button = event.target.closest("[data-layout]");
    if (!button) {
      return;
    }
    event.stopPropagation();
    if (button.dataset.layout === CUSTOM_LAYOUT_PICKER) {
      setChoosing(false);
      openCustomLayoutOverlay();
      return;
    }
    setChoosing(false);
    handler(button.dataset.layout);
  });

  form.addEventListener("click", (event) => {
    if (!conversation.classList.contains("is-picking")) {
      return;
    }
    if (event.target === form) {
      setChoosing(false);
    }
  });
}
