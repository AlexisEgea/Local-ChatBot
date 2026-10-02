/** Chat Mode context menu: edit or delete a layout. */

import { CUSTOM_LAYOUT_PICKER } from "./configuration.js";
import { deleteCustomLayout, listLayouts } from "./store.js";
import { openCustomLayoutOverlay } from "./overlay.js";

const chatMode = document.getElementById("chat-mode");
const layoutMenu = document.getElementById("layout-menu");

let menuLayoutId = "";
let afterDelete = null;

/** Hide the Chat Mode layout menu. */
export function hideLayoutMenu() {
  layoutMenu.hidden = true;
  menuLayoutId = "";
}

/** Bind right-click Edit / Delete on layouts in Chat Mode only. */
export function initLayoutMenu(options = {}) {
  afterDelete = options.afterDelete ?? null;

  chatMode.addEventListener("contextmenu", (event) => {
    const button = event.target.closest(".sidebar-layout");
    if (!button) {
      return;
    }
    const layoutId = button.dataset.layout;
    if (!layoutId || layoutId === CUSTOM_LAYOUT_PICKER) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    menuLayoutId = layoutId;
    layoutMenu.hidden = false;
    const menuWidth = layoutMenu.offsetWidth;
    const menuHeight = layoutMenu.offsetHeight;
    const left = Math.min(event.clientX, window.innerWidth - menuWidth - 8);
    const top = Math.min(event.clientY, window.innerHeight - menuHeight - 8);
    layoutMenu.style.left = `${Math.max(8, left)}px`;
    layoutMenu.style.top = `${Math.max(8, top)}px`;
  });

  layoutMenu.addEventListener("click", async (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton || !menuLayoutId) {
      return;
    }
    event.stopPropagation();
    const action = actionButton.dataset.action;
    const layoutId = menuLayoutId;
    hideLayoutMenu();
    if (action === "edit") {
      const layout = listLayouts().find((entry) => entry.id === layoutId);
      openCustomLayoutOverlay({ layout });
      return;
    }
    if (action === "delete") {
      if (listLayouts().length <= 1) {
        return;
      }
      await deleteCustomLayout(layoutId);
      afterDelete?.(layoutId);
    }
  });

  document.addEventListener("click", hideLayoutMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideLayoutMenu();
    }
  });
}
