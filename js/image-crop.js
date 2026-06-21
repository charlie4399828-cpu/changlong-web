const IMAGE_SLOTS = {
  carousel: { mode: "fit", maxWidth: 1200, maxHeight: 820, quality: 0.82, label: "轮播图（保持原比例）" },
  about: { aspect: 4 / 5, maxWidth: 900, quality: 0.88, label: "店铺图片 4:5" },
  avatar: { aspect: 1, maxWidth: 512, quality: 0.9, label: "头像 1:1" },
  qr: { aspect: 1, maxWidth: 512, quality: 0.92, label: "二维码 1:1" },
  product: { aspect: 4 / 3, maxWidth: 960, quality: 0.86, label: "产品图 4:3" },
  story: { mode: "fit", maxWidth: 960, maxHeight: 720, quality: 0.86, label: "故事配图（保持原比例）" },
  logo: { aspect: 1, maxWidth: 256, quality: 0.9, label: "Logo 1:1" }
};

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片加载失败"));
    };
    img.src = url;
  });
}

function exportFittedImage(img, slot) {
  const maxW = slot.maxWidth || 1280;
  const maxH = slot.maxHeight || 820;
  let outW = img.naturalWidth;
  let outH = img.naturalHeight;
  const scale = Math.min(maxW / outW, maxH / outH, 1);
  outW = Math.max(1, Math.round(outW * scale));
  outH = Math.max(1, Math.round(outH * scale));

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, outW, outH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) return reject(new Error("图片处理失败"));
        resolve(new File([blob], `carousel_${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      slot.quality || 0.82
    );
  });
}

function exportCroppedImage(img, slot, view) {
  const { scale, offsetX, offsetY, cropW, cropH } = view;
  const srcX = (0 - offsetX) / scale;
  const srcY = (0 - offsetY) / scale;
  const srcW = cropW / scale;
  const srcH = cropH / scale;

  const outW = Math.min(slot.maxWidth, Math.max(1, Math.round(srcW)));
  const outH = Math.round(outW / slot.aspect);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) return reject(new Error("图片处理失败"));
        resolve(new File([blob], `cropped_${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      slot.quality
    );
  });
}

function openImageCropModal(file, slotKey) {
  const slot = IMAGE_SLOTS[slotKey] || IMAGE_SLOTS.about;

  return loadImageFromFile(file).then(img => new Promise((resolve, reject) => {
    const overlay = document.createElement("div");
    overlay.className = "crop-overlay";
    overlay.innerHTML = `
      <div class="crop-modal">
        <div class="crop-modal-header">
          <h3>裁剪图片</h3>
          <p class="crop-modal-hint">${slot.label} · 拖动图片调整构图，滑块可缩放</p>
        </div>
        <div class="crop-stage">
          <div class="crop-viewport">
            <div class="crop-box">
              <img class="crop-source" alt="" draggable="false">
            </div>
            <div class="crop-mask" aria-hidden="true">
              <div class="crop-hole"></div>
            </div>
          </div>
        </div>
        <div class="crop-controls">
          <label class="crop-zoom-label">缩放</label>
          <input type="range" class="crop-zoom" min="100" max="300" value="100">
        </div>
        <div class="crop-actions">
          <button type="button" class="admin-btn admin-btn-outline" data-cancel>取消</button>
          <button type="button" class="admin-btn admin-btn-primary" data-confirm>确认上传</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    const source = overlay.querySelector(".crop-source");
    const viewport = overlay.querySelector(".crop-viewport");
    const cropBox = overlay.querySelector(".crop-box");
    const hole = overlay.querySelector(".crop-hole");
    const zoomInput = overlay.querySelector(".crop-zoom");
    source.src = URL.createObjectURL(file);

    const view = {
      cropW: 0,
      cropH: 0,
      scale: 1,
      baseScale: 1,
      offsetX: 0,
      offsetY: 0,
      dragging: false,
      startX: 0,
      startY: 0,
      startOffX: 0,
      startOffY: 0
    };

    const layout = () => {
      const vw = viewport.clientWidth;
      const vh = viewport.clientHeight;
      const margin = 24;
      let cropW = vw - margin * 2;
      let cropH = cropW / slot.aspect;
      if (cropH > vh - margin * 2) {
        cropH = vh - margin * 2;
        cropW = cropH * slot.aspect;
      }
      view.cropW = cropW;
      view.cropH = cropH;
      cropBox.style.width = `${cropW}px`;
      cropBox.style.height = `${cropH}px`;
      hole.style.width = `${cropW}px`;
      hole.style.height = `${cropH}px`;

      view.baseScale = Math.max(cropW / img.naturalWidth, cropH / img.naturalHeight);
      view.scale = view.baseScale * (+zoomInput.value / 100);
      clampOffset();
      applyTransform();
    };

    const clampOffset = () => {
      const imgW = img.naturalWidth * view.scale;
      const imgH = img.naturalHeight * view.scale;
      view.offsetX = Math.min(0, Math.max(view.cropW - imgW, view.offsetX));
      view.offsetY = Math.min(0, Math.max(view.cropH - imgH, view.offsetY));
    };

    const applyTransform = () => {
      source.style.width = `${img.naturalWidth * view.scale}px`;
      source.style.height = `${img.naturalHeight * view.scale}px`;
      source.style.transform = `translate(${view.offsetX}px, ${view.offsetY}px)`;
    };

    const centerImage = () => {
      view.offsetX = (view.cropW - img.naturalWidth * view.scale) / 2;
      view.offsetY = (view.cropH - img.naturalHeight * view.scale) / 2;
      clampOffset();
    };

    source.onload = () => {
      layout();
      centerImage();
      applyTransform();
    };

    zoomInput.oninput = () => {
      const cx = view.cropW / 2 - view.offsetX;
      const cy = view.cropH / 2 - view.offsetY;
      const prevScale = view.scale;
      view.scale = view.baseScale * (+zoomInput.value / 100);
      const ratio = view.scale / prevScale;
      view.offsetX = view.cropW / 2 - cx * ratio;
      view.offsetY = view.cropH / 2 - cy * ratio;
      clampOffset();
      applyTransform();
    };

    const onPointerDown = e => {
      view.dragging = true;
      view.startX = e.clientX;
      view.startY = e.clientY;
      view.startOffX = view.offsetX;
      view.startOffY = view.offsetY;
      cropBox.setPointerCapture(e.pointerId);
    };

    const onPointerMove = e => {
      if (!view.dragging) return;
      view.offsetX = view.startOffX + (e.clientX - view.startX);
      view.offsetY = view.startOffY + (e.clientY - view.startY);
      clampOffset();
      applyTransform();
    };

    const onPointerUp = e => {
      view.dragging = false;
      try { cropBox.releasePointerCapture(e.pointerId); } catch (_) {}
    };

    cropBox.addEventListener("pointerdown", onPointerDown);
    cropBox.addEventListener("pointermove", onPointerMove);
    cropBox.addEventListener("pointerup", onPointerUp);
    cropBox.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("resize", layout);

    const close = () => {
      window.removeEventListener("resize", layout);
      URL.revokeObjectURL(source.src);
      overlay.remove();
      document.body.style.overflow = "";
    };

    overlay.querySelector("[data-cancel]").onclick = () => {
      close();
      reject(new Error("cancelled"));
    };

    overlay.querySelector("[data-confirm]").onclick = async () => {
      try {
        const out = await exportCroppedImage(img, slot, view);
        close();
        resolve(out);
      } catch (err) {
        reject(err);
      }
    };

    overlay.addEventListener("click", e => {
      if (e.target === overlay) {
        close();
        reject(new Error("cancelled"));
      }
    });
  }));
}

async function processImageUpload(file, slotKey) {
  if (!file?.type?.startsWith("image/")) return file;
  if (file.type === "image/svg+xml" || file.type === "image/gif") return file;
  const slot = IMAGE_SLOTS[slotKey] || IMAGE_SLOTS.about;
  if (slot.mode === "fit") {
    const img = await loadImageFromFile(file);
    return exportFittedImage(img, slot);
  }
  return openImageCropModal(file, slotKey);
}
