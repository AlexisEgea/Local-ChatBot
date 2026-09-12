/** History panel: new chat, saved list, and right-click rename/delete. */

const newChatButton = document.getElementById("history-new-chat");
const historyList = document.getElementById("history-list");
const historyMenu = document.getElementById("history-menu");

let menuConversationId = null;

/** Bind the History "New chat" button. */
export function onNewChat(handler) {
  newChatButton.addEventListener("click", (event) => {
    event.stopPropagation();
    handler();
  });
}

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

/** Hide the rename/delete context menu. */
function hideHistoryMenu() {
  historyMenu.hidden = true;
  menuConversationId = null;
}

/** Replace a history title with an inline rename field. */
function beginHistoryRename(id, currentTitle, onCommit) {
  const button = historyList.querySelector(`.history-item[data-id="${CSS.escape(id)}"]`);
  if (!button || button.classList.contains("is-editing")) {
    return;
  }

  const original = currentTitle;
  button.classList.add("is-editing");
  button.replaceChildren();

  const input = document.createElement("input");
  input.type = "text";
  input.className = "history-item-input";
  input.value = original;
  input.maxLength = 60;
  button.appendChild(input);
  input.focus();
  input.select();

  let finished = false;
  /** Commit or cancel the inline rename and restore the title button. */
  const finish = (shouldSave) => {
    if (finished) {
      return;
    }
    finished = true;
    const nextTitle = input.value.trim();
    button.classList.remove("is-editing");
    if (shouldSave && nextTitle && nextTitle !== original) {
      button.textContent = nextTitle;
      onCommit(nextTitle);
      return;
    }
    button.textContent = original;
  };

  input.addEventListener("keydown", (event) => {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      input.blur();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  });
  input.addEventListener("click", (event) => event.stopPropagation());
  input.addEventListener("blur", () => finish(true));
}

/** Draw saved chats under History. */
export function renderHistoryList(items, activeId) {
  historyList.replaceChildren();
  for (const item of items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-item";
    button.dataset.id = item.id;
    button.textContent = item.title;
    if (item.id === activeId) {
      button.classList.add("is-active");
    }
    historyList.appendChild(button);
  }
}
