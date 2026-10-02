/** Open and close the Custom Prompt dialog. */

import { paintPromptRow, readPromptRows } from "../fields.js";

const overlay = document.getElementById("custom-layout-overlay");
const nameInput = document.getElementById("custom-layout-name");
const descriptionInput = document.getElementById("custom-layout-description");
const fieldsRoot = document.getElementById("custom-layout-fields");
const errorNode = document.getElementById("custom-layout-error");

let editingId = "";

/** Show or hide a dialog error. */
export function setCustomLayoutError(message) {
  const text = String(message ?? "").trim();
  errorNode.hidden = !text;
  errorNode.textContent = text;
}

/** Hide the Custom Prompt dialog. */
export function hideCustomLayoutOverlay() {
  overlay.hidden = true;
}

/** Load a saved layout, or an empty new form. */
export function fillCustomLayoutForm(layout) {
  editingId = layout?.id ?? "";
  nameInput.value = layout?.label ?? "";
  descriptionInput.value = layout?.description ?? "";
  fieldsRoot.replaceChildren();
  const fields = layout?.fields?.length ? layout.fields : [{ title: "", role: "user" }];
  for (const field of fields) {
    fieldsRoot.appendChild(paintPromptRow(field));
  }
  setCustomLayoutError("");
}

/** Open the Custom Prompt dialog. */
export function openCustomLayoutOverlay(options = {}) {
  fillCustomLayoutForm(options.layout ?? null);
  overlay.hidden = false;
  nameInput.focus();
}

/** Build a layout object from the dialog, or null when invalid. */
export function readCustomLayoutForm() {
  const label = nameInput.value.trim();
  const description = descriptionInput.value.trim();
  const fields = readPromptRows(fieldsRoot);
  if (!label) {
    setCustomLayoutError("Name this custom prompt.");
    return null;
  }
  if (!description) {
    setCustomLayoutError("Add a short description.");
    return null;
  }
  if (fields.length === 0) {
    setCustomLayoutError("Add at least one named prompt.");
    return null;
  }
  setCustomLayoutError("");
  return {
    id: editingId || `custom-${crypto.randomUUID()}`,
    label,
    description,
    fields,
  };
}
