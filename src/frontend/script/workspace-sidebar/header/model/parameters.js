/** Model Parameters section. */

import { getModelParameters } from "../../../api/model.js";
import { enhanceSelect } from "./choice.js";
import { LOCAL_PROVIDER_ID, OPENAI_PROVIDER_ID, providerSelect } from "./provider.js";
import { clearPricing, hidePricing, loadPricing } from "./pricing.js";
import { modelDescription, modelSelect } from "./select.js";
import { readStore, writeStore } from "./snapshot.js";
import { renderStepper } from "./stepper.js";
import { renderToggle } from "./toggle.js";

const modelParams = document.getElementById("model-params");
const paramsSection = document.querySelector(".sidebar-section--params");

export let currentParameters = [];

/** Return defaults for the active model's parameters. */
function defaultSettings() {
  const settings = {};
  for (const parameter of currentParameters) {
    settings[parameter.id] = parameter.default;
  }
  return settings;
}

/** Merge saved values with this model's defaults. */
function settingsFor(modelId) {
  const saved = readStore().settingsByModel?.[modelId] ?? {};
  return { ...defaultSettings(), ...saved };
}

/** Read the parameter widgets for the active model. */
export function readInputs() {
  const settings = {};
  for (const parameter of currentParameters) {
    const input = modelParams.querySelector(`[name="${parameter.id}"]`);
    if (!input) {
      settings[parameter.id] = parameter.default;
      continue;
    }
    if (parameter.type === "boolean") {
      settings[parameter.id] = input.checked;
    } else if (parameter.type === "integer") {
      settings[parameter.id] = Number.parseInt(input.value, 10);
    } else if (parameter.type === "number") {
      settings[parameter.id] = Number.parseFloat(input.value);
    } else {
      settings[parameter.id] = input.value;
    }
  }
  return settings;
}

/** Save the current model id and its parameter values. */
function persist() {
  const modelId = modelSelect.value;
  if (!modelId) {
    return;
  }
  const store = readStore();
  writeStore({
    modelId,
    settingsByModel: {
      ...(store.settingsByModel ?? {}),
      [modelId]: readInputs(),
    },
  });
}

/** Hide the Parameters heading when the selected model has none. */
function showParamsSection(visible) {
  if (paramsSection) {
    paramsSection.hidden = !visible;
  }
}

/** Draw a dropdown parameter. */
function renderSelect(parameter, value) {
  const label = document.createElement("label");
  label.className = "model-param";

  const heading = document.createElement("span");
  heading.className = "model-param-label";
  heading.textContent = parameter.label;

  const input = document.createElement("select");
  input.className = "model-select";
  input.name = parameter.id;
  for (const option of parameter.options) {
    const item = document.createElement("option");
    item.value = option.id;
    item.textContent = option.label;
    item.selected = option.id === value;
    input.appendChild(item);
  }
  input.addEventListener("change", persist);

  label.append(heading, input);
  enhanceSelect(input);
  return label;
}

/** Draw the parameters that belong to the selected model. */
function renderParams(modelId) {
  const settings = settingsFor(modelId);
  modelParams.replaceChildren();
  showParamsSection(currentParameters.length > 0);
  for (const parameter of currentParameters) {
    const value = settings[parameter.id];
    if (parameter.type === "boolean") {
      modelParams.appendChild(renderToggle(parameter, value, persist));
    } else if (parameter.type === "select") {
      modelParams.appendChild(renderSelect(parameter, value));
    } else {
      modelParams.appendChild(renderStepper(parameter, value, persist));
    }
  }
}

/** Fetch and show the parameters associated with one model. */
export async function loadParameters(modelId) {
  if (providerSelect.value !== OPENAI_PROVIDER_ID) {
    clearPricing();
  } else {
    hidePricing();
  }
  modelParams.replaceChildren();
  if (!modelId) {
    currentParameters = [];
    showParamsSection(false);
    clearPricing();
    modelDescription.textContent =
      providerSelect.value === LOCAL_PROVIDER_ID
        ? "Click Model and choose a Hugging Face folder that contains config.json."
        : "";
    return;
  }
  modelDescription.textContent = "Loading parameters…";
  try {
    currentParameters = await getModelParameters(modelId);
    modelDescription.textContent = "";
    renderParams(modelId);
    persist();
  } catch (error) {
    currentParameters = [];
    showParamsSection(false);
    console.error("Could not load model parameters", error);
    modelDescription.textContent = "Could not load parameters for this model.";
  }
  await loadPricing(modelId);
}
