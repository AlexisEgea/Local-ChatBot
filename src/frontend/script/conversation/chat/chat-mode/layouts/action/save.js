/** Save the Custom Prompt dialog to data/configuration/layouts.json. */

import { saveCustomLayout } from "../store.js";
import { hideCustomLayoutOverlay, readCustomLayoutForm, setCustomLayoutError } from "./open.js";

/** Persist the current form and return to Chat Mode. */
export async function saveCustomLayoutForm() {
  const layout = readCustomLayoutForm();
  if (!layout) {
    return null;
  }
  try {
    await saveCustomLayout(layout);
  } catch (error) {
    setCustomLayoutError(error instanceof Error ? error.message : String(error));
    return null;
  }
  hideCustomLayoutOverlay();
  return layout;
}
