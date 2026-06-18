document.addEventListener("DOMContentLoaded", async () => {
  await CMS.init();

  const site = CMS.data?.site;
  if (site?.name) {
    document.querySelectorAll(".logo-text").forEach(el => { el.textContent = site.name; });
  }

  const id = new URLSearchParams(location.search).get("id");
  const card = id ? CMS.getContactCard(id) : CMS.data?.contact?.cards?.[0];
  const root = document.getElementById("card-root");
  const err = document.getElementById("card-error");

  if (!card || typeof buildBusinessCardHTML !== "function") {
    if (root) root.innerHTML = "";
    if (err) err.hidden = false;
    return;
  }

  document.title = `${card.name} - 电子名片`;
  root.innerHTML = await buildBusinessCardHTML(card, { page: true });

  const phoneEl = root.querySelector(".card-info-item[data-type='phone'] .card-info-text");
  if (phoneEl && card.phone) {
    phoneEl.innerHTML = `<a href="tel:${card.phone.replace(/\s/g, "")}">${esc(card.phone)}</a>`;
  }
});
