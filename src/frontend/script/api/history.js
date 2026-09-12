/** Saved conversation API client. */

const API_BASE_URL = window.location.origin;

/** Parse a history API response or throw using the server error detail. */
async function readHistory(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail ?? "History request failed");
  }
  return data;
}

/** Create a history file for a new conversation. */
export async function createHistory(messages, conversationId) {
  const response = await fetch(`${API_BASE_URL}/api/history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, id: conversationId }),
  });
  return readHistory(response);
}

/** Overwrite messages in an existing history file. */
export async function updateHistory(conversationId, messages, refineTitle = false) {
  const response = await fetch(`${API_BASE_URL}/api/history/${conversationId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, refine_title: refineTitle }),
  });
  return readHistory(response);
}

/** List saved conversations for the History panel. */
export async function listHistory() {
  const response = await fetch(`${API_BASE_URL}/api/history`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail ?? "History request failed");
  }
  return data;
}

/** Load one saved conversation, including messages. */
export async function getHistory(conversationId) {
  const response = await fetch(`${API_BASE_URL}/api/history/${conversationId}`);
  return readHistory(response);
}

/** Rename a saved conversation. */
export async function renameHistory(conversationId, title) {
  const response = await fetch(`${API_BASE_URL}/api/history/${conversationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
  return readHistory(response);
}

/** Delete a saved conversation file. */
export async function deleteHistory(conversationId) {
  const response = await fetch(`${API_BASE_URL}/api/history/${conversationId}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? "History request failed");
  }
}
