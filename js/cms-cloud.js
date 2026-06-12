const CMSCloud = {
  PASSWORD_KEY: "changlong_cms_edit_password",
  lastSyncStatus: null,
  storageUrlCache: new Map(),

  getConfig() {
    const fromFile = window.CMS_CLOUD || {};
    let baseUrl = (fromFile.supabaseUrl || "").trim();
    baseUrl = baseUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
    return {
      supabaseUrl: baseUrl,
      supabaseAnonKey: (fromFile.supabaseAnonKey || "").trim(),
      saveFunctionUrl: (fromFile.saveFunctionUrl || "").trim(),
      storageBucket: (fromFile.storageBucket || "changlong-cms").trim(),
      defaultEditPassword: String(fromFile.defaultEditPassword || "763560")
    };
  },

  isEnabled() {
    const cfg = this.getConfig();
    return !!(cfg.supabaseUrl && cfg.supabaseAnonKey);
  },

  getStoredPassword() {
    try {
      return localStorage.getItem(this.PASSWORD_KEY) || "";
    } catch {
      return "";
    }
  },

  setStoredPassword(password) {
    localStorage.setItem(this.PASSWORD_KEY, password || "");
  },

  getEffectivePassword() {
    return this.getStoredPassword() || this.getConfig().defaultEditPassword;
  },

  authHeaders(cfg) {
    const headers = {};
    if (cfg.supabaseAnonKey) {
      headers.apikey = cfg.supabaseAnonKey;
      headers.Authorization = "Bearer " + cfg.supabaseAnonKey;
    }
    return headers;
  },

  hasContent(data) {
    if (!data || typeof data !== "object") return false;
    return Object.keys(data).some(key => key !== "_cmsUpdatedAt");
  },

  pickNewer(local, remote) {
    if (!local) return remote;
    if (!remote) return local;
    if (!this.hasContent(remote)) return local;
    if (!this.hasContent(local)) return remote;
    const tl = local._cmsUpdatedAt || 0;
    const tr = remote._cmsUpdatedAt || 0;
    if (tr > 0 && tl === 0) return remote;
    return tl >= tr ? local : remote;
  },

  applyRemoteMeta(content, updatedAt) {
    if (!content || typeof content !== "object") return content;
    if (updatedAt) {
      content._cmsUpdatedAt = new Date(updatedAt).getTime();
    }
    return content;
  },

  async fetchStaticFallback() {
    try {
      const res = await fetch("./site-data.json?t=" + Date.now(), { cache: "no-store" });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || typeof data !== "object" || !Object.keys(data).length) return null;
      if (!data._cmsUpdatedAt) {
        data._cmsUpdatedAt = Date.now();
      }
      return data;
    } catch (err) {
      console.warn("读取 site-data.json 失败", err);
      return null;
    }
  },

  injectMobileLayoutCss() {
    if (window.__mobileLayoutPatch) return;
    if (!window.matchMedia("(max-width: 768px)").matches) return;

    const cfg = this.getConfig();
    const base = (cfg.supabaseUrl || "").replace(/\/$/, "");
    if (!base) return;

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = base + "/storage/v1/object/public/" + cfg.storageBucket + "/patch/mobile-layout.css?v=" + Date.now();
    link.onload = link.onerror = () => { window.__mobileLayoutPatch = true; };
    document.head.appendChild(link);
  },

  async fetchRemote() {
    const cfg = this.getConfig();
    this.injectMobileLayoutCss();
    if (!this.isEnabled()) {
      return this.fetchStaticFallback();
    }

    try {
      const api =
        cfg.supabaseUrl +
        "/rest/v1/site_content?id=eq.1&select=content,updated_at";
      const res = await fetch(api, {
        cache: "no-store",
        headers: this.authHeaders(cfg)
      });
      if (!res.ok) {
        return this.fetchStaticFallback();
      }

      const rows = await res.json();
      const row = rows?.[0];
      if (!row?.content || !Object.keys(row.content).length) {
        return this.fetchStaticFallback();
      }

      return this.applyRemoteMeta(
        JSON.parse(JSON.stringify(row.content)),
        row.updated_at
      );
    } catch (err) {
      console.warn("读取云端 CMS 失败", err);
      return this.fetchStaticFallback();
    }
  },

  collectMediaRefs(value, refs) {
    if (!value) return;
    if (typeof value === "string") {
      if (value.startsWith("media_")) refs.add(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(item => this.collectMediaRefs(item, refs));
      return;
    }
    if (typeof value === "object") {
      Object.values(value).forEach(item => this.collectMediaRefs(item, refs));
    }
  },

  replaceMediaRefs(value, urlMap) {
    if (!value) return;
    if (typeof value === "string") {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === "string" && urlMap.has(item)) {
          value[index] = urlMap.get(item);
        } else {
          this.replaceMediaRefs(item, urlMap);
        }
      });
      return;
    }
    if (typeof value === "object") {
      Object.keys(value).forEach(key => {
        const item = value[key];
        if (typeof item === "string" && urlMap.has(item)) {
          value[key] = urlMap.get(item);
        } else {
          this.replaceMediaRefs(item, urlMap);
        }
      });
    }
  },

  extFromMime(type, name) {
    const map = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/svg+xml": "svg",
      "video/mp4": "mp4",
      "video/webm": "webm"
    };
    if (map[type]) return map[type];
    const fromName = (name || "").split(".").pop();
    return fromName && fromName.length <= 5 ? fromName.toLowerCase() : "bin";
  },

  publicStorageUrl(cfg, objectPath) {
    return (
      cfg.supabaseUrl +
      "/storage/v1/object/public/" +
      cfg.storageBucket +
      "/" +
      objectPath
    );
  },

  storageObjectBase(mediaId) {
    return "media/" + mediaId.replace(/[^a-zA-Z0-9_-]/g, "_");
  },

  async resolveStorageUrl(mediaId) {
    if (!mediaId?.startsWith("media_")) return "";
    if (this.storageUrlCache.has(mediaId)) {
      return this.storageUrlCache.get(mediaId) || "";
    }

    const cfg = this.getConfig();
    if (!cfg.supabaseUrl) return "";

    const base = this.storageObjectBase(mediaId);
    const exts = ["jpg", "jpeg", "png", "webp", "gif", "svg", "mp4", "webm"];
    for (const ext of exts) {
      const url = this.publicStorageUrl(cfg, base + "." + ext);
      try {
        const res = await fetch(url, { method: "HEAD", cache: "force-cache" });
        if (res.ok) {
          this.storageUrlCache.set(mediaId, url);
          return url;
        }
      } catch {
        /* try next extension */
      }
    }

    this.storageUrlCache.set(mediaId, "");
    return "";
  },

  async hydrateAllMediaRefs(data) {
    const refs = new Set();
    this.collectMediaRefs(data, refs);
    if (!refs.size) return false;

    const urlMap = new Map();
    for (const ref of refs) {
      const url = await this.resolveStorageUrl(ref);
      if (url) urlMap.set(ref, url);
    }
    if (!urlMap.size) return false;

    this.replaceMediaRefs(data, urlMap);
    return true;
  },

  countRemainingMediaRefs(data) {
    const refs = new Set();
    this.collectMediaRefs(data, refs);
    return refs.size;
  },

  async uploadMediaBlob(blob, mediaId, type, name) {
    const cfg = this.getConfig();
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      throw new Error("云端未配置");
    }

    const ext = this.extFromMime(type || blob.type, name);
    const objectPath = "media/" + mediaId.replace(/[^a-zA-Z0-9_-]/g, "_") + "." + ext;
    const uploadUrl =
      cfg.supabaseUrl + "/storage/v1/object/" + cfg.storageBucket + "/" + objectPath;

    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        ...this.authHeaders(cfg),
        "Content-Type": type || blob.type || "application/octet-stream",
        "x-upsert": "true"
      },
      body: blob
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error("媒体上传失败: " + (text || res.status));
    }

    return this.publicStorageUrl(cfg, objectPath);
  },

  async uploadMediaFile(file, localId) {
    return this.uploadMediaBlob(file, localId, file.type, file.name);
  },

  async resolveMediaRefsForCloud(data) {
    const copy = JSON.parse(JSON.stringify(data));
    const refs = new Set();
    this.collectMediaRefs(copy, refs);
    if (!refs.size) return copy;

    const urlMap = new Map();
    for (const ref of refs) {
      if (!ref.startsWith("media_")) continue;
      const record = await getMediaRecord(ref);
      if (record?.blob) {
        try {
          const url = await this.uploadMediaBlob(
            record.blob,
            ref,
            record.type,
            record.name
          );
          urlMap.set(ref, url);
          continue;
        } catch (err) {
          console.warn("上传媒体到云端失败:", ref, err);
        }
      }
      const existing = await this.resolveStorageUrl(ref);
      if (existing) urlMap.set(ref, existing);
    }

    this.replaceMediaRefs(copy, urlMap);
    return copy;
  },

  async callSaveApi(payload) {
    const cfg = this.getConfig();
    if (!cfg.saveFunctionUrl) {
      return { ok: false, reason: "no-config" };
    }

    const res = await fetch(cfg.saveFunctionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.authHeaders(cfg)
      },
      body: JSON.stringify(payload)
    });

    let body = {};
    try {
      body = await res.json();
    } catch {
      body = {};
    }

    return { ok: res.ok, status: res.status, body };
  },

  async verifyPassword(password) {
    const pwd = password || this.getEffectivePassword();
    const result = await this.callSaveApi({ action: "verify", password: pwd });
    return result.ok && result.body?.ok;
  },

  async syncToCloud(data, password) {
    if (!this.isEnabled()) {
      this.lastSyncStatus = { ok: false, message: "云端未配置" };
      return this.lastSyncStatus;
    }

    const pwd = password || this.getEffectivePassword();
    const cloudData = await this.resolveMediaRefsForCloud(data);
    cloudData._cmsUpdatedAt = data._cmsUpdatedAt || Date.now();

    const result = await this.callSaveApi({
      action: "save",
      password: pwd,
      data: cloudData
    });

    if (!result.ok) {
      const msg = result.body?.error || "云端保存失败 (" + result.status + ")";
      this.lastSyncStatus = { ok: false, message: msg };
      throw new Error(msg);
    }

    this.lastSyncStatus = {
      ok: true,
      message: "已同步到云端",
      at: Date.now()
    };
    return this.lastSyncStatus;
  }
};

CMSCloud.injectMobileLayoutCss();
