/** Header sidebar: open API keys. */

import { openApiKeyOverlay } from "./api-key-overlay/overlay.js";

const header = document.getElementById("app-toggle");
const headerSidebar = document.getElementById("header-sidebar");

/** Hide the Local ChatBot header sidebar. */
export function hideHeaderSidebar() {
  headerSidebar.hidden = true;
}

/** Bind right-click on the Local ChatBot title. */
export function initHeaderSidebar() {
  header.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
    hideHeaderSidebar();
    headerSidebar.hidden = false;
    const sidebarWidth = headerSidebar.offsetWidth;
    const sidebarHeight = headerSidebar.offsetHeight;
    const left = Math.min(event.clientX, window.innerWidth - sidebarWidth - 8);
    const top = Math.min(event.clientY, window.innerHeight - sidebarHeight - 8);
    headerSidebar.style.left = `${Math.max(8, left)}px`;
    headerSidebar.style.top = `${Math.max(8, top)}px`;
  });

  headerSidebar.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]");
    if (!action) {
      return;
    }
    event.stopPropagation();
    hideHeaderSidebar();
    if (action.dataset.action === "api-keys") {
      openApiKeyOverlay();
    }
  });

  document.addEventListener("click", hideHeaderSidebar);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideHeaderSidebar();
    }
  });
}
