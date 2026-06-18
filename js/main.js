document.addEventListener("DOMContentLoaded", async () => {
  window.addEventListener("storage", e => {
    if (e.key === "changlong_site_data" || e.key === "changlong_cms_version") {
      window.location.reload();
    }
  });

  /* 先初始化滚动/导航，避免 CMS 云端加载慢时下方区块一直 opacity:0 */
  initHeader();
  initScrollReveal();
  initSectionFade();
  initParallax();
  initMobileNav();
  initSideNav();
  revealVisibleContent();

  if (typeof CMS !== "undefined") {
    try {
      await CMS.init();
      if (typeof renderSiteFromCMS === "function") {
        await renderSiteFromCMS();
      }
    } catch (err) {
      console.error("CMS 渲染失败:", err);
    }
  }

  initCarousel();
  await initProductCards();
  observeRevealElements();
  revealVisibleContent();
  initSmoothScroll();
  initTapEffect();
  if (typeof initSpotlight === "function") initSpotlight(true);

  /* 兜底：3 秒后强制显示仍被动画隐藏的内容 */
  setTimeout(revealAllContent, 3000);
});

function revealVisibleContent() {
  const vh = window.innerHeight || 800;
  document.querySelectorAll(REVEAL_SELECTOR).forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < vh * 1.1 && rect.bottom > -40) {
      el.classList.add("revealed");
    }
  });
  document.querySelectorAll(".scroll-section").forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < vh * 1.2) el.classList.add("in-view");
  });
}

function revealAllContent() {
  document.querySelectorAll(REVEAL_SELECTOR).forEach(el => el.classList.add("revealed"));
  document.querySelectorAll(".scroll-section").forEach(el => el.classList.add("in-view"));
}

const REVEAL_SELECTOR = [
  ".reveal", ".reveal-left", ".reveal-right", ".reveal-scale",
  ".reveal-fade", ".reveal-blur", ".reveal-up", ".text-reveal-line",
  ".section-divider"
].join(", ");

let revealObserver = null;

function initHeader() {
  initPageHeader({ trackNav: true });
}

function initMobileNav() {
  initPageMobileNav();
}

function getCurrentSection() {
  const sections = ["shop", "products", "contact"];
  let current = sections[0];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const rect = el.getBoundingClientRect();
      if (rect.top <= 120) current = id;
    }
  });
  return current;
}

function updateActiveNav() {
  const current = getCurrentSection();

  document.querySelectorAll(".nav-link").forEach(link => {
    const href = link.getAttribute("href");
    link.classList.toggle("active", href === `#${current}`);
  });

  document.querySelectorAll(".side-nav-item").forEach(item => {
    item.classList.toggle("active", item.dataset.section === current);
  });

  updateSideNavProgress(current);
}

function updateSideNavProgress(current) {
  const progress = document.querySelector(".side-nav-line-progress");
  if (!progress) return;
  const map = { shop: "0%", products: "50%", contact: "100%" };
  progress.style.height = map[current] || "0%";
}

function initSideNav() {
  const portal = document.getElementById("side-nav-portal");
  const sideNav = document.querySelector(".side-nav");
  if (!sideNav) return;

  if (portal && portal.parentElement !== document.documentElement) {
    document.documentElement.appendChild(portal);
  }

  let isHovering = false;
  let scrollTimer = null;
  let lastScrollY = window.scrollY;

  const collapse = () => {
    if (!isHovering) sideNav.classList.add("is-collapsed");
  };

  const expand = () => {
    sideNav.classList.remove("is-collapsed");
    sideNav.classList.add("is-expanded");
  };

  sideNav.querySelectorAll(".side-nav-item").forEach(item => {
    item.addEventListener("click", e => {
      const sectionId = item.dataset.section;
      const target = document.getElementById(sectionId);
      if (!target) return;
      e.preventDefault();
      const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-height")) || 72;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
      item.classList.add("tap-active");
      setTimeout(() => item.classList.remove("tap-active"), 350);
    });
  });

  sideNav.addEventListener("mouseenter", () => {
    isHovering = true;
    expand();
  });

  sideNav.addEventListener("mouseleave", () => {
    isHovering = false;
    sideNav.classList.remove("is-expanded");
    collapse();
  });

  sideNav.addEventListener("focusin", expand);
  sideNav.addEventListener("focusout", () => {
    if (!sideNav.matches(":hover")) collapse();
  });

  window.addEventListener("scroll", () => {
    const scrolling = Math.abs(window.scrollY - lastScrollY) > 2;
    lastScrollY = window.scrollY;

    if (scrolling && !isHovering) collapse();

    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      if (!isHovering && window.scrollY > 200) collapse();
    }, 600);
  }, { passive: true });

  if (window.scrollY > 200) collapse();
}

function initCarousel() {
  const carousel = document.querySelector(".carousel");
  if (!carousel) return;

  const slides = carousel.querySelectorAll(".carousel-slide");
  const dots = carousel.querySelectorAll(".carousel-dot");
  const prevBtn = carousel.querySelector(".carousel-arrow.prev");
  const nextBtn = carousel.querySelector(".carousel-arrow.next");

  let current = 0;
  let autoplayTimer = null;
  const interval = parseInt(carousel.dataset.interval) || 5000;

  function goTo(index) {
    const next = (index + slides.length) % slides.length;
    if (next === current) return;

    slides[current].classList.add("exiting");
    slides[current].classList.remove("active");

    setTimeout(() => slides[current].classList.remove("exiting"), 1200);

    current = next;
    slides[current].classList.add("active");
    dots.forEach((d, i) => d.classList.toggle("active", i === current));
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  function startAutoplay() {
    stopAutoplay();
    autoplayTimer = setInterval(next, interval);
  }

  function stopAutoplay() {
    if (autoplayTimer) clearInterval(autoplayTimer);
  }

  prevBtn?.addEventListener("click", () => { prev(); startAutoplay(); });
  nextBtn?.addEventListener("click", () => { next(); startAutoplay(); });

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => { goTo(i); startAutoplay(); });
  });

  carousel.addEventListener("mouseenter", stopAutoplay);
  carousel.addEventListener("mouseleave", startAutoplay);

  let touchStartX = 0;
  carousel.addEventListener("touchstart", e => {
    touchStartX = e.touches[0].clientX;
    stopAutoplay();
  }, { passive: true });

  carousel.addEventListener("touchend", e => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
    startAutoplay();
  }, { passive: true });

  startAutoplay();
}

function initScrollReveal() {
  revealObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
        } else {
          entry.target.classList.remove("revealed");
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );
  observeRevealElements();
}

function observeRevealElements() {
  if (!revealObserver) return;
  document.querySelectorAll(REVEAL_SELECTOR).forEach(el => {
    if (!el.dataset.observed) {
      el.dataset.observed = "1";
      revealObserver.observe(el);
    }
  });
}

function initSectionFade() {
  const sections = document.querySelectorAll(".scroll-section");
  const sectionObserver = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        entry.target.classList.toggle("in-view", entry.isIntersecting);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -5% 0px" }
  );
  sections.forEach(s => sectionObserver.observe(s));
}

function initParallax() {
  const layers = document.querySelectorAll("[data-parallax]");
  const hero = document.querySelector(".hero");
  const carousel = document.querySelector(".carousel");

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const scrollY = window.scrollY;

      layers.forEach(el => {
        const speed = parseFloat(el.dataset.parallax) || 0.3;
        const rect = el.getBoundingClientRect();
        const offset = (rect.top + scrollY - window.innerHeight / 2) * speed * 0.1;
        el.style.transform = `translate3d(0, ${offset}px, 0)`;
      });

      if (hero && carousel) {
        const progress = Math.min(scrollY / hero.offsetHeight, 1);
        carousel.style.transform = `translate3d(0, ${scrollY * 0.2}px, 0)`;
        carousel.style.opacity = String(Math.max(1 - progress * 1.1, 0));
      }

      ticking = false;
    });
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

const HOME_PRODUCT_LIMIT = 8;

async function initProductCards() {
  const grid = document.getElementById("product-grids");
  const productData = (typeof CMS !== "undefined" && CMS.data?.products) || (typeof PRODUCTS !== "undefined" ? PRODUCTS : null);
  if (!grid || !productData) return;

  const modules = (typeof CMS !== "undefined" && CMS.getProductModules?.()) || [
    { key: "seasonal", label: "当季新品" },
    { key: "hot", label: "热销商品" }
  ];

  grid.innerHTML = modules.map(mod => `
    <div class="product-category" data-module="${mod.key}">
      <div class="category-header reveal-left">
        <h3 class="category-title">${escProductText(mod.label)}</h3>
        <div class="category-header-right"></div>
      </div>
      <div class="product-grid" id="module-${mod.key}"></div>
    </div>`).join("");

  for (const mod of modules) {
    const container = document.getElementById(`module-${mod.key}`);
    if (!container) continue;

    const products = productData[mod.key] || [];
    const headerRight = container.closest(".product-category")?.querySelector(".category-header-right");
    if (headerRight) {
      const parts = [`<span class="category-count">共 ${products.length} 款</span>`];
      if (products.length > HOME_PRODUCT_LIMIT) {
        parts.push(`<a href="products.html?module=${encodeURIComponent(mod.key)}" class="category-view-all">查看全部<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg></a>`);
      }
      headerRight.innerHTML = parts.join("");
    }

    const visible = products.slice(0, HOME_PRODUCT_LIMIT);
    const cards = await Promise.all(visible.map((p, i) => createProductCard(p, i)));
    container.innerHTML = cards.join("");
    bindProductCardClicks(container);
  }

  observeRevealElements();
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]:not(.side-nav-item)').forEach(anchor => {
    anchor.addEventListener("click", e => {
      const target = document.querySelector(anchor.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--header-height")) || 72;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });
}

function initTapEffect() {
  document.addEventListener("click", e => {
    const el = e.target.closest(".btn, .product-card, .business-card, .contact-entry, .carousel-dot, .about-feature, .carousel-arrow");
    if (!el) return;
    el.classList.add("tap-active");
    setTimeout(() => el.classList.remove("tap-active"), 350);
  });
}
