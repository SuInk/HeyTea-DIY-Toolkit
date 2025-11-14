# HeyTea Cup Sticker

Vue 3 + TypeScript + Element Plus + Tailwind CSS + Node.js 代理，实现喜茶杯贴上传工具，逻辑参考 [FuQuan233/HeyTea_AutoUpload](https://github.com/FuQuan233/HeyTea_AutoUpload)。

## 功能概览

- 手机号短信登录（Node 端转发喜茶接口）
- Token 快速登录与本地记忆
- 596×832 画布自动缩放、裁切、灰度、强制 PNG、自动压缩至 ≤ 200KB
- 处理结果预览、下载、重复上传提醒
- Node 代理直连官方 API：验证码、登录、用户信息、杯贴上传，并可托管前端静态文件

## 本地开发

```bash
# 1. 安装依赖（会自动安装 server/frontend）
npm install

# 2. 启动开发环境（代理 + Vite）
npm run dev
# 访问 http://localhost:5173
```

## 本地生产运行

```bash
npm run build   # 构建前端 dist
npm start       # Express 读取 dist 并提供 /api/*
# 访问 http://localhost:8787
```

## Vercel 部署（静态 + API 一体）

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FSuInk%2Fheytea-picture&project-name=heytea-cup&repository-name=heytea-cup&build-command=npm%20run%20frontend%3Abuild&install-command=npm%20install&output-directory=frontend%2Fdist)

仓库根目录包含 `api/sms/send.js`、`api/login/sms.js`、`api/user.js`、`api/upload.js` 等 Serverless 端点（内部都复用 `server/app.js`），Vercel 会为每个端点生成函数，前端可直接访问同源 `/api/*`。


## 目录结构

```
frontend/  # Vite + Vue3 前端
server/    # Express 代理层
```

开发环境下，`frontend/.env.development` 默认指向 `http://localhost:8787`。如需自定义，修改该文件或通过环境变量覆盖 `VITE_API_BASE`。
