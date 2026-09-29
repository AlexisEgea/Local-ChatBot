/** Model Pricing section (OpenAI rates). */

import { getModelPricing } from "../../../api/model.js";
import { OPENAI_PROVIDER_ID, providerSelect } from "./provider.js";
import { modelSelect } from "./select.js";

const pricingRoot = document.getElementById("model-pricing");
const priceInput = document.getElementById("model-price-input");
const priceOutput = document.getElementById("model-price-output");

let currentPricing = null;
let pricingModelId = "";

/** Return cached rates for the information snapshot. */
export function getCurrentPricing() {
  return currentPricing;
}

/** Format a USD rate as `$0.15 / 1M tokens`. */
export function formatMillionRate(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "";
  }
  const amount = Number(value);
  const text = Number.isInteger(amount) ? amount.toFixed(2) : String(amount);
  return `$${text} / 1M tokens`;
}

/** Hide the Pricing section until rates are confirmed. */
export function hidePricing() {
  if (pricingRoot) {
    pricingRoot.hidden = true;
  }
}

/** Drop cached rates and hide Pricing. */
export function clearPricing() {
  currentPricing = null;
  pricingModelId = "";
  if (priceInput) {
    priceInput.textContent = "";
  }
  if (priceOutput) {
    priceOutput.textContent = "";
  }
  hidePricing();
}

/** Show confirmed OpenAI rates in the Pricing section. */
function showPricing(rates) {
  if (!pricingRoot || !priceInput || !priceOutput) {
    return;
  }
  currentPricing = {
    input_per_million: rates.input_per_million,
    output_per_million: rates.output_per_million,
  };
  priceInput.textContent = formatMillionRate(rates.input_per_million);
  priceOutput.textContent = formatMillionRate(rates.output_per_million);
  pricingRoot.hidden = false;
}

/** Fetch OpenAI standard rates once per selected model id. */
export async function loadPricing(modelId) {
  if (providerSelect.value !== OPENAI_PROVIDER_ID || !modelId) {
    clearPricing();
    return;
  }
  if (pricingModelId === modelId && currentPricing) {
    showPricing(currentPricing);
    return;
  }
  try {
    const rates = await getModelPricing(modelId);
    if (providerSelect.value !== OPENAI_PROVIDER_ID || modelSelect.value !== modelId) {
      return;
    }
    if (rates.input_per_million == null || rates.output_per_million == null) {
      clearPricing();
      return;
    }
    pricingModelId = modelId;
    showPricing(rates);
  } catch (error) {
    console.error("Could not load model pricing", error);
    if (providerSelect.value !== OPENAI_PROVIDER_ID || modelSelect.value !== modelId) {
      return;
    }
    clearPricing();
  }
}
