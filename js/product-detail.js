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
  const id = params.get("id");
  const product = CMS?.getProductById?.(id) || (typeof getProductById === "function" ? getProductById(id) : null);

  if (product) {
    await renderProduct(product);
  } else {
    renderNotFound();
  }

  if (typeof renderSiteMeta === "function" && CMS?.data?.site) {
    await renderSiteMeta(CMS.data.site, { skipTitle: true });
  }

  initPageHeader();
  initPageMobileNav();
  initTapEffect();
});

async function renderProduct(product) {
  const siteName = CMS?.data?.site?.name || "昌隆茶业";
  document.title = `${product.name} - ${siteName}`;

  const container = document.getElementById("product-detail");
  if (!container) return;

  const mediaHtml = typeof renderProductMedia === "function"
    ? await renderProductMedia(product, "detail-image")
    : `<div class="tea-visual detail-image" data-tea="${product.image}">${product.name}</div>`;

  const galleryHtml = await buildProductGalleryHTML(product);

  container.innerHTML = `
    <div class="detail-hero">
      <div class="container">
        <nav class="detail-breadcrumb reveal-fade revealed">
          <a href="index.html">首页</a>
          <span>/</span>
          <a href="index.html#products">产品信息</a>
          <span>/</span>
          ${escText(product.name)}
        </nav>
        <div class="detail-grid">
          <div class="detail-image-wrap reveal-left revealed">
            ${mediaHtml}
          </div>
          <div class="detail-info reveal-right revealed">
            <span class="detail-tag reveal-fade delay-1 revealed">${escText(product.tag)}</span>
            <h1 class="detail-name reveal-fade delay-2 revealed">${escText(product.name)}</h1>
            <p class="detail-price reveal-fade delay-3 revealed">¥${product.price} <span>/ ${escText(product.unit)}</span></p>
            <p class="detail-desc reveal-fade delay-4 revealed">${escText(product.desc)}</p>
            <div class="detail-features">
              ${(product.features || []).map((f, i) => `<span class="detail-feature reveal-scale delay-${Math.min(i + 1, 5)} revealed">${escText(f)}</span>`).join("")}
            </div>
            <div class="detail-actions">
              <a href="index.html#contact" class="btn btn-primary">联系购买</a>
              <a href="index.html#products" class="btn btn-outline">返回列表</a>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="detail-content">
      <div class="container">
        <h2 class="detail-content-title reveal-blur revealed">茶品详情</h2>
        <div class="section-divider reveal-fade delay-2 revealed"></div>
        <p class="detail-content-text reveal-up delay-3 revealed">${escText(product.detail)}</p>
        ${galleryHtml}
      </div>
    </div>
  `;

  initScrollReveal();
  initPhotoFanGallery();
}

function escText(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

async function buildProductGalleryHTML(product) {
  const refs = product.gallery || [];
  if (!refs.length) return "";

  const items = await Promise.all(refs.map(async (ref, i) => {
    const url = await CMS.resolveMediaUrl(ref);
    if (!url) return null;
    return { url, i };
  }));

  const valid = items.filter(Boolean);
  if (!valid.length) return "";

  const cards = valid.map(item => `
    <button type="button" class="photo-fan-item revealed" data-index="${item.i}" aria-label="查看实拍图 ${item.i + 1}">
      <img src="${item.url}" alt="${escText(product.name)} 实拍 ${item.i + 1}" loading="lazy" decoding="async">
    </button>
  `).join("");

  return `
    <div class="photo-fan-block reveal-up revealed">
      <h3 class="photo-fan-title">产品实拍</h3>
      <div class="photo-fan" data-photo-fan>
        ${cards}
      </div>
      <p class="photo-fan-hint">轻触或划过图片可放大，点击查看大图</p>
    </div>`;
}

function initPhotoFanGallery() {
  const fan = document.querySelector("[data-photo-fan]");
  if (!fan) return;

  const items = [...fan.querySelectorAll(".photo-fan-item")];
  const count = items.length;
  const mid = (count - 1) / 2;
  const spread = Math.min(14, 28 / Math.max(count, 1));
  const offset = Math.min(48, 220 / Math.max(count, 1));

  items.forEach((item, i) => {
    const angle = (i - mid) * spread;
    const x = (i - mid) * offset;
    item.dataset.fanRotate = String(angle);
    item.dataset.fanX = String(x);
    item.style.setProperty("--fan-rotate", `${angle}deg`);
    item.style.setProperty("--fan-x", `${x}px`);
    item.style.zIndex = String(i + 1);
  });

  const repelStep = Math.min(52, 300 / Math.max(count, 1));
  const repelExtra = 22;
  let activeItem = null;
  let clearTimer = null;

  const resetFanItem = el => {
    el.classList.remove("is-active");
    el.style.removeProperty("--fan-push-x");
    el.style.removeProperty("--fan-scale");
    el.style.removeProperty("--fan-y");
    el.style.removeProperty("--fan-rotate-active");
    el.style.zIndex = el.dataset.fanZ || "1";
  };

  const applyFanState = item => {
    const activeIndex = item ? items.indexOf(item) : -1;
    fan.classList.toggle("has-active", activeIndex >= 0);

    if (activeIndex < 0) {
      items.forEach(resetFanItem);
      return;
    }

    items.forEach((el, i) => {
      const dist = i - activeIndex;
      if (dist === 0) {
        el.classList.add("is-active");
        el.style.setProperty("--fan-push-x", "0px");
        el.style.setProperty("--fan-scale", "1.24");
        el.style.setProperty("--fan-y", "-30px");
        el.style.setProperty("--fan-rotate-active", "0deg");
        el.style.zIndex = "30";
        return;
      }

      el.classList.remove("is-active");
      const dir = dist > 0 ? 1 : -1;
      const push = dir * (repelStep + Math.abs(dist) * repelExtra);
      const baseRotate = Number(el.dataset.fanRotate || 0);
      const extraRotate = dir * (10 + Math.abs(dist) * 5);
      el.style.setProperty("--fan-push-x", `${push}px`);
      el.style.setProperty("--fan-scale", String(Math.max(0.84, 0.95 - Math.abs(dist) * 0.04)));
      el.style.setProperty("--fan-y", `${6 + Math.abs(dist) * 2}px`);
      el.style.setProperty("--fan-rotate-active", `${baseRotate + extraRotate}deg`);
      el.style.zIndex = String(Math.max(1, 20 - Math.abs(dist)));
    });
  };

  const setActive = item => {
    if (clearTimer) {
      clearTimeout(clearTimer);
      clearTimer = null;
    }
    if (activeItem === item) return;
    activeItem = item;
    applyFanState(item);
  };

  const clearActive = (delay = 80) => {
    if (clearTimer) clearTimeout(clearTimer);
    clearTimer = setTimeout(() => {
      activeItem = null;
      applyFanState(null);
      clearTimer = null;
    }, delay);
  };

  items.forEach((item, i) => {
    item.dataset.fanZ = String(i + 1);

    item.addEventListener("pointerenter", () => {
      if (item.dataset.touching !== "1") setActive(item);
    });
    item.addEventListener("pointerleave", () => {
      if (item.dataset.touching !== "1") clearActive(120);
    });
    item.addEventListener("click", () => {
      const img = item.querySelector("img");
      if (img?.src) openPhotoLightbox(img.src, img.alt);
    });
  });

  fan.addEventListener("pointerdown", e => {
    const item = e.target.closest(".photo-fan-item");
    if (!item) return;
    item.dataset.touching = "1";
    setActive(item);
  });

  fan.addEventListener("pointermove", e => {
    if (e.pointerType !== "touch" && e.pointerType !== "pen") return;
    const item = document.elementFromPoint(e.clientX, e.clientY)?.closest(".photo-fan-item");
    if (item) setActive(item);
  });

  fan.addEventListener("pointerup", () => {
    items.forEach(el => { delete el.dataset.touching; });
  });

  fan.addEventListener("pointerleave", () => clearActive(160));
  fan.addEventListener("pointercancel", () => clearActive(0));
}

function openPhotoLightbox(src, alt) {
  const existing = document.querySelector(".photo-lightbox");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.className = "photo-lightbox";
  overlay.innerHTML = `
    <button type="button" class="photo-lightbox-backdrop" aria-label="关闭"></button>
    <div class="photo-lightbox-stage">
      <img src="${src}" alt="${alt || ""}">
    </div>
    <button type="button" class="photo-lightbox-close" aria-label="关闭">×</button>`;

  const close = () => {
    overlay.remove();
    document.body.style.overflow = "";
  };

  overlay.querySelector(".photo-lightbox-backdrop").onclick = close;
  overlay.querySelector(".photo-lightbox-close").onclick = close;
  overlay.addEventListener("click", e => {
    if (e.target === overlay) close();
  });

  document.addEventListener("keydown", function onKey(e) {
    if (e.key === "Escape") {
      close();
      document.removeEventListener("keydown", onKey);
    }
  });

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";
}

function renderNotFound() {
  document.title = "商品未找到 - 昌隆茶业";
  const container = document.getElementById("product-detail");
  if (!container) return;

  container.innerHTML = `
    <div class="detail-not-found">
      <h2>未找到该商品</h2>
      <p style="color: var(--color-mist); margin-bottom: 2rem;">您访问的商品可能已下架或链接有误</p>
      <a href="index.html#products" class="btn btn-primary">返回商品列表</a>
    </div>
  `;
}

const REVEAL_SELECTOR = [
  ".reveal", ".reveal-left", ".reveal-right", ".reveal-scale",
  ".reveal-fade", ".reveal-blur", ".reveal-up", ".section-divider"
].join(", ");

function initScrollReveal() {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        entry.target.classList.toggle("revealed", entry.isIntersecting);
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  document.querySelectorAll(REVEAL_SELECTOR).forEach(el => observer.observe(el));
}

function initTapEffect() {
  document.querySelectorAll(".btn").forEach(el => {
    el.addEventListener("click", () => {
      el.classList.add("tap-active");
      setTimeout(() => el.classList.remove("tap-active"), 300);
    });
  });
}
