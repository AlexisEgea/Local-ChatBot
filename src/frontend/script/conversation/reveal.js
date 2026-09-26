/** Letter-by-letter reveal of assistant reply text. */

let generation = 0;
let finishNow = false;

/** Stop any in-progress reveal (new chat, reopen, another reply). */
export function cancelTextReveal() {
  finishNow = false;
  generation += 1;
}

/** Stop the animation and show the full remaining text. */
export function skipTextReveal() {
  finishNow = true;
  generation += 1;
}

/** Skip animation when the user prefers reduced motion. */
function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const DELAY_MS = 2;

/** Write `text` into `element` one character at a time. */
export async function revealText(element, text, onTick, paint = null) {
  const value = text ?? "";
  const chars = Array.from(value);
  if (!element) {
    return;
  }
  if (prefersReducedMotion() || chars.length === 0) {
    if (paint) {
      paint(element, value);
    } else {
      element.textContent = value;
    }
    onTick?.();
    return;
  }

  const token = (generation += 1);
  const show = (slice) => {
    if (paint) {
      paint(element, slice);
    } else {
      element.textContent = slice;
    }
  };
  show("");
  for (let index = 1; index <= chars.length; index += 1) {
    if (token !== generation) {
      if (finishNow) {
        show(value);
        onTick?.();
      }
      return;
    }
    show(chars.slice(0, index).join(""));
    onTick?.();
    await new Promise((resolve) => {
      setTimeout(resolve, DELAY_MS);
    });
  }
}
