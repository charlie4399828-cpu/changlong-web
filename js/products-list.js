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
  document.title = `${mod.label} — ${siteName}`;

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
      const cards = await Promise.all(products.map((p, i) => createListProductCard(p, i)));
      grid.innerHTML = cards.join("");
      grid.querySelectorAll(".product-card").forEach(card => {
        card.addEventListener("click", () => navigateToProduct(card.dataset.id));
      });
    }
  }

  if (typeof renderSiteMeta === "function" && CMS?.data?.site) {
    await renderSiteMeta(CMS.data.site, { skipTitle: true });
  }

  initHeader();
  initMobileNav();
});

async function createListProductCard(product, index) {
  const delay = Math.min((index % 4) + 1, 4);
  const mediaHtml = typeof renderProductMedia === "function"
    ? await renderProductMedia(product)
    : `<div class="tea-visual" data-tea="${product.image}">${product.name.slice(0, 2)}</div>`;
  return `
    <article class="product-card reveal-scale delay-${delay}" data-id="${product.id}">
      <div class="product-card-shine"></div>
      <div class="product-card-image">
        ${mediaHtml}
        <span class="product-tag">${product.tag}</span>
      </div>
      <div class="product-card-body">
        <h4 class="product-name">${product.name}</h4>
        <p class="product-desc">${product.desc}</p>
        <div class="product-footer">
          <span class="product-price">¥${product.price}<span>/${product.unit}</span></span>
          <span class="product-arrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </span>
        </div>
      </div>
    </article>
  `;
}

function navigateToProduct(id) {
  document.body.classList.add("page-exit");
  setTimeout(() => {
    window.location.href = `product.html?id=${id}`;
  }, 400);
}

function initHeader() {
  const header = document.querySelector(".header");
  if (!header) return;
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function initMobileNav() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    toggle.classList.toggle("active");
    nav.classList.toggle("open");
    document.body.style.overflow = nav.classList.contains("open") ? "hidden" : "";
  });

  nav.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      toggle.classList.remove("active");
      nav.classList.remove("open");
      document.body.style.overflow = "";
    });
  });
}
