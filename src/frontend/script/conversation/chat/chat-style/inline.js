/** Inline markdown: code, emphasis, links, and math spans. */

import { paintMath } from "./math.js";

/** Append inline markdown nodes into a parent. */
export function appendInline(parent, text) {
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
export function paragraph(tag, text) {
  const node = document.createElement(tag);
  appendInline(node, text);
  return node;
}
