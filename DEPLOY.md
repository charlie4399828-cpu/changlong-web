# 昌隆茶业官网 · 云端部署指南

参考 `person_web` 的部署方式：**GitHub Pages 托管静态站点**，国内一般**无需 VPN** 即可访问。

```
用户浏览器
    │
    └─► GitHub Pages（HTML / CSS / JS / 图片）

Supabase 云端 + localStorage 缓存：任意浏览器加载同一份 CMS 数据
```

| 层级 | 技术 | 作用 |
|------|------|------|
| 前端托管 | GitHub Pages | 免费 HTTPS，国内可访问 |
| 内容同步 | Supabase Database | 站点 JSON 配置（跨浏览器共享） |
| 媒体文件 | Supabase Storage | 上传的图片/视频公网 URL |
| 本地缓存 | localStorage + IndexedDB | 离线预览、加速加载 |

**链接格式**

| 页面 | 示例 |
|------|------|
| 首页 | `https://charlie4399828-cpu.github.io/changlong-web/` |
| 商品详情 | `https://charlie4399828-cpu.github.io/changlong-web/product.html?id=s1` |
| 管理后台 | `https://charlie4399828-cpu.github.io/changlong-web/admin.html` |

---

## 一、部署前准备

- [ ] GitHub 账号（与 person_web 相同即可：`charlie4399828-cpu`）
- [ ] 新建仓库，名称建议 **`changlong-web`**（与 Pages 路径一致）
- [ ] 本机已安装 Git

---

## 二、首次发布

### 2.1 在 GitHub 创建仓库

1. 打开 [github.com/new](https://github.com/new)
2. Repository name：`changlong-web`
3. 选 **Public**
4. **不要**勾选 “Add a README”（本地已有代码）
5. Create repository

### 2.2 推送代码

```powershell
cd D:\Code\ChangLong-web
git add .
git commit -m "初始化昌隆茶业官网"
git branch -M main
git remote add origin https://github.com/charlie4399828-cpu/changlong-web.git
git push -u origin main
```

若远程仓库已存在，只需：

```powershell
git push -u origin main
```

### 2.3 开启 GitHub Pages

1. 仓库 → **Settings → Pages**
2. **Source** 选 **Deploy from a branch**
3. **Branch** 选 `main`，文件夹选 **`/ (root)`**
4. Save，等待 1～2 分钟

访问：**https://charlie4399828-cpu.github.io/changlong-web/**

---

## 三、前端配置

### 3.1 site-config.js

编辑根目录 **`site-config.js`**（公网地址，用于二维码）：

```javascript
window.SITE_CONFIG = {
  publicUrl: "https://charlie4399828-cpu.github.io/changlong-web/"
};
```

若仓库名或用户名不同，请改成你的 Pages 地址（末尾保留 `/`）。

### 3.2 后台「官网公网地址」

打开 `admin.html` → **站点设置** → **官网公网地址**，填与上面相同的 URL，保存后重新下载二维码。

---

## 四、日常更新

```powershell
cd D:\Code\ChangLong-web
# 修改代码后
git add .
git commit -m "更新站点内容"
git push
```

推送后约 1 分钟 GitHub Pages 自动更新，**无需**再执行 `npm run deploy`（Vercel）。

---

## 五、从 Vercel 迁移说明

| 对比 | Vercel | GitHub Pages |
|------|--------|----------------|
| 国内访问 | `*.vercel.app` 常被墙，需 VPN | `*.github.io` 一般可直接访问 |
| 更新方式 | `npm run deploy` | `git push` |
| 二维码地址 | 需改 `site-config.js` | 同上 |

旧 Vercel 地址可停用；二维码务必改为 GitHub Pages 地址。

---

## 六、内容同步（多设备 / 多浏览器）

### 方式 A：Supabase 云端（推荐）

与 person_web 共用同一 Supabase 项目，配置见 **`supabase/README.md`**。

1. 在 Supabase 控制台 **恢复（Unpause）** 项目（若显示 paused）
2. SQL Editor 执行 `supabase/schema-site.sql`
3. 部署 Edge Function：
   ```powershell
   cd D:\Code\ChangLong-web
   supabase link --project-ref ghyvptwooesjvtwfljfz
   supabase secrets set SITE_EDIT_PASSWORD=763560
   supabase functions deploy save-site
   ```
4. 在**已编辑过内容的浏览器**打开 `admin.html` → **备份恢复** → **立即同步到云端**
5. 任意浏览器访问 GitHub Pages，自动加载云端数据

默认编辑密码：`763560`（与 person_web 一致）

### 方式 B：静态 JSON（云端暂不可用时）

1. `admin.html` → **备份恢复** → **导出为 site-data.json**
2. 将文件放到项目根目录，执行 `git add site-data.json && git push`
3. 其他浏览器访问线上地址即可读取该文件

---

## 七、故障排查

| 现象 | 处理 |
|------|------|
| Pages 404 | 确认 Settings → Pages 已启用 `main` 分支 |
| 样式/脚本 404 | 确认仓库根目录有 `index.html`、`css/`、`js/` |
| 二维码仍是 localhost | 改 `site-config.js` 与后台「官网公网地址」后重新下载 |
| 别的浏览器看不到已保存内容 | 先「立即同步到云端」，或导出 `site-data.json` 并 push |
| 云端同步失败 | Supabase 项目是否 paused；是否已执行 schema 并部署 save-site |
| 密码错误 | 确认 `SITE_EDIT_PASSWORD` 与后台编辑密码一致 |

---

## 八、相关文件

```
ChangLong-web/
├── DEPLOY.md              # 本文档
├── site-config.js         # 公网地址（二维码）
├── cloud-config.js        # Supabase 云端配置
├── site-data.json         # 可选：静态 CMS 数据（方式 B）
├── index.html             # 首页
├── admin.html             # 管理后台
├── .nojekyll              # 禁用 Jekyll
├── js/cms.js              # CMS 数据层
├── js/cms-cloud.js        # 云端同步
└── supabase/              # 数据库脚本与 Edge Function
```

---

## 九、当前项目参考值

| 项 | 值 |
|----|-----|
| GitHub Pages | `https://charlie4399828-cpu.github.io/changlong-web/` |
| GitHub 用户 | `charlie4399828-cpu` |
| 仓库名 | `changlong-web` |

部署到新账号时请替换为自己的用户名与仓库名。
