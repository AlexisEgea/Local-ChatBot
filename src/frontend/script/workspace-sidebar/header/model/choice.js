/** Glass option menu for Model (and Chat Mode) selects. */

import { LOCAL_PROVIDER_ID, providerSelect } from "./provider.js";
import { modelSelect } from "./select.js";

const modelMenu = document.getElementById("model-menu");

let openChoiceSelect = null;
let openChoiceTrigger = null;
let localPicker = null;

/** Register the Local folder picker used when Model is clicked. */
export function setLocalPicker(handler) {
  localPicker = handler;
}

/** Return the glass trigger button for a hidden native select. */
function choiceTrigger(select) {
  return select.closest(".model-choice")?.querySelector(":scope > .model-select");
}

/** Copy the selected option label onto the glass trigger. */
export function syncChoiceLabel(select) {
  const trigger = choiceTrigger(select);
  if (trigger) {
    trigger.textContent = select.selectedOptions[0]?.textContent ?? "";
  }
}

/** Hide the glass option menu. */
export function hideModelMenu() {
  modelMenu.hidden = true;
  modelMenu.style.maxHeight = "";
  modelMenu.style.width = "";
  if (openChoiceTrigger) {
    openChoiceTrigger.setAttribute("aria-expanded", "false");
  }
  openChoiceSelect = null;
  openChoiceTrigger = null;
}

/** Open the glass option menu under a model select trigger. */
function showModelMenu(select, trigger) {
  const gap = 6;
  const margin = 8;
  openChoiceSelect = select;
  openChoiceTrigger = trigger;
  modelMenu.replaceChildren();
  for (const option of select.options) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = option.textContent;
    button.dataset.value = option.value;
    if (option.value === select.value) {
      button.classList.add("is-active");
    }
    modelMenu.appendChild(button);
  }
  trigger.setAttribute("aria-expanded", "true");
  const rect = trigger.getBoundingClientRect();
  modelMenu.style.width = `${rect.width}px`;
  modelMenu.style.maxHeight = "none";
  modelMenu.hidden = false;

  const spaceBelow = window.innerHeight - rect.bottom - gap - margin;
  const spaceAbove = rect.top - gap - margin;
  const naturalHeight = modelMenu.scrollHeight;
  const openBelow = spaceBelow >= Math.min(naturalHeight, 96) || spaceBelow >= spaceAbove;
  const available = Math.max(96, openBelow ? spaceBelow : spaceAbove);
  modelMenu.style.maxHeight = `${Math.min(naturalHeight, available)}px`;

  const menuHeight = modelMenu.offsetHeight;
  let left = rect.left;
  const top = openBelow ? rect.bottom + gap : rect.top - menuHeight - gap;
  left = Math.min(left, window.innerWidth - rect.width - margin);
  modelMenu.style.left = `${Math.max(margin, left)}px`;
  modelMenu.style.top = `${Math.max(margin, top)}px`;
  modelMenu.querySelector(".is-active")?.scrollIntoView({ block: "nearest" });
}

/** Replace a native select popup with a glass trigger and shared menu. */
export function enhanceSelect(select) {
  if (select.closest(".model-choice")) {
    return;
  }
  const wrap = document.createElement("div");
  wrap.className = "model-choice";
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "model-select glass";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  select.parentNode.insertBefore(wrap, select);
  wrap.append(trigger, select);
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (select === modelSelect && providerSelect.value === LOCAL_PROVIDER_ID) {
      hideModelMenu();
      localPicker?.();
      return;
    }
    if (!modelMenu.hidden && openChoiceSelect === select) {
      hideModelMenu();
      return;
    }
    showModelMenu(select, trigger);
  });
  syncChoiceLabel(select);
}

/** Fill a select from { id, label } items. */
export function fillSelect(select, items, selectedId) {
  hideModelMenu();
  select.replaceChildren();
  const chosen = items.some((item) => item.id === selectedId) ? selectedId : items[0]?.id;
  for (const item of items) {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.label;
    option.selected = item.id === chosen;
    select.appendChild(option);
  }
  syncChoiceLabel(select);
}

modelMenu.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button || !openChoiceSelect) {
    return;
  }
  event.stopPropagation();
  openChoiceSelect.value = button.dataset.value;
  syncChoiceLabel(openChoiceSelect);
  openChoiceSelect.dispatchEvent(new Event("change", { bubbles: true }));
  hideModelMenu();
});

document.addEventListener("click", hideModelMenu);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hideModelMenu();
  }
});
