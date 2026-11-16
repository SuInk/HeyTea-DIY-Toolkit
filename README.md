# 喜茶杯贴工作台 / HeyTea Sticker Studio

在浏览器中制作自定义喜茶杯贴，支持图片处理、预览、下载和登录上传。

## 功能

- 黑白、点阵和原图三种处理模式
- 596 × 832 杯贴尺寸适配，压缩至 200 KB 以内
- 实时预览、参数调节与图片下载
- 手机验证码登录及杯贴上传

使用 Vue 3、TypeScript、Reka UI 和 Node.js。

## 本机运行

建议使用 Node.js 24，在仓库根目录执行：

```sh
npm ci --ignore-scripts --registry=https://registry.npmjs.org
npm run build
HOST=127.0.0.1 PORT=8787 npm run server:start
```

访问 <http://127.0.0.1:8787>。

- 开发：`npm run dev`
- 测试：`npm run test:local`

默认仅支持本机运行，API 使用同源地址。公网及 Vercel 部署尚未适配。

## 使用说明

图片处理和下载在浏览器完成，无需登录。登录与上传由本机服务连接喜茶；人机验证使用腾讯验证码组件。

登录状态仅保留在当前页面，刷新前请先下载编辑好的图片。

## 致谢

- [SuInk/HeyTea-DIY-Toolkit](https://github.com/SuInk/HeyTea-DIY-Toolkit)：原项目
- [FuQuan233/HeyTea_AutoUpload](https://github.com/FuQuan233/HeyTea_AutoUpload)：接口思路
- [DiheMoe/heyteago-diy](https://github.com/DiheMoe/heyteago-diy)：协议研究

参考文件见 [SOURCES.md](SOURCES.md)。

## 许可

[MIT](LICENSE) · Copyright (c) 2025 SuInk

第三方依赖见 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)。
