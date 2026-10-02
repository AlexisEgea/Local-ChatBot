/** Chat thread: empty state, rows, and replacing the list from history. */

import { getLayout, inferLayout, inferValues } from "../chat/chat-mode/layouts/configuration.js";
import { fillBubble, paintReadFields } from "./message-bubble.js";
import { paintWaitingBlob } from "../animation/waiting-animation.js";
import { cancelTextReveal } from "../animation/typewriter-reveal-animation.js";
import { hideMessageMenu } from "../context-menu/open.js";
import { hideModelInfo } from "../context-menu/system/information.js";
import { onCodeCopyClick } from "../chat/chat-style/code-block.js";

export const thread = document.getElementById("chat-thread");

/** Remove the placeholder once the first real message appears. */
function hideEmptyState() {
  const empty = thread.querySelector(".empty");
  if (empty) {
    empty.remove();
  }
}

/** Append one message row and paint its bubble. */
export function appendRow(role, extraClass, index, painter) {
  hideEmptyState();
  const row = document.createElement("div");
  row.className = `message message--${role}${extraClass ? ` ${extraClass}` : ""}`;
  row.dataset.role = role;
  if (index !== null) {
    row.dataset.index = String(index);
  }
  const bubble = document.createElement("div");
  bubble.className = "bubble glass";
  painter(bubble);
  row.appendChild(bubble);
  thread.appendChild(row);
  scrollToBottom();
  return bubble;
}

/** Append chat bubbles: one per field, or a single assistant / Default bubble. */
export function appendMessage(role, content, extraClass = "", index = null, message = null) {
  if (role === "user" && message) {
    const layoutId = message.layout || inferLayout(message, 0, [message]);
    const values = message.values && typeof message.values === "object" ? message.values : inferValues(message, 0, [message]);
    const fields = getLayout(layoutId).fields.filter((field) => field.role !== "system" && values[field.name]);
    if (fields.length > 1) {
      let last = null;
      for (const field of fields) {
        last = appendRow("user", extraClass, index, (bubble) => {
          paintReadFields(bubble, [field], { [field.name]: values[field.name] });
        });
      }
      if (last) {
        return last;
      }
    }
  }
  return appendRow(role, extraClass, index, (bubble) => {
    if (extraClass.includes("message--pending")) {
      paintWaitingBlob(bubble);
      return;
    }
    fillBubble(bubble, role, content, message);
  });
}

/** Style a bubble as a failed request. */
export function markError(bubble) {
  bubble.parentElement.classList.remove("message--pending");
  bubble.classList.remove("bubble--waiting");
  bubble.parentElement.classList.add("message--error");
}

/** Keep the latest message visible. */
export function scrollToBottom() {
  thread.scrollTop = thread.scrollHeight;
}

/** Reset the thread to the empty-state prompt. */
export function clearThread() {
  cancelTextReveal();
  hideMessageMenu();
  hideModelInfo();
  thread.innerHTML = '<p class="empty">How can I help you?</p>';
}

/** Replace the thread with a saved conversation. */
export function renderThread(messages) {
  cancelTextReveal();
  hideModelInfo();
  thread.replaceChildren();
  const visible = messages.filter(
    (message) => message.role === "user" || message.role === "assistant" || message.role === "system",
  );
  if (visible.length === 0) {
    clearThread();
    return;
  }
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (message.role === "user" || message.role === "assistant" || message.role === "system") {
      appendMessage(message.role, message.content, "", index, message);
    }
  }
}

thread.addEventListener("click", onCodeCopyClick, true);
