async function renderAdminImageGallery(listEl, images, options = {}) {
  if (!listEl) return;
  const gallery = images || [];
  const {
    emptyHint = "暂无图片",
    altPrefix = "配图",
    deleteMessage = i => `确定删除第 ${i + 1} 张图片吗？`,
    onReorder,
    onDelete
  } = options;

  if (!gallery.length) {
    listEl.innerHTML = `<p class="admin-hint admin-hint--empty">${emptyHint}</p>`;
    return;
  }

  const rows = await Promise.all(gallery.map(async (ref, i) => {
    const url = await CMS.getMediaUrl(ref);
    return `
      <div class="admin-gallery-item" data-gi="${i}">
        <img class="admin-gallery-thumb" src="${url || ""}" alt="${altPrefix} ${i + 1}">
        <span class="admin-gallery-index">第 ${i + 1} 张</span>
        <div class="admin-order-btns">
          <button type="button" class="admin-btn admin-btn-outline admin-btn-sm" data-gup ${i === 0 ? "disabled" : ""}>↑</button>
          <button type="button" class="admin-btn admin-btn-outline admin-btn-sm" data-gdown ${i >= gallery.length - 1 ? "disabled" : ""}>↓</button>
          <button type="button" class="admin-btn admin-btn-danger admin-btn-sm" data-gdel>删</button>
        </div>
      </div>`;
  }));

  listEl.innerHTML = rows.join("");

  listEl.querySelectorAll(".admin-gallery-item").forEach(row => {
    const i = +row.dataset.gi;
    row.querySelector("[data-gup]")?.addEventListener("click", () => {
      if (i <= 0) return;
      onReorder?.(i, i - 1);
    });
    row.querySelector("[data-gdown]")?.addEventListener("click", () => {
      if (i >= gallery.length - 1) return;
      onReorder?.(i, i + 1);
    });
    row.querySelector("[data-gdel]")?.addEventListener("click", async () => {
      const msg = typeof deleteMessage === "function" ? deleteMessage(i) : deleteMessage;
      if (!await confirmDelete(msg)) return;
      onDelete?.(i);
    });
  });
}
