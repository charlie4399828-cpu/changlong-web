/**
 * jsdom DOM 冒烟测试：在真实 DOM 中加载页面实际引用的脚本，
 * 远程资源（Supabase/CDN）一律置空，模拟"云端离线"时的本机行为。
 * 覆盖：名片页渲染、后台门禁错误密码拒绝 / 正确密码进入。
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const { JSDOM, VirtualConsole, requestInterceptor } = require("jsdom");
const { makeIndexedDB } = require("./helpers");

const ROOT = path.join(__dirname, "..");

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(fn, { timeout = 8000, interval = 100, label = "" } = {}) {
  const start = Date.now();
  for (;;) {
    const v = fn();
    if (v) return v;
    if (Date.now() - start > timeout) throw new Error(`等待超时: ${label}`);
    await sleep(interval);
  }
}

// 远程脚本/模块一律置空（模拟云端不可达，且远程脚本失败不应阻塞页面）；
// 本机页面资源改为从磁盘读取，不依赖外部网络。
const localOnlyInterceptor = requestInterceptor(request => {
  const u = new URL(request.url);
  if (u.hostname !== "localhost" && u.hostname !== "127.0.0.1") {
    return new Response("", { headers: { "Content-Type": "application/javascript" } });
  }
  try {
    const rel = decodeURIComponent(u.pathname).replace(/^\/+/, "");
    const file = path.join(ROOT, rel || "index.html");
    return new Response(fs.readFileSync(file), {
      headers: { "Content-Type": "application/javascript" }
    });
  } catch {
    return new Response("", { headers: { "Content-Type": "application/javascript" } });
  }
});

function createDom(page, { url } = {}) {
  const virtualConsole = new VirtualConsole();
  const errors = [];
  virtualConsole.on("jsdomError", e => errors.push(e && e.message ? e.message : String(e)));

  const dom = new JSDOM(fs.readFileSync(path.join(ROOT, page), "utf8"), {
    url: url || `http://localhost:8080/${page}`,
    runScripts: "dangerously",
    resources: { interceptors: [localOnlyInterceptor] },
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse(window) {
      window.indexedDB = makeIndexedDB();
    }
  });

  const { window } = dom;
  window.fetch = async () => ({
    ok: false,
    status: 503,
    headers: { get: () => null },
    json: async () => ({}),
    text: async () => "",
    arrayBuffer: async () => new ArrayBuffer(0)
  });
  window.matchMedia = window.matchMedia || (() => ({
    matches: false,
    media: "",
    onchange: null,
    addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; }
  }));
  class FakeObserver {
    observe() {} unobserve() {} disconnect() {} takeRecords() { return []; }
  }
  window.IntersectionObserver = window.IntersectionObserver || FakeObserver;
  window.ResizeObserver = window.ResizeObserver || FakeObserver;
  window.scrollTo = () => {};
  // jsdom 未实现 canvas 渲染上下文
  window.HTMLCanvasElement.prototype.getContext = () => null;

  return { dom, window, errors };
}

test("名片页：离线默认数据渲染出姓名、拨号链接与微信号", async () => {
  const { window, errors } = createDom("card.html", { url: "http://localhost:8080/card.html" });

  const root = await waitFor(
    () => {
      const el = window.document.getElementById("card-root");
      return el && el.textContent.trim().length > 0 ? el : null;
    },
    { label: "#card-root 渲染", timeout: 10000 }
  );

  const tel = root.querySelector("a[href^='tel:']");
  assert.ok(tel, "应存在拨号链接");
  assert.match(tel.getAttribute("href"), /^tel:\d{7,}$/, "拨号链接应为纯数字号码");
  assert.ok(tel.textContent.trim().length > 0, "号码应可见");

  const name = root.querySelector(".card-name, [class*='name'], h1, h2");
  assert.ok(name && name.textContent.trim().length > 0, "应渲染姓名/标题");

  const text = root.textContent;
  assert.ok(/13769148246|[\d]{7,}/.test(text.replace(/\s/g, "")), "文本中应有联系电话");

  const fatal = errors.filter(m => /is not defined|not a function|Cannot read propert/.test(m));
  assert.equal(fatal.length, 0, `名片页不应有致命脚本错误: ${fatal.join(" | ")}`);

  window.close();
});

test("后台门禁：错误密码被拒，正确密码进入后台", async () => {
  const { window } = createDom("admin.html", { url: "http://localhost:8080/admin.html" });
  const doc = window.document;

  const form = doc.getElementById("admin-gate-form");
  const gate = doc.getElementById("admin-gate");
  const app = doc.getElementById("admin-app");
  // 等待 DOMContentLoaded 完成门禁绑定（外部脚本异步加载，密码框先于脚本出现）
  await waitFor(
    () => form && form.dataset.loginBound === "1",
    { label: "门禁表单绑定", timeout: 10000 }
  );
  const input = doc.getElementById("admin-gate-password");

  // 确保门禁默认可见
  assert.ok(!gate.hidden, "初始应显示门禁");

  // 1) 错误密码
  input.value = "wrongpass123";
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

  await waitFor(
    () => {
      const err = doc.getElementById("admin-gate-error");
      return err && !err.hidden && /密码错误/.test(err.textContent || "");
    },
    { label: "错误密码提示", timeout: 6000 }
  );
  assert.ok(!gate.hidden, "错误密码后仍应停留门禁");
  assert.equal(app.hidden, true, "错误密码后后台应保持隐藏");

  // 2) 正确密码（离线默认数据，默认密码）
  const pwd = (window.CMS?.data?.site?.adminPassword || "").trim() || "CLCY64583329";
  input.value = pwd;
  form.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true }));

  await waitFor(() => gate.hidden === true, { label: "门禁隐藏", timeout: 8000 });
  assert.equal(app.hidden, false, "正确密码后后台应显示");
  assert.equal(window.sessionStorage.getItem("changlong_admin_session") ? 1 : 0, 1, "应写入登录会话");

  window.close();
});
