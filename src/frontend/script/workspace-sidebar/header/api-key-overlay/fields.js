/** API key password rows and show/hide eye. */

import { bindTestAction } from "./actions.js";
import { clearFieldStatus, setError } from "./status.js";

const fieldsRoot = document.getElementById("api-key-fields");

const EYE_CLOSED =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10.6 10.7a2.5 2.5 0 0 0 3.5 3.5M9.9 5.6A11 11 0 0 1 12 5.5c5 0 9.3 3.1 11 7.5a12.4 12.4 0 0 1-4.1 4.9M6.6 6.6C3.9 8.3 1.9 10.8 1 13c.7 1.7 1.8 3.2 3.2 4.4A13 13 0 0 0 12 20.5c1.2 0 2.3-.2 3.4-.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const EYE_OPEN =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';

/** Read the current popup values. */
export function readKeys() {
  return [...fieldsRoot.querySelectorAll(".api-key-field")].map((row) => ({
    id: row.dataset.id,
    value: row.querySelector("input")?.value ?? "",
  }));
}

/** Draw one password row with a show/hide eye and a Test button. */
export function paintField(entry) {
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

  const status = document.createElement("p");
  status.className = "api-key-status";
  status.hidden = true;

  control.append(input, eye);
  line.append(control, test);
  row.append(name, line, status);
  bindTestAction(row, entry.id, input);
  return row;
}
