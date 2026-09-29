/** Paint a markdown document: fenced code first, then block markdown. */

import { appendMarkdownBlocks } from "./blocks.js";
import { codeBlock } from "./code-block.js";

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
