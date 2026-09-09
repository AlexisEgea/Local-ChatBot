/**
 * Composer controls.
 * Handles the textarea, send button, Enter-to-submit, and auto-resize.
 */

const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");
const sendButton = document.getElementById("chat-send");

/** Return the trimmed message text. */
export function getInputValue() {
  return input.value.trim();
}

/** Clear the field and reset its height. */
export function clearInput() {
  input.value = "";
  input.style.height = "auto";
}

/** Disable input while a reply is loading. */
export function setBusy(isBusy) {
  sendButton.disabled = isBusy;
  input.disabled = isBusy;
}

export function focusInput() {
  input.focus();
}

/**
 * Bind submit handlers.
 * Enter sends the message; Shift+Enter inserts a newline.
 */
export function onSubmit(handler) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    handler();
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
}

/** Grow the textarea with its content, capped at 160px. */
export function enableAutoResize() {
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
  });
}
