/** Run execution: start a question from the prompt bar, or stop it. */

import { form } from "./chat/prompt-bar.js";
import { setBarModeDisabled } from "./chat/chat-mode/bar-mode.js";

const sendButton = document.getElementById("chat-send");

const SEND_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M12 5l-6 6M12 5l6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" /></svg>';
const STOP_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="1.5" fill="currentColor" /></svg>';

let stopHandler = null;

/** Switch the run control to a stop square while a reply is in flight. */
export function setBusy(isBusy) {
  sendButton.disabled = false;
  sendButton.classList.toggle("is-stop", isBusy);
  sendButton.setAttribute("aria-label", isBusy ? "Stop" : "Send");
  sendButton.innerHTML = isBusy ? STOP_ICON : SEND_ICON;
  setBarModeDisabled(isBusy);
}

/** Bind the form submit handler without a page reload. */
export function onSubmit(handler) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (sendButton.classList.contains("is-stop")) {
      stopHandler?.();
      return;
    }
    handler();
  });
}

/** Bind the stop square shown while a reply is generated or typed. */
export function onStop(handler) {
  stopHandler = handler;
}
