/** Save the open conversation after an exchange, and keep its history id. */

import { addHistoryMessage, createHistory, listHistory } from "../../../api/history.js";
import { renderHistoryList } from "./list.js";

export const conversationPersist = {
  id: null,
  saved: false,
};

/** Build a local timestamp used as the history file id. */
export function newConversationId() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

/** Keep the start-time id from the first user message. */
export function rememberConversationStart() {
  if (!conversationPersist.id) {
    conversationPersist.id = newConversationId();
  }
}

/** Copy backend message ids onto the matching local turns. */
export function applyServerIds(local, remote) {
  for (let index = 0; index < local.length; index += 1) {
    const id = remote[index]?.id;
    if (id) {
      local[index].id = id;
    }
  }
}

/** Count completed user/assistant rounds in the current thread. */
function exchangeCount(messages) {
  return messages.filter((message) => message.role === "assistant").length;
}

/** Reload History panel titles from the backend. */
export async function refreshHistoryList() {
  try {
    const items = await listHistory();
    renderHistoryList(items, conversationPersist.saved ? conversationPersist.id : null);
  } catch (error) {
    console.error("Could not load history", error);
  }
}

/** Save after the first exchange; append only new messages afterwards. */
export async function persistHistory(messages, refineTitle = null) {
  const exchanges = exchangeCount(messages);
  if (exchanges < 1) {
    return;
  }

  try {
    if (!conversationPersist.saved) {
      const saved = await createHistory(messages, conversationPersist.id);
      conversationPersist.id = saved.id;
      conversationPersist.saved = true;
      applyServerIds(messages, saved.messages || []);
      await refreshHistoryList();
      return;
    }
    const pending = messages.filter((message) => !message.id);
    for (let index = 0; index < pending.length; index += 1) {
      const shouldRefine = Boolean(refineTitle ?? exchanges === 2) && index === pending.length - 1;
      const saved = await addHistoryMessage(conversationPersist.id, pending[index], shouldRefine);
      pending[index].id = saved.message.id;
    }
    await refreshHistoryList();
  } catch (error) {
    console.error("Could not save conversation", error);
  }
}
