/** Outer side rail: open or close a pane. */

/** Bind open/close and click-to-toggle for one side rail. */
export function bindRail(element) {
  function setOpen(open) {
    element.classList.toggle("is-open", open);
    element.classList.toggle("glass", open);
    element.setAttribute("aria-expanded", String(open));
  }

  function isOpen() {
    return element.classList.contains("is-open");
  }

  function onToggle(handler) {
    element.addEventListener("click", (event) => {
      if (event.target.closest("label, input, button")) {
        return;
      }
      handler();
    });
  }

  return { setOpen, isOpen, onToggle };
}
