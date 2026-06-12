/**
 * 将 Supabase 中残留的 media_* ID 替换为 Storage 公网 URL
 */
const SUPABASE_URL = "https://ghyvptwooesjvtwfljfz.supabase.co";
const ANON_KEY = "sb_publishable_jlEah_ycR8WruZaEhw0QRA_6oHiDTqK";
const SAVE_URL = `${SUPABASE_URL}/functions/v1/save-site`;
const BUCKET = "changlong-cms";
const PASSWORD = "763560";

const EXTS = ["jpg", "jpeg", "png", "webp", "gif", "svg", "mp4", "webm"];

function storageBase(mediaId) {
  return `media/${mediaId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

async function resolveStorageUrl(mediaId) {
  for (const ext of EXTS) {
    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storageBase(mediaId)}.${ext}`;
    const res = await fetch(url, { method: "HEAD" });
    if (res.ok) return url;
  }
  return null;
}

function collectRefs(value, refs) {
  if (!value) return;
  if (typeof value === "string") {
    if (value.startsWith("media_")) refs.add(value);
    return;
  }
  if (Array.isArray(value)) value.forEach(v => collectRefs(v, refs));
  else if (typeof value === "object") Object.values(value).forEach(v => collectRefs(v, refs));
}

function replaceRefs(value, map) {
  if (!value) return;
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      if (typeof item === "string" && map.has(item)) value[i] = map.get(item);
      else replaceRefs(item, map);
    });
    return;
  }
  if (typeof value === "object") {
    Object.keys(value).forEach(key => {
      const item = value[key];
      if (typeof item === "string" && map.has(item)) value[key] = map.get(item);
      else replaceRefs(item, map);
    });
  }
}

async function main() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/site_content?id=eq.1&select=content`,
    { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
  );
  const rows = await res.json();
  const data = rows[0]?.content;
  if (!data) throw new Error("无云端数据");

  const refs = new Set();
  collectRefs(data, refs);
  console.log(`发现 ${refs.size} 个 media_* 引用`);

  const map = new Map();
  for (const ref of refs) {
    const url = await resolveStorageUrl(ref);
    if (url) {
      map.set(ref, url);
      console.log(`  ✓ ${ref} → ${url}`);
    } else {
      console.log(`  ✗ ${ref} 未找到存储文件`);
    }
  }

  if (!map.size) {
    console.log("无需修复");
    return;
  }

  replaceRefs(data, map);
  data._cmsUpdatedAt = Date.now();

  const saveRes = await fetch(SAVE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({ action: "save", password: PASSWORD, data })
  });

  const body = await saveRes.json();
  if (!saveRes.ok) throw new Error(body.error || saveRes.status);
  console.log(`已修复 ${map.size} 个媒体链接并写回云端`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
