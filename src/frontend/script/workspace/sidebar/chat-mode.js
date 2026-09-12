/** Chat Mode panel: how to pick a layout and the default-layout buttons. */

const chatMode = document.getElementById("chat-mode");
const defaultLayoutSection = document.getElementById("default-layout-section");

/** Return how the user picks a conversation layout. */
export function getChooseMode() {
  return chatMode.querySelector('input[name="choose-mode"]:checked')?.value ?? "default";
}

/** Set the choose-mode radios and show default-layout options only in default mode. */
export function setChooseMode(mode) {
  const input = chatMode.querySelector(`input[name="choose-mode"][value="${mode}"]`);
  if (input) {
    input.checked = true;
  }
  defaultLayoutSection.hidden = mode !== "default";
}

/** Highlight the Chat Mode button that matches the active layout. */
export function setActiveLayoutButton(layoutId) {
  for (const button of chatMode.querySelectorAll(".sidebar-layout")) {
    button.classList.toggle("is-active", button.dataset.layout === layoutId);
  }
}

/** Bind changes on the "How to choose" radios. */
export function onChooseModeChange(handler) {
  chatMode.addEventListener("change", (event) => {
    if (event.target.name === "choose-mode") {
      defaultLayoutSection.hidden = event.target.value !== "default";
      handler(event.target.value);
    }
  });
}

/** Bind clicks on default-layout buttons (ignored while picker mode is on). */
export function onDefaultLayoutClick(handler) {
  chatMode.addEventListener("click", (event) => {
    const button = event.target.closest(".sidebar-layout");
    if (!button || getChooseMode() === "picker") {
      return;
    }
    handler(button.dataset.layout);
  });
}
