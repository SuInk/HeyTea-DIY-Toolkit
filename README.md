# 喜茶杯贴工作台

基于 [SuInk/HeyTea-DIY-Toolkit](https://github.com/SuInk/HeyTea-DIY-Toolkit) 的本机使用分支。保留上游 Git 历史、MIT 许可证及 `Copyright (c) 2025 SuInk`。本分支由 [frozenbunexe](https://github.com/frozenbunexe) 维护，不代表原作者或喜茶官方。

Vue 3 + TypeScript + Reka UI + Node.js。支持图片预览、黑白/点阵/原图处理、596×832 适配、200KB 内压缩、下载及登录后上传。图片处理无需登录；上传与登录由本机 Node 服务直接请求喜茶。

## 本机运行

建议使用 Node.js 24，在仓库根目录执行：

```sh
npm ci --ignore-scripts --registry=https://registry.npmjs.org
npm run build
HOST=127.0.0.1 PORT=8787 npm run server:start
```

访问 <http://127.0.0.1:8787>。开发使用 `npm run dev`，测试使用 `npm run test:local`。以根目录 workspace 锁文件为准；历史遗留嵌套锁文件不用于此工作流。

**此分支默认仅支持本机运行。** 后端和开发服务器限制回环地址与同源请求，前端固定同源 API。上游 Vercel 示例文件保留用于历史参考，但本分支没有验证公网托管，也不提供一键公网部署。不要直接去除访问限制后公开部署。

## 隐私与操作边界

- 图片选择、处理及下载在浏览器完成；仅点击上传时发送给喜茶。
- 登录会向喜茶发送手机号和验证码；需要人机验证时加载腾讯验证码组件。
- Token 仅存当前页面内存，不写入 localStorage；刷新会清除登录和编辑状态，请先下载图片。
- 不记录手机号、验证码、Token 或上游响应正文；固定官方地址、禁止重定向、限制请求时间与大小。
- 不自动发送短信、不自动重试上传，不绕过验证码、账户验证、内容审核或官方访问限制。
- 网络中断时结果可能未确认，请先查看短信或喜茶端结果，不要连续提交。

## 协议来源与归属

原项目说明其接口思路参考 [FuQuan233/HeyTea_AutoUpload](https://github.com/FuQuan233/HeyTea_AutoUpload)，本分支保留这一归属。

本分支参考 [DiheMoe/heyteago-diy 的公开协议研究](https://github.com/DiheMoe/heyteago-diy/tree/25a56c4b5ebd9fb6da58b65198ee3fc2b288e7b4)，使用 Node.js `crypto` 重新实现安全传输与客户端签名适配。参考范围包括协议字段、算法流程、版本标识及公开代码中的客户端常量，详见 [SOURCES.md](SOURCES.md)。这不是独立抓包研究，也不声称 clean-room 实现；未逐行复制/翻译其 Go 函数或测试。参考项目当时未声明许可证，引用不表示获得其代码许可或作者背书，亦不将该项目重新许可为 MIT。

## 验证与限制

- 构建和本机回归测试通过，覆盖输入限制、同源策略、加密报文解析、并发状态、验证码组件失败恢复。
- 公开配置及无账户数据的握手验证成功；自动化测试不发送真实短信、不登录、不上传图片。
- 前端用独立浏览器和合成图片检查导入、三种处理模式、滑块、下载、键盘弹窗及桌面/窄屏布局。
- 依赖审计在维护时未报告已知漏洞，不代表零风险；喜茶私有接口可能随时变化，握手成功不代表完整业务流程始终可用。

## 许可

项目沿用 [MIT](LICENSE)，原作者版权原样保留。依赖分别受各自许可证约束，参见 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md)。项目标识、喜茶服务及第三方 SDK 不属于本项目的授权范围。本工具不是喜茶官方产品。
