/** History list: saved chats and the active conversation. */

import { createHistoryItem } from "./item.js";
import { hideHistoryMenu } from "./context-menu/open.js";

export const historyList = document.getElementById("history-list");

/** Bind clicks on a saved conversation in History. */
export function onHistorySelect(handler) {
  historyList.addEventListener("click", (event) => {
    if (event.target.closest(".history-item-input")) {
      return;
    }
    const button = event.target.closest(".history-item");
    if (!button || button.classList.contains("is-editing")) {
      return;
    }
    event.stopPropagation();
    hideHistoryMenu();
    handler(button.dataset.id);
  });
}

/** Draw saved chats under History. */
export function renderHistoryList(items, activeId) {
  historyList.replaceChildren();
  for (const item of items) {
    historyList.appendChild(createHistoryItem(item, activeId));
  }
}
