const ADMIN_UNLOCK_KEY = "changlong_admin_unlocked";
const DEFAULT_ADMIN_PASSWORD = "CLCY64583329";

let adminAppReady = false;

function getAdminPassword() {
  const pw = CMS.data?.site?.adminPassword;
  if (typeof pw === "string" && pw.trim()) return pw.trim();
  return DEFAULT_ADMIN_PASSWORD;
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

function bindPasswordToggle(input, button) {
  if (!input || !button || button.dataset.bound) return;
  button.dataset.bound = "1";
  button.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.setAttribute("aria-pressed", show ? "true" : "false");
    button.setAttribute("aria-label", show ? "隐藏密码" : "显示密码");
    button.classList.toggle("is-visible", show);
  });
}

function showAdminGate(onSuccess) {
  const gate = document.getElementById("admin-gate");
  const app = document.getElementById("admin-app");
  const form = document.getElementById("admin-gate-form");
  const input = document.getElementById("admin-gate-password");
  const toggle = document.getElementById("admin-gate-toggle-pw");
  const err = document.getElementById("admin-gate-error");
  const submitBtn = form?.querySelector(".admin-gate-submit");

  if (!gate || !app) {
    onSuccess?.();
    return;
  }

  gate.hidden = false;
  app.hidden = true;
  if (input) {
    input.value = "";
    input.type = "password";
    setTimeout(() => input.focus(), 50);
  }
  if (toggle) {
    toggle.classList.remove("is-visible");
    toggle.setAttribute("aria-pressed", "false");
    toggle.setAttribute("aria-label", "显示密码");
    bindPasswordToggle(input, toggle);
  }
  if (err) err.hidden = true;
  if (submitBtn) submitBtn.disabled = false;

  if (!form) return;

  form.onsubmit = async e => {
    e.preventDefault();
    const value = (input?.value || "").trim();
    if (!value) {
      if (err) {
        err.textContent = "请输入访问密码";
        err.hidden = false;
      }
      toast("请输入访问密码", { variant: "error" });
      input?.focus();
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "验证中…";
    }

    const matched = value === getAdminPassword();
    await new Promise(r => setTimeout(r, matched ? 120 : 0));

    if (matched) {
      setAdminUnlocked();
      gate.hidden = true;
      app.hidden = false;
      if (err) err.hidden = true;
      toast("验证成功，正在进入后台");
      try {
        await onSuccess?.();
      } catch (err) {
        console.error(err);
        clearAdminUnlock();
        toast("进入后台失败，请刷新后重试", { variant: "error" });
        showAdminGate(onSuccess);
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "进入后台";
        }
      }
      return;
    }

    if (err) {
      err.textContent = "密码错误，请重试";
      err.hidden = false;
    }
    toast("密码错误，请检查后重试", { variant: "error" });
    input?.select();
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "进入后台";
    }
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

  const saveBtn = document.getElementById("btn-save-all");
  if (saveBtn) {
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
  if (previewBtn) {
    previewBtn.addEventListener("click", async e => {
      e.preventDefault();
      previewBtn.style.pointerEvents = "none";
      await saveAll(false, { syncCloud: false });
      window.location.href = "index.html";
    });
  }

  window.addEventListener("beforeunload", () => {
    if (autoSaveTimer) CMS.save(productMasterList, { syncCloud: false });
  });
}
