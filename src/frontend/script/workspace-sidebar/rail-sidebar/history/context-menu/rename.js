/** Inline rename of a History title. */

import { renameHistory } from "../../../../api/history.js";
import { historyList } from "../list.js";

/** Persist a History title after the inline field commits. */
export async function renameHistoryChat(id, title) {
  await renameHistory(id, title);
}

/** Replace a history title with an inline rename field. */
export function beginHistoryRename(id, currentTitle, onCommit) {
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
