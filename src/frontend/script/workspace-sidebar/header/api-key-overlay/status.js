/** Per-field and dialog status for API keys. */

const errorNode = document.getElementById("api-key-error");

/** Show or hide the dialog error line. */
export function setError(message) {
  errorNode.hidden = !message;
  errorNode.textContent = message || "";
}

/** Clear the per-field test result. */
export function clearFieldStatus(row) {
  const status = row.querySelector(".api-key-status");
  if (!status) {
    return;
  }
  status.hidden = true;
  status.textContent = "";
  status.classList.remove("is-ok", "is-bad");
}

/** Show a per-field result under the password row. */
export function setFieldStatus(row, ok, message) {
  const status = row.querySelector(".api-key-status");
  if (!status) {
    return;
  }
  status.hidden = false;
  status.classList.toggle("is-ok", ok);
  status.classList.toggle("is-bad", !ok);
  status.textContent =
    message ?? (ok ? "API key is valid." : "API key is invalid.");
}
