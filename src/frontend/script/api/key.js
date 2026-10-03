/**
 * API key client: load, test, and save tokens from infra/env.
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

/** Load API key fields and current values. */
export async function getApiKeys() {
  const data = await request("/api/keys");
  return data.keys ?? [];
}

/** Check one key without writing env. Returns true or false. */
export async function testApiKey(id, value) {
  const data = await request("/api/keys/test", {
    method: "POST",
    body: JSON.stringify({ id, value }),
  });
  return data.ok === true;
}

/** Test one key, then save it to infra/env. */
export async function saveApiKey(id, value) {
  const data = await request("/api/keys", {
    method: "PUT",
    body: JSON.stringify({ id, value }),
  });
  return data.keys ?? [];
}
