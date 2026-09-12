/** History and Chat Mode side rails at the edges of the workspace. */

const outerLeft = document.getElementById("sidebar-outer-left");
const outerRight = document.getElementById("sidebar-outer-right");

/** Show or hide one of the outer side panels. */
export function setSidePanelOpen(side, open) {
  const panel = side === "left" ? outerLeft : outerRight;
  panel.classList.toggle("is-open", open);
  panel.classList.toggle("glass", open);
  panel.setAttribute("aria-expanded", String(open));
}

/** Bind clicks on the left and right side zones. */
export function onSidePanelToggle(handler) {
  const onRailClick = (side) => (event) => {
    if (event.target.closest("label, input, button")) {
      return;
    }
    handler(side);
  };
  outerLeft.addEventListener("click", onRailClick("left"));
  outerRight.addEventListener("click", onRailClick("right"));
}
