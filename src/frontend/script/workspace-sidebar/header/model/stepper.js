/** Numeric parameter stepper on the Model panel. */

/** Parse a numeric parameter and clamp it to its range. */
export function clampNumber(parameter, raw) {
  const parsed = parameter.type === "integer" ? Number.parseInt(raw, 10) : Number.parseFloat(raw);
  if (Number.isNaN(parsed)) {
    return parameter.default;
  }
  const low = parameter.min ?? parsed;
  const high = parameter.max ?? parsed;
  return Math.min(high, Math.max(low, parsed));
}

/** Format a numeric parameter for the text field. */
export function formatNumber(parameter, value) {
  if (parameter.type === "integer") {
    return String(Math.round(value));
  }
  const step = String(parameter.step ?? "0.01");
  const decimals = step.includes(".") ? step.split(".")[1].length : 2;
  return String(Number(Number(value).toFixed(decimals)));
}

/** Draw minus / typed value / plus controls for a numeric parameter. */
export function renderStepper(parameter, value, persist) {
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
