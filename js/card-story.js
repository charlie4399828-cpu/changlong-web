const DEFAULT_CONTACT_STORY = Object.freeze({
  title: "我的故事",
  paragraphs: [],
  images: []
});

function ensureContactStory(card) {
  if (!card.story) card.story = { ...DEFAULT_CONTACT_STORY, images: [] };
  if (!card.story.title) card.story.title = DEFAULT_CONTACT_STORY.title;
  if (!Array.isArray(card.story.paragraphs)) {
    card.story.paragraphs = card.story.text
      ? String(card.story.text).split(/\n+/).map(s => s.trim()).filter(Boolean)
      : [];
    delete card.story.text;
  }
  if (!Array.isArray(card.story.images)) card.story.images = [];
  return card.story;
}

function parseStoryParagraphs(text) {
  return String(text || "")
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .filter(Boolean);
}

function formatStoryParagraphs(paragraphs) {
  return (paragraphs || []).join("\n\n");
}

function storyEsc(str) {
  const d = document.createElement("div");
  d.textContent = str || "";
  return d.innerHTML;
}

async function buildCardStoryHTML(card) {
  const story = ensureContactStory(card);
  const paragraphs = story.paragraphs.map(p => p.trim()).filter(Boolean);
  const images = story.images || [];
  if (!paragraphs.length && !images.length) return "";

  const title = story.title || DEFAULT_CONTACT_STORY.title;
  const textHtml = paragraphs.map(p => `<p class="card-story-text">${storyEsc(p)}</p>`).join("");
  const imageHtml = (await Promise.all(images.map(async ref => {
    const url = await CMS.getMediaUrl(ref);
    return url
      ? `<figure class="card-story-figure"><img class="card-story-image" src="${url}" alt="" loading="lazy" decoding="async"></figure>`
      : "";
  }))).filter(Boolean).join("");

  return `
      <section class="card-story" aria-labelledby="card-story-heading">
        <h4 class="card-story-title" id="card-story-heading">${storyEsc(title)}</h4>
        ${textHtml ? `<div class="card-story-texts">${textHtml}</div>` : ""}
        ${imageHtml ? `<div class="card-story-images">${imageHtml}</div>` : ""}
      </section>`;
}

function bindContactStoryEditor(root, card, handlers = {}) {
  ensureContactStory(card);
  const { onChange, renderGallery, uploadFiles } = handlers;
  const storyGallery = root.querySelector("[data-story-gallery]");
  const storyTitleInput = root.querySelector("[data-story-title]");
  const storyTextInput = root.querySelector("[data-story-text]");
  const uploadInput = root.querySelector("[data-story-upload]");

  renderGallery?.(storyGallery);

  storyTitleInput?.addEventListener("input", () => {
    card.story.title = storyTitleInput.value;
    onChange?.();
  });

  storyTextInput?.addEventListener("input", () => {
    card.story.paragraphs = parseStoryParagraphs(storyTextInput.value);
    onChange?.();
  });

  uploadInput?.addEventListener("change", async e => {
    const files = [...(e.target.files || [])];
    if (!files.length) return;
    try {
      await uploadFiles?.(files);
      renderGallery?.(storyGallery);
    } finally {
      e.target.value = "";
    }
  });
}

function storyAttr(s) {
  return String(s || "").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function contactStoryEditorHTML(card) {
  ensureContactStory(card);
  const storyText = formatStoryParagraphs(card.story.paragraphs);
  const fieldId = storyAttr(card.id || "contact");
  return `
    <div class="admin-subcard">
      <div class="admin-card-title">我的故事</div>
      <p class="admin-hint admin-hint--flush">显示在电子名片二维码下方，可添加文字与配图介绍此人。</p>
      <div class="admin-field">
        <label for="story-title-${fieldId}">故事标题</label>
        <input id="story-title-${fieldId}" data-story-title value="${storyAttr(card.story.title)}">
      </div>
      <div class="admin-field">
        <label for="story-text-${fieldId}">故事正文</label>
        <textarea id="story-text-${fieldId}" data-story-text rows="5" placeholder="每段之间空一行，名片页将分段展示">${storyEsc(storyText)}</textarea>
      </div>
      <div class="admin-field">
        <label>故事配图</label>
        <div class="admin-gallery-list" data-story-gallery></div>
        <div class="admin-upload admin-upload--compact">
          <input type="file" accept="image/*" multiple data-story-upload>
        </div>
      </div>
    </div>`;
}
