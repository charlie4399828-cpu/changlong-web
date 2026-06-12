(function () {
  if (window.__mobileLayoutPatch) return;
  if (!window.matchMedia("(max-width: 768px)").matches) return;
  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://ghyvptwooesjvtwfljfz.supabase.co/storage/v1/object/public/changlong-cms/patch/mobile-layout.css?v=" + Date.now();
  link.onload = link.onerror = function () { window.__mobileLayoutPatch = true; };
  document.head.appendChild(link);
})();
