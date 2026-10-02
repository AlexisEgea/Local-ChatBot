/** Add a prompt row in the Custom Prompt dialog. */

import { paintPromptRow } from "../fields.js";

const fieldsRoot = document.getElementById("custom-layout-fields");

/** Append an empty prompt row. */
export function addCustomLayoutField() {
  fieldsRoot.appendChild(paintPromptRow());
  fieldsRoot.querySelector(".custom-layout-row:last-child .custom-layout-title")?.focus();
}
