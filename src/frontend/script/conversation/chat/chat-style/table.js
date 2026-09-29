/** Markdown tables: detect rows and split cells without breaking math or inline code. */

/** True when a line is a markdown table row. */
export function isTableRow(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

/** True when a line is a table separator. */
export function isTableSep(line) {
  return /^\s*\|?[\s:-]+\|[\s|:-]*$/.test(line);
}

/** Split a table row into cells, ignoring `|` inside math or inline code. */
export function tableCells(line) {
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
