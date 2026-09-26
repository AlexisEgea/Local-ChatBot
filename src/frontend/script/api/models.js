/** Model catalog API client. */

const API_BASE_URL = window.location.origin;

/** Load provider models for the Model panel. */
export async function getModels() {
  const response = await fetch(`${API_BASE_URL}/api/models`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail ?? "Could not load models");
  }
  return data;
}

/** Load generation parameters that belong to one model. */
export async function getModelParameters(model) {
  const response = await fetch(`${API_BASE_URL}/api/models/parameters?model=${encodeURIComponent(model)}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail ?? "Could not load model parameters");
  }
  return data.parameters;
}

/** Register a folder chosen in the browser directory picker. */
export async function addLocalModel(folder) {
  const response = await fetch(`${API_BASE_URL}/api/models/local`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail ?? "Could not add this folder");
  }
  return data;
}
