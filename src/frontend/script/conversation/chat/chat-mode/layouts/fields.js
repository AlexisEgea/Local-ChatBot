/** Custom Prompt rows: role, prompt name, and remove. */

/** Draw one prompt row in the Custom Prompt dialog. */
export function paintPromptRow(field = {}) {
  const row = document.createElement("div");
  row.className = "custom-layout-row";
  row.dataset.name = field.name ?? "";
  row.dataset.rows = String(field.rows ?? 2);

  const roleWrap = document.createElement("div");
  roleWrap.className = "api-key-control glass";
  const role = document.createElement("select");
  role.className = "custom-layout-role";
  for (const [value, label] of [
    ["user", "User"],
    ["system", "System"],
  ]) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    role.appendChild(option);
  }
  role.value = field.role === "system" ? "system" : "user";
  roleWrap.appendChild(role);

  const titleWrap = document.createElement("div");
  titleWrap.className = "api-key-control glass";
  const title = document.createElement("input");
  title.type = "text";
  title.className = "custom-layout-title";
  title.placeholder = "Prompt name";
  title.autocomplete = "off";
  title.value = field.title ?? "";
  titleWrap.appendChild(title);

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "glass custom-layout-remove";
  remove.dataset.action = "remove";
  remove.textContent = "Remove";

  row.append(roleWrap, titleWrap, remove);
  return row;
}

/** Read prompt rows as layout fields (rows without a name are skipped). */
export function readPromptRows(root) {
  return [...root.querySelectorAll(".custom-layout-row")]
    .map((row, index) => {
      const title = row.querySelector(".custom-layout-title")?.value.trim() ?? "";
      return {
        name: row.dataset.name || `prompt-${index}`,
        title,
        placeholder: title || "Prompt",
        role: row.querySelector(".custom-layout-role")?.value === "system" ? "system" : "user",
        rows: Number(row.dataset.rows) || 2,
      };
    })
    .filter((field) => field.title);
}
