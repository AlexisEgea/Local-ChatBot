/** Message context menu: open, place, and dispatch Copy / Edit / Delete / Information. */

import { hideModelInfo } from "./system/information.js";

const messageMenu = document.getElementById("message-menu");

let menuIndex = null;
let menuHandler = null;

/** Hide the message action menu. */
export function hideMessageMenu() {
  messageMenu.hidden = true;
  menuIndex = null;
}

/** Place the glass menu next to a click point. */
function placeMessageMenu(clientX, clientY) {
  messageMenu.hidden = false;
  const menuWidth = messageMenu.offsetWidth;
  const menuHeight = messageMenu.offsetHeight;
  const left = Math.min(clientX, window.innerWidth - menuWidth - 8);
  const top = Math.min(clientY, window.innerHeight - menuHeight - 8);
  messageMenu.style.left = `${Math.max(8, left)}px`;
  messageMenu.style.top = `${Math.max(8, top)}px`;
}

/** Fill Copy / Edit actions for the selected bubble. */
function openMessageMenu(row, clientX, clientY) {
  if (row.classList.contains("message--pending") || row.dataset.index === undefined) {
    return;
  }
  hideMessageMenu();
  const role = row.dataset.role;
  messageMenu.replaceChildren();
  const copy = document.createElement("button");
  copy.type = "button";
  copy.dataset.action = "copy";
  copy.textContent = "Copy";
  messageMenu.appendChild(copy);
  if (role === "user" || role === "system") {
    const edit = document.createElement("button");
    edit.type = "button";
    edit.dataset.action = "edit";
    edit.textContent = "Edit";
    messageMenu.appendChild(edit);
  }
  if (role === "user") {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.dataset.action = "delete";
    remove.textContent = "Delete";
    messageMenu.appendChild(remove);
  }
  if (role === "assistant") {
    const info = document.createElement("button");
    info.type = "button";
    info.dataset.action = "info";
    info.textContent = "Information";
    messageMenu.appendChild(info);
  }
  menuIndex = Number(row.dataset.index);
  placeMessageMenu(clientX, clientY);
}

/** Bind Copy / Edit on right-click, like the History menu. */
export function onMessageMenuAction(handler) {
  menuHandler = handler;
  const thread = document.getElementById("chat-thread");
  thread.addEventListener("contextmenu", (event) => {
    const row = event.target.closest(".message");
    if (!row || row.classList.contains("message--pending") || row.classList.contains("is-editing")) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    openMessageMenu(row, event.clientX, event.clientY);
  });

  messageMenu.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton || menuIndex === null || !menuHandler) {
      return;
    }
    event.stopPropagation();
    const action = actionButton.dataset.action;
    const index = menuIndex;
    hideMessageMenu();
    menuHandler(action, index);
  });

  document.addEventListener("click", hideMessageMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideMessageMenu();
      hideModelInfo();
    }
  });
}
