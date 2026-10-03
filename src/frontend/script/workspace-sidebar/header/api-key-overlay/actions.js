/** Test and Save actions on one API key row. */

import { saveApiKey, testApiKey } from "../../../api/key.js";
import { setError, setFieldStatus } from "./status.js";

function rowButtons(row) {
  return [...row.querySelectorAll(".api-key-test, .api-key-save")];
}

function setRowBusy(row, busy) {
  for (const button of rowButtons(row)) {
    button.disabled = busy;
  }
}

/** Bind Test and Save on one password row. */
export function bindRowActions(row, keyId, input) {
  const test = row.querySelector(".api-key-test");
  const save = row.querySelector(".api-key-save");

  test.addEventListener("click", async () => {
    setError("");
    setRowBusy(row, true);
    try {
      const ok = await testApiKey(keyId, input.value);
      setFieldStatus(row, ok);
    } catch (error) {
      setFieldStatus(row, false, error instanceof Error ? error.message : String(error));
    } finally {
      setRowBusy(row, false);
    }
  });

  save.addEventListener("click", async () => {
    setError("");
    setRowBusy(row, true);
    try {
      await saveApiKey(keyId, input.value);
      setFieldStatus(row, true, `${keyId} saved`);
    } catch (error) {
      setFieldStatus(
        row,
        false,
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setRowBusy(row, false);
    }
  });
}
