/** Model panel: pick a provider model and edit its generation parameters. */

import { getModelParameters, getModels } from "../../api/models.js";

const STORAGE_KEY = "local-chatbot-model";
const providerSelect = document.getElementById("model-provider");
const companySelect = document.getElementById("model-company");
const modelSelect = document.getElementById("model-select");
const modelDescription = document.getElementById("model-description");
const modelParams = document.getElementById("model-params");
const modelMenu = document.getElementById("model-menu");

let openChoiceSelect = null;
let openChoiceTrigger = null;

let options = { default_id: "", providers: [] };
let currentParameters = [];

/** Read the last model choice from localStorage. */
function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** Persist the current model choice to localStorage. */
function writeStore(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Return provider, company, and model entries for an id. */
function findModel(modelId) {
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
function hideModelMenu() {
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
    if (!modelMenu.hidden && openChoiceSelect === select) {
      hideModelMenu();
      return;
    }
    showModelMenu(select, trigger);
  });
  syncChoiceLabel(select);
}

/** Fill a select from { id, label } items. */
function fillSelect(select, items, selectedId) {
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

/** Read the parameter widgets for the active model. */
function readInputs() {
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

/** Parse a numeric parameter and clamp it to its range. */
function clampNumber(parameter, raw) {
  const parsed = parameter.type === "integer" ? Number.parseInt(raw, 10) : Number.parseFloat(raw);
  if (Number.isNaN(parsed)) {
    return parameter.default;
  }
  const low = parameter.min ?? parsed;
  const high = parameter.max ?? parsed;
  return Math.min(high, Math.max(low, parsed));
}

/** Format a numeric parameter for the text field. */
function formatNumber(parameter, value) {
  if (parameter.type === "integer") {
    return String(Math.round(value));
  }
  const step = String(parameter.step ?? "0.01");
  const decimals = step.includes(".") ? step.split(".")[1].length : 2;
  return String(Number(Number(value).toFixed(decimals)));
}

/** Draw minus / typed value / plus controls for a numeric parameter. */
function renderStepper(parameter, value) {
  const field = document.createElement("div");
  field.className = "model-param";

  const heading = document.createElement("span");
  heading.className = "model-param-label";
  heading.textContent = parameter.label;

  const stepper = document.createElement("div");
  stepper.className = "model-stepper glass";

  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = parameter.type === "integer" ? "numeric" : "decimal";
  input.name = parameter.id;
  input.value = formatNumber(parameter, value);
  input.setAttribute("aria-label", parameter.label);

  const apply = () => {
    input.value = formatNumber(parameter, clampNumber(parameter, input.value));
    persist();
  };

  const nudge = (direction) => {
    const step = Number(parameter.step) || (parameter.type === "integer" ? 1 : 0.05);
    const current = clampNumber(parameter, input.value);
    input.value = formatNumber(parameter, clampNumber(parameter, current + direction * step));
    persist();
  };

  const minus = document.createElement("button");
  minus.type = "button";
  minus.className = "model-stepper-btn";
  minus.setAttribute("aria-label", `Decrease ${parameter.label}`);
  minus.textContent = "‹";
  minus.addEventListener("click", () => nudge(-1));

  const plus = document.createElement("button");
  plus.type = "button";
  plus.className = "model-stepper-btn";
  plus.setAttribute("aria-label", `Increase ${parameter.label}`);
  plus.textContent = "›";
  plus.addEventListener("click", () => nudge(1));

  const onKeyNudge = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      apply();
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault();
      event.stopPropagation();
      nudge(event.key === "ArrowRight" ? 1 : -1);
      return;
    }
    if (parameter.type === "integer" && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      event.stopPropagation();
      nudge(event.key === "ArrowUp" ? 1 : -1);
    }
  };

  input.addEventListener("change", apply);
  stepper.addEventListener("keydown", onKeyNudge, true);

  stepper.addEventListener(
    "wheel",
    (event) => {
      const horizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (horizontal) {
        if (event.deltaX === 0) {
          return;
        }
        event.preventDefault();
        nudge(event.deltaX > 0 ? 1 : -1);
        return;
      }
      if (parameter.type !== "integer") {
        return;
      }
      event.preventDefault();
      nudge(event.deltaY < 0 ? 1 : -1);
    },
    { passive: false },
  );

  stepper.append(minus, input, plus);
  field.append(heading, stepper);
  return field;
}

/** Draw a boolean parameter. */
function renderBoolean(parameter, value) {
  const label = document.createElement("label");
  label.className = "model-param model-param--toggle";

  const heading = document.createElement("span");
  heading.className = "model-param-label";
  heading.textContent = parameter.label;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.className = "glass";
  input.name = parameter.id;
  input.checked = Boolean(value);
  input.addEventListener("change", persist);

  label.append(heading, input);
  return label;
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
  for (const parameter of currentParameters) {
    const value = settings[parameter.id];
    if (parameter.type === "boolean") {
      modelParams.appendChild(renderBoolean(parameter, value));
    } else if (parameter.type === "select") {
      modelParams.appendChild(renderSelect(parameter, value));
    } else {
      modelParams.appendChild(renderStepper(parameter, value));
    }
  }
}

/** Fetch and show the parameters associated with one model. */
async function loadParameters(modelId) {
  modelParams.replaceChildren();
  modelDescription.textContent = "Loading parameters…";
  try {
    currentParameters = await getModelParameters(modelId);
    modelDescription.textContent = "";
    renderParams(modelId);
    persist();
  } catch (error) {
    currentParameters = [];
    console.error("Could not load model parameters", error);
    modelDescription.textContent = "Could not load parameters for this model.";
  }
}

/** Return the model id and settings currently shown in the panel. */
export function getModelConfig() {
  const modelId = modelSelect.value;
  if (!modelId) {
    return { model: undefined, settings: undefined };
  }
  return { model: modelId, settings: readInputs() };
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

/** Show companies for the current provider, then models for the current company. */
function syncCompanyAndModel(preferredModelId) {
  const provider = options.providers.find((entry) => entry.id === providerSelect.value) ?? options.providers[0];
  if (!provider) {
    return null;
  }
  fillSelect(providerSelect, options.providers, provider.id);

  const preferred = preferredModelId ? findModel(preferredModelId) : null;
  const company =
    provider.companies.find((entry) => entry.id === (companySelect.value || preferred?.company?.id)) ??
    preferred?.company ??
    provider.companies[0];
  fillSelect(companySelect, provider.companies, company?.id);

  const selectedCompany = provider.companies.find((entry) => entry.id === companySelect.value) ?? company;
  const model =
    selectedCompany?.models.find((entry) => entry.id === (preferredModelId || modelSelect.value)) ??
    selectedCompany?.models[0];
  fillSelect(modelSelect, selectedCompany?.models ?? [], model?.id);
  return model;
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

  providerSelect.addEventListener("change", () => {
    companySelect.value = "";
    const model = syncCompanyAndModel();
    if (model) {
      loadParameters(model.id);
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
