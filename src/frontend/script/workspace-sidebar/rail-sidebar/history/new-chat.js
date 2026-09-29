/** History: start a new conversation from the rail. */

const newChatButton = document.getElementById("history-new-chat");

/** Bind the History "New chat" button. */
export function onNewChat(handler) {
  newChatButton.addEventListener("click", (event) => {
    event.stopPropagation();
    handler();
  });
}
