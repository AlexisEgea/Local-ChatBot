/** Chat payload: layout field values as messages, bubble text, and send-ready check. */

/** Turn composer fields into OpenAI-style chat messages. */
export function buildOutgoingMessages(layoutId, values) {
  if (layoutId === "system-user") {
    const outgoing = [];
    if (values.system) {
      outgoing.push({ role: "system", content: values.system });
    }
    outgoing.push({ role: "user", content: values.user });
    return outgoing;
  }

  if (layoutId === "cgse") {
    const content = [
      values.context && `Context: ${values.context}`,
      values.goal && `Goal: ${values.goal}`,
      values.source && `Source: ${values.source}`,
      values.expectation && `Expectation: ${values.expectation}`,
    ]
      .filter(Boolean)
      .join("\n\n");
    return [{ role: "user", content }];
  }

  return [{ role: "user", content: values.user }];
}

/** Build the user-visible bubble text for the current layout. */
export function displayText(layoutId, values) {
  if (layoutId === "cgse") {
    return buildOutgoingMessages(layoutId, values)[0].content;
  }
  return values.user;
}

/** Return whether the composer has enough content to send. */
export function canSend(layoutId, values) {
  if (layoutId === "cgse") {
    return Boolean(values.context || values.goal || values.source || values.expectation);
  }
  return Boolean(values.user);
}
