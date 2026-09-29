/** History context menu: open, place, and dispatch Rename / Delete. */

import { historyList } from "../list.js";
import { beginHistoryRename } from "./rename.js";

const historyMenu = document.getElementById("history-menu");

let menuConversationId = null;

/** Hide the rename/delete context menu. */
export function hideHistoryMenu() {
  historyMenu.hidden = true;
  menuConversationId = null;
}

/** Bind the right-click menu: rename or delete a saved chat. */
export function onHistoryMenuAction(handler) {
  historyList.addEventListener("contextmenu", (event) => {
    const button = event.target.closest(".history-item");
    if (!button) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    menuConversationId = button.dataset.id;
    historyMenu.hidden = false;
    const menuWidth = historyMenu.offsetWidth;
    const menuHeight = historyMenu.offsetHeight;
    const left = Math.min(event.clientX, window.innerWidth - menuWidth - 8);
    const top = Math.min(event.clientY, window.innerHeight - menuHeight - 8);
    historyMenu.style.left = `${Math.max(8, left)}px`;
    historyMenu.style.top = `${Math.max(8, top)}px`;
  });

  historyMenu.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton || !menuConversationId) {
      return;
    }
    event.stopPropagation();
    const item = historyList.querySelector(`.history-item[data-id="${menuConversationId}"]`);
    const title = item?.textContent ?? "";
    const action = actionButton.dataset.action;
    const id = menuConversationId;
    hideHistoryMenu();
    if (action === "rename") {
      beginHistoryRename(id, title, (nextTitle) => handler("rename", id, nextTitle));
      return;
    }
    handler(action, id, title);
  });

  document.addEventListener("click", hideHistoryMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideHistoryMenu();
    }
  });
}
