/**
 * Message thread rendering.
 * Builds user/assistant bubbles and keeps the list scrolled to the latest message.
 */

const thread = document.getElementById("chat-thread");

/** Remove the placeholder once the first real message appears. */
function hideEmptyState() {
  const empty = thread.querySelector(".empty");
  if (empty) {
    empty.remove();
  }
}

/**
 * Append a chat bubble and return it so callers can update it later.
 * @param {"user" | "assistant"} role
 * @param {string} content
 * @param {string} extraClass
 * @returns {HTMLDivElement}
 */
export function appendMessage(role, content, extraClass = "") {
  hideEmptyState();

  const row = document.createElement("div");
  row.className = `message message--${role}${extraClass ? ` ${extraClass}` : ""}`;

  const bubble = document.createElement("div");
  bubble.className = "bubble glass";
  bubble.textContent = content;
  row.appendChild(bubble);
  thread.appendChild(row);
  scrollToBottom();
  return bubble;
}

/** Style a bubble as a failed request. */
export function markError(bubble) {
  bubble.parentElement.classList.add("message--error");
}

/** Keep the latest message visible. */
export function scrollToBottom() {
  thread.scrollTop = thread.scrollHeight;
}
