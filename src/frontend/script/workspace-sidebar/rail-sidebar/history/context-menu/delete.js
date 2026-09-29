/** Delete a saved chat from History. */

import { deleteHistory } from "../../../../api/history.js";

/** Remove one conversation. Returns true when it was the open chat. */
export async function deleteHistoryChat(id, activeId) {
  await deleteHistory(id);
  return id === activeId;
}
