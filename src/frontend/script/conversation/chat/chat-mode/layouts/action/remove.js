/** Remove a prompt row in the Custom Prompt dialog. */

import { setCustomLayoutError } from "./open.js";

const fieldsRoot = document.getElementById("custom-layout-fields");

/** Remove a prompt row, or clear the last one when it still has a name. */
export function removeCustomLayoutField(row) {
  setCustomLayoutError("");
  if (fieldsRoot.querySelectorAll(".custom-layout-row").length > 1) {
    row.remove();
    return;
  }
  const title = row.querySelector(".custom-layout-title");
  if (!title?.value.trim()) {
    return;
  }
  title.value = "";
  const role = row.querySelector(".custom-layout-role");
  if (role) {
    role.value = "user";
  }
  row.dataset.name = "";
}
