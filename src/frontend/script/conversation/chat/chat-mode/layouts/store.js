/** Cache prompt layouts loaded from data/configuration/layouts.json. */

import { deleteLayout, getLayouts, saveLayout } from "../../../../api/layout.js";

const FALLBACK_LAYOUTS = [
  {
    id: "user",
    label: "Layout",
    description: "",
    fields: [{ name: "user", title: "User", placeholder: "Type a message", rows: 1, role: "user" }],
  },
];

let cache = FALLBACK_LAYOUTS;
const listeners = [];

/** Tell listeners the stored layout list changed. */
function notifyLayoutsChanged() {
  for (const listener of listeners) {
    listener();
  }
}

/** Run after the layout list is loaded, saved, or deleted. */
export function onLayoutsChanged(listener) {
  listeners.push(listener);
}

/** Load every prompt layout from the server. */
export async function loadLayouts() {
  cache = await getLayouts();
  if (!Array.isArray(cache) || cache.length === 0) {
    cache = FALLBACK_LAYOUTS;
  }
  return cache;
}

/** Return the current layout list. */
export function listLayouts() {
  return cache;
}

/** Create or update one Custom Prompt layout. */
export async function saveCustomLayout(layout) {
  cache = await saveLayout(layout);
  notifyLayoutsChanged();
  return cache.find((entry) => entry.id === layout.id) ?? layout;
}

/** Remove one Custom Prompt layout. */
export async function deleteCustomLayout(id) {
  cache = await deleteLayout(id);
  notifyLayoutsChanged();
}
