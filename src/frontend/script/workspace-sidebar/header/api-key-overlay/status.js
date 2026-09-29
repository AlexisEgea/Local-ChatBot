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

/** Show whether this field's test passed. */
export function setFieldStatus(row, ok) {
  const status = row.querySelector(".api-key-status");
  if (!status) {
    return;
  }
  status.hidden = false;
  status.classList.toggle("is-ok", ok);
  status.classList.toggle("is-bad", !ok);
  status.textContent = ok ? "This API key is valid." : "This API key is invalid.";
}
