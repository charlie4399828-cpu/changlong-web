document.addEventListener("DOMContentLoaded", async () => {
  document.body.classList.add("page-transition");

  if (typeof CMS !== "undefined") {
    await CMS.init();
  }

  window.addEventListener("storage", e => {
    if (e.key === "changlong_site_data" || e.key === "changlong_cms_version") {
      window.location.reload();
    }
  });

  const params = new URLSearchParams(window.location.search);
  const moduleKey = params.get("module") || "seasonal";

  const modules = CMS?.getProductModules?.() || [
    { key: "seasonal", label: "当季新品" },
    { key: "hot", label: "热销商品" }
  ];
  const mod = modules.find(m => m.key === moduleKey) || { key: moduleKey, label: moduleKey };

  const productData = CMS?.data?.products || (typeof PRODUCTS !== "undefined" ? PRODUCTS : null);
  const products = productData?.[mod.key] || [];

  const siteName = CMS?.data?.site?.name || "昌隆茶业";
  document.title = `${mod.label} - ${siteName}`;

  const titleEl = document.getElementById("list-title");
  const countEl = document.getElementById("list-count");
  const breadcrumbEl = document.getElementById("list-breadcrumb-label");
  const grid = document.getElementById("products-grid");

  if (titleEl) titleEl.textContent = mod.label;
  if (breadcrumbEl) breadcrumbEl.textContent = mod.label;
  if (countEl) countEl.textContent = `共 ${products.length} 款`;

  if (grid) {
    if (!products.length) {
      grid.innerHTML = `<p class="products-list-empty">该分类暂无商品</p>`;
    } else {
      const cards = await Promise.all(products.map((p, i) => createProductCard(p, i)));
      grid.innerHTML = cards.join("");
      bindProductCardClicks(grid);
      if (typeof observeRevealElements === "function") observeRevealElements();
    }
  }

  if (typeof renderSiteMeta === "function" && CMS?.data?.site) {
    await renderSiteMeta(CMS.data.site, { skipTitle: true });
  }

  initPageHeader();
  initPageMobileNav();
});
