/**
 * Prompt layout client: load, save, and delete entries in data/configuration/layouts.json.
 */

const API_BASE_URL = window.location.origin;

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.detail;
    throw new Error(typeof detail === "string" ? detail : "Request failed");
  }
  return data;
}

/** Load every prompt layout. */
export async function getLayouts() {
  const data = await request("/api/layouts");
  return data.layouts ?? [];
}

/** Create or update one custom layout. */
export async function saveLayout(layout) {
  const data = await request("/api/layouts", {
    method: "PUT",
    body: JSON.stringify(layout),
  });
  return data.layouts ?? [];
}

/** Delete one custom layout. */
export async function deleteLayout(id) {
  const data = await request(`/api/layouts/${encodeURIComponent(id)}`, { method: "DELETE" });
  return data.layouts ?? [];
}
