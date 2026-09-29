/** Model panel: show or hide the Model sidebar. */

const sidebar = document.getElementById("sidebar");

/** Show or hide the Model panel. */
export function setModelPanelOpen(open) {
  sidebar.hidden = !open;
}
