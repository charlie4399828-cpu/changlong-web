/**
 * 将静态网站上传到 Supabase Storage 公网桶
 * 用法：在项目根目录配置 .env 后执行 npm run deploy:supabase
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8"
};

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "scripts",
  "supabase",
  ".vercel",
  ".netlify"
]);

const SKIP_FILES = new Set([
  ".env",
  ".env.local",
  ".env.example",
  ".gitignore",
  "package.json",
  "package-lock.json",
  "vercel.json",
  "netlify.toml",
  "README.md"
]);

function loadEnvFile() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  fs.readFileSync(envPath, "utf8").split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const idx = trimmed.indexOf("=");
    if (idx === -1) return;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  });
}

function collectFiles(dir, baseDir = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...collectFiles(fullPath, baseDir));
      continue;
    }
    if (SKIP_FILES.has(entry.name)) continue;
    const rel = path.relative(baseDir, fullPath).replace(/\\/g, "/");
    files.push({ fullPath, rel });
  }

  return files;
}

function getContentType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

async function ensureBucket(supabase, bucket) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) throw listError;

  const exists = buckets?.some(b => b.name === bucket);
  if (exists) return;

  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 52_428_800
  });
  if (error) throw error;
  console.log(`已创建公网存储桶: ${bucket}`);
}

async function main() {
  loadEnvFile();

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET || "website";

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("缺少环境变量：请在 .env 中配置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY");
    console.error("参考 .env.example");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  await ensureBucket(supabase, bucket);

  const files = collectFiles(ROOT);
  if (!files.some(f => f.rel === "index.html")) {
    throw new Error("未找到 index.html，请确认项目根目录正确");
  }

  console.log(`开始上传 ${files.length} 个文件到 Supabase Storage /${bucket} ...`);

  let uploaded = 0;
  for (const file of files) {
    const body = fs.readFileSync(file.fullPath);
    const { error } = await supabase.storage.from(bucket).upload(file.rel, body, {
      upsert: true,
      contentType: getContentType(file.fullPath),
      cacheControl: file.rel.match(/\.(html|js|css)$/) ? "3600" : "31536000"
    });

    if (error) {
      console.error(`上传失败: ${file.rel}`, error.message);
      process.exit(1);
    }

    uploaded += 1;
    process.stdout.write(`\r已上传 ${uploaded}/${files.length}: ${file.rel.padEnd(40).slice(0, 40)}`);
  }

  const publicBase = `${supabaseUrl}/storage/v1/object/public/${bucket}`;
  console.log("\n\n部署完成！");
  console.log(`首页: ${publicBase}/index.html`);
  console.log(`后台: ${publicBase}/admin.html`);
  console.log("\n说明: Supabase Storage 适合静态文件托管，但无独立域名时 URL 较长。");
  console.log("若需多设备共享 CMS 内容，建议下一步把数据迁移到 Supabase Database。");
}

main().catch(err => {
  console.error("\n部署失败:", err.message || err);
  process.exit(1);
});
