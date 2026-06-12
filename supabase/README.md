# Supabase 集成说明

## 当前方案：Storage 静态托管

网站文件上传到 Supabase Storage 公网桶，通过固定 URL 访问。

部署步骤见项目根目录 `README.md` 的「Supabase Storage 部署」章节。

## 后续可扩展

若要让手机、电脑看到同一份 CMS 内容，可将 `localStorage` / `IndexedDB` 迁移到：

- **Supabase Database**：站点文字配置、商品列表
- **Supabase Storage**：用户上传的图片、视频

前端仍保持静态页面，通过 `@supabase/supabase-js` 读写云端数据。
