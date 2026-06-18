function initPageHeader(options = {}) {
  const header = document.querySelector(".header");
  if (!header) return;

  const onScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 50);
    if (options.trackNav && typeof updateActiveNav === "function") {
      updateActiveNav();
    }
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function initPageMobileNav() {
  const toggle = document.querySelector(".menu-toggle");
  const nav = document.querySelector(".nav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    toggle.classList.toggle("active");
    nav.classList.toggle("open");
    document.body.style.overflow = nav.classList.contains("open") ? "hidden" : "";
  });

  nav.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", () => {
      toggle.classList.remove("active");
      nav.classList.remove("open");
      document.body.style.overflow = "";
    });
  });
}
