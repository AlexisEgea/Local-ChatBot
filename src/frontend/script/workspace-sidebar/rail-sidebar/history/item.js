/** One History pill for a saved conversation. */

/** Build a glass button for one saved chat. */
export function createHistoryItem(item, activeId) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "history-item glass";
  button.dataset.id = item.id;
  button.textContent = item.title;
  if (item.id === activeId) {
    button.classList.add("is-active");
  }
  return button;
}
