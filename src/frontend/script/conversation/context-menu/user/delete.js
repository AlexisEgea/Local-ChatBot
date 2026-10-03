/** Remove a user turn and its paired system / assistant messages from the list. */

import { exchangeRange } from "../../chat/chat-mode/layouts/configuration.js";

/** Splice out the exchange around a user message. Returns the removed entries, or null. */
export function takeUserExchange(messages, index) {
  const message = messages[index];
  if (!message || message.role !== "user") {
    return null;
  }
  const { start, end } = exchangeRange(messages, index);
  return messages.splice(start, end - start + 1);
}
