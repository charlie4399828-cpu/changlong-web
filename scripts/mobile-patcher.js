(function () {
  if (window.__mobileLayoutPatch) return;
  if (!window.matchMedia("(max-width: 768px)").matches) return;
  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://ghyvptwooesjvtwfljfz.supabase.co/storage/v1/object/public/changlong-cms/patch/mobile-layout.css?v=" + Date.now();
  link.onload = link.onerror = function () { window.__mobileLayoutPatch = true; };
  document.head.appendChild(link);
})();

/* 防止 CMS 加载慢导致下方内容 opacity:0 不显示 */
(function () {
  function revealAll() {
    var sel = ".reveal,.reveal-left,.reveal-right,.reveal-scale,.reveal-fade,.reveal-blur,.reveal-up,.text-reveal-line";
    document.querySelectorAll(sel).forEach(function (el) { el.classList.add("revealed"); });
    document.querySelectorAll(".scroll-section").forEach(function (el) { el.classList.add("in-view"); });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      setTimeout(revealAll, 800);
      setTimeout(revealAll, 3500);
    });
  } else {
    setTimeout(revealAll, 800);
    setTimeout(revealAll, 3500);
  }
})();
