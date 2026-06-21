const ADMIN_UNLOCK_KEY = "changlong_admin_unlocked";
const DEFAULT_ADMIN_PASSWORD = "CLCY64583329";

let adminAppReady = false;

function getAdminPassword() {
  return CMS.data?.site?.adminPassword || DEFAULT_ADMIN_PASSWORD;
}

function isAdminUnlocked() {
  return sessionStorage.getItem(ADMIN_UNLOCK_KEY) === getAdminPassword();
}

function setAdminUnlocked() {
  sessionStorage.setItem(ADMIN_UNLOCK_KEY, getAdminPassword());
}

function clearAdminUnlock() {
  sessionStorage.removeItem(ADMIN_UNLOCK_KEY);
}

function showAdminGate(onSuccess) {
  const gate = document.getElementById("admin-gate");
  const app = document.getElementById("admin-app");
  const form = document.getElementById("admin-gate-form");
  const input = document.getElementById("admin-gate-password");
  const err = document.getElementById("admin-gate-error");

  if (!gate || !app) {
    onSuccess?.();
    return;
  }

  gate.hidden = false;
  app.hidden = true;
  if (input) {
    input.value = "";
    setTimeout(() => input.focus(), 50);
  }
  if (err) err.hidden = true;

  if (!form) return;

  form.onsubmit = e => {
    e.preventDefault();
    const value = input?.value || "";
    if (value === getAdminPassword()) {
      setAdminUnlocked();
      gate.hidden = true;
      app.hidden = false;
      if (err) err.hidden = true;
      onSuccess?.();
      return;
    }
    if (err) {
      err.textContent = "密码错误，请重试";
      err.hidden = false;
    }
    if (input) input.select();
  };
}

function revealAdminApp() {
  const gate = document.getElementById("admin-gate");
  const app = document.getElementById("admin-app");
  if (gate) gate.hidden = true;
  if (app) app.hidden = false;
}

function renderPasswordPanel() {
  const el = document.getElementById("panel-password");
  if (!el) return;

  el.innerHTML = `
    <div class="admin-card">
      <div class="admin-card-title">后台访问密码</div>
      <p class="admin-hint admin-hint--flush">进入内容管理时使用的登录密码。与「备份恢复」中的云端同步密码不同，修改后请点「保存全部」同步到云端。</p>
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
    clearAdminUnlock();
    await saveAll(true, { syncCloud: true });
    toast("密码已更新，请用新密码重新登录");
    showAdminGate(startAdminApp);
  };
}

async function startAdminApp() {
  revealAdminApp();

  if (adminAppReady) {
    renderAllPanels();
    return;
  }
  adminAppReady = true;

  reloadProductMasterList();
  await applyAdminSiteBranding();
  await maybeAutoSyncLocalToCloud();
  bindNav();
  renderAllPanels();
  document.getElementById("btn-save-all").addEventListener("click", async () => {
    const btn = document.getElementById("btn-save-all");
    btn.disabled = true;
    btn.textContent = "保存中…";
    try {
      await saveAll(true, { syncCloud: true });
    } finally {
      btn.disabled = false;
      btn.textContent = "保存全部";
    }
  });
  document.getElementById("btn-preview").addEventListener("click", async e => {
    e.preventDefault();
    const link = e.currentTarget;
    link.style.pointerEvents = "none";
    await saveAll(false, { syncCloud: false });
    window.location.href = "index.html";
  });
  window.addEventListener("beforeunload", () => {
    if (autoSaveTimer) CMS.save(productMasterList, { syncCloud: false });
  });
}
