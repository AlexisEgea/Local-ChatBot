/** Render LaTeX fragments with KaTeX. */

import katex from "https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/katex.mjs";

/** Render LaTeX with KaTeX; fall back to the source if a fragment is incomplete. */
export function paintMath(latex, display) {
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
