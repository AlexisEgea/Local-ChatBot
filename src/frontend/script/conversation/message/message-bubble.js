/** Message bubble: structured fields, plain text, and assistant reveal. */

import { getLayout, inferLayout, inferValues } from "../chat/chat-mode/layouts/configuration.js";
import { getReplySource } from "../../workspace-sidebar/header/model/snapshot.js";
import { getRevealedText, revealFrom, revealText, skipTextReveal } from "../animation/typewriter-reveal-animation.js";
import { paintMarkdown } from "../chat/chat-style/paint-markdown.js";
import { scrollToBottom } from "./message-list.js";

/** Draw read-only field blocks with a small top-left title. */
export function paintReadFields(bubble, fields, values) {
  bubble.classList.add("bubble--fields");
  for (const field of fields) {
    const value = values[field.name];
    if (!value) {
      continue;
    }
    const block = document.createElement("div");
    block.className = "bubble-field";
    const label = document.createElement("span");
    label.className = "bubble-field-label";
    label.textContent = field.title ?? field.placeholder;
    const text = document.createElement("div");
    text.className = "bubble-field-text";
    if (field.name === "assistant") {
      text.classList.add("markdown");
      paintMarkdown(text, value);
    } else {
      text.textContent = value;
    }
    block.append(label, text);
    bubble.appendChild(block);
  }
}

/** Fill a bubble from a stored message: structured fields, or plain text. */
export function fillBubble(bubble, role, content, message = null) {
  bubble.replaceChildren();
  bubble.classList.remove("bubble--fields");
  if (role === "assistant") {
    const title = message?.source || getReplySource();
    paintReadFields(bubble, [{ name: "assistant", title }], { assistant: content });
    return;
  }
  if (!message) {
    bubble.textContent = content;
    return;
  }

  const layoutId = message.layout || inferLayout(message, 0, [message]);
  const layout = getLayout(layoutId);
  const values = message.values && typeof message.values === "object" ? message.values : inferValues(message, 0, [message]);
  const fields = layout.fields.filter((field) =>
    role === "system" ? field.role === "system" : field.role !== "system",
  );
  paintReadFields(bubble, fields.length ? fields : layout.fields, values);
}

/** Paint an assistant bubble and reveal its reply letter by letter. */
export async function revealAssistantBubble(bubble, content, message = null) {
  bubble.parentElement?.classList.remove("message--pending");
  bubble.classList.remove("bubble--waiting");
  bubble.replaceChildren();
  bubble.classList.remove("bubble--fields");
  const title = message?.source || getReplySource();
  paintReadFields(bubble, [{ name: "assistant", title }], { assistant: "\u00a0" });
  const field = bubble.querySelector(".bubble-field-text");
  const row = bubble.parentElement;
  const onSkip = (event) => {
    if (event.button !== 0 || event.target.closest(".code-block-copy")) {
      return;
    }
    event.preventDefault();
    skipTextReveal();
  };
  row?.addEventListener("pointerdown", onSkip, true);
  try {
    await revealText(field, content, scrollToBottom, paintMarkdown);
  } finally {
    row?.removeEventListener("pointerdown", onSkip, true);
  }
}

/** Keep the typed text, then type a stop notice on the next line. */
export async function appendStoppedReply(bubble, notice) {
  const field = bubble.querySelector(".bubble-field-text");
  if (!field) {
    await revealAssistantBubble(bubble, notice);
    return notice;
  }
  const kept = getRevealedText();
  const prefix = kept ? `${kept}\n\n` : "";
  await revealFrom(field, prefix, notice, scrollToBottom, (element, slice) => {
    paintMarkdown(element, slice);
    if (slice.length <= prefix.length) {
      return;
    }
    const last = element.lastElementChild;
    if (last && last !== element.firstElementChild) {
      last.style.marginTop = "1.5em";
    }
  });
  return `${prefix}${notice}`;
}
