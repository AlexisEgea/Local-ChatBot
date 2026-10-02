/** Draw Chat Mode and composer layout buttons from data/configuration/layouts.json. */

import { setActiveLayoutButton } from "../../../../workspace-sidebar/rail-sidebar/design-option/layout.js";
import { getCurrentLayout } from "../bar-mode.js";
import { CUSTOM_LAYOUT_PICKER, getLayouts } from "./configuration.js";
import { onLayoutsChanged } from "./store.js";

/** Return the layout subtitle shown under the button label. */
function layoutHint(layout) {
  return layout.description || "";
}

/** Draw one layout choice button. */
function paintChoice(buttonClass, layout) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = buttonClass;
  button.dataset.layout = layout.id;
  const hint = document.createElement("span");
  hint.textContent = layoutHint(layout);
  button.append(layout.label, hint);
  return button;
}

/** Draw the Custom Prompt picker button. */
function paintCustomPrompt(buttonClass) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = buttonClass;
  button.dataset.layout = CUSTOM_LAYOUT_PICKER;
  const hint = document.createElement("span");
  hint.textContent = "Name prompts and roles";
  button.append("Custom Prompt", hint);
  return button;
}

/** Fill a container with layout buttons, then Custom Prompt. */
function paintRoot(root, buttonClass) {
  if (!root) {
    return;
  }
  root.replaceChildren();
  for (const layout of Object.values(getLayouts())) {
    root.appendChild(paintChoice(buttonClass, layout));
  }
  root.appendChild(paintCustomPrompt(buttonClass));
}

/** Rebuild composer picker cards and Chat Mode layout buttons. */
export function paintLayoutChoices() {
  paintRoot(document.getElementById("composer-picker"), "composer-choice glass");
  const section = document.getElementById("default-layout-section");
  if (!section) {
    return;
  }
  const heading = section.querySelector("h2") ?? document.createElement("h2");
  if (!heading.textContent) {
    heading.textContent = "chat";
  }
  section.replaceChildren(heading);
  for (const layout of Object.values(getLayouts())) {
    section.appendChild(paintChoice("sidebar-layout glass", layout));
  }
  section.appendChild(paintCustomPrompt("sidebar-layout glass"));
  setActiveLayoutButton(getCurrentLayout());
}

onLayoutsChanged(paintLayoutChoices);
