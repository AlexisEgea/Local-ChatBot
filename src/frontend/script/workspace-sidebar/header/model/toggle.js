/** Boolean parameter toggle on the Model panel. */

/** Draw a boolean parameter. */
export function renderToggle(parameter, value, persist) {
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
