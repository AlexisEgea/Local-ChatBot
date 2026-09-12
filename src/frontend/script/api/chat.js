/**
 * Chat API client.
 * Talks to the FastAPI backend served on the same origin.
 */

const API_BASE_URL = window.location.origin;

/**
 * Send the full conversation and return the assistant reply.
 * @param {{ role: string, content: string }[]} messages
 * @returns {Promise<string>}
 */
export async function sendChat(messages) {
  const response = await fetch(`${API_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail ?? "Request failed");
  }

  return data.content;
}
