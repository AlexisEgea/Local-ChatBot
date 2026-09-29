/** Local Hugging Face folder as the Model selection. */

import { addLocalModel } from "../../../api/model.js";
import { fillSelect, setLocalPicker } from "./choice.js";
import { companyField, companySelect } from "./company.js";
import { loadParameters } from "./parameters.js";
import { LOCAL_PROVIDER_ID, providerSelect } from "./provider.js";
import { modelDescription, modelSelect } from "./select.js";
import { findModel, getOptions } from "./snapshot.js";

const folderInput = document.getElementById("local-model-folder");

/** Hide Company when Local is selected; Model opens a folder dialog. */
export function syncLocalFields() {
  const isLocal = providerSelect.value === LOCAL_PROVIDER_ID;
  if (companyField) {
    companyField.hidden = isLocal;
  }
  providerSelect.closest(".sidebar-section")?.classList.toggle("model-section--local", isLocal);
}

/** Show companies for the current provider, then models for the current company. */
export function syncCompanyAndModel(preferredModelId) {
  const options = getOptions();
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
  syncLocalFields();
  return model;
}

/** Merge a path-only catalog row into the in-memory Local provider. */
function upsertLocalCatalog(entry) {
  const options = getOptions();
  let provider = options.providers.find((item) => item.id === LOCAL_PROVIDER_ID);
  if (!provider) {
    provider = { id: LOCAL_PROVIDER_ID, label: "Local", companies: [] };
    options.providers.push(provider);
  }
  const companyId = entry.company || "Local";
  let company = provider.companies.find((item) => item.id === companyId);
  if (!company) {
    company = { id: companyId, label: companyId, models: [] };
    provider.companies.push(company);
  }
  if (!company.models.some((item) => item.id === entry.id)) {
    company.models.push({
      id: entry.id,
      label: entry.label,
      context_length: entry.context_length,
    });
  }
}

/** Select a local folder as the active model without loading weights. */
function selectLocalEntry(entry) {
  upsertLocalCatalog(entry);
  fillSelect(providerSelect, getOptions().providers, LOCAL_PROVIDER_ID);
  const model = syncCompanyAndModel(entry.id);
  if (model) {
    loadParameters(model.id);
  }
}

/** Open the browser directory picker. Must stay synchronous with the click. */
export function pickLocalFolder() {
  folderInput?.click();
}

/** Register the folder chosen in the browser picker and load config.json from disk. */
async function onLocalFolderChosen() {
  const files = [...(folderInput?.files ?? [])];
  if (folderInput) {
    folderInput.value = "";
  }
  if (!files.length) {
    return;
  }
  const relative = (files[0].webkitRelativePath || files[0].name).replaceAll("\\", "/");
  const folderName = relative.includes("/") ? relative.split("/")[0] : relative;
  const hasConfig = files.some((file) => {
    const path = (file.webkitRelativePath || file.name).replaceAll("\\", "/");
    return path === `${folderName}/config.json` || file.name === "config.json";
  });
  if (!hasConfig) {
    modelDescription.textContent = "Choose a Hugging Face folder that contains config.json.";
    return;
  }
  try {
    const entry = await addLocalModel(folderName);
    modelDescription.textContent = "";
    selectLocalEntry(entry);
  } catch (error) {
    modelDescription.textContent = error.message;
  }
}

setLocalPicker(pickLocalFolder);

folderInput?.addEventListener("change", () => {
  onLocalFolderChosen();
});
