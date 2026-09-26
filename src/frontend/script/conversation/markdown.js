/** Minimal markdown paint for assistant replies (headings, lists, tables, code). */

import katex from "https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/katex.mjs";

const COPY_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
const CHECK_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const copyReset = new WeakMap();

/** Split fenced code from surrounding markdown. An unclosed fence stays a code block. */
function splitFences(source) {
  const tokens = [];
  const lines = String(source ?? "").split("\n");
  let index = 0;
  let markdown = [];

  const flushMarkdown = () => {
    if (markdown.length) {
      tokens.push({ type: "markdown", body: markdown.join("\n") });
      markdown = [];
    }
  };

  while (index < lines.length) {
    const open = lines[index].match(/^```([^\n`]*)$/);
    if (!open) {
      markdown.push(lines[index]);
      index += 1;
      continue;
    }
    flushMarkdown();
    const language = open[1].trim();
    index += 1;
    const body = [];
    while (index < lines.length && !lines[index].startsWith("```")) {
      body.push(lines[index]);
      index += 1;
    }
    if (index < lines.length && lines[index].startsWith("```")) {
      index += 1;
    }
    tokens.push({ type: "code", language, body: body.join("\n") });
  }
  flushMarkdown();
  return tokens;
}

/** Title-case a fence language for the code bar. */
function languageLabel(language) {
  if (!language) {
    return "";
  }
  return language.charAt(0).toUpperCase() + language.slice(1);
}

/** Build a copyable code bubble. */
function codeBlock(language, body) {
  const wrap = document.createElement("div");
  wrap.className = "code-block glass";
  const bar = document.createElement("div");
  bar.className = "code-block-bar";
  const lang = document.createElement("span");
  lang.className = "code-block-lang";
  lang.textContent = languageLabel(language);
  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "code-block-copy";
  copy.setAttribute("aria-label", "Copy");
  copy.innerHTML = COPY_ICON;
  bar.append(lang, copy);
  const pre = document.createElement("pre");
  const code = document.createElement("code");
  code.textContent = body;
  pre.appendChild(code);
  wrap.append(bar, pre);
  return wrap;
}

/** True when a line is a markdown table row. */
function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

/** True when a line is a table separator. */
function isTableSep(line) {
  return /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(line);
}

/** Split a table row into cells, ignoring `|` inside math or inline code. */
function tableCells(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let current = "";
  let inlineMath = false;
  let displayMath = false;
  let dollarMath = false;
  let code = false;

  for (let index = 0; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    const next = trimmed[index + 1];

    if (char === "`") {
      code = !code;
      current += char;
      continue;
    }
    if (!code && char === "\\" && next === "(") {
      inlineMath = true;
      current += char;
      continue;
    }
    if (!code && inlineMath && char === "\\" && next === ")") {
      inlineMath = false;
      current += char;
      continue;
    }
    if (!code && char === "\\" && next === "[") {
      displayMath = true;
      current += char;
      continue;
    }
    if (!code && displayMath && char === "\\" && next === "]") {
      displayMath = false;
      current += char;
      continue;
    }
    if (!code && !inlineMath && !displayMath && char === "$" && next === "$") {
      dollarMath = !dollarMath;
      current += "$$";
      index += 1;
      continue;
    }
    if (char === "|" && !code && !inlineMath && !displayMath && !dollarMath) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.length || cells.length) {
    cells.push(current.trim());
  }
  return cells;
}

/** Render LaTeX with KaTeX; fall back to the source if a fragment is incomplete. */
function paintMath(latex, display) {
  const node = document.createElement(display ? "div" : "span");
  node.className = display ? "md-math md-math--block" : "md-math";
  try {
    katex.render(latex, node, {
      throwOnError: false,
      displayMode: display,
      output: "html",
    });
  } catch {
    node.textContent = latex;
  }
  return node;
}

/** Append inline markdown nodes into a parent. */
function appendInline(parent, text) {
  const pattern =
    /(`[^`]+`)|(\\\[[\s\S]*?\\\])|(\$\$[\s\S]*?\$\$)|(\\\([\s\S]*?\\\))|(\*\*[^*]+\*\*)|(_[^_]+_)|(\*[^*\n]+\*)|(\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0;
  let match = pattern.exec(text);
  while (match) {
    if (match.index > last) {
      parent.appendChild(document.createTextNode(text.slice(last, match.index)));
    }
    const token = match[0];
    if (token.startsWith("`")) {
      const code = document.createElement("code");
      code.className = "md-inline-code";
      code.textContent = token.slice(1, -1);
      parent.appendChild(code);
    } else if (token.startsWith("\\[") || token.startsWith("\\(") || token.startsWith("$$")) {
      const display = token.startsWith("\\[") || token.startsWith("$$");
      const latex = token.startsWith("$$") ? token.slice(2, -2).trim() : token.slice(2, -2).trim();
      parent.appendChild(paintMath(latex, display));
    } else if (token.startsWith("**")) {
      const strong = document.createElement("strong");
      appendInline(strong, token.slice(2, -2));
      parent.appendChild(strong);
    } else if (token.startsWith("_") || token.startsWith("*")) {
      const em = document.createElement("em");
      appendInline(em, token.slice(1, -1));
      parent.appendChild(em);
    } else if (token.startsWith("[")) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      const href = linkMatch?.[2] ?? "";
      if (/^https?:\/\//i.test(href)) {
        const link = document.createElement("a");
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        appendInline(link, linkMatch[1]);
        parent.appendChild(link);
      } else {
        parent.appendChild(document.createTextNode(token));
      }
    }
    last = match.index + token.length;
    match = pattern.exec(text);
  }
  if (last < text.length) {
    parent.appendChild(document.createTextNode(text.slice(last)));
  }
}

/** Paint a paragraph-like element. */
function paragraph(tag, text) {
  const node = document.createElement(tag);
  appendInline(node, text);
  return node;
}

/** Paint markdown (no fences) as DOM blocks. */
function appendMarkdownBlocks(root, source) {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      root.appendChild(paragraph(`h${Math.min(heading[1].length, 4)}`, heading[2]));
      index += 1;
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
      root.appendChild(document.createElement("hr"));
      index += 1;
      continue;
    }

    const mathOpen = line.trim();
    if (mathOpen === "\\[" || mathOpen === "$$") {
      const close = mathOpen === "$$" ? "$$" : "\\]";
      const body = [];
      index += 1;
      while (index < lines.length && lines[index].trim() !== close) {
        body.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      root.appendChild(paintMath(body.join("\n"), true));
      continue;
    }

    if (isTableRow(line) && index + 1 < lines.length && isTableSep(lines[index + 1])) {
      const table = document.createElement("table");
      table.className = "md-table";
      const head = document.createElement("thead");
      const headRow = document.createElement("tr");
      for (const cell of tableCells(line)) {
        headRow.appendChild(paragraph("th", cell));
      }
      head.appendChild(headRow);
      table.appendChild(head);
      const body = document.createElement("tbody");
      index += 2;
      while (index < lines.length && isTableRow(lines[index])) {
        const row = document.createElement("tr");
        for (const cell of tableCells(lines[index])) {
          row.appendChild(paragraph("td", cell));
        }
        body.appendChild(row);
        index += 1;
      }
      table.appendChild(body);
      root.appendChild(table);
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      const list = document.createElement("ul");
      while (index < lines.length) {
        const item = lines[index].match(/^\s*[-*]\s+(.*)$/);
        if (!item) {
          break;
        }
        list.appendChild(paragraph("li", item[1]));
        index += 1;
      }
      root.appendChild(list);
      continue;
    }

    const numbered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (numbered) {
      const list = document.createElement("ol");
      while (index < lines.length) {
        const item = lines[index].match(/^\s*\d+\.\s+(.*)$/);
        if (!item) {
          break;
        }
        list.appendChild(paragraph("li", item[1]));
        index += 1;
      }
      root.appendChild(list);
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = document.createElement("blockquote");
      const quoted = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoted.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      quote.appendChild(paragraph("p", quoted.join(" ")));
      root.appendChild(quote);
      continue;
    }

    const paragraphLines = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].match(/^(#{1,6})\s+/) &&
      !/^```/.test(lines[index]) &&
      !isTableRow(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index]) &&
      !/^>\s?/.test(lines[index]) &&
      !/^(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[index].trim()) &&
      lines[index].trim() !== "\\[" &&
      lines[index].trim() !== "$$"
    ) {
      paragraphLines.push(lines[index]);
      index += 1;
    }
    root.appendChild(paragraph("p", paragraphLines.join(" ")));
  }
}

/** Replace `root` contents with a rendered markdown document. */
export function paintMarkdown(root, source) {
  if (!root) {
    return;
  }
  root.replaceChildren();
  root.classList.add("markdown");
  for (const token of splitFences(source)) {
    if (token.type === "code") {
      root.appendChild(codeBlock(token.language, token.body));
    } else {
      appendMarkdownBlocks(root, token.body);
    }
  }
}

/** Show a checkmark for two seconds after a successful copy. */
function showCopied(button) {
  const previous = copyReset.get(button);
  if (previous) {
    clearTimeout(previous);
  }
  button.innerHTML = CHECK_ICON;
  button.setAttribute("aria-label", "Copied");
  copyReset.set(
    button,
    setTimeout(() => {
      button.innerHTML = COPY_ICON;
      button.setAttribute("aria-label", "Copy");
      copyReset.delete(button);
    }, 500),
  );
}

/** Copy handler for code-block buttons (does not skip a running reveal). */
export function onCodeCopyClick(event) {
  const button = event.target.closest(".code-block-copy");
  if (!button) {
    return false;
  }
  event.preventDefault();
  event.stopPropagation();
  const code = button.closest(".code-block")?.querySelector("pre code");
  const text = code?.textContent ?? "";
  navigator.clipboard.writeText(text).then(() => showCopied(button)).catch(() => {});
  return true;
}
