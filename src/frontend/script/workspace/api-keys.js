/** Header right-click menu and centered API key popup. */

import { getApiKeys, saveApiKeys, testApiKey } from "../api/keys.js";

const header = document.getElementById("app-toggle");
const headerMenu = document.getElementById("header-menu");
const overlay = document.getElementById("api-key-overlay");
const fieldsRoot = document.getElementById("api-key-fields");
const errorNode = document.getElementById("api-key-error");
const saveButton = document.getElementById("api-key-save");

const EYE_CLOSED =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10.6 10.7a2.5 2.5 0 0 0 3.5 3.5M9.9 5.6A11 11 0 0 1 12 5.5c5 0 9.3 3.1 11 7.5a12.4 12.4 0 0 1-4.1 4.9M6.6 6.6C3.9 8.3 1.9 10.8 1 13c.7 1.7 1.8 3.2 3.2 4.4A13 13 0 0 0 12 20.5c1.2 0 2.3-.2 3.4-.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const EYE_OPEN =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

/** Hide the Local ChatBot context menu. */
function hideHeaderMenu() {
  headerMenu.hidden = true;
}

/** Hide the API key dialog. */
function hideApiKeyPopup() {
  overlay.hidden = true;
}

/** Show or hide the dialog error line. */
function setError(message) {
  errorNode.hidden = !message;
  errorNode.textContent = message || "";
}

/** Read the current popup values. */
function readKeys() {
  return [...fieldsRoot.querySelectorAll(".api-key-field")].map((row) => ({
    id: row.dataset.id,
    value: row.querySelector("input")?.value ?? "",
  }));
}

/** Clear the per-field test result. */
function clearFieldStatus(row) {
  const status = row.querySelector(".api-key-status");
  if (!status) {
    return;
  }
  status.hidden = true;
  status.textContent = "";
  status.classList.remove("is-ok", "is-bad");
}

/** Show whether this field's test passed. */
function setFieldStatus(row, ok) {
  const status = row.querySelector(".api-key-status");
  if (!status) {
    return;
  }
  status.hidden = false;
  status.classList.toggle("is-ok", ok);
  status.classList.toggle("is-bad", !ok);
  status.textContent = ok ? "This API key is valid." : "This API key is invalid.";
}

/** Draw one password row with a show/hide eye and a Test button. */
function paintField(entry) {
  const row = document.createElement("div");
  row.className = "api-key-field";
  row.dataset.id = entry.id;

  const name = document.createElement("span");
  name.className = "api-key-label";
  name.textContent = entry.label;

  const line = document.createElement("div");
  line.className = "api-key-line";

  const control = document.createElement("div");
  control.className = "api-key-control glass";

  const input = document.createElement("input");
  input.type = "password";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.value = entry.value ?? "";
  input.addEventListener("input", () => {
    clearFieldStatus(row);
    setError("");
  });

  const eye = document.createElement("button");
  eye.type = "button";
  eye.className = "api-key-eye";
  eye.setAttribute("aria-label", "Show API key");
  eye.innerHTML = EYE_CLOSED;
  eye.addEventListener("click", () => {
    const hidden = input.type === "password";
    input.type = hidden ? "text" : "password";
    eye.setAttribute("aria-label", hidden ? "Hide API key" : "Show API key");
    eye.innerHTML = hidden ? EYE_OPEN : EYE_CLOSED;
  });

  const test = document.createElement("button");
  test.type = "button";
  test.className = "api-key-test glass";
  test.textContent = "Test";
  test.addEventListener("click", async () => {
    setError("");
    test.disabled = true;
    try {
      const ok = await testApiKey(entry.id, input.value);
      setFieldStatus(row, ok);
    } catch (error) {
      setFieldStatus(row, false);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      test.disabled = false;
    }
  });

  const status = document.createElement("p");
  status.className = "api-key-status";
  status.hidden = true;

  control.append(input, eye);
  line.append(control, test);
  row.append(name, line, status);
  return row;
}

/** Open the centered popup filled from infra/env. */
async function openApiKeyPopup() {
  setError("");
  overlay.hidden = false;
  try {
    const keys = await getApiKeys();
    fieldsRoot.replaceChildren(...keys.map(paintField));
    fieldsRoot.querySelector("input")?.focus();
  } catch (error) {
    fieldsRoot.replaceChildren();
    setError(error instanceof Error ? error.message : String(error));
  }
}

/** Bind header context menu, overlay, and validate. */
export function initApiKeys() {
  header.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    event.stopPropagation();
    hideHeaderMenu();
    headerMenu.hidden = false;
    const menuWidth = headerMenu.offsetWidth;
    const menuHeight = headerMenu.offsetHeight;
    const left = Math.min(event.clientX, window.innerWidth - menuWidth - 8);
    const top = Math.min(event.clientY, window.innerHeight - menuHeight - 8);
    headerMenu.style.left = `${Math.max(8, left)}px`;
    headerMenu.style.top = `${Math.max(8, top)}px`;
  });

  headerMenu.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]");
    if (!action) {
      return;
    }
    event.stopPropagation();
    hideHeaderMenu();
    if (action.dataset.action === "api-keys") {
      openApiKeyPopup();
    }
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      hideApiKeyPopup();
    }
  });

  saveButton.addEventListener("click", async () => {
    setError("");
    saveButton.disabled = true;
    try {
      await saveApiKeys(readKeys());
      hideApiKeyPopup();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      saveButton.disabled = false;
    }
  });

  document.addEventListener("click", hideHeaderMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }
    hideHeaderMenu();
    hideApiKeyPopup();
  });
}
