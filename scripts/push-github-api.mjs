/**
 * 通过 GitHub API 推送文件（无需 git push / VPN）
 * 用法：在 .env 中设置 GITHUB_TOKEN=ghp_xxx 后执行
 *   node scripts/push-github-api.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const OWNER = "charlie4399828-cpu";
const REPO = "changlong-web";
const BRANCH = "main";

const FILES = [
  "index.html",
  "product.html",
  "card.html",
  "cloud-config.js",
  "site-config.js",
  "css/style.css",
  "css/mobile-layout.css",
  "js/cms-cloud.js"
];

function loadEnv() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach(line => {
    const t = line.trim();
    if (!t || t.startsWith("#")) return;
    const i = t.indexOf("=");
    if (i === -1) return;
    const k = t.slice(0, i).trim();
    const v = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[k]) process.env[k] = v;
  });
}

async function getFileSha(token, filePath) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}?ref=${BRANCH}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${filePath} 查询失败: ${res.status}`);
  const data = await res.json();
  return data.sha;
}

async function uploadFile(token, filePath) {
  const full = path.join(ROOT, filePath);
  if (!fs.existsSync(full)) {
    console.warn(`跳过（不存在）: ${filePath}`);
    return;
  }
  const content = fs.readFileSync(full).toString("base64");
  const sha = await getFileSha(token, filePath);
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: `更新 ${filePath}（手机端布局）`,
      content,
      branch: BRANCH,
      ...(sha ? { sha } : {})
    })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`上传 ${filePath} 失败: ${res.status} ${err}`);
  }
  console.log(`✓ ${filePath}`);
}

async function main() {
  loadEnv();
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("请在 .env 中设置 GITHUB_TOKEN（GitHub → Settings → Developer settings → Personal access tokens）");
    process.exit(1);
  }
  for (const file of FILES) {
    await uploadFile(token, file);
  }
  console.log("\n完成！约 1 分钟后刷新手机页面。");
}

main().catch(err => {
  console.error(err.message || err);
  process.exit(1);
});
