const CMS = {
  data: null,
  mediaCache: new Map(),

  buildDefaultData() {
    const slides = [
      {
        subtitle: "宋韵茶香", title: "昌隆茶舍",
        desc: "承宋式清雅之风，择名山好茶，以一方茶席，敬岁月清欢",
        mediaType: "gradient",
        gradient: "linear-gradient(135deg, #d4e4dc 0%, #a8c4b8 40%, #7a9a8c 100%)",
        media: ""
      },
      {
        subtitle: "明前头采", title: "春茶上新",
        desc: "清明前采摘，嫩芽初展，一盏春茶，尽揽山野清气",
        mediaType: "gradient",
        gradient: "linear-gradient(135deg, #e8e4dc 0%, #c9c5bc 40%, #a8c4b8 100%)",
        media: ""
      },
      {
        subtitle: "以茶会友", title: "静享时光",
        desc: "一方茶室，半日清闲，邀您共品东方茶韵之美",
        mediaType: "gradient",
        gradient: "linear-gradient(135deg, #faf8f4 0%, #d4e4dc 50%, #b8a88a 100%)",
        media: ""
      }
    ];

    const products = typeof PRODUCTS !== "undefined"
      ? JSON.parse(JSON.stringify(PRODUCTS))
      : { seasonal: [], hot: [], all: [] };

    Object.values(products).flat().forEach(p => {
      if (!p.media) p.media = "";
      if (!p.mediaType) p.mediaType = p.media ? "image" : "placeholder";
      if (!p.gallery) p.gallery = [];
    });

    return {
      site: {
        name: "昌隆茶舍",
        logo: "assets/logo-icon.svg",
        footerLogo: "assets/logo.svg",
        footerText: "宋韵茶香 · 温润东方",
        copyright: "© 2026 昌隆茶舍 版权所有",
        publicUrl: "https://charlie4399828-cpu.github.io/changlong-web/"
      },
      carousel: { interval: 5000, slides },
      about: {
        tag: "ABOUT US",
        title: "店铺介绍",
        desc: "一盏清茶，半卷书香，宋式雅境",
        mediaType: "image",
        media: "assets/logo.svg",
        caption: "昌隆茶舍 · CHANG LONG",
        shopTitle: "昌隆茶舍",
        paragraphs: [
          "昌隆茶舍创立于江南古城一隅，秉承宋代点茶美学与当代极简设计理念，致力于为您呈现最纯粹的东方茶韵。我们深入全国各大名茶产区，严选每一片茶叶，从茶园到茶杯，全程把控品质。",
          "茶舍空间以米白、青釉、淡墨为主色调，大量运用留白与线条，营造清雅通透的品茶氛围。无论是日常自饮，还是礼赠亲友，这里总有一款茶，能契合您的心意。",
          "我们坚信，好茶无需多言。愿以一杯清茗，伴您静享岁月悠长。"
        ],
        features: [
          { num: "10+", text: "年制茶经验" },
          { num: "30+", text: "款精选茶品" },
          { num: "100%", text: "原产地直供" }
        ]
      },
      productsSection: {
        tag: "PRODUCTS",
        title: "产品信息",
        desc: "精选好茶，分类陈列，一览东方茶韵",
        allLabel: "全部商品",
        modules: [
          { key: "seasonal", label: "当季新品" },
          { key: "hot", label: "热销商品" }
        ]
      },
      products,
      contact: {
        tag: "CONTACT",
        title: "联系方式",
        desc: "期待与您以茶会友",
        cards: [
          {
            id: "founder",
            label: "创始人",
            name: "李鑫",
            jobTitle: "昌隆茶业 · 创始人",
            bio: "2000年结缘茶事业，2003年投身茶叶行业至今已二十载。走遍云南核心茶区，只为寻得那一抹最纯粹的茶香。愿以茶为媒，结交天下爱茶之人。",
            phone: "13769148246",
            wechat: "y13769148246",
            avatar: "assets/logo-icon.svg",
            qr: "assets/qr-code.svg"
          },
          {
            id: "store",
            label: "门店联络",
            name: "昌隆茶业",
            jobTitle: "新广丰店 · 接待咨询",
            bio: "欢迎莅临店面品茶选茶。如需送货上门、批发合作或茶礼定制，请通过电话或微信与我们联系。",
            phone: "13769148246",
            wechat: "y13769148246",
            avatar: "assets/logo-icon.svg",
            qr: "assets/qr-code.svg"
          }
        ]
      }
    };
  },

  deepMerge(defaults, saved) {
    const result = JSON.parse(JSON.stringify(defaults));
    const merge = (target, source) => {
      if (!source || typeof source !== "object") return;
      Object.keys(source).forEach(key => {
        if (Array.isArray(source[key])) {
          target[key] = source[key];
        } else if (source[key] && typeof source[key] === "object") {
          if (!target[key] || typeof target[key] !== "object") target[key] = {};
          merge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      });
    };
    merge(result, saved);
    return result;
  },

  normalizeContact() {
    const c = this.data?.contact;
    if (!c) return;
    if (c.cards?.length) return;

    c.cards = [{
      id: "founder",
      label: "创始人",
      name: c.name || "李鑫",
      jobTitle: c.title || "昌隆茶业 · 创始人",
      bio: c.bio || "",
      phone: c.phone || "",
      wechat: c.wechat || "",
      avatar: c.avatar || "assets/logo-icon.svg",
      qr: c.qr || "assets/qr-code.svg"
    }];
  },

  getContactCard(id) {
    const cards = this.data?.contact?.cards || [];
    return cards.find(c => c.id === id) || cards[0] || null;
  },

  mergeProductCategories(defaultProducts, savedProducts) {
    const result = JSON.parse(JSON.stringify(defaultProducts));
    const cats = new Set([
      ...Object.keys(defaultProducts || {}),
      ...Object.keys(savedProducts || {})
    ]);
    cats.forEach(cat => {
      if (!Array.isArray(savedProducts?.[cat])) return;
      const defById = Object.fromEntries((defaultProducts[cat] || []).map(p => [p.id, p]));
      result[cat] = savedProducts[cat].map(sp => {
        const base = defById[sp.id] ? JSON.parse(JSON.stringify(defById[sp.id])) : {};
        const merged = { ...base, ...sp };
        if (!merged.gallery) merged.gallery = base.gallery || [];
        if (!merged.media) merged.media = "";
        if (!merged.mediaType) merged.mediaType = merged.media ? "image" : "placeholder";
        return merged;
      });
    });
    return result;
  },

  normalizeProductModules() {
    const sec = this.data?.productsSection;
    if (!sec) return;
    if (!sec.modules?.length) {
      sec.modules = [
        { key: "seasonal", label: "当季新品" },
        { key: "hot", label: "热销商品" }
      ];
    }
    if (!sec.allLabel) sec.allLabel = "全部商品";
  },

  getProductModules() {
    this.normalizeProductModules();
    return this.data.productsSection.modules;
  },

  buildMergedData(defaults, saved) {
    const merged = saved ? this.deepMerge(defaults, saved) : defaults;
    if (saved?.products) {
      merged.products = this.mergeProductCategories(defaults.products, saved.products);
    }
    return merged;
  },

  async init() {
    await openCMSDatabase();
    const defaults = this.buildDefaultData();
    const localSaved = loadSiteData();
    const localData = localSaved ? this.buildMergedData(defaults, localSaved) : null;

    let remoteData = null;
    if (typeof CMSCloud !== "undefined") {
      remoteData = await CMSCloud.fetchRemote();
    }

    const picked = typeof CMSCloud !== "undefined"
      ? CMSCloud.pickNewer(localData, remoteData)
      : localData;

    this.data = picked || defaults;
    if (picked?.products) {
      this.data.products = this.mergeProductCategories(defaults.products, picked.products);
    }
    this.normalizeContact();
    this.normalizeProductModules();
    this.syncProductsGlobal();

    if (remoteData && picked === remoteData) {
      persistSiteData(this.data);
    }

    if (typeof CMSCloud !== "undefined" && CMSCloud.isEnabled()) {
      CMSCloud.hydrateAllMediaRefs(this.data)
        .then(hydrated => { if (hydrated) persistSiteData(this.data); })
        .catch(err => console.warn("媒体链接解析失败:", err));
    }

    return this.data;
  },

  normalizeProducts() {
    if (!this.data?.products) return;
    Object.values(this.data.products).flat().forEach(p => {
      if (!p.gallery) p.gallery = [];
    });
  },

  syncProductsGlobal() {
    if (this.data?.products) {
      this.normalizeProducts();
      window.PRODUCTS = this.data.products;
    }
  },

  async save(masterProductList, options = {}) {
    const { syncCloud = true } = options;
    if (Array.isArray(masterProductList)) {
      this.rebuildProductCategories(masterProductList);
    }
    this.data._cmsUpdatedAt = Date.now();
    persistSiteData(this.data);
    localStorage.setItem("changlong_cms_version", String(Date.now()));
    this.syncProductsGlobal();

    if (!syncCloud || typeof CMSCloud === "undefined" || !CMSCloud.isEnabled()) {
      return;
    }

    try {
      await CMSCloud.hydrateAllMediaRefs(this.data);
      persistSiteData(this.data);
      await CMSCloud.syncToCloud(this.data);
      this.lastCloudError = "";
    } catch (err) {
      console.warn("云端同步失败（本地已保存）:", err.message || err);
      this.lastCloudError = err.message || String(err);
    }
  },

  async reset() {
    this.data = this.buildDefaultData();
    await this.save();
  },

  isMediaId(ref) {
    return ref && ref.startsWith("media_");
  },

  async getMediaUrl(ref) {
    if (!ref) return "";
    if (!this.isMediaId(ref)) return ref;
    if (this.mediaCache.has(ref)) return this.mediaCache.get(ref);

    const record = await getMediaRecord(ref);
    if (record?.blob) {
      const url = URL.createObjectURL(record.blob);
      this.mediaCache.set(ref, url);
      return url;
    }

    if (typeof CMSCloud !== "undefined") {
      const cloudUrl = await CMSCloud.resolveStorageUrl(ref);
      if (cloudUrl) {
        this.mediaCache.set(ref, cloudUrl);
        return cloudUrl;
      }
    }

    return "";
  },

  async uploadFile(file) {
    if (!file) return "";
    const maxSize = file.type.startsWith("video/") ? 80 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(file.type.startsWith("video/") ? "视频不能超过 80MB" : "图片不能超过 10MB");
    }
    const localId = await saveMediaFile(file);
    if (typeof CMSCloud !== "undefined" && CMSCloud.isEnabled()) {
      try {
        return await CMSCloud.uploadMediaFile(file, localId);
      } catch (err) {
        console.warn("云端媒体上传失败，使用本地缓存:", err);
      }
    }
    return localId;
  },

  inferProductModules(product) {
    if (Array.isArray(product?.modules)) return [...product.modules];
    const modules = [];
    const id = product?.id;
    if (!id) return modules;
    this.getProductModules().forEach(mod => {
      if (this.data.products[mod.key]?.some(p => p.id === id)) modules.push(mod.key);
    });
    return modules;
  },

  getMasterProductList() {
    const seen = new Set();
    const list = [];
    const cats = [...this.getProductModules().map(m => m.key), "all"];
    cats.forEach(cat => {
      (this.data.products[cat] || []).forEach(p => {
        if (seen.has(p.id)) return;
        seen.add(p.id);
        const item = JSON.parse(JSON.stringify(p));
        item.modules = this.inferProductModules(p);
        if (!item.gallery) item.gallery = [];
        list.push(item);
      });
    });
    return list;
  },

  rebuildProductCategories(masterList) {
    const moduleKeys = this.getProductModules().map(m => m.key);
    const list = (masterList || []).map(p => {
      const copy = JSON.parse(JSON.stringify(p));
      if (!copy.modules) copy.modules = this.inferProductModules(copy);
      if (!copy.gallery) copy.gallery = [];
      copy.modules = copy.modules.filter(key => moduleKeys.includes(key));
      return copy;
    });
    const result = { all: list };
    moduleKeys.forEach(key => {
      result[key] = list.filter(p => p.modules.includes(key));
    });
    this.data.products = result;
  },

  getAllProductsList() {
    const seen = new Set();
    const list = [];
    Object.values(this.data.products || {}).flat().forEach(p => {
      if (seen.has(p.id)) return;
      seen.add(p.id);
      list.push(p);
    });
    return list;
  },

  getProductById(id) {
    const product = this.getAllProductsList().find(p => p.id === id) || null;
    if (product && !product.gallery) product.gallery = [];
    return product;
  },

  async resolveMediaUrl(ref) {
    if (!ref) return "";
    if (!this.isMediaId(ref)) return ref;
    const url = await this.getMediaUrl(ref);
    return url || "";
  },

  exportJSON() {
    return JSON.stringify(this.data, null, 2);
  },

  async importJSON(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    this.data = parsed;
    this.normalizeProductModules();
    await this.save();
  }
};

function getProductById(id) {
  if (typeof CMS !== "undefined" && CMS.data) return CMS.getProductById(id);
  if (typeof PRODUCTS !== "undefined") {
    return [...PRODUCTS.seasonal, ...PRODUCTS.hot, ...PRODUCTS.all].find(p => p.id === id) || null;
  }
  return null;
}
