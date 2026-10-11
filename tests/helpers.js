/**
 * 测试沙箱：用 Node 内置 vm 把浏览器脚本按 HTML 中的依赖顺序
 * 拼接到同一个上下文中执行，零依赖、不改动业务代码。
 */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.resolve(__dirname, "..");

function readJs(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function makeStorage() {
  const map = new Map();
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
    clear: () => { map.clear(); }
  };
}

function makeElement(tag) {
  return {
    tagName: String(tag || "div").toUpperCase(),
    style: {},
    dataset: {},
    children: [],
    setAttribute() {},
    removeAttribute() {},
    getAttribute() { return null; },
    appendChild(child) { this.children.push(child); return child; },
    addEventListener() {},
    removeEventListener() {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    focus() {},
    remove() {}
  };
}

function makeDocument() {
  return {
    head: makeElement("head"),
    body: { classList: { add() {}, remove() {}, contains() { return false; } } },
    documentElement: makeElement("html"),
    addEventListener() {},
    removeEventListener() {},
    createElement: (tag) => makeElement(tag),
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getElementById() { return null; },
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} })
  };
}

function makeIndexedDB() {
  const mediaTable = new Map();
  const dbStub = {
    objectStoreNames: { contains: () => false },
    createObjectStore() { return { createIndex() {} }; },
    transaction() {
      let tx;
      const makeReq = (produce) => {
        const req = { onsuccess: null, onerror: null, result: undefined };
        queueMicrotask(() => {
          req.result = produce();
          req.onsuccess && req.onsuccess({ target: req });
          queueMicrotask(() => { tx.oncomplete && tx.oncomplete(); });
        });
        return req;
      };
      tx = {
        objectStore: () => ({
          put: (record) => makeReq(() => { mediaTable.set(record.id, record); return undefined; }),
          get: (id) => makeReq(() => mediaTable.get(id) || null),
          getAll: () => makeReq(() => [...mediaTable.values()]),
          delete: (id) => makeReq(() => { mediaTable.delete(id); return undefined; })
        }),
        oncomplete: null,
        onerror: null
      };
      return tx;
    }
  };
  return {
    open() {
      const req = { onupgradeneeded: null, onsuccess: null, onerror: null, result: dbStub };
      queueMicrotask(() => {
        req.onupgradeneeded && req.onupgradeneeded({ target: { result: dbStub } });
        req.onsuccess && req.onsuccess({ target: { result: dbStub } });
      });
      return req;
    }
  };
}

/**
 * 创建并加载业务脚本的隔离环境
 * @param {{cloud?:object,location?:object,fetchImpl?:Function}} [opts]
 */
function createEnv(opts = {}) {
  const sandbox = {};
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.console = console;
  sandbox.setTimeout = setTimeout;
  sandbox.clearTimeout = clearTimeout;
  sandbox.queueMicrotask = queueMicrotask;
  sandbox.URL = URL;
  sandbox.Blob = class Blob {};
  sandbox.File = class File {};
  sandbox.navigator = {};
  sandbox.document = makeDocument();
  sandbox.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
  sandbox.localStorage = makeStorage();
  sandbox.sessionStorage = makeStorage();
  sandbox.indexedDB = makeIndexedDB();

  sandbox.location = opts.location || {
    hostname: "localhost",
    origin: "http://localhost:8080"
  };

  sandbox.CMS_CLOUD = opts.cloud || {
    supabaseUrl: "https://example-test.supabase.co",
    supabaseAnonKey: "sb_publishable_test",
    saveFunctionUrl: "https://example-test.supabase.co/functions/v1/save-site",
    storageBucket: "changlong-cms",
    defaultEditPassword: "763560"
  };

  const fetchCalls = [];
  sandbox.fetch = async (...args) => {
    fetchCalls.push(args);
    const impl = opts.fetchImpl || (async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => "" }));
    return impl(...args);
  };

  vm.createContext(sandbox);

  // 依赖顺序与 admin.html / index.html 中的 script 标签一致
  const sources = [
    "js/cms-storage.js",
    "js/cms-cloud.js",
    "js/site-qr.js",
    "js/cms.js"
  ];
  const code = sources.map(readJs).join("\n;\n") + `
;globalThis.__testApi = {
  CMS, CMSCloud,
  normalizePublicUrl, getSiteHomeUrl,
  loadSiteData, persistSiteData, clearSiteData, getCMSVersion,
  saveMediaFile, getMediaRecord, listAllMedia, deleteMediaFile
};`;

  vm.runInContext(code, sandbox, { filename: "bundle.test.vm.js" });

  return { api: sandbox.__testApi, sandbox, fetchCalls };
}

// vm 沙箱返回的对象属于另一个 Realm（原型不同，无法直接 deepEqual），
// 结构断言前用 JSON 往返转成当前 Realm 的普通对象。
function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

module.exports = { createEnv, makeStorage, makeIndexedDB, ROOT, plain };
