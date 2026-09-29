/** Assistant Information popup: a read-only copy of the Model sidebar for one reply. */

import { conversation } from "../../chat/prompt-bar.js";

const modelInfo = document.getElementById("model-info");

/** Hide the model information popup. */
export function hideModelInfo() {
  modelInfo.hidden = true;
  modelInfo.replaceChildren();
}

/** Fill one Model sidebar row in the information popup. */
function appendInfoField(section, label, value) {
  if (!value) {
    return;
  }
  const field = document.createElement("div");
  field.className = "model-field";
  const caption = document.createElement("span");
  caption.textContent = label;
  const text = document.createElement("p");
  text.className = "model-info-value glass";
  text.textContent = value;
  field.append(caption, text);
  section.appendChild(field);
}

/** Format a token count for the information popup. */
function formatTokenCount(value) {
  if (value == null || value === "") {
    return "";
  }
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return String(value);
  }
  return String(Math.trunc(amount));
}

/** Format a reply cost in USD. */
function formatOperationCost(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) {
    return String(value);
  }
  if (amount >= 0.01) {
    return `$${amount.toFixed(4)}`;
  }
  return `$${amount.toFixed(8).replace(/0+$/, "").replace(/\.$/, "")}`;
}

/** Show a read-only glass copy of the Model sidebar for one reply. */
export function showModelInfo(snapshot) {
  modelInfo.replaceChildren();
  const info = snapshot && typeof snapshot === "object" ? snapshot : {};

  const modelSection = document.createElement("section");
  modelSection.className = "sidebar-section";
  const modelTitle = document.createElement("h2");
  modelTitle.textContent = "Model";
  modelSection.appendChild(modelTitle);
  appendInfoField(modelSection, "Provider", info.provider);
  appendInfoField(modelSection, "Company", info.company);
  appendInfoField(modelSection, "Model", info.model);
  modelInfo.appendChild(modelSection);

  if (info.input_rate || info.output_rate) {
    const pricingSection = document.createElement("section");
    pricingSection.className = "sidebar-section";
    const pricingTitle = document.createElement("h2");
    pricingTitle.textContent = "Pricing";
    pricingSection.appendChild(pricingTitle);
    appendInfoField(pricingSection, "Input (1M tokens)", info.input_rate);
    appendInfoField(pricingSection, "Output (1M tokens)", info.output_rate);
    modelInfo.appendChild(pricingSection);
  }

  const hasTokens = info.prompt_tokens != null || info.completion_tokens != null;
  if (hasTokens) {
    const tokenSection = document.createElement("section");
    tokenSection.className = "sidebar-section";
    const tokenTitle = document.createElement("h2");
    tokenTitle.textContent = "Tokens";
    tokenSection.appendChild(tokenTitle);
    appendInfoField(tokenSection, "Input", formatTokenCount(info.prompt_tokens));
    appendInfoField(tokenSection, "Output", formatTokenCount(info.completion_tokens));
    modelInfo.appendChild(tokenSection);
  }

  if (info.cost != null && info.cost !== "") {
    const costSection = document.createElement("section");
    costSection.className = "sidebar-section";
    const costTitle = document.createElement("h2");
    costTitle.textContent = "Cost";
    costSection.appendChild(costTitle);
    appendInfoField(costSection, "Input", info.input_cost != null ? formatOperationCost(info.input_cost) : "");
    appendInfoField(costSection, "Output", info.output_cost != null ? formatOperationCost(info.output_cost) : "");
    appendInfoField(costSection, "Total", formatOperationCost(info.cost));
    modelInfo.appendChild(costSection);
  }

  const parameters = Array.isArray(info.parameters) ? info.parameters : [];
  if (parameters.length > 0) {
    const paramSection = document.createElement("section");
    paramSection.className = "sidebar-section";
    const paramTitle = document.createElement("h2");
    paramTitle.textContent = "Parameters";
    paramSection.appendChild(paramTitle);
    for (const parameter of parameters) {
      appendInfoField(paramSection, parameter.label || parameter.id, parameter.value);
    }
    modelInfo.appendChild(paramSection);
  }

  modelInfo.hidden = false;
}

conversation.addEventListener("mousedown", (event) => {
  if (modelInfo.hidden) {
    return;
  }
  if (event.target.closest("#model-info")) {
    return;
  }
  hideModelInfo();
});
