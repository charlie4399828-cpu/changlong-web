const DEFAULT_PUBLIC_URL =
  (typeof window !== "undefined" && window.SITE_CONFIG?.publicUrl)
  || "https://charlie4399828-cpu.github.io/changlong-web/";

function normalizePublicUrl(url) {
  if (!url) return "";
  let value = String(url).trim();
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  return `${value.replace(/\/+$/, "")}/`;
}

function getSiteHomeUrl() {
  const configured =
    window.SITE_CONFIG?.publicUrl
    || (typeof CMS !== "undefined" && CMS.data?.site?.publicUrl);
  if (configured) return normalizePublicUrl(configured);

  const { hostname, origin } = window.location;
  if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local")) {
    return normalizePublicUrl(DEFAULT_PUBLIC_URL);
  }

  return `${origin}/`;
}

function loadQRCodeLib() {
  if (window.QRCode) return Promise.resolve(window.QRCode);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js";
    script.async = true;
    script.onload = () => resolve(window.QRCode);
    script.onerror = () => reject(new Error("QR 库加载失败"));
    document.head.appendChild(script);
  });
}

function useQrFallbackImage(container, url, size) {
  const img = document.createElement("img");
  img.className = "site-qr-img";
  img.alt = "网站二维码";
  img.width = size;
  img.height = size;
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
  container.appendChild(img);
  return img;
}

async function renderSiteQr(container, options = {}) {
  if (!container) return null;

  const size = +(container.dataset.siteQrSize || options.size || 168);
  const url = options.url || getSiteHomeUrl();
  const showUrl = container.dataset.siteQrShowUrl !== "0";
  const urlEl = container.closest(".site-qr-card, .admin-site-qr")?.querySelector("[data-site-qr-text]");
  if (urlEl) urlEl.textContent = url.replace(/^https?:\/\//, "");

  container.innerHTML = "";
  let canvas = null;

  try {
    const QRCode = await loadQRCodeLib();
    canvas = document.createElement("canvas");
    canvas.className = "site-qr-canvas";
    canvas.width = size;
    canvas.height = size;
    container.appendChild(canvas);
    await QRCode.toCanvas(canvas, url, {
      width: size,
      margin: 1,
      color: { dark: "#3d3b38", light: "#ffffff" }
    });
  } catch {
    useQrFallbackImage(container, url, size);
  }

  container.dataset.qrReady = "1";
  container.dataset.qrUrl = url;

  const downloadBtn = container.closest(".site-qr-card, .admin-site-qr")?.querySelector("[data-site-qr-dl]");
  if (downloadBtn) {
    downloadBtn.hidden = false;
    downloadBtn.onclick = () => downloadSiteQr(container, url);
  }

  if (showUrl && !urlEl) {
    const text = document.createElement("p");
    text.className = "site-qr-url";
    text.textContent = url.replace(/^https?:\/\//, "");
    container.after(text);
  }

  return canvas;
}

function downloadSiteQr(container, url) {
  const canvas = container.querySelector("canvas");
  const img = container.querySelector("img");
  const link = document.createElement("a");
  link.download = "changlong-website-qr.png";

  if (canvas) {
    link.href = canvas.toDataURL("image/png");
  } else if (img?.src) {
    link.href = img.src;
    link.target = "_blank";
  } else {
    return;
  }

  link.click();
}

function resetSiteQrNodes() {
  document.querySelectorAll("[data-site-qr]").forEach(el => {
    delete el.dataset.qrReady;
    el.innerHTML = "";
  });
}

async function initSiteQrCodes() {
  const nodes = [...document.querySelectorAll("[data-site-qr]")];
  await Promise.all(nodes.map(node => renderSiteQr(node)));
}

async function refreshSiteQrCodes() {
  resetSiteQrNodes();
  await initSiteQrCodes();
}

document.addEventListener("DOMContentLoaded", () => {
  initSiteQrCodes();
});
