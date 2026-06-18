function escProductText(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

async function createProductCard(product, index) {
  const delay = Math.min((index % 4) + 1, 4);
  const mediaHtml = typeof renderProductMedia === "function"
    ? await renderProductMedia(product)
    : `<div class="tea-visual" data-tea="${product.image}">${product.name.slice(0, 2)}</div>`;
  return `
    <article class="product-card reveal-scale delay-${delay}" data-id="${product.id}">
      <div class="product-card-shine"></div>
      <div class="product-card-image">
        ${mediaHtml}
        <span class="product-tag">${product.tag}</span>
      </div>
      <div class="product-card-body">
        <h4 class="product-name">${product.name}</h4>
        <p class="product-desc">${product.desc}</p>
        <div class="product-footer">
          <span class="product-price">¥${product.price}<span>/${product.unit}</span></span>
          <span class="product-arrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </span>
        </div>
      </div>
    </article>
  `;
}

function navigateToProduct(id) {
  document.body.classList.add("page-exit");
  setTimeout(() => {
    window.location.href = `product.html?id=${id}`;
  }, 400);
}

function bindProductCardClicks(container) {
  if (!container) return;
  container.querySelectorAll(".product-card").forEach(card => {
    card.addEventListener("click", () => navigateToProduct(card.dataset.id));
  });
}
