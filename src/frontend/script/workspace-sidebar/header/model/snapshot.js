/** Model config and snapshot for chat replies and Information. */

import { getModels } from "../../../api/model.js";
import { fillSelect, enhanceSelect } from "./choice.js";
import { companySelect } from "./company.js";
import { syncCompanyAndModel, syncLocalFields } from "./local.js";
import { currentParameters, loadParameters, readInputs } from "./parameters.js";
import { formatMillionRate, getCurrentPricing } from "./pricing.js";
import { providerSelect } from "./provider.js";
import { modelDescription, modelSelect } from "./select.js";
import { formatNumber } from "./stepper.js";

const STORAGE_KEY = "local-chatbot-model";

let options = { default_id: "", providers: [] };

/** Catalog used by Local folder registration. */
export function getOptions() {
  return options;
}

/** Read the last model choice from localStorage. */
export function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** Persist the current model choice to localStorage. */
export function writeStore(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Return provider, company, and model entries for an id. */
export function findModel(modelId) {
  for (const provider of options.providers) {
    for (const company of provider.companies) {
      const model = company.models.find((entry) => entry.id === modelId);
      if (model) {
        return { provider, company, model };
      }
    }
  }
  const provider = options.providers[0];
  const company = provider?.companies[0];
  return { provider, company, model: company?.models[0] };
}

/** Return the model id and settings currently shown in the panel. */
export function getModelConfig() {
  const modelId = modelSelect.value;
  if (!modelId) {
    return { model: undefined, settings: undefined };
  }
  return { model: modelId, settings: readInputs() };
}

/** Format a parameter value the same way the Model sidebar shows it. */
function snapshotValue(parameter, value) {
  if (parameter.type === "boolean") {
    return value ? "On" : "Off";
  }
  if (parameter.type === "select") {
    return parameter.options?.find((entry) => entry.id === value)?.label ?? String(value ?? "");
  }
  if (parameter.type === "integer" || parameter.type === "number") {
    return formatNumber(parameter, value);
  }
  return String(value ?? "");
}

/** Snapshot of the Model sidebar used on assistant replies and the info popup. */
export function getModelSnapshot() {
  const modelId = modelSelect.value;
  const found = modelId ? findModel(modelId) : {};
  const settings = modelId ? readInputs() : {};
  const pricing = getCurrentPricing();
  return {
    provider: found.provider?.label || found.provider?.id || "",
    company: found.company?.label || found.company?.id || "",
    model: found.model?.label || modelId || "",
    input_rate: pricing ? formatMillionRate(pricing.input_per_million) : "",
    output_rate: pricing ? formatMillionRate(pricing.output_per_million) : "",
    parameters: currentParameters.map((parameter) => ({
      id: parameter.id,
      label: parameter.label,
      value: snapshotValue(parameter, settings[parameter.id]),
    })),
  };
}

/** Return `company/model` for the selected reply source, for transparent labels. */
export function getReplySource() {
  const modelId = modelSelect.value;
  if (!modelId) {
    return "System";
  }
  const found = findModel(modelId);
  const company = found.company?.label || found.company?.id || "";
  const model = found.model?.label || modelId;
  if (company && model) {
    return `${company}/${model}`;
  }
  return model || "System";
}

/** Load provider models, restore the last choice, and bind the Model panel. */
export async function initModelOptions() {
  try {
    options = await getModels();
  } catch (error) {
    console.error("Could not load models", error);
    modelDescription.textContent = "Could not load models from the provider.";
    return;
  }

  const savedId = readStore().modelId || options.default_id;
  const selected = findModel(savedId);
  if (!selected.model) {
    modelDescription.textContent = "No models available.";
    return;
  }

  fillSelect(providerSelect, options.providers, selected.provider.id);
  fillSelect(companySelect, selected.provider.companies, selected.company.id);
  fillSelect(modelSelect, selected.company.models, selected.model.id);
  syncLocalFields();

  providerSelect.addEventListener("change", () => {
    companySelect.value = "";
    const model = syncCompanyAndModel();
    if (model) {
      loadParameters(model.id);
    } else {
      loadParameters("");
    }
  });
  companySelect.addEventListener("change", () => {
    const provider = options.providers.find((entry) => entry.id === providerSelect.value);
    const company = provider?.companies.find((entry) => entry.id === companySelect.value);
    fillSelect(modelSelect, company?.models ?? [], company?.models[0]?.id);
    if (modelSelect.value) {
      loadParameters(modelSelect.value);
    }
  });
  modelSelect.addEventListener("change", () => {
    loadParameters(modelSelect.value);
  });

  await loadParameters(selected.model.id);
}

enhanceSelect(providerSelect);
enhanceSelect(companySelect);
enhanceSelect(modelSelect);
