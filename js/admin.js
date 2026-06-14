const PANEL_TITLES = {
  carousel: "轮播图管理",
  about: "店铺介绍",
  products: "产品管理",
  contact: "联系方式",
  site: "站点设置",
  backup: "备份恢复"
};

let autoSaveTimer = null;
let productMasterList = null;
const productPanelState = { page: 1, pageSize: 10 };

function showConfirmDialog(message, options = {}) {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "admin-confirm-overlay";
    overlay.innerHTML = `
      <div class="admin-confirm-modal" role="dialog" aria-modal="true">
        <p class="admin-confirm-text">${escHtml(message || "确定要删除吗？此操作不可撤销。")}</p>
        <div class="admin-confirm-actions">
          <button type="button" class="admin-btn admin-btn-outline" data-cancel>取消</button>
          <button type="button" class="admin-btn admin-btn-danger" data-ok>${escHtml(options.okText || "确认删除")}</button>
        </div>
      </div>`;

    const close = result => {
      overlay.remove();
      resolve(result);
    };

    document.body.appendChild(overlay);
    overlay.querySelector("[data-cancel]").onclick = () => close(false);
    overlay.querySelector("[data-ok]").onclick = () => close(true);
    overlay.addEventListener("click", e => {
      if (e.target === overlay) close(false);
    });
  });
}

function confirmDelete(message, options) {
  return showConfirmDialog(message, options);
}

function showPromptDialog(message, defaultValue = "") {
  return new Promise(resolve => {
    const overlay = document.createElement("div");
    overlay.className = "admin-confirm-overlay";
    overlay.innerHTML = `
      <div class="admin-confirm-modal" role="dialog" aria-modal="true">
        <p class="admin-confirm-text">${escHtml(message || "请输入内容")}</p>
        <input type="text" class="admin-prompt-input" value="${escAttr(defaultValue)}">
        <div class="admin-confirm-actions">
          <button type="button" class="admin-btn admin-btn-outline" data-cancel>取消</button>
          <button type="button" class="admin-btn admin-btn-primary" data-ok>确定</button>
        </div>
      </div>`;

    const input = overlay.querySelector(".admin-prompt-input");
    const close = result => {
      overlay.remove();
      resolve(result);
    };

    document.body.appendChild(overlay);
    input.focus();
    input.select();
    overlay.querySelector("[data-cancel]").onclick = () => close(null);
    overlay.querySelector("[data-ok]").onclick = () => close(input.value.trim());
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") close(input.value.trim());
      if (e.key === "Escape") close(null);
    });
    overlay.addEventListener("click", e => {
      if (e.target === overlay) close(null);
    });
  });
}

function getProductModules() {
  return CMS.getProductModules();
}

function getModuleLabel(key) {
  if (key === "all") return CMS.data.productsSection.allLabel || "全部商品";
  return getProductModules().find(m => m.key === key)?.label || key;
}

async function promptAddProductModule() {
  const name = await showPromptDialog("请输入新模块名称", "");
  if (!name) return null;
  const key = `mod_${Date.now()}`;
  CMS.data.productsSection.modules.push({ key, label: name });
  if (!CMS.data.products[key]) CMS.data.products[key] = [];
  scheduleAutoSave();
  toast(`已添加模块「${name}」`);
  return key;
}

function buildModulePickerHTML(selectedKeys = []) {
  const modules = getProductModules();
  const chips = (selectedKeys || []).map(key => `
    <button type="button" class="admin-module-chip" data-chip="${key}">
      ${escHtml(getModuleLabel(key))}<span aria-hidden="true">×</span>
    </button>`).join("");

  return `
    <div class="admin-module-picker">
      <select class="admin-module-select" data-module-picker>
        <option value="">选择展示模块…</option>
        ${modules.map(mod => `<option value="${mod.key}">${escHtml(mod.label)}</option>`).join("")}
        <option value="__add__">➕ 添加新模块…</option>
      </select>
      <div class="admin-module-chips">${chips || `<span class="admin-module-empty">未选择</span>`}</div>
    </div>`;
}

function refreshModulePicker(container, product) {
  const wrap = container.querySelector(".admin-module-picker");
  if (!wrap) return;
  const parent = wrap.parentElement;
  const fresh = document.createElement("div");
  fresh.innerHTML = buildModulePickerHTML(product.modules || []);
  parent.replaceChild(fresh.firstElementChild, wrap);
  bindModulePicker(parent, product);
}

function bindModulePicker(container, product, options = {}) {
  const picker = container.querySelector("[data-module-picker]");
  const chipsEl = container.querySelector(".admin-module-chips");
  if (!picker || !chipsEl) return;

  if (!product.modules) product.modules = [];

  picker.addEventListener("change", async () => {
    const value = picker.value;
    picker.value = "";
    if (!value) return;

    if (value === "__add__") {
      const key = await promptAddProductModule();
      if (key && !product.modules.includes(key)) {
        product.modules.push(key);
        if (!product.tag) {
          product.tag = getModuleLabel(key);
          options.onTagAutoFill?.(product.tag);
        }
        (options.silent ? rebuildProductsFromMaster : syncProductMaster)();
        refreshModulePicker(container, product);
        options.onChange?.();
      } else if (key) {
        refreshModulePicker(container, product);
      }
      return;
    }

    if (!product.modules.includes(value)) {
      product.modules.push(value);
      if (!product.tag) {
        product.tag = getModuleLabel(value);
        options.onTagAutoFill?.(product.tag);
      }
      (options.silent ? rebuildProductsFromMaster : syncProductMaster)();
      refreshModulePicker(container, product);
      options.onChange?.();
    }
  });

  chipsEl.querySelectorAll("[data-chip]").forEach(chip => {
    chip.addEventListener("click", () => {
      const key = chip.dataset.chip;
      product.modules = product.modules.filter(m => m !== key);
      (options.silent ? rebuildProductsFromMaster : syncProductMaster)();
      refreshModulePicker(container, product);
      options.onChange?.();
    });
  });
}

function openModuleManagerModal() {
  const existing = document.querySelector(".admin-modal-overlay");
  if (existing) existing.remove();

  const modules = getProductModules();
  const overlay = document.createElement("div");
  overlay.className = "admin-modal-overlay";
  overlay.innerHTML = `
    <div class="admin-modal" role="dialog" aria-modal="true">
      <div class="admin-modal-header">
        <h3 class="admin-modal-title">管理展示模块</h3>
        <button type="button" class="admin-modal-close" aria-label="关闭">×</button>
      </div>
      <div class="admin-modal-body">
        <p class="admin-hint" style="margin-top:0;">修改模块名称会同步到首页对应分区标题。「全部商品」模块始终展示所有商品。</p>
        <div class="admin-field">
          <label>全部商品模块名称</label>
          <input type="text" id="module-all-label" value="${escAttr(CMS.data.productsSection.allLabel || "全部商品")}">
        </div>
        <div id="module-manager-list"></div>
        <button type="button" class="admin-btn admin-btn-outline admin-btn-sm" id="btn-module-add" style="margin-top:var(--space-sm);">+ 添加模块</button>
      </div>
    </div>`;

  const close = () => {
    overlay.remove();
    document.body.style.overflow = "";
  };
  overlay.querySelector(".admin-modal-close").onclick = close;
  overlay.addEventListener("click", e => {
    if (e.target === overlay) close();
  });

  document.body.appendChild(overlay);
  document.body.style.overflow = "hidden";

  const listEl = overlay.querySelector("#module-manager-list");
  const renderModuleRows = () => {
    listEl.innerHTML = getProductModules().map((mod, i) => `
      <div class="admin-module-manager-row" data-mod-index="${i}">
        <input type="text" class="admin-module-name-input" value="${escAttr(mod.label)}" data-mod-label>
        <button type="button" class="admin-btn admin-btn-danger admin-btn-sm" data-mod-del ${mod.key === "seasonal" || mod.key === "hot" ? "disabled title=\"默认模块不可删除\"" : ""}>删除</button>
      </div>`).join("");

    listEl.querySelectorAll("[data-mod-label]").forEach(inp => {
      inp.addEventListener("input", () => {
        const row = inp.closest("[data-mod-index]");
        const idx = +row.dataset.modIndex;
        CMS.data.productsSection.modules[idx].label = inp.value;
        scheduleAutoSave();
      });
    });

    listEl.querySelectorAll("[data-mod-del]").forEach(btn => {
      if (btn.disabled) return;
      btn.addEventListener("click", async () => {
        const row = btn.closest("[data-mod-index]");
        const idx = +row.dataset.modIndex;
        const mod = CMS.data.productsSection.modules[idx];
        if (!mod || !await confirmDelete(`确定删除模块「${mod.label}」吗？已归入该模块的商品将移出此模块。`)) return;
        const key = mod.key;
        CMS.data.productsSection.modules.splice(idx, 1);
        productMasterList?.forEach(p => {
          if (p.modules) p.modules = p.modules.filter(m => m !== key);
        });
        delete CMS.data.products[key];
        syncProductMaster();
        renderModuleRows();
        toast("模块已删除");
      });
    });
  };

  renderModuleRows();

  overlay.querySelector("#module-all-label").addEventListener("input", e => {
    CMS.data.productsSection.allLabel = e.target.value;
    scheduleAutoSave();
  });

  overlay.querySelector("#btn-module-add").onclick = async () => {
    const key = await promptAddProductModule();
    if (key) renderModuleRows();
  };
}

async function maybeAutoSyncLocalToCloud() {
  if (typeof CMSCloud === "undefined" || !CMSCloud.isEnabled()) return;

  let localRaw = "";
  try {
    localRaw = localStorage.getItem("changlong_site_data") || "";
  } catch {
    return;
  }
  if (!localRaw || localRaw.length < 80) return;

  const remote = await CMSCloud.fetchRemote();
  if (CMSCloud.hasContent(remote)) return;

  const statusEl = document.getElementById("save-status");
  if (statusEl) statusEl.textContent = "正在将本机数据同步到云端…";

  try {
    await CMS.save(productMasterList);
    if (CMSCloud.lastSyncStatus?.ok) {
      toast("本机数据已自动同步到云端，其他浏览器现在可以访问");
      if (statusEl) {
        statusEl.textContent = `已同步云端 ${new Date().toLocaleTimeString()}`;
      }
    } else if (CMS.lastCloudError) {
      toast("自动同步失败：" + CMS.lastCloudError);
      if (statusEl) statusEl.textContent = "云端同步失败，请点「立即同步到云端」重试";
    }
  } catch (err) {
    console.warn("自动同步失败", err);
    if (statusEl) statusEl.textContent = "云端同步失败";
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await CMS.init();
  reloadProductMasterList();
  await maybeAutoSyncLocalToCloud();
  bindNav();
  renderAllPanels();
  document.getElementById("btn-save-all").addEventListener("click", () => saveAll(true));
  document.getElementById("btn-preview").addEventListener("click", async e => {
    e.preventDefault();
    await saveAll(false);
    window.location.href = "index.html";
  });
  window.addEventListener("beforeunload", () => {
    if (autoSaveTimer) CMS.save(productMasterList);
  });
});

function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  document.getElementById("save-status").textContent = "编辑中…";
  autoSaveTimer = setTimeout(() => saveAll(false), 600);
}

function bindInput(id, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  const handler = () => { fn(el); scheduleAutoSave(); };
  el.addEventListener("input", handler);
  if (el.tagName === "SELECT") el.addEventListener("change", handler);
}

function bindNav() {
  const main = document.querySelector(".admin-main");
  document.querySelectorAll(".admin-nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".admin-nav-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".admin-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const panel = btn.dataset.panel;
      document.getElementById(`panel-${panel}`).classList.add("active");
      document.getElementById("panel-title").textContent = PANEL_TITLES[panel];
      main?.classList.toggle("admin-main--wide", panel === "products");
    });
  });
  main?.classList.toggle("admin-main--wide", document.querySelector('.admin-nav-btn[data-panel="products"]')?.classList.contains("active"));
}

function renderAllPanels() {
  renderCarouselPanel();
  renderAboutPanel();
  renderProductsPanel();
  renderContactPanel();
  renderSitePanel();
  renderBackupPanel();
}

function renderCarouselPanel() {
  const el = document.getElementById("panel-carousel");
  const c = CMS.data.carousel;
  el.innerHTML = `
    <div class="admin-card">
      <div class="admin-field">
        <label>自动轮播间隔（毫秒）</label>
        <input type="number" id="carousel-interval" value="${c.interval}" min="2000" step="500">
      </div>
    </div>
    <div id="slides-list"></div>
    <button class="admin-btn admin-btn-outline" id="btn-add-slide">+ 添加轮播页</button>
    <p class="admin-hint">图片按原比例自动缩放到轮播区域（最大 1200×820），前台完整展示不裁切。视频仍直接上传。</p>`;

  const list = document.getElementById("slides-list");
  c.slides.forEach((slide, i) => list.appendChild(createSlideEditor(slide, i, c.slides.length)));
  document.getElementById("btn-add-slide").onclick = () => {
    c.slides.push({
      subtitle: "副标题", title: "标题", desc: "描述文字",
      mediaType: "gradient",
      gradient: "linear-gradient(135deg, #d4e4dc, #a8c4b8)",
      media: ""
    });
    scheduleAutoSave();
    renderCarouselPanel();
  };
  document.getElementById("carousel-interval").onchange = e => {
    c.interval = +e.target.value;
    scheduleAutoSave();
  };
}

function createSlideEditor(slide, index, total) {
  const div = document.createElement("div");
  div.className = "admin-slide-item";
  const isMediaBg = slide.mediaType === "image" || slide.mediaType === "video";
  div.innerHTML = `
    <div class="admin-item-header">
      <div class="admin-card-title">轮播 ${index + 1}</div>
      <div class="admin-order-btns">
        <button type="button" class="admin-btn admin-btn-outline admin-btn-sm" data-move="up" title="上移" ${index === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="admin-btn admin-btn-outline admin-btn-sm" data-move="down" title="下移" ${index >= total - 1 ? "disabled" : ""}>↓</button>
      </div>
    </div>
    <div class="slide-text-fields" style="${isMediaBg ? "display:none" : ""}">
      <div class="admin-row">
        <div class="admin-field"><label>副标题</label><input data-f="subtitle" value="${escAttr(slide.subtitle)}"></div>
        <div class="admin-field"><label>主标题</label><input data-f="title" value="${escAttr(slide.title)}"></div>
      </div>
      <div class="admin-field"><label>描述</label><textarea data-f="desc">${escHtml(slide.desc)}</textarea></div>
      <p class="admin-hint" style="margin-top:0;margin-bottom:var(--space-sm);">渐变色模式下显示以上文字</p>
    </div>
    <div class="admin-row">
      <div class="admin-field">
        <label>背景类型</label>
        <select data-f="mediaType">
          <option value="gradient" ${slide.mediaType === "gradient" ? "selected" : ""}>渐变色</option>
          <option value="image" ${slide.mediaType === "image" ? "selected" : ""}>图片</option>
          <option value="video" ${slide.mediaType === "video" ? "selected" : ""}>视频</option>
        </select>
      </div>
      <div class="admin-field gradient-field" style="${slide.mediaType !== "gradient" ? "display:none" : ""}">
        <label>渐变色 CSS</label>
        <input data-f="gradient" value="${escAttr(slide.gradient || "")}">
      </div>
    </div>
    <div class="admin-field media-field" style="${slide.mediaType === "gradient" ? "display:none" : ""}">
      <label>上传图片/视频</label>
      <p class="admin-hint" style="margin:4px 0 var(--space-sm);">图片模式完整展示上传图（不裁切、不叠文字），请按轮播横幅比例制作</p>
      <div class="admin-upload admin-upload--carousel">
        <input type="file" accept="image/*,video/*" data-upload="media">
        <div class="media-preview-wrap media-preview-wrap--carousel"></div>
      </div>
    </div>
    <div class="admin-actions">
      <button class="admin-btn admin-btn-danger admin-btn-sm" data-del>删除此页</button>
    </div>`;

  bindFields(div, slide);
  const typeSel = div.querySelector('[data-f="mediaType"]');
  typeSel.onchange = () => {
    slide.mediaType = typeSel.value;
    const isMedia = typeSel.value === "image" || typeSel.value === "video";
    div.querySelector(".gradient-field").style.display = typeSel.value === "gradient" ? "" : "none";
    div.querySelector(".media-field").style.display = typeSel.value === "gradient" ? "none" : "";
    const textFields = div.querySelector(".slide-text-fields");
    if (textFields) textFields.style.display = isMedia ? "none" : "";
    scheduleAutoSave();
  };
  div.querySelector('[data-move="up"]')?.addEventListener("click", () => moveCarouselSlide(index, -1));
  div.querySelector('[data-move="down"]')?.addEventListener("click", () => moveCarouselSlide(index, 1));

  div.querySelector("[data-del]").onclick = async () => {
    if (!await confirmDelete(`确定删除「轮播 ${index + 1}」吗？`)) return;
    CMS.data.carousel.slides.splice(index, 1);
    scheduleAutoSave();
    renderCarouselPanel();
  };
  setupMediaUpload(div.querySelector("[data-upload]"), slide, "media", div.querySelector(".media-preview-wrap"), {
    cropSlot: "carousel",
    previewClass: "admin-upload-preview--carousel"
  });
  return div;
}

function moveCarouselSlide(index, direction) {
  const slides = CMS.data.carousel.slides;
  const target = index + direction;
  if (target < 0 || target >= slides.length) return;
  [slides[index], slides[target]] = [slides[target], slides[index]];
  scheduleAutoSave();
  renderCarouselPanel();
}

function renderAboutPanel() {
  const a = CMS.data.about;
  const el = document.getElementById("panel-about");
  el.innerHTML = `
    <div class="admin-card">
      <div class="admin-row">
        <div class="admin-field"><label>英文标签</label><input id="about-tag" value="${escAttr(a.tag)}"></div>
        <div class="admin-field"><label>区块标题</label><input id="about-title" value="${escAttr(a.title)}"></div>
      </div>
      <div class="admin-field"><label>副标题</label><input id="about-desc" value="${escAttr(a.desc)}"></div>
      <div class="admin-field"><label>店名标题</label><input id="about-shopTitle" value="${escAttr(a.shopTitle)}"></div>
      <div class="admin-field"><label>图片说明</label><input id="about-caption" value="${escAttr(a.caption)}"></div>
      <div class="admin-row">
        <div class="admin-field">
          <label>左侧展示类型</label>
          <select id="about-mediaType">
            <option value="image" ${a.mediaType === "image" ? "selected" : ""}>图片</option>
            <option value="video" ${a.mediaType === "video" ? "selected" : ""}>视频</option>
          </select>
        </div>
        <div class="admin-field">
          <label>上传图片/视频</label>
          <div class="admin-upload">
            <input type="file" id="about-upload" accept="image/*,video/*">
            <div id="about-preview"></div>
          </div>
        </div>
      </div>
      <div class="admin-field"><label>介绍段落（每段一行）</label>
        <textarea id="about-paragraphs" rows="5">${a.paragraphs.join("\n")}</textarea>
      </div>
      <div id="about-features"></div>
      <p class="admin-hint">上传店铺照片时按 4:5 比例裁剪，自动压缩后前台自适应铺满左侧展示区。</p>
    </div>`;

  bindInput("about-tag", el => { a.tag = el.value; });
  bindInput("about-title", el => { a.title = el.value; });
  bindInput("about-desc", el => { a.desc = el.value; });
  bindInput("about-shopTitle", el => { a.shopTitle = el.value; });
  bindInput("about-caption", el => { a.caption = el.value; });
  bindInput("about-mediaType", el => { a.mediaType = el.value; });
  bindInput("about-paragraphs", el => { a.paragraphs = el.value.split("\n").filter(Boolean); });

  const featEl = document.getElementById("about-features");
  a.features.forEach((f, i) => {
    featEl.innerHTML += `
      <div class="admin-row">
        <div class="admin-field"><label>数据 ${i + 1}</label><input data-fi="${i}" data-fk="num" value="${escAttr(f.num)}"></div>
        <div class="admin-field"><label>说明 ${i + 1}</label><input data-fi="${i}" data-fk="text" value="${escAttr(f.text)}"></div>
      </div>`;
  });
  featEl.querySelectorAll("input").forEach(inp => {
    inp.oninput = () => {
      a.features[+inp.dataset.fi][inp.dataset.fk] = inp.value;
      scheduleAutoSave();
    };
  });

  setupMediaUpload(document.getElementById("about-upload"), a, "media", document.getElementById("about-preview"), { cropSlot: "about" });
}

function ensureProductMasterList() {
  if (!productMasterList) {
    productMasterList = CMS.getMasterProductList();
  }
  return productMasterList;
}

function reloadProductMasterList() {
  productMasterList = CMS.getMasterProductList();
  return productMasterList;
}

function rebuildProductsFromMaster() {
  CMS.rebuildProductCategories(productMasterList);
}

function syncProductMaster() {
  rebuildProductsFromMaster();
  scheduleAutoSave();
}

async function saveCurrentProduct(product, showToast = true) {
  ensureProductMasterList();
  const idx = productMasterList.findIndex(p => p.id === product.id);
  if (idx < 0) {
    productMasterList.push(JSON.parse(JSON.stringify(product)));
  } else {
    Object.assign(productMasterList[idx], product);
  }

  clearTimeout(autoSaveTimer);
  rebuildProductsFromMaster();
  await CMS.save(productMasterList);

  const time = new Date().toLocaleTimeString();
  const name = product.name || "商品";
  let status = `「${name}」已保存 ${time}`;
  if (typeof CMSCloud !== "undefined" && CMSCloud.isEnabled()) {
    if (CMSCloud.lastSyncStatus?.ok) {
      status += " · 已同步云端";
    } else if (CMS.lastCloudError) {
      status += " · 云端失败";
    }
  }
  const statusEl = document.getElementById("save-status");
  if (statusEl) statusEl.textContent = status;

  if (showToast) {
    const msg = CMS.lastCloudError
      ? `「${name}」本地已保存，云端失败：${CMS.lastCloudError}`
      : `商品「${name}」已保存`;
    toast(msg);
  }
}

function renderProductsPanel() {
  const el = document.getElementById("panel-products");
  const sec = CMS.data.productsSection;
  const master = ensureProductMasterList();
  const total = master.length;
  const pageSize = productPanelState.pageSize;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (productPanelState.page > totalPages) productPanelState.page = totalPages;
  const start = (productPanelState.page - 1) * pageSize;
  const pageItems = master.slice(start, start + pageSize);

  el.innerHTML = `
    <div class="admin-card">
      <div class="admin-row">
        <div class="admin-field"><label>英文标签</label><input id="prod-sec-tag" value="${escAttr(sec.tag)}"></div>
        <div class="admin-field"><label>区块标题</label><input id="prod-sec-title" value="${escAttr(sec.title)}"></div>
      </div>
      <div class="admin-field"><label>副标题</label><input id="prod-sec-desc" value="${escAttr(sec.desc)}"></div>
    </div>
    <div class="admin-card admin-product-panel">
      <div class="admin-product-toolbar">
        <div class="admin-product-toolbar-main">
          <div class="admin-product-panel-title">全部商品 <small>共 ${total} 款</small></div>
          <div class="admin-product-toolbar-actions">
            <button class="admin-btn admin-btn-outline admin-btn-sm" id="btn-manage-modules">管理模块</button>
            <button class="admin-btn admin-btn-outline admin-btn-sm" id="btn-add-product">+ 添加商品</button>
          </div>
        </div>
        <p class="admin-hint admin-product-hint">通过下拉框选择展示模块，商品会自动出现在首页对应分区；所有商品均会出现在「全部商品」模块。可在「管理模块」中自定义模块名称。</p>
        <div class="admin-product-toolbar-meta">
          <label class="admin-page-size">
            每页
            <select id="product-page-size">
              <option value="10" ${pageSize === 10 ? "selected" : ""}>10</option>
              <option value="20" ${pageSize === 20 ? "selected" : ""}>20</option>
            </select>
            条
          </label>
          <div class="admin-pagination" data-product-pagination></div>
        </div>
      </div>
      <div class="admin-product-table-head">
        <span class="col-thumb">缩略图</span>
        <span class="col-name">产品名称</span>
        <span class="col-modules">展示模块</span>
        <span class="col-tag">角标标签</span>
        <span class="col-actions">操作</span>
      </div>
      <div id="products-table-body"></div>
      <div class="admin-product-footer">
        <span class="admin-product-range">${total ? `显示第 ${start + 1}–${Math.min(start + pageSize, total)} 条，共 ${total} 款` : "暂无商品"}</span>
        <div class="admin-pagination" data-product-pagination></div>
      </div>
    </div>`;

  bindInput("prod-sec-tag", inp => { sec.tag = inp.value; });
  bindInput("prod-sec-title", inp => { sec.title = inp.value; });
  bindInput("prod-sec-desc", inp => { sec.desc = inp.value; });

  document.getElementById("btn-manage-modules").onclick = () => openModuleManagerModal();

  document.getElementById("btn-add-product").onclick = () => {
    ensureProductMasterList();
    const id = `p${Date.now()}`;
    const newProduct = {
      id, name: "新茶品", tag: "", price: 0, unit: "50g",
      desc: "", detail: "", image: "longjing",
      features: [], media: "", mediaType: "placeholder", gallery: [],
      modules: []
    };
    productMasterList.push(newProduct);
    rebuildProductsFromMaster();
    productPanelState.page = Math.ceil(productMasterList.length / pageSize);
    renderProductsPanel();
    const idx = productMasterList.findIndex(p => p.id === id);
    openProductEditorModal(productMasterList[idx], idx);
  };

  document.getElementById("product-page-size").onchange = e => {
    productPanelState.pageSize = +e.target.value;
    productPanelState.page = 1;
    renderProductsPanel();
  };

  renderProductPagination(totalPages);
  renderProductTableRows(pageItems, start, total);
}

function renderProductPagination(totalPages) {
  const page = productPanelState.page;
  const html = `
    <button type="button" class="admin-btn admin-btn-outline admin-btn-sm" data-page="prev" ${page <= 1 ? "disabled" : ""}>上一页</button>
    <span class="admin-page-indicator">${page} / ${totalPages}</span>
    <button type="button" class="admin-btn admin-btn-outline admin-btn-sm" data-page="next" ${page >= totalPages ? "disabled" : ""}>下一页</button>`;

  document.querySelectorAll("[data-product-pagination]").forEach(el => {
    el.innerHTML = html;
    el.querySelector('[data-page="prev"]')?.addEventListener("click", () => {
      if (productPanelState.page > 1) {
        productPanelState.page -= 1;
        renderProductsPanel();
      }
    });
    el.querySelector('[data-page="next"]')?.addEventListener("click", () => {
      if (productPanelState.page < totalPages) {
        productPanelState.page += 1;
        renderProductsPanel();
      }
    });
  });
}

async function renderProductTableRows(pageItems, globalStart, total) {
  const body = document.getElementById("products-table-body");
  if (!body) return;

  if (!pageItems.length) {
    body.innerHTML = `<p class="admin-hint" style="padding:var(--space-md);">暂无商品，点击「添加商品」开始录入。</p>`;
    return;
  }

  const rows = await Promise.all(pageItems.map(async (product, i) => {
    const globalIndex = globalStart + i;
    const thumb = await buildProductThumbHTML(product);
    return `
      <div class="admin-product-row" data-index="${globalIndex}">
        <div class="col-thumb">${thumb}</div>
        <div class="col-name">
          <input class="admin-product-name-input" data-name value="${escAttr(product.name)}" placeholder="产品名称">
          <small class="admin-product-id">${escHtml(product.id)}</small>
        </div>
        <div class="col-modules" data-module-cell>${buildModulePickerHTML(product.modules || [])}</div>
        <div class="col-tag">
          <input class="admin-product-tag-input" data-display-tag value="${escAttr(product.tag)}" placeholder="如：岩茶、绿茶">
        </div>
        <div class="col-actions">
          <div class="admin-order-btns">
            <button type="button" class="admin-btn admin-btn-outline admin-btn-sm" data-move="up" title="上移" ${globalIndex === 0 ? "disabled" : ""}>↑</button>
            <button type="button" class="admin-btn admin-btn-outline admin-btn-sm" data-move="down" title="下移" ${globalIndex >= total - 1 ? "disabled" : ""}>↓</button>
          </div>
          <button type="button" class="admin-btn admin-btn-outline admin-btn-sm" data-edit>编辑</button>
          <button type="button" class="admin-btn admin-btn-danger admin-btn-sm" data-del>删除</button>
        </div>
      </div>`;
  }));

  body.innerHTML = rows.join("");

  body.querySelectorAll(".admin-product-row").forEach(row => {
    const index = +row.dataset.index;
    const product = productMasterList[index];
    if (!product) return;

    row.querySelector("[data-name]")?.addEventListener("input", e => {
      product.name = e.target.value;
      syncProductMaster();
    });

    row.querySelector("[data-display-tag]")?.addEventListener("input", e => {
      product.tag = e.target.value;
      syncProductMaster();
    });

    const moduleCell = row.querySelector("[data-module-cell]");
    if (moduleCell) {
      bindModulePicker(moduleCell, product, {
        onChange: () => renderProductsPanel(),
        onTagAutoFill: tag => {
          const tagInput = row.querySelector("[data-display-tag]");
          if (tagInput) tagInput.value = tag;
        }
      });
    }

    row.querySelector('[data-move="up"]')?.addEventListener("click", () => moveProductInMaster(index, -1));
    row.querySelector('[data-move="down"]')?.addEventListener("click", () => moveProductInMaster(index, 1));
    row.querySelector("[data-edit]")?.addEventListener("click", () => openProductEditorModal(product, index));
    row.querySelector("[data-del]")?.addEventListener("click", async () => {
      if (!await confirmDelete(`确定删除商品「${product.name}」吗？`)) return;
      productMasterList.splice(index, 1);
      syncProductMaster();
      renderProductsPanel();
    });
  });
}

async function buildProductThumbHTML(product) {
  if (product.mediaType === "image" && product.media) {
    const url = await CMS.getMediaUrl(product.media);
    if (url) return `<img class="admin-product-thumb" src="${url}" alt="">`;
  }
  if (product.mediaType === "video" && product.media) {
    const url = await CMS.getMediaUrl(product.media);
    if (url) return `<video class="admin-product-thumb" src="${url}" muted playsinline></video>`;
  }
  const label = (product.name || "茶").slice(0, 2);
  return `<div class="admin-product-thumb admin-product-thumb--placeholder" data-tea="${escAttr(product.image || "longjing")}">${escHtml(label)}</div>`;
}

function moveProductInMaster(index, direction) {
  const list = productMasterList;
  const target = index + direction;
  if (!list || target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
  syncProductMaster();
  renderProductsPanel();
}

function openProductEditorModal(product, index) {
  const existing = document.querySelector(".admin-modal-overlay");
  if (existing) existing.remove();

  ensureProductMasterList();
  let resolvedIndex = typeof index === "number" && productMasterList[index]?.id === product.id
    ? index
    : productMasterList.findIndex(p => p.id === product.id);
  if (resolvedIndex < 0) {
    productMasterList.push(JSON.parse(JSON.stringify(product)));
    resolvedIndex = productMasterList.length - 1;
    rebuildProductsFromMaster();
  }
  const resolvedProduct = productMasterList[resolvedIndex];

  const overlay = document.createElement("div");
  overlay.className = "admin-modal-overlay";
  overlay.innerHTML = `
    <div class="admin-modal admin-modal--wide" role="dialog" aria-modal="true">
      <div class="admin-modal-header">
        <h3 class="admin-modal-title">编辑商品</h3>
        <p class="admin-modal-subtitle">${escHtml(resolvedProduct.name)}</p>
        <button type="button" class="admin-modal-close" aria-label="关闭">×</button>
      </div>
      <div class="admin-modal-body" id="product-editor-body"></div>
      <div class="admin-modal-footer">
        <button type="button" class="admin-btn admin-btn-danger admin-btn-sm" data-del>删除商品</button>
        <button type="button" class="admin-btn admin-btn-primary" data-save>保存</button>
      </div>
    </div>`;

  const close = () => {
    overlay.remove();
    document.body.style.overflow = "";
  };
  overlay.querySelector(".admin-modal-close").onclick = close;
  overlay.addEventListener("click", e => {
    if (e.target === overlay) close();
  });

  document.body.style.overflow = "hidden";
  document.body.appendChild(overlay);
  const body = overlay.querySelector("#product-editor-body");
  body.appendChild(createProductEditorForm(resolvedProduct, resolvedIndex));

  overlay.querySelector("[data-save]").onclick = async () => {
    await saveCurrentProduct(resolvedProduct, true);
    close();
    renderProductsPanel();
  };

  overlay.querySelector("[data-del]").onclick = async () => {
    if (!await confirmDelete(`确定删除商品「${resolvedProduct.name}」吗？`)) return;
    productMasterList.splice(resolvedIndex, 1);
    rebuildProductsFromMaster();
    await CMS.save(productMasterList);
    toast(`商品「${resolvedProduct.name}」已删除`);
    close();
    renderProductsPanel();
  };
}

function createProductEditorForm(product, index) {
  if (!product.gallery) product.gallery = [];
  if (!product.modules) product.modules = CMS.inferProductModules(product);

  const div = document.createElement("div");
  div.className = "admin-product-item";
  div.innerHTML = `
    <div class="admin-row">
      <div class="admin-field"><label>名称</label><input data-f="name" value="${escAttr(product.name)}"></div>
      <div class="admin-field"><label>角标标签</label><input data-f="tag" value="${escAttr(product.tag)}" placeholder="卡片角标，如岩茶、绿茶"></div>
    </div>
    <div class="admin-field" data-module-field>
      <label>展示模块</label>
      ${buildModulePickerHTML(product.modules || [])}
    </div>
    <div class="admin-row">
      <div class="admin-field"><label>价格</label><input type="number" data-f="price" value="${product.price}"></div>
      <div class="admin-field"><label>规格</label><input data-f="unit" value="${escAttr(product.unit)}"></div>
    </div>
    <div class="admin-field"><label>简介</label><textarea data-f="desc">${escHtml(product.desc)}</textarea></div>
    <div class="admin-field"><label>详情</label><textarea data-f="detail" rows="3">${escHtml(product.detail)}</textarea></div>
    <div class="admin-field"><label>特色标签（逗号分隔）</label>
      <input data-f="features" value="${(product.features || []).join("，")}"></div>
    <div class="admin-row">
      <div class="admin-field">
        <label>展示类型</label>
        <select data-f="mediaType">
          <option value="placeholder" ${product.mediaType === "placeholder" ? "selected" : ""}>默认色块</option>
          <option value="image" ${product.mediaType === "image" ? "selected" : ""}>图片</option>
          <option value="video" ${product.mediaType === "video" ? "selected" : ""}>视频</option>
        </select>
      </div>
      <div class="admin-field">
        <label>上传图片/视频</label>
        <div class="admin-upload">
          <input type="file" accept="image/*,video/*" data-upload="media">
          <div class="media-preview-wrap"></div>
        </div>
      </div>
    </div>
    <div class="admin-field">
      <label>产品实拍图</label>
      <p class="admin-hint" style="margin:4px 0 var(--space-sm);">详情页底部扇形展示，可上传多张并按顺序排列</p>
      <div class="admin-gallery-list"></div>
      <div class="admin-upload">
        <input type="file" accept="image/*" multiple data-gallery-upload>
      </div>
    </div>`;

  bindFields(div, product, { autoSave: false });
  const galleryList = div.querySelector(".admin-gallery-list");
  renderProductGalleryList(product, galleryList);

  const moduleField = div.querySelector("[data-module-field]");
  if (moduleField) {
    bindModulePicker(moduleField, product, {
      silent: true,
      onTagAutoFill: tag => {
        const tagInput = div.querySelector('[data-f="tag"]');
        if (tagInput) tagInput.value = tag;
      }
    });
  }

  div.querySelector("[data-gallery-upload]").onchange = async e => {
    const files = [...e.target.files];
    if (!files.length) return;
    try {
      for (const file of files) {
        let processed = file;
        if (typeof processImageUpload === "function") {
          processed = await processImageUpload(file, "product");
        }
        const id = await CMS.uploadFile(processed);
        product.gallery.push(id);
      }
      await saveCurrentProduct(product, false);
      renderProductGalleryList(product, galleryList);
      toast("实拍图已添加");
    } catch (err) {
      if (err.message !== "cancelled") toast(err.message || "上传失败");
    }
    e.target.value = "";
  };

  div.querySelector('[data-f="features"]').oninput = e => {
    product.features = e.target.value.split(/[,，]/).map(s => s.trim()).filter(Boolean);
  };

  setupMediaUpload(div.querySelector("[data-upload]"), product, "media", div.querySelector(".media-preview-wrap"), { cropSlot: "product", autoSave: false });
  return div;
}

async function renderProductGalleryList(product, listEl) {
  if (!listEl) return;
  const gallery = product.gallery || [];
  if (!gallery.length) {
    listEl.innerHTML = `<p class="admin-hint" style="margin:0;">暂无实拍图</p>`;
    return;
  }

  const rows = await Promise.all(gallery.map(async (ref, i) => {
    const url = await CMS.getMediaUrl(ref);
    return `
      <div class="admin-gallery-item" data-gi="${i}">
        <img class="admin-gallery-thumb" src="${url || ""}" alt="实拍 ${i + 1}">
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
      [product.gallery[i], product.gallery[i - 1]] = [product.gallery[i - 1], product.gallery[i]];
      scheduleAutoSave();
      renderProductGalleryList(product, listEl);
    });
    row.querySelector("[data-gdown]")?.addEventListener("click", () => {
      if (i >= product.gallery.length - 1) return;
      [product.gallery[i], product.gallery[i + 1]] = [product.gallery[i + 1], product.gallery[i]];
      scheduleAutoSave();
      renderProductGalleryList(product, listEl);
    });
    row.querySelector("[data-gdel]")?.addEventListener("click", async () => {
      if (!await confirmDelete(`确定删除「${product.name}」的第 ${i + 1} 张实拍图吗？`)) return;
      product.gallery.splice(i, 1);
      scheduleAutoSave();
      renderProductGalleryList(product, listEl);
    });
  });
}

function renderContactPanel() {
  const c = CMS.data.contact;
  if (!c.cards) CMS.normalizeContact();
  const el = document.getElementById("panel-contact");
  el.innerHTML = `
    <div class="admin-card">
      <div class="admin-row">
        <div class="admin-field"><label>英文标签</label><input id="ct-tag" value="${escAttr(c.tag)}"></div>
        <div class="admin-field"><label>区块标题</label><input id="ct-title" value="${escAttr(c.title)}"></div>
      </div>
      <div class="admin-field"><label>副标题</label><input id="ct-desc" value="${escAttr(c.desc)}"></div>
      <p class="admin-hint">首页展示联系人列表，点击后在独立页面打开完整电子名片。</p>
    </div>
    <div id="contact-cards-list"></div>
    <button class="admin-btn admin-btn-outline" id="btn-add-contact-card">+ 添加联系人</button>`;

  bindInput("ct-tag", el => { c.tag = el.value; });
  bindInput("ct-title", el => { c.title = el.value; });
  bindInput("ct-desc", el => { c.desc = el.value; });

  const list = document.getElementById("contact-cards-list");
  c.cards.forEach((card, i) => list.appendChild(createContactCardEditor(card, i)));

  document.getElementById("btn-add-contact-card").onclick = () => {
    const id = `card_${Date.now()}`;
    c.cards.push({
      id,
      label: "联系人",
      name: "新联系人",
      jobTitle: "昌隆茶业",
      bio: "",
      phone: "",
      wechat: "",
      avatar: "assets/logo-icon.svg",
      qr: "assets/qr-code.svg"
    });
    scheduleAutoSave();
    renderContactPanel();
  };
}

function createContactCardEditor(card, index) {
  const div = document.createElement("div");
  div.className = "admin-slide-item";
  div.innerHTML = `
    <div class="admin-card-title">联系人 ${index + 1} · ${escHtml(card.label || card.name)}</div>
    <div class="admin-row">
      <div class="admin-field"><label>标识 ID</label><input data-f="id" value="${escAttr(card.id)}"></div>
      <div class="admin-field"><label>列表标签</label><input data-f="label" value="${escAttr(card.label)}"></div>
    </div>
    <div class="admin-row">
      <div class="admin-field"><label>姓名</label><input data-f="name" value="${escAttr(card.name)}"></div>
      <div class="admin-field"><label>职位</label><input data-f="jobTitle" value="${escAttr(card.jobTitle)}"></div>
    </div>
    <div class="admin-field"><label>个人简介</label><textarea data-f="bio">${escHtml(card.bio)}</textarea></div>
    <div class="admin-row">
      <div class="admin-field"><label>联系电话</label><input data-f="phone" value="${escAttr(card.phone)}"></div>
      <div class="admin-field"><label>微信号</label><input data-f="wechat" value="${escAttr(card.wechat)}"></div>
    </div>
    <div class="admin-row">
      <div class="admin-field">
        <label>头像图片</label>
        <div class="admin-upload"><input type="file" accept="image/*" data-upload="avatar"><div class="avatar-preview-wrap"></div></div>
      </div>
      <div class="admin-field">
        <label>微信二维码</label>
        <div class="admin-upload"><input type="file" accept="image/*" data-upload="qr"><div class="qr-preview-wrap"></div></div>
      </div>
    </div>
    <div class="admin-actions">
      <button class="admin-btn admin-btn-danger admin-btn-sm" data-del ${CMS.data.contact.cards.length <= 1 ? "disabled" : ""}>删除此人</button>
    </div>`;

  bindFields(div, card);
  setupMediaUpload(div.querySelector('[data-upload="avatar"]'), card, "avatar", div.querySelector(".avatar-preview-wrap"), { cropSlot: "avatar" });
  setupMediaUpload(div.querySelector('[data-upload="qr"]'), card, "qr", div.querySelector(".qr-preview-wrap"), { cropSlot: "qr" });

  const delBtn = div.querySelector("[data-del]");
  if (delBtn && !delBtn.disabled) {
    delBtn.onclick = async () => {
      if (!await confirmDelete(`确定删除联系人「${card.name}」吗？`)) return;
      CMS.data.contact.cards.splice(index, 1);
      scheduleAutoSave();
      renderContactPanel();
    };
  }

  return div;
}

function renderSitePanel() {
  const s = CMS.data.site;
  const el = document.getElementById("panel-site");
  el.innerHTML = `
    <div class="admin-card">
      <div class="admin-field"><label>店铺名称</label><input id="site-name" value="${escAttr(s.name)}"></div>
      <div class="admin-field"><label>页脚标语</label><input id="site-footer" value="${escAttr(s.footerText)}"></div>
      <div class="admin-field"><label>版权信息</label><input id="site-copy" value="${escAttr(s.copyright)}"></div>
      <div class="admin-field">
        <label>官网公网地址</label>
        <input id="site-public-url" value="${escAttr(s.publicUrl || "https://charlie4399828-cpu.github.io/changlong-web/")}" placeholder="https://你的用户名.github.io/changlong-web/">
        <p class="admin-hint" style="margin:6px 0 0;">二维码始终指向此地址；本地开发时也不会生成 localhost 链接。</p>
      </div>
      <div class="admin-row">
        <div class="admin-field">
          <label>导航 Logo</label>
          <div class="admin-upload"><input type="file" id="site-logo-up" accept="image/*"><div id="site-logo-prev"></div></div>
        </div>
        <div class="admin-field">
          <label>页脚 Logo</label>
          <div class="admin-upload"><input type="file" id="site-flogo-up" accept="image/*"><div id="site-flogo-prev"></div></div>
        </div>
      </div>
    </div>
    <div class="admin-card admin-site-qr">
      <div class="admin-card-title">官网访问二维码</div>
      <p class="admin-hint" style="margin-top:0;">根据上方「官网公网地址」生成，可保存后用于名片、海报、门店展示。</p>
      <div class="admin-site-qr-body">
        <div class="site-qr-frame" data-site-qr data-site-qr-size="200"></div>
        <div class="admin-site-qr-meta">
          <p class="site-qr-url" data-site-qr-text></p>
          <button type="button" class="admin-btn admin-btn-outline admin-btn-sm" data-site-qr-dl hidden>下载二维码 PNG</button>
        </div>
      </div>
    </div>`;

  if (!s.publicUrl) s.publicUrl = window.SITE_CONFIG?.publicUrl || "https://charlie4399828-cpu.github.io/changlong-web/";

  bindInput("site-name", el => { s.name = el.value; });
  bindInput("site-footer", el => { s.footerText = el.value; });
  bindInput("site-copy", el => { s.copyright = el.value; });
  bindInput("site-public-url", el => {
    s.publicUrl = el.value.trim();
    if (typeof refreshSiteQrCodes === "function") refreshSiteQrCodes();
  });
  setupMediaUpload(document.getElementById("site-logo-up"), s, "logo", document.getElementById("site-logo-prev"), { cropSlot: "logo" });
  setupMediaUpload(document.getElementById("site-flogo-up"), s, "footerLogo", document.getElementById("site-flogo-prev"), { cropSlot: "logo" });
  if (typeof initSiteQrCodes === "function") initSiteQrCodes();
}

function renderBackupPanel() {
  const el = document.getElementById("panel-backup");
  const cloudEnabled = typeof CMSCloud !== "undefined" && CMSCloud.isEnabled();
  const storedPwd = cloudEnabled ? CMSCloud.getStoredPassword() : "";
  const cloudHint = cloudEnabled
    ? "已启用云端同步。保存内容时会自动上传到 Supabase，任意浏览器访问线上地址均可加载同一份数据。"
    : "请在 cloud-config.js 中配置 Supabase 后启用云端同步。";

  el.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-title">云端同步</div>
      <p class="admin-hint">${escHtml(cloudHint)}</p>
      <div class="admin-field" style="margin-bottom:12px;">
        <label class="admin-label">编辑密码</label>
        <input type="password" class="admin-input" id="cloud-edit-password" placeholder="默认 763560" value="${escAttr(storedPwd)}">
        <p class="admin-hint" style="margin-top:6px;">密码需与 Supabase 密钥 SITE_EDIT_PASSWORD 一致。留空则使用默认密码。</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="admin-btn admin-btn-primary" id="btn-cloud-sync" ${cloudEnabled ? "" : "disabled"}>立即同步到云端</button>
        <button class="admin-btn admin-btn-outline" id="btn-cloud-verify" ${cloudEnabled ? "" : "disabled"}>验证密码</button>
      </div>
      <p class="admin-hint" id="cloud-sync-status" style="margin-top:10px;"></p>
    </div>
    <div class="admin-card">
      <div class="admin-card-title">导出备份</div>
      <p class="admin-hint">导出全部配置。若云端暂不可用，可将导出的 JSON 重命名为 <code>site-data.json</code> 放入项目根目录并 push 到 GitHub，其他浏览器即可加载。</p>
      <button class="admin-btn admin-btn-outline" id="btn-export">下载 JSON 备份</button>
      <button class="admin-btn admin-btn-outline" id="btn-export-static" style="margin-left:8px;">导出为 site-data.json</button>
    </div>
    <div class="admin-card">
      <div class="admin-card-title">导入恢复</div>
      <input type="file" id="import-file" accept=".json" style="margin-bottom:12px;">
      <button class="admin-btn admin-btn-outline" id="btn-import">导入 JSON</button>
    </div>
    <div class="admin-card">
      <div class="admin-card-title">恢复默认</div>
      <p class="admin-hint">将所有文字内容恢复为初始默认值（不会删除已上传的媒体文件）。</p>
      <button class="admin-btn admin-btn-danger" id="btn-reset">恢复默认内容</button>
    </div>`;

  const pwdInput = document.getElementById("cloud-edit-password");
  const statusEl = document.getElementById("cloud-sync-status");

  pwdInput?.addEventListener("change", () => {
    if (typeof CMSCloud !== "undefined") {
      CMSCloud.setStoredPassword(pwdInput.value.trim());
    }
  });

  document.getElementById("btn-cloud-verify")?.addEventListener("click", async () => {
    if (!cloudEnabled) return;
    const pwd = pwdInput?.value.trim() || CMSCloud.getConfig().defaultEditPassword;
    CMSCloud.setStoredPassword(pwdInput?.value.trim() || "");
    statusEl.textContent = "验证中…";
    try {
      const ok = await CMSCloud.verifyPassword(pwd);
      statusEl.textContent = ok ? "密码验证成功" : "密码错误，请检查 Supabase 配置";
      if (ok) toast("密码验证成功");
      else toast("密码错误");
    } catch (err) {
      statusEl.textContent = "验证失败：" + (err.message || err);
      toast("验证失败");
    }
  });

  document.getElementById("btn-cloud-sync")?.addEventListener("click", async () => {
    if (!cloudEnabled) return;
    const pwd = pwdInput?.value.trim() || CMSCloud.getConfig().defaultEditPassword;
    CMSCloud.setStoredPassword(pwdInput?.value.trim() || "");
    statusEl.textContent = "同步中，正在上传媒体…";
    try {
      await CMS.save(productMasterList);
      const st = CMSCloud.lastSyncStatus;
      statusEl.textContent = st?.ok
        ? `云端同步成功 ${new Date().toLocaleTimeString()}`
        : (CMS.lastCloudError || st?.message || "同步失败");
      toast(st?.ok ? "已同步到云端" : "同步失败");
    } catch (err) {
      statusEl.textContent = "同步失败：" + (err.message || err);
      toast("同步失败");
    }
  });

  if (CMSCloud?.lastSyncStatus?.ok) {
    statusEl.textContent = `上次同步：${new Date(CMSCloud.lastSyncStatus.at).toLocaleString()}`;
  }

  const downloadJson = (filename, prepare) => {
    const payload = prepare ? prepare() : CMS.exportJSON();
    const blob = new Blob([payload], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  };

  document.getElementById("btn-export").onclick = async () => {
    downloadJson(`changlong-backup-${Date.now()}.json`);
    toast("备份已下载");
  };

  document.getElementById("btn-export-static")?.addEventListener("click", async () => {
    if (typeof CMSCloud !== "undefined" && CMSCloud.isEnabled()) {
      statusEl.textContent = "正在准备可跨设备的静态数据…";
      try {
        const cloudReady = await CMSCloud.resolveMediaRefsForCloud(CMS.data);
        cloudReady._cmsUpdatedAt = CMS.data._cmsUpdatedAt || Date.now();
        downloadJson("site-data.json", () => JSON.stringify(cloudReady, null, 2));
        statusEl.textContent = "已导出 site-data.json，请放入项目根目录并 push 到 GitHub";
        toast("已导出 site-data.json");
        return;
      } catch (err) {
        statusEl.textContent = "导出失败：" + (err.message || err);
        toast("导出失败");
        return;
      }
    }
    downloadJson("site-data.json");
    toast("已导出 site-data.json（媒体仍为本地 ID，建议先同步云端）");
  });
  document.getElementById("btn-import").onclick = async () => {
    const file = document.getElementById("import-file").files[0];
    if (!file) return toast("请选择 JSON 文件");
    const text = await file.text();
    await CMS.importJSON(text);
    reloadProductMasterList();
    renderAllPanels();
    toast("导入成功");
  };
  document.getElementById("btn-reset").onclick = async () => {
    if (!await confirmDelete("确定恢复全部默认内容？当前文字配置将被覆盖。", { okText: "确认恢复" })) return;
    await CMS.reset();
    reloadProductMasterList();
    renderAllPanels();
    toast("已恢复默认");
  };
}

function bindFields(container, obj, options = {}) {
  const { autoSave = true } = options;
  container.querySelectorAll("[data-f]").forEach(inp => {
    const key = inp.dataset.f;
    const handler = () => {
      obj[key] = inp.type === "number" ? +inp.value : inp.value;
      if (autoSave) scheduleAutoSave();
    };
    inp.addEventListener("input", handler);
    inp.addEventListener("change", handler);
  });
}

function setupMediaUpload(input, obj, field, previewWrap, options = {}) {
  if (!input || !previewWrap) return;
  showPreview(previewWrap, obj[field], false, options.previewClass);

  input.onchange = async () => {
    let file = input.files[0];
    if (!file) return;
    try {
      const isVideo = file.type.startsWith("video/");
      if (field === "media" && obj.mediaType === undefined) {
        obj.mediaType = isVideo ? "video" : "image";
      }
      if (field === "media") obj.mediaType = isVideo ? "video" : "image";

      if (!isVideo && options.cropSlot && typeof processImageUpload === "function") {
        file = await processImageUpload(file, options.cropSlot);
      }

      const id = await CMS.uploadFile(file);
      obj[field] = id;
      showPreview(previewWrap, id, isVideo, options.previewClass);
      if (options.autoSave !== false) scheduleAutoSave();
      else toast("上传成功，请点击保存");
    } catch (err) {
      if (err.message !== "cancelled") toast(err.message || "上传失败");
    }
    input.value = "";
  };
}

async function showPreview(wrap, ref, forceVideo, previewClass = "") {
  if (!wrap) return;
  if (!ref) { wrap.innerHTML = ""; return; }
  const url = await CMS.getMediaUrl(ref);
  const extraClass = previewClass ? ` ${previewClass}` : "";
  if (!url) { wrap.innerHTML = `<span style="font-size:0.75rem;color:var(--color-mist)">当前：${ref}</span>`; return; }
  const isVideo = forceVideo || ref.includes("video") || url.includes("video");
  if (CMS.isMediaId(ref)) {
    const rec = await getMediaRecord(ref);
    if (rec?.type?.startsWith("video/")) {
      wrap.innerHTML = `<video class="admin-upload-preview video-preview${extraClass}" src="${url}" muted loop autoplay playsinline></video>`;
      return;
    }
  }
  wrap.innerHTML = `<img class="admin-upload-preview${extraClass}" src="${url}" alt="预览">`;
}

async function saveAll(showToast = true) {
  clearTimeout(autoSaveTimer);
  await CMS.save(productMasterList);
  const time = new Date().toLocaleTimeString();
  let status = `已保存 ${time}`;
  if (typeof CMSCloud !== "undefined" && CMSCloud.isEnabled()) {
    if (CMSCloud.lastSyncStatus?.ok) {
      status += " · 已同步云端";
    } else if (CMS.lastCloudError) {
      status += " · 云端失败";
    }
  }
  document.getElementById("save-status").textContent = status;
  if (showToast) {
    const msg = CMS.lastCloudError
      ? "本地已保存，但云端同步失败：" + CMS.lastCloudError
      : "全部内容已保存，请刷新首页查看";
    toast(msg);
  }
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

function escAttr(s) {
  return String(s || "").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function escHtml(s) {
  const d = document.createElement("div");
  d.textContent = s || "";
  return d.innerHTML;
}
