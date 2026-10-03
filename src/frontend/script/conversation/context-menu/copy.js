/** Copy a message's stored text to the clipboard. */

export async function copyMessage(content) {
  await navigator.clipboard.writeText(content);
}
