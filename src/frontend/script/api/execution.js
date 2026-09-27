/**
 * Execution API client: abort an in-flight reply.
 */

const API_BASE_URL = window.location.origin;

/** Ask the server to abort the in-flight chat job. */
export async function stopExecution(key) {
  if (!key) {
    return;
  }
  await fetch(`${API_BASE_URL}/api/execution/stop`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
}
