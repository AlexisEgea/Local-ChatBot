/** API key overlay: show or hide the centered dialog. */

import { getApiKeys } from "../../../api/key.js";
import { bindSaveAction } from "./actions.js";
import { paintField } from "./fields.js";
import { setError } from "./status.js";

const overlay = document.getElementById("api-key-overlay");
const fieldsRoot = document.getElementById("api-key-fields");

/** Hide the API key dialog. */
export function hideApiKeyOverlay() {
  overlay.hidden = true;
}

/** Open the centered popup filled from infra/env. */
export async function openApiKeyOverlay() {
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

/** Bind overlay backdrop, validate, and Escape. */
export function initApiKeys() {
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      hideApiKeyOverlay();
    }
  });

  bindSaveAction();

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      hideApiKeyOverlay();
    }
  });
}
