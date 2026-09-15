export const LAYOUTS = {
  user: {
    id: "user",
    label: "Default",
    fields: [{ name: "user", placeholder: "Type a message", rows: 1 }],
  },
  "system-user": {
    id: "system-user",
    label: "Role-Based Prompt",
    fields: [
      { name: "system", placeholder: "System Instruction", rows: 2 },
      { name: "user", placeholder: "User Message", rows: 1 },
    ],
  },
  cgse: {
    id: "cgse",
    label: "CGSE",
    fields: [
      { name: "context", placeholder: "Context", rows: 2 },
      { name: "goal", placeholder: "Goal", rows: 2 },
      { name: "source", placeholder: "Source", rows: 2 },
      { name: "expectation", placeholder: "Expectation", rows: 2 },
    ],
  },
};

export const DEFAULT_LAYOUT = "user";
export const DEFAULT_CHOOSE_MODE = "picker";

const LABEL_NAMES = "System|User|Context|Goal|Source|Expectation";

/** Format `Name: value`, without duplicating a prefix already in the text. */
function formatLabeled(name, value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  if (new RegExp(`^${name}:\\s*`, "i").test(text)) {
    return text;
  }
  return `${name}: ${text}`;
}

/** Join non-empty labeled blocks as `Name: value` separated by a blank line. */
function joinLabeled(parts) {
  return parts.map(([name, value]) => formatLabeled(name, value)).filter(Boolean).join("\n\n");
}

/** Split text into System / User / CGSE blocks when those labels are present. */
export function parseLabeledBlocks(content) {
  const source = String(content ?? "");
  const regex = new RegExp(`(^|\\n)(${LABEL_NAMES}):\\s*`, "gi");
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

/** Parse a CGSE bubble back into named fields. */
export function parseCgse(content) {
  const parsed = parseLabeledBlocks(content);
  return {
    context: parsed?.context ?? "",
    goal: parsed?.goal ?? "",
    source: parsed?.source ?? "",
    expectation: parsed?.expectation ?? "",
  };
}

/** Turn a layout's fields into a single labeled (or plain) string. */
export function serializeLayout(layoutId, values) {
  if (layoutId === "system-user") {
    return joinLabeled([
      ["System", values.system],
      ["User", values.user],
    ]);
  }
  if (layoutId === "cgse") {
    return joinLabeled([
      ["Context", values.context],
      ["Goal", values.goal],
      ["Source", values.source],
      ["Expectation", values.expectation],
    ]);
  }
  return String(values.user ?? "").trim();
}

function hasRoleLabels(parsed) {
  return Boolean(parsed && (parsed.system != null || parsed.user != null));
}

function hasCgseLabels(parsed) {
  return Boolean(
    parsed && (parsed.context != null || parsed.goal != null || parsed.source != null || parsed.expectation != null),
  );
}

/** Read System / User / CGSE labels already sitting inside the current fields. */
function parseFields(layoutId, values) {
  const chunks =
    layoutId === "system-user"
      ? [values.system, values.user]
      : layoutId === "cgse"
        ? [values.context, values.goal, values.source, values.expectation]
        : [values.user];
  const merged = {};
  for (const chunk of chunks) {
    const parsed = parseLabeledBlocks(chunk ?? "");
    if (!parsed) {
      continue;
    }
    Object.assign(merged, parsed);
  }
  return Object.keys(merged).length > 0 ? merged : null;
}

function roleValues(parsed) {
  return {
    system: parsed?.system ?? "",
    user: [parsed?.prefix, parsed?.user].filter(Boolean).join("\n\n"),
  };
}

function cgseValues(parsed) {
  return {
    context: [parsed?.prefix, parsed?.context].filter(Boolean).join("\n\n"),
    goal: parsed?.goal ?? "",
    source: parsed?.source ?? "",
    expectation: parsed?.expectation ?? "",
  };
}

/** Map field values from one prompt type to another. */
export function convertLayoutValues(fromId, toId, values) {
  const sourceId = LAYOUTS[fromId] ? fromId : DEFAULT_LAYOUT;
  const targetId = LAYOUTS[toId] ? toId : DEFAULT_LAYOUT;
  if (sourceId === targetId) {
    return { ...values };
  }

  const parsed = parseFields(sourceId, values);

  if (targetId === "system-user") {
    if (hasRoleLabels(parsed)) {
      return roleValues(parsed);
    }
    if (sourceId === "user") {
      return { system: "", user: values.user ?? "" };
    }
    return { system: "", user: serializeLayout(sourceId, values) };
  }

  if (targetId === "cgse") {
    if (hasCgseLabels(parsed)) {
      return cgseValues(parsed);
    }
    if (hasRoleLabels(parsed)) {
      return { context: joinLabeled([["System", parsed.system], ["User", parsed.user]]), goal: "", source: "", expectation: "" };
    }
    if (sourceId === "system-user") {
      return {
        context: joinLabeled([
          ["System", values.system],
          ["User", values.user],
        ]),
        goal: "",
        source: "",
        expectation: "",
      };
    }
    return { context: String(values.user ?? "").trim(), goal: "", source: "", expectation: "" };
  }

  if (hasRoleLabels(parsed) && !hasCgseLabels(parsed)) {
    return { user: joinLabeled([["System", parsed.system], ["User", parsed.user]]) };
  }
  if (hasCgseLabels(parsed)) {
    return { user: serializeLayout("cgse", cgseValues(parsed)) };
  }
  if (sourceId === "system-user") {
    return {
      user: joinLabeled([
        ["System", values.system],
        ["User", values.user],
      ]),
    };
  }
  if (sourceId === "cgse") {
    return { user: serializeLayout("cgse", values) };
  }
  return { user: values.user ?? "" };
}

/** Layout stored on the message, or inferred from older history. */
export function inferLayout(message, index, list) {
  if (message.layout && LAYOUTS[message.layout]) {
    return message.layout;
  }
  if (message.role === "system") {
    return "system-user";
  }
  if (message.role === "user" && list[index - 1]?.role === "system") {
    return "system-user";
  }
  if (typeof message.content === "string" && /^(Context|Goal|Source|Expectation):/m.test(message.content)) {
    return "cgse";
  }
  return DEFAULT_LAYOUT;
}

/** Field map stored on the message, or rebuilt from bubble text. */
export function inferValues(message, index, list) {
  if (message.values && typeof message.values === "object") {
    return { ...message.values };
  }
  const layout = inferLayout(message, index, list);
  if (layout === "system-user") {
    if (message.role === "system") {
      const next = list[index + 1];
      return { system: message.content, user: next?.role === "user" ? next.content : "" };
    }
    const prev = list[index - 1];
    return { system: prev?.role === "system" ? prev.content : "", user: message.content };
  }
  if (layout === "cgse") {
    return parseCgse(message.content);
  }
  return { user: message.content };
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
  let next = end + 1;
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
