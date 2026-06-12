# 昌隆茶舍 CMS 云端同步

让任意浏览器、任意设备访问线上地址时，加载**同一份**后台保存的内容。

## 一次性配置（约 5 分钟）

### 1. 建表与存储桶

在 [Supabase SQL Editor](https://supabase.com/dashboard) 中执行 `schema-site.sql` 的全部内容。

### 2. 部署保存接口

```powershell
cd D:\Code\ChangLong-web
supabase login
supabase link --project-ref ghyvptwooesjvtwfljfz
supabase secrets set SITE_EDIT_PASSWORD=763560
supabase functions deploy save-site
```

### 3. 确认前端配置

`cloud-config.js` 中已填写与 person_web 相同的 Supabase 项目，默认编辑密码 `763560`。

### 4. 首次同步

1. 在**已保存过内容的浏览器**打开 `admin.html`
2. 进入「备份恢复」→ 点击「立即同步到云端」
3. 在其他浏览器打开 GitHub Pages 地址，应能看到相同内容

## 工作原理

| 层级 | 作用 |
|------|------|
| `site_content` 表 | 存储站点 JSON 配置（公开可读，写入走 Edge Function） |
| `changlong-cms` 桶 | 存储上传的图片/视频（公网 URL） |
| `save-site` 函数 | 校验密码后写入数据库 |
| 本地 localStorage | 缓存，离线时仍可预览 |

保存时：本地写入 → 媒体上传 Storage → JSON 同步云端。  
加载时：拉取云端数据，与本地比较时间戳，使用较新的一份。
