/** Letter-by-letter reveal of assistant reply text. */

let generation = 0;
let finishNow = false;
let currentSlice = "";

/** Stop any in-progress reveal (new chat, reopen, another reply). */
export function cancelTextReveal() {
  finishNow = false;
  generation += 1;
  currentSlice = "";
}

/** Stop the animation and show the full remaining text. */
export function skipTextReveal() {
  finishNow = true;
  generation += 1;
}

/** Stop the animation and keep the text already on screen. */
export function haltTextReveal() {
  finishNow = false;
  generation += 1;
  return currentSlice;
}

/** Return the text currently shown by the in-progress reveal. */
export function getRevealedText() {
  return currentSlice;
}

/** Skip animation when the user prefers reduced motion. */
function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const DELAY_MS = 2;

/** Paint `slice` into `element`, tracking it as the current reveal. */
function paintSlice(element, slice, paint) {
  currentSlice = slice;
  if (paint) {
    paint(element, slice);
  } else {
    element.textContent = slice;
  }
}

/** Write `text` into `element` one character at a time. */
export async function revealText(element, text, onTick, paint = null) {
  await revealFrom(element, "", text ?? "", onTick, paint);
}

/** Show `prefix` at once, then type `extra` after it. */
export async function revealFrom(element, prefix, extra, onTick, paint = null) {
  const lead = prefix ?? "";
  const notice = extra ?? "";
  const value = `${lead}${notice}`;
  if (!element) {
    return;
  }
  if (prefersReducedMotion() || notice.length === 0) {
    paintSlice(element, value, paint);
    onTick?.();
    return;
  }

  const token = (generation += 1);
  const chars = Array.from(notice);
  paintSlice(element, lead, paint);
  onTick?.();
  for (let index = 1; index <= chars.length; index += 1) {
    if (token !== generation) {
      if (finishNow) {
        paintSlice(element, value, paint);
        onTick?.();
      }
      return;
    }
    paintSlice(element, lead + chars.slice(0, index).join(""), paint);
    onTick?.();
    await new Promise((resolve) => {
      setTimeout(resolve, DELAY_MS);
    });
    if (token !== generation) {
      if (finishNow) {
        paintSlice(element, value, paint);
        onTick?.();
      }
      return;
    }
  }
}
