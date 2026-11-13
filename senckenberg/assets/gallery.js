const dialog = document.querySelector("#photo-dialog");
const dialogPhoto = dialog.querySelector("img");
const dialogCaption = dialog.querySelector("p");

for (const link of document.querySelectorAll(".photo-link")) {
  link.addEventListener("click", (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    dialogPhoto.src = link.href;
    dialogPhoto.alt = link.querySelector("img").alt;
    dialogCaption.textContent = link.parentElement.querySelector("figcaption").textContent;
    dialog.showModal();
  });
}
