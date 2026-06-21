const DEFAULT_ADMIN_PASSWORD = "CLCY64583329";
const ADMIN_SESSION_KEY = "changlong_admin_session";
const IDLE_TIMEOUT_MS = 60 * 60 * 1000;
const IDLE_CHECK_INTERVAL_MS = 30 * 1000;
const SESSION_TOUCH_THROTTLE_MS = 15 * 1000;

let adminAppReady = false;
let adminSessionActive = false;
let cmsInitPromise = null;
let idleCheckTimer = null;
let lastSessionTouch = 0;
let idleWatcherBound = false;

function getAdminPassword() {
  const pw = CMS?.data?.site?.adminPassword;
  if (typeof pw === "string" && pw.trim()) return pw.trim();
  return DEFAULT_ADMIN_PASSWORD;
}

function readSession() {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data.lastActive !== "number") return null;
    return data;
  } catch {
    return null;
  }
}

function writeSession() {
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
    passwordKey: getAdminPassword(),
    lastActive: Date.now()
  }));
  lastSessionTouch = Date.now();
}

function clearSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  sessionStorage.removeItem("changlong_admin_unlocked");
  lastSessionTouch = 0;
}

function isSessionValid() {
  const session = readSession();
  if (!session) return false;
  if (session.passwordKey !== getAdminPassword()) return false;
  return Date.now() - session.lastActive < IDLE_TIMEOUT_MS;
}

function touchSession() {
  if (!adminSessionActive) return;
  const now = Date.now();
  if (now - lastSessionTouch < SESSION_TOUCH_THROTTLE_MS) return;
  writeSession();
}

function stopIdleWatcher() {
  if (idleCheckTimer) {
    clearInterval(idleCheckTimer);
    idleCheckTimer = null;
  }
}

function handleSessionExpired() {
  stopIdleWatcher();
  clearSession();
  exitAdminDashboard();
  resetGateForm();
  showGateNotice("已超过一小时未操作，请重新输入密码", "error");
  if (typeof toast === "function") {
    toast("登录已过期，请重新输入密码", { variant: "error" });
  }
  setTimeout(() => document.getElementById("admin-gate-password")?.focus(), 50);
}

function startIdleWatcher() {
  stopIdleWatcher();

  if (!idleWatcherBound) {
    idleWatcherBound = true;
    const onActivity = () => touchSession();
    ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"].forEach(eventName => {
      document.addEventListener(eventName, onActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && adminSessionActive && !isSessionValid()) {
        handleSessionExpired();
      }
    });
  }

  idleCheckTimer = setInterval(() => {
    if (!adminSessionActive) return;
    if (!isSessionValid()) handleSessionExpired();
  }, IDLE_CHECK_INTERVAL_MS);
}

function enterAdminDashboard() {
  adminSessionActive = true;
  document.body.classList.add("admin-session-active");

  const gate = document.getElementById("admin-gate");
  const app = document.getElementById("admin-app");
  if (gate) {
    gate.hidden = true;
    gate.setAttribute("aria-hidden", "true");
  }
  if (app) {
    app.hidden = false;
    app.removeAttribute("aria-hidden");
  }
}

function exitAdminDashboard() {
  stopIdleWatcher();
  adminSessionActive = false;
  adminAppReady = false;
  document.body.classList.remove("admin-session-active");

  const gate = document.getElementById("admin-gate");
  const app = document.getElementById("admin-app");
  if (gate) {
    gate.hidden = false;
    gate.removeAttribute("aria-hidden");
  }
  if (app) {
    app.hidden = true;
    app.setAttribute("aria-hidden", "true");
  }
}

function ensureCmsReady() {
  if (CMS?.data) return Promise.resolve(CMS.data);
  if (!cmsInitPromise && typeof CMS !== "undefined") {
    cmsInitPromise = CMS.init().catch(err => {
      cmsInitPromise = null;
      throw err;
    });
  }
  return cmsInitPromise || Promise.resolve();
}

function setPasswordFieldVisible(input, visible) {
  if (!input) return;
  input.type = visible ? "text" : "password";
  input.setAttribute("autocomplete", visible ? "off" : "current-password");
}

function bindPasswordToggle(input, button) {
  if (!input || !button || button.dataset.bound) return;
  button.dataset.bound = "1";

  button.addEventListener("mousedown", e => e.preventDefault());
  button.addEventListener("click", e => {
    e.preventDefault();
    e.stopPropagation();
    const visible = input.type === "password";
    setPasswordFieldVisible(input, visible);
    button.setAttribute("aria-pressed", visible ? "true" : "false");
    button.setAttribute("aria-label", visible ? "隐藏密码" : "显示密码");
    button.classList.toggle("is-visible", visible);
    input.focus({ preventScroll: true });
    const end = input.value.length;
    if (typeof input.setSelectionRange === "function") {
      input.setSelectionRange(end, end);
    }
  });
}

function showGateNotice(msg, variant = "info") {
  const notice = document.getElementById("admin-gate-notice");
  if (!notice) {
    if (typeof toast === "function") toast(msg, { variant });
    return;
  }
  notice.textContent = msg;
  notice.classList.remove("admin-gate-notice--error", "admin-gate-notice--success");
  if (variant === "error") notice.classList.add("admin-gate-notice--error");
  if (variant === "success") notice.classList.add("admin-gate-notice--success");
  notice.hidden = false;
  notice.classList.add("show");
  clearTimeout(showGateNotice._timer);
  showGateNotice._timer = setTimeout(() => {
    notice.classList.remove("show");
    notice.hidden = true;
  }, variant === "error" ? 3200 : 2400);
}

function resetGateForm() {
  const input = document.getElementById("admin-gate-password");
  const toggle = document.getElementById("admin-gate-toggle-pw");
  const err = document.getElementById("admin-gate-error");
  const submitBtn = document.querySelector(".admin-gate-submit");

  if (input) {
    input.value = "";
    setPasswordFieldVisible(input, false);
  }
  if (toggle) {
    toggle.classList.remove("is-visible");
    toggle.setAttribute("aria-pressed", "false");
    toggle.setAttribute("aria-label", "显示密码");
  }
  if (err) err.hidden = true;
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "进入后台";
  }
}

function showAdminGate() {
  if (adminSessionActive) return;
  exitAdminDashboard();
  resetGateForm();
  setTimeout(() => document.getElementById("admin-gate-password")?.focus(), 50);
}

async function resumeAdminSession() {
  writeSession();
  enterAdminDashboard();
  startIdleWatcher();
  await startAdminApp();
}

async function handleAdminGateLogin(e) {
  e.preventDefault();

  const input = document.getElementById("admin-gate-password");
  const err = document.getElementById("admin-gate-error");
  const submitBtn = document.querySelector(".admin-gate-submit");
  const value = (input?.value || "").trim();

  if (!value) {
    if (err) {
      err.textContent = "请输入访问密码";
      err.hidden = false;
    }
    showGateNotice("请输入访问密码", "error");
    input?.focus();
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "验证中…";
  }

  try {
    await ensureCmsReady();
    if (typeof applyAdminSiteBranding === "function") {
      await applyAdminSiteBranding();
    }

    if (value !== getAdminPassword()) {
      if (err) {
        err.textContent = "密码错误，请重试";
        err.hidden = false;
      }
      showGateNotice("登录失败，密码错误", "error");
      if (typeof toast === "function") toast("登录失败，密码错误", { variant: "error" });
      input?.select();
      return;
    }

    writeSession();
    enterAdminDashboard();
    startIdleWatcher();
    showGateNotice("登录成功，正在进入后台", "success");
    if (typeof toast === "function") toast("登录成功", { variant: "success" });

    await startAdminApp();
  } catch (loginErr) {
    console.error(loginErr);
    clearSession();
    if (!adminSessionActive) {
      showAdminGate();
      showGateNotice("登录失败，请重试", "error");
      if (typeof toast === "function") toast("登录失败，请重试", { variant: "error" });
    } else if (typeof toast === "function") {
      toast("后台部分功能加载失败，请刷新页面", { variant: "error" });
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "进入后台";
    }
  }
}

function initAdminGate() {
  bindPasswordToggle(
    document.getElementById("admin-gate-password"),
    document.getElementById("admin-gate-toggle-pw")
  );

  const form = document.getElementById("admin-gate-form");
  if (!form || form.dataset.loginBound) return;
  form.dataset.loginBound = "1";
  form.addEventListener("submit", handleAdminGateLogin);
}

async function bootstrapAdminPage() {
  try {
    await ensureCmsReady();
    if (typeof applyAdminSiteBranding === "function") {
      await applyAdminSiteBranding();
    }

    if (isSessionValid()) {
      await resumeAdminSession();
      return;
    }

    clearSession();
    showAdminGate();
  } catch (err) {
    console.error(err);
    clearSession();
    showAdminGate();
    showGateNotice("页面加载失败，请刷新后重试", "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initAdminGate();
  bootstrapAdminPage();
});

function renderPasswordPanel() {
  const el = document.getElementById("panel-password");
  if (!el) return;

  el.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-title">后台访问密码</div>
      <p class="admin-hint admin-hint--flush">进入内容管理时使用的登录密码。与「备份恢复」中的云端同步密码不同，修改后请点「保存全部」同步到云端。登录后一小时无操作需重新输入密码。</p>
      <div class="admin-field">
        <label for="pw-current">当前密码</label>
        <input type="password" id="pw-current" autocomplete="current-password">
      </div>
      <div class="admin-field">
        <label for="pw-new">新密码</label>
        <input type="password" id="pw-new" autocomplete="new-password">
      </div>
      <div class="admin-field">
        <label for="pw-confirm">确认新密码</label>
        <input type="password" id="pw-confirm" autocomplete="new-password">
      </div>
      <button type="button" class="admin-btn admin-btn-primary" id="btn-change-pw">更新密码</button>
    </div>`;

  document.getElementById("btn-change-pw").onclick = async () => {
    const current = document.getElementById("pw-current").value;
    const newPw = document.getElementById("pw-new").value;
    const confirmPw = document.getElementById("pw-confirm").value;

    if (current !== getAdminPassword()) {
      toast("当前密码不正确");
      return;
    }
    if (!newPw || newPw.length < 6) {
      toast("新密码至少 6 位");
      return;
    }
    if (newPw !== confirmPw) {
      toast("两次输入的新密码不一致");
      return;
    }

    if (!CMS.data.site) CMS.data.site = {};
    CMS.data.site.adminPassword = newPw;
    await saveAll(true, { syncCloud: true });
    toast("密码已更新，请用新密码重新登录");
    clearSession();
    exitAdminDashboard();
    showAdminGate();
  };
}

async function startAdminApp() {
  if (!adminSessionActive) return;

  try {
    if (!adminAppReady) {
      adminAppReady = true;
      if (typeof reloadProductMasterList === "function") reloadProductMasterList();
      if (typeof bindNav === "function") bindNav();
      if (typeof renderAllPanels === "function") renderAllPanels();

      const saveBtn = document.getElementById("btn-save-all");
      if (saveBtn && !saveBtn.dataset.bound) {
        saveBtn.dataset.bound = "1";
        saveBtn.addEventListener("click", async () => {
          saveBtn.disabled = true;
          saveBtn.textContent = "保存中…";
          try {
            await saveAll(true, { syncCloud: true });
          } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = "保存全部";
          }
        });
      }

      const previewBtn = document.getElementById("btn-preview");
      if (previewBtn && !previewBtn.dataset.bound) {
        previewBtn.dataset.bound = "1";
        previewBtn.addEventListener("click", async e => {
          e.preventDefault();
          previewBtn.style.pointerEvents = "none";
          await saveAll(false, { syncCloud: false });
          window.location.href = "index.html";
        });
      }

      if (!window.__adminBeforeUnloadBound) {
        window.__adminBeforeUnloadBound = true;
        window.addEventListener("beforeunload", () => {
          if (autoSaveTimer) CMS.save(productMasterList, { syncCloud: false });
        });
      }
    } else if (typeof renderAllPanels === "function") {
      renderAllPanels();
    }

    if (typeof applyAdminSiteBranding === "function") {
      applyAdminSiteBranding().catch(console.warn);
    }
    if (typeof maybeAutoSyncLocalToCloud === "function") {
      maybeAutoSyncLocalToCloud().catch(console.warn);
    }
  } catch (err) {
    console.error("startAdminApp failed:", err);
    if (typeof toast === "function") {
      toast("后台加载异常，请刷新页面", { variant: "error" });
    }
    throw err;
  }
}
