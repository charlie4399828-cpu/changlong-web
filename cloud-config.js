/**
 * ★ CMS 云端同步配置（与 person_web 共用同一 Supabase 项目）
 * supabaseUrl 只填项目根地址，不要带 /rest/v1/
 */
window.CMS_CLOUD = {
  supabaseUrl: "https://ghyvptwooesjvtwfljfz.supabase.co",
  supabaseAnonKey: "sb_publishable_jlEah_ycR8WruZaEhw0QRA_6oHiDTqK",
  saveFunctionUrl: "https://ghyvptwooesjvtwfljfz.supabase.co/functions/v1/save-site",
  storageBucket: "changlong-cms",
  /** 默认编辑密码，需与 Supabase 密钥 SITE_EDIT_PASSWORD 一致 */
  defaultEditPassword: "763560"
};

(function loadMobileLayoutPatch() {
  if (window.__mobilePatchLoading) return;
  window.__mobilePatchLoading = true;
  const base = (window.CMS_CLOUD?.supabaseUrl || "").replace(/\/$/, "");
  if (!base) return;
  const s = document.createElement("script");
  s.src = base + "/storage/v1/object/public/changlong-cms/patch/mobile-patcher.js?v=" + Date.now();
  document.head.appendChild(s);
})();
