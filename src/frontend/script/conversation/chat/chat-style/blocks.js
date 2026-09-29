/** Block markdown: headings, rules, lists, quotes, tables, and display math. */

import { paragraph } from "./inline.js";
import { paintMath } from "./math.js";
import { isTableRow, isTableSep, tableCells } from "./table.js";

/** Paint markdown (no fences) as DOM blocks. */
export function appendMarkdownBlocks(root, source) {
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
