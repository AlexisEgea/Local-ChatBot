/** Waiting animation: three leaping dots while a reply is generated. */

/** Paint three leaping dots shown while a reply is generated. */
export function paintWaitingBlob(bubble) {
  bubble.replaceChildren();
  bubble.classList.add("bubble--waiting");
  const dots = document.createElement("span");
  dots.className = "waiting-dots";
  dots.setAttribute("aria-hidden", "true");
  for (let index = 0; index < 3; index += 1) {
    dots.appendChild(document.createElement("span"));
  }
  bubble.appendChild(dots);
}
