/** Prompt layouts loaded from data/configuration/layouts.json. */

import { listLayouts } from "./store.js";

export const DEFAULT_CHOOSE_MODE = "picker";
export const CUSTOM_LAYOUT_PICKER = "custom";

const FALLBACK_LAYOUT = {
  id: "user",
  label: "Layout",
  description: "",
  fields: [{ name: "user", title: "User", placeholder: "Type a message", rows: 1, role: "user" }],
};

/** Return the first stored layout id, used when the current one is missing. */
export function getDefaultLayoutId() {
  return listLayouts()[0]?.id ?? FALLBACK_LAYOUT.id;
}

/** Return stored layouts as an id map. */
export function getLayouts() {
  const layouts = {};
  for (const layout of listLayouts()) {
    layouts[layout.id] = layout;
  }
  return layouts;
}

/** Return one layout, or the default when the id is unknown. */
export function getLayout(layoutId) {
  const layouts = getLayouts();
  return layouts[layoutId] ?? layouts[getDefaultLayoutId()] ?? FALLBACK_LAYOUT;
}

/** Escape a string for use inside a regular expression. */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Return the display name of a layout field. */
function fieldLabel(field) {
  return String(field.title || field.name || "").trim();
}

/** Return unique field titles across every stored layout. */
function layoutTitles() {
  const titles = [];
  const seen = new Set();
  for (const layout of listLayouts()) {
    for (const field of layout.fields ?? []) {
      const title = fieldLabel(field);
      const key = title.toLowerCase();
      if (!title || seen.has(key)) {
        continue;
      }
      seen.add(key);
      titles.push(title);
    }
  }
  return titles;
}

/** Format `Name: value`, without duplicating a prefix already in the text. */
function formatLabeled(name, value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  if (new RegExp(`^${escapeRegex(name)}:\\s*`, "i").test(text)) {
    return text;
  }
  return `${name}: ${text}`;
}

/** Join non-empty labeled blocks as `Name: value` separated by a blank line. */
function joinLabeled(parts) {
  return parts.map(([name, value]) => formatLabeled(name, value)).filter(Boolean).join("\n\n");
}

/** Split text into named blocks using every known field title. */
export function parseLabeledBlocks(content) {
  const titles = layoutTitles();
  const source = String(content ?? "");
  if (titles.length === 0) {
    return null;
  }
  const regex = new RegExp(`(^|\\n)(${titles.map(escapeRegex).join("|")}):\\s*`, "gi");
  const matches = [...source.matchAll(regex)];
  if (matches.length === 0) {
    return null;
  }
  const result = {};
  const prefix = source.slice(0, matches[0].index).trim();
  if (prefix) {
    result.prefix = prefix;
  }
  for (let index = 0; index < matches.length; index += 1) {
    const key = matches[index][2].toLowerCase();
    const start = matches[index].index + matches[index][0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
    result[key] = source.slice(start, end).trim();
  }
  return result;
}

/** Turn a layout's fields into a single labeled (or plain) string. */
export function serializeLayout(layoutId, values) {
  const layout = getLayout(layoutId);
  const filled = layout.fields.filter((field) => String(values[field.name] ?? "").trim());
  if (filled.length <= 1) {
    return String(values[filled[0]?.name] ?? "").trim();
  }
  return joinLabeled(layout.fields.map((field) => [fieldLabel(field), values[field.name]]));
}

/** Read labels already sitting inside the current fields. */
function parseFields(layoutId, values) {
  const layout = getLayout(layoutId);
  const merged = {};
  for (const field of layout.fields) {
    const parsed = parseLabeledBlocks(values[field.name] ?? "");
    if (!parsed) {
      continue;
    }
    Object.assign(merged, parsed);
  }
  return Object.keys(merged).length > 0 ? merged : null;
}

/** Return empty string values for every field in a layout. */
function emptyValues(layoutId) {
  const values = {};
  for (const field of getLayout(layoutId).fields) {
    values[field.name] = "";
  }
  return values;
}

/** Return the first non-system field, or the first field. */
function firstUserField(layout) {
  return layout.fields.find((field) => field.role !== "system") ?? layout.fields[0];
}

/** Fill a layout from parsed labeled blocks, or null when nothing matched. */
function fillFromParsed(layout, parsed) {
  const next = emptyValues(layout.id);
  if (!parsed) {
    return next;
  }
  let filled = false;
  for (const field of layout.fields) {
    const value = parsed[fieldLabel(field).toLowerCase()] ?? parsed[field.name];
    if (value == null || value === "") {
      continue;
    }
    next[field.name] = value;
    filled = true;
  }
  if (parsed.prefix) {
    const userField = firstUserField(layout);
    if (userField) {
      next[userField.name] = [parsed.prefix, next[userField.name]].filter(Boolean).join("\n\n");
      filled = true;
    }
  }
  return filled ? next : null;
}

/** Map field values from one prompt type to another. */
export function convertLayoutValues(fromId, toId, values) {
  const layouts = getLayouts();
  const sourceId = layouts[fromId] ? fromId : getDefaultLayoutId();
  const targetId = layouts[toId] ? toId : getDefaultLayoutId();
  if (sourceId === targetId) {
    return { ...values };
  }

  const target = getLayout(targetId);
  const parsed = fillFromParsed(target, parseFields(sourceId, values));
  if (parsed) {
    return parsed;
  }

  const next = emptyValues(targetId);
  const packed = serializeLayout(sourceId, values);
  const userField = firstUserField(target);
  if (userField) {
    next[userField.name] = packed;
  }
  return next;
}

/** Return a layout id that includes a system field. */
function layoutWithSystemField() {
  const withSystem = listLayouts().filter((layout) => layout.fields.some((field) => field.role === "system"));
  const paired = withSystem.find((layout) => layout.fields.some((field) => field.role !== "system"));
  return (paired ?? withSystem[0])?.id ?? getDefaultLayoutId();
}

/** Count how many layout fields appear in parsed labeled blocks. */
function scoreLayout(layout, parsed) {
  if (!parsed) {
    return 0;
  }
  return layout.fields.filter((field) => parsed[fieldLabel(field).toLowerCase()] != null || parsed[field.name] != null).length;
}

/** Layout stored on the message, or inferred from older history. */
export function inferLayout(message, index, list) {
  if (message.layout && getLayouts()[message.layout]) {
    return message.layout;
  }
  if (message.role === "system") {
    return layoutWithSystemField();
  }
  if (message.role === "user" && list[index - 1]?.role === "system") {
    return layoutWithSystemField();
  }
  const parsed = typeof message.content === "string" ? parseLabeledBlocks(message.content) : null;
  let bestId = "";
  let bestScore = 0;
  for (const layout of listLayouts()) {
    const score = scoreLayout(layout, parsed);
    if (score > bestScore) {
      bestScore = score;
      bestId = layout.id;
    }
  }
  return bestScore > 0 ? bestId : getDefaultLayoutId();
}

/** Field map stored on the message, or rebuilt from bubble text. */
export function inferValues(message, index, list) {
  if (message.values && typeof message.values === "object") {
    return { ...message.values };
  }
  const layoutId = inferLayout(message, index, list);
  const layout = getLayout(layoutId);
  const systemField = layout.fields.find((field) => field.role === "system");
  const userField = firstUserField(layout);

  if (layout.fields.some((field) => field.role === "system")) {
    if (message.role === "system") {
      const next = emptyValues(layoutId);
      if (systemField) {
        next[systemField.name] = message.content;
      }
      const following = list[index + 1];
      if (userField && following?.role === "user") {
        next[userField.name] = following.content;
      }
      return next;
    }
    const previous = list[index - 1];
    if (previous?.role === "system") {
      const next = emptyValues(layoutId);
      if (systemField) {
        next[systemField.name] = previous.content;
      }
      if (userField) {
        next[userField.name] = message.content;
      }
      return next;
    }
  }

  const parsed = fillFromParsed(layout, parseLabeledBlocks(message.content));
  if (parsed) {
    return parsed;
  }
  const next = emptyValues(layoutId);
  if (userField) {
    next[userField.name] = message.content;
  }
  return next;
}

/** First index of the prompt turn that contains this message. */
export function turnStartIndex(list, index) {
  if (list[index]?.role === "user" && list[index - 1]?.role === "system") {
    return index - 1;
  }
  return index;
}

/** Inclusive range of the question and its assistant reply. */
export function exchangeRange(list, index) {
  const message = list[index];
  if (!message) {
    return { start: index, end: index };
  }

  let start = index;
  let end = index;

  if (message.role === "assistant") {
    let cursor = index - 1;
    while (cursor >= 0 && list[cursor].role === "assistant") {
      cursor -= 1;
    }
    if (cursor >= 0 && (list[cursor].role === "user" || list[cursor].role === "system")) {
      start = turnStartIndex(list, cursor);
    }
    end = index;
    let next = index + 1;
    while (next < list.length && list[next].role === "assistant") {
      end = next;
      next += 1;
    }
    return { start, end };
  }

  start = turnStartIndex(list, index);
  end = start;
  if (list[start]?.role === "system" && list[start + 1]?.role === "user") {
    end = start + 1;
  } else if (message.role === "user") {
    end = index;
  }
  next = end + 1;
  while (next < list.length && list[next].role === "assistant") {
    end = next;
    next += 1;
  }
  return { start, end };
}

/** Attach layout metadata so a later edit can rebuild the composer. */
export function withLayoutMeta(outgoing, layoutId, values) {
  return outgoing.map((message) => ({ ...message, layout: layoutId, values: { ...values } }));
}
