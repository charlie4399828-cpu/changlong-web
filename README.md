# 昌隆茶舍 — 官方网站

新中式 + 宋氏美学风格的茶叶店响应式官网，适配电脑端、平板与手机 H5。

## 功能特性

- **全端响应式**：自动适配桌面、平板、手机，无错位溢出
- **宋氏美学设计**：米白、青釉、淡墨配色，大量留白，简约国风
- **高级动态交互**：滚动渐入、悬浮动效、轮播淡转、页面过渡动画
- **三大导航模块**：店铺信息、产品信息、联系方式
- **全屏轮播图**：支持自动/手动切换、触摸滑动
- **产品分类展示**：当季新品、热销商品、全部商品
- **商品详情页**：点击卡片跳转，流畅过渡
- **国风电子名片**：店主信息、电话、微信、二维码

## 内容管理（编辑后台）

访问 `admin.html` 或首页页脚「内容管理」，可在线编辑：

- **轮播图**：文字、渐变色 / 图片 / 视频背景
- **店铺介绍**：图文、视频、数据卡片
- **产品管理**：增删改商品，上传图片/视频
- **联系方式**：名片信息、头像、微信二维码
- **站点设置**：店名、Logo
- **备份恢复**：导出/导入 JSON

数据保存在浏览器本地（localStorage + IndexedDB），上传的图片/视频存储在本机，换浏览器需重新上传。

## 快速开始

直接用浏览器打开 `index.html`，或使用本地服务器：

```bash
# Python
python -m http.server 8080

# Node.js
npx serve .
```

访问 `http://localhost:8080`

## 云端部署（GitHub Pages · 国内免 VPN）

与 `person_web` 相同：**GitHub Pages** 托管静态站点，国内一般可直接访问。

**完整步骤见 [DEPLOY.md](./DEPLOY.md)**

```powershell
cd D:\Code\ChangLong-web
git add .
git commit -m "更新站点"
git push
```

线上地址：**https://charlie4399828-cpu.github.io/changlong-web/**

首次部署需在 GitHub 创建仓库 `changlong-web` 并开启 Settings → Pages（`main` 分支）。

### 部署后访问

| 页面 | 路径 |
|------|------|
| 首页 | `/index.html` 或 `/` |
| 商品详情 | `/product.html?id=商品ID` |
| 管理后台 | `/admin.html` |

### 内容管理说明

后台 CMS 数据保存在**各设备浏览器的 localStorage / IndexedDB** 中，不会自动跨设备同步。

- 其他设备打开的是同一套网站，但后台内容需单独导入
- 换设备前：`admin.html` → **备份恢复** → **导出 JSON**
- 新设备上：**导入 JSON** 即可恢复配置与文字（图片若存在本机 IndexedDB，需在同一浏览器重新上传或保留原设备）

## 项目结构

```
ChangLong-web/
├── index.html          # 首页
├── product.html        # 商品详情页
├── css/
│   ├── variables.css   # 设计变量
│   ├── animations.css  # 动画效果
│   └── style.css       # 主样式
├── js/
│   ├── products.js     # 商品数据
│   ├── main.js         # 首页逻辑
│   └── product-detail.js # 详情页逻辑
└── assets/
    └── qr-code.svg     # 微信二维码占位图
```

## 自定义配置

### 轮播图

在 `index.html` 中修改 `.carousel-slide` 内容，调整 `data-interval` 改变自动轮播间隔（毫秒）。

### 商品数据

编辑 `js/products.js` 中的 `PRODUCTS` 对象，按分类添加/修改商品。

### 联系方式

在 `index.html` 联系方式区块修改店主信息、电话、微信号，替换 `assets/qr-code.svg` 为真实微信二维码。

### 店铺介绍

修改 `index.html` 中 `.about-content` 区域的文字与图片。

## 技术栈

- 纯 HTML / CSS / JavaScript
- 无构建依赖，开箱即用
- Google Fonts（Noto Serif SC / Noto Sans SC）
- Intersection Observer 滚动动画
- CSS 自定义属性 + Flexbox / Grid 布局
