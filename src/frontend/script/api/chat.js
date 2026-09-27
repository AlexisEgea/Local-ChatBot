/**
 * Chat API client.
 * Talks to the FastAPI backend served on the same origin.
 */

const API_BASE_URL = window.location.origin;

export const STOPPED_REPLY = "Generation was stopped by the user.";

/** Send the full conversation and return the assistant reply. */
export async function sendChat(messages, model, settings, key) {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: messages.map(({ role, content }) => ({ role, content })),
      model,
      settings,
      key,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail ?? "Request failed");
  }

  return data.content;
}
