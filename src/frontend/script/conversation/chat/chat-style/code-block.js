/** Fenced code bubbles and the Copy control on the language bar. */

const COPY_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>';
const CHECK_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const copyReset = new WeakMap();

/** Title-case a fence language for the code bar. */
function languageLabel(language) {
  if (!language) {
    return "";
  }
  return language.charAt(0).toUpperCase() + language.slice(1);
}

/** Build a copyable code bubble. */
export function codeBlock(language, body) {
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
