/** Chat payload: layout field values as messages, bubble text, and send-ready check. */

import { getLayout } from "./layouts/configuration.js";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function joinRoleParts(parts) {
  if (parts.length === 0) {
    return "";
  }
  if (parts.length === 1) {
    return parts[0].text;
  }
  return parts
    .map(({ field, text }) => {
      const name = field.title || field.name;
      if (new RegExp(`^${escapeRegex(name)}:\\s*`, "i").test(text)) {
        return text;
      }
      return `${name}: ${text}`;
    })
    .join("\n\n");
}

/** Turn composer fields into OpenAI-style chat messages. */
export function buildOutgoingMessages(layoutId, values) {
  const layout = getLayout(layoutId);
  const byRole = { system: [], user: [] };
  for (const field of layout.fields) {
    const text = String(values[field.name] ?? "").trim();
    if (!text) {
      continue;
    }
    const role = field.role === "system" ? "system" : "user";
    byRole[role].push({ field, text });
  }
  const system = joinRoleParts(byRole.system);
  const user = joinRoleParts(byRole.user);
  if (system && user) {
    return [
      { role: "system", content: system },
      { role: "user", content: user },
    ];
  }
  if (user) {
    return [{ role: "user", content: user }];
  }
  if (system) {
    return [{ role: "user", content: system }];
  }
  return [{ role: "user", content: "" }];
}

/** Build the user-visible bubble text for the current layout. */
export function displayText(layoutId, values) {
  const messages = buildOutgoingMessages(layoutId, values);
  return messages.find((entry) => entry.role === "user")?.content ?? messages[0]?.content ?? "";
}

/** Return whether the composer has enough content to send. */
export function canSend(layoutId, values) {
  return getLayout(layoutId).fields.some((field) => String(values[field.name] ?? "").trim());
}
