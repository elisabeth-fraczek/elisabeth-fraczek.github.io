// Die normalen Bildverknüpfungen funktionieren auch ohne JavaScript.
const dialog = document.querySelector("#photo-dialog");

if (dialog && typeof dialog.showModal === "function") {
  const enlargedImage = dialog.querySelector("img");
  const description = dialog.querySelector("p");
  let openedFrom = null;

  document.querySelectorAll(".photo-link").forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
        return;
      }

      event.preventDefault();
      openedFrom = link;
      enlargedImage.src = link.href;
      enlargedImage.alt = link.querySelector("img").alt;
      description.textContent = link.closest("figure").querySelector("figcaption").textContent.trim();
      dialog.showModal();
    });
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      const outside = event.clientX < bounds.left
        || event.clientX > bounds.right
        || event.clientY < bounds.top
        || event.clientY > bounds.bottom;

      if (outside) {
        dialog.close();
      }
    }
  });

  dialog.addEventListener("close", () => {
    openedFrom?.focus();
  });
}
