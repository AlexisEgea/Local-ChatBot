/** Test and Validate actions on the API key overlay. */

import { saveApiKeys, testApiKey } from "../../../api/key.js";
import { hideApiKeyOverlay } from "./overlay.js";
import { readKeys } from "./fields.js";
import { setError, setFieldStatus } from "./status.js";

const saveButton = document.getElementById("api-key-save");

/** Bind Test on one password row. */
export function bindTestAction(row, keyId, input) {
  const test = row.querySelector(".api-key-test");
  test.addEventListener("click", async () => {
    setError("");
    test.disabled = true;
    try {
      const ok = await testApiKey(keyId, input.value);
      setFieldStatus(row, ok);
    } catch (error) {
      setFieldStatus(row, false);
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      test.disabled = false;
    }
  });
}

/** Bind Validate: write keys then close the overlay. */
export function bindSaveAction() {
  saveButton.addEventListener("click", async () => {
    setError("");
    saveButton.disabled = true;
    try {
      await saveApiKeys(readKeys());
      hideApiKeyOverlay();
    } catch (error) {
      setError(error instanceof Error ? error.message : String(error));
    } finally {
      saveButton.disabled = false;
    }
  });
}
