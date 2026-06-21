async function renderSiteFromCMS() {
  if (!CMS?.data) return;

  const d = CMS.data;
  await renderSiteMeta(d.site);
  await renderCarousel(d.carousel);
  await renderAbout(d.about);
  renderProductsSection(d.productsSection);
  await renderContact(d.contact);

  if (typeof observeRevealElements === "function") observeRevealElements();
  if (typeof revealVisibleContent === "function") revealVisibleContent();
}

async function renderSiteMeta(site, options = {}) {
  if (!site) return;

  document.querySelectorAll(".logo-text").forEach(el => { el.textContent = site.name; });
  if (!options.skipTitle) {
    document.title = `${site.name} - 宋韵茶香`;
  }

  const footerTexts = document.querySelectorAll(".footer .footer-text");
  if (footerTexts[0]) {
    footerTexts[0].innerHTML = `<span class="footer-brand">${esc(site.name)}</span> · ${esc(site.footerText)}`;
  }
  if (footerTexts[1]) footerTexts[1].textContent = site.copyright;

  const navLogo = await CMS.resolveMediaUrl(site.logo);
  const navLogoSrc = navLogo || site.logo || "assets/logo-icon.svg";
  document.querySelectorAll(".logo-mark").forEach(el => {
    el.src = navLogoSrc;
    el.alt = site.name || "";
  });

  const footerLogoSrc = await CMS.resolveMediaUrl(site.footerLogo) || site.footerLogo || "assets/logo.svg";
  document.querySelectorAll(".footer-logo").forEach(el => {
    el.src = footerLogoSrc;
    el.alt = site.name || "";
  });

  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon && navLogoSrc) favicon.href = navLogoSrc;
}

async function renderCarousel(carousel) {
  const el = document.querySelector(".carousel");
  if (!el || !carousel?.slides?.length) return;

  el.dataset.interval = carousel.interval;

  const slidesHTML = await Promise.all(carousel.slides.map(async (slide, i) => {
    const bg = await buildMediaBg(slide);
    const hasMediaBg = (slide.mediaType === "image" || slide.mediaType === "video") && slide.media;
    const contentHTML = hasMediaBg ? "" : `
        <div class="slide-content">
          <p class="slide-subtitle">${esc(slide.subtitle)}</p>
          <h1 class="slide-title">${esc(slide.title)}</h1>
          <p class="slide-desc">${esc(slide.desc)}</p>
        </div>`;
    return `
      <div class="carousel-slide${i === 0 ? " active" : ""}${hasMediaBg ? " carousel-slide--media" : ""}">
        <div class="slide-bg">${bg}</div>
        <div class="slide-overlay"></div>${contentHTML}
      </div>`;
  }));

  const dotsHTML = carousel.slides.map((_, i) =>
    `<button class="carousel-dot${i === 0 ? " active" : ""}" aria-label="第${i + 1}张"></button>`
  ).join("");

  el.innerHTML = `
    ${slidesHTML.join("")}
    <button class="carousel-arrow prev" aria-label="上一张">
      <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    <button class="carousel-arrow next" aria-label="下一张">
      <svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg>
    </button>
    <div class="carousel-controls">
      <div class="carousel-dots">${dotsHTML}</div>
    </div>`;

  if (typeof refreshSpotlight === "function") refreshSpotlight();
  if (typeof observeRevealElements === "function") observeRevealElements();
  if (typeof revealVisibleContent === "function") revealVisibleContent();
}

async function buildMediaBg(item) {
  const type = item.mediaType || "gradient";
  if (type === "image" && item.media) {
    const url = await CMS.getMediaUrl(item.media);
    if (url) {
      const alt = esc(item.title || "轮播图");
      return `<img src="${url}" alt="${alt}" class="slide-media" loading="lazy" decoding="async">`;
    }
  }
  if (type === "video" && item.media) {
    const url = await CMS.getMediaUrl(item.media);
    if (url) return `<video src="${url}" class="slide-media" autoplay muted loop playsinline></video>`;
  }
  const grad = item.gradient || "linear-gradient(135deg, #d4e4dc, #a8c4b8)";
  return `<div class="slide-gradient" style="background-image:${grad}"></div>`;
}

async function renderAbout(about) {
  hideSectionTag(".about .spotlight-band .section-tag");
  setText(".about .spotlight-band .section-title", about.title);
  setText(".about .spotlight-band .section-desc", about.desc);
  setText(".about-content h3", about.shopTitle);

  const content = document.querySelector(".about-content");
  const featuresEl = content?.querySelector(".about-features");
  if (content && featuresEl) {
    content.querySelectorAll(".text-reveal-line").forEach(el => el.remove());
    const paras = (about.paragraphs || []).map((t, i) => {
      const p = document.createElement("p");
      p.className = `text-reveal-line delay-${Math.min(i + 2, 7)}`;
      p.textContent = t;
      return p;
    });
    paras.forEach(p => content.insertBefore(p, featuresEl));
    if (typeof revealVisibleContent === "function") revealVisibleContent();
  }

  const feats = document.querySelectorAll(".about-feature");
  (about.features || []).forEach((f, i) => {
    if (!feats[i]) return;
    feats[i].querySelector(".about-feature-num").textContent = f.num;
    feats[i].querySelector(".about-feature-text").textContent = f.text;
  });

  const showcase = document.querySelector(".about-logo-showcase");
  if (!showcase) return;

  const url = about.media ? await CMS.getMediaUrl(about.media) : "";
  const type = about.mediaType || "image";
  const caption = `<p class="about-logo-caption">${esc(about.caption)}</p>`;

  const wrap = showcase.closest(".about-image-wrap");
  const isCloudOrUploadedPhoto = url && (CMS.isMediaId(about.media) || /^https?:\/\//i.test(about.media));

  if (type === "video" && url) {
    showcase.className = "about-image about-logo-showcase about-showcase--media";
    wrap?.classList.add("about-image-wrap--media");
    showcase.innerHTML = `<video class="about-media" src="${url}" autoplay muted loop playsinline></video>${caption}`;
  } else if (url && isCloudOrUploadedPhoto) {
    showcase.className = "about-image about-logo-showcase about-showcase--media";
    wrap?.classList.add("about-image-wrap--media");
    showcase.innerHTML = `<img src="${url}" alt="${esc(about.shopTitle)}" class="about-media" loading="lazy" decoding="async">${caption}`;
  } else if (url) {
    showcase.className = "about-image about-logo-showcase";
    wrap?.classList.remove("about-image-wrap--media");
    showcase.innerHTML = `<img src="${url}" alt="${esc(about.shopTitle)}" class="about-logo-img">${caption}`;
  } else {
    showcase.innerHTML = `<img src="assets/logo.svg" alt="${esc(about.shopTitle)}" class="about-logo-img">${caption}`;
  }
}

function renderProductsSection(sec) {
  if (!sec) return;
  hideSectionTag(".products .spotlight-band .section-tag");
  setText(".products .spotlight-band .section-title", sec.title);
  setText(".products .spotlight-band .section-desc", sec.desc);
}

async function renderContact(contact) {
  const section = document.querySelector(".contact");
  if (!section || !contact) return;

  setText(".contact .section-title", contact.title);
  setText(".contact .section-desc", contact.desc);
  hideSectionTag(".contact .section-tag");

  const container = section.querySelector("#contact-cards");
  if (!container) return;

  const cards = contact.cards || [];
  const entries = await Promise.all(cards.map(async (card, i) => {
    const avatarUrl = await CMS.getMediaUrl(card.avatar) || "assets/logo-icon.svg";
    const delay = Math.min(i + 1, 4);
    return `
      <a href="card.html?id=${encodeURIComponent(card.id)}" class="contact-entry reveal-up delay-${delay}" target="_blank" rel="noopener noreferrer">
        <div class="contact-entry-avatar">
          <img src="${avatarUrl}" alt="${esc(card.name)}" loading="lazy">
        </div>
        <div class="contact-entry-body">
          <span class="contact-entry-label">${esc(card.label || "联系人")}</span>
          <h3 class="contact-entry-name">${esc(card.name)}</h3>
          <p class="contact-entry-title">${esc(card.jobTitle)}</p>
          <p class="contact-entry-phone">${esc(card.phone)}</p>
        </div>
        <span class="contact-entry-action">查看名片</span>
      </a>`;
  }));

  container.innerHTML = entries.join("");
}

async function buildCardStoryHTML(card) {
  const story = card.story;
  if (!story) return "";
  const paragraphs = (story.paragraphs || []).map(p => p.trim()).filter(Boolean);
  const images = story.images || [];
  if (!paragraphs.length && !images.length) return "";

  const title = story.title || "我的故事";
  const textHtml = paragraphs.map(p => `<p class="card-story-text">${esc(p)}</p>`).join("");
  const imageHtml = (await Promise.all(images.map(async ref => {
    const url = await CMS.getMediaUrl(ref);
    return url ? `<img class="card-story-image" src="${url}" alt="" loading="lazy" decoding="async">` : "";
  }))).filter(Boolean).join("");

  return `
      <section class="card-story">
        <h4 class="card-story-title">${esc(title)}</h4>
        ${textHtml ? `<div class="card-story-texts">${textHtml}</div>` : ""}
        ${imageHtml ? `<div class="card-story-images">${imageHtml}</div>` : ""}
      </section>`;
}

async function buildBusinessCardHTML(card, options = {}) {
  const avatarUrl = await CMS.getMediaUrl(card.avatar) || "assets/logo-icon.svg";
  const qrUrl = await CMS.getMediaUrl(card.qr) || "assets/qr-code.svg";
  const pageClass = options.page ? " business-card--page" : "";
  const storyHtml = options.page ? await buildCardStoryHTML(card) : "";

  return `
    <div class="business-card${pageClass}">
      <div class="card-header">
        <div class="card-avatar">
          <img src="${avatarUrl}" alt="${esc(card.name)}" loading="lazy">
        </div>
        <h3 class="card-name">${esc(card.name)}</h3>
        <p class="card-title">${esc(card.jobTitle)}</p>
      </div>
      <p class="card-bio">${esc(card.bio)}</p>
      <div class="card-info">
        <div class="card-info-item" data-type="phone">
          <svg class="card-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
          </svg>
          <span class="card-info-text">${esc(card.phone)}</span>
        </div>
        <div class="card-info-item" data-type="wechat">
          <svg class="card-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
          </svg>
          <span class="card-info-text">微信号：${esc(card.wechat)}</span>
        </div>
      </div>
      <div class="card-qr">
        <p class="card-qr-label">扫码添加微信</p>
        <img class="card-qr-image" src="${qrUrl}" alt="微信二维码" loading="lazy">
      </div>${storyHtml}
    </div>`;
}

function setText(selector, text) {
  const el = document.querySelector(selector);
  if (el && text !== undefined) el.textContent = text;
}

function hideSectionTag(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.textContent = "";
  el.hidden = true;
}

function esc(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

async function renderProductMedia(product, className = "") {
  if (product.media) {
    const url = await CMS.resolveMediaUrl(product.media);
    if (url) {
      const isVideo = product.mediaType === "video" || /\.(mp4|webm)(\?|$)/i.test(url);
      if (isVideo) {
        return `<video class="${className}" src="${url}" autoplay muted loop playsinline></video>`;
      }
      return `<img class="${className}" src="${url}" alt="${esc(product.name)}" loading="lazy" decoding="async">`;
    }
  }
  return `<div class="tea-visual ${className}" data-tea="${product.image || ""}">${product.name.slice(0, 2)}</div>`;
}
