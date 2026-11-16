# 来源与实现说明

## 上游项目

- SuInk/HeyTea-DIY-Toolkit：本仓库 fork 来源，保留完整提交历史、LICENSE 和原作者版权。
- FuQuan233/HeyTea_AutoUpload：原 README 标注的接口思路参考，继续保留归属。

## 安全传输与签名互操作参考

阅读版本：DiheMoe/heyteago-diy 提交 `25a56c4b5ebd9fb6da58b65198ee3fc2b288e7b4`。

- [secure.go](https://github.com/DiheMoe/heyteago-diy/blob/25a56c4b5ebd9fb6da58b65198ee3fc2b288e7b4/internal/adapter/appsecure/secure.go)：安全传输头、公开握手、P-256/HMAC/AES-GCM 流程、信封字段与服务端公钥。
- [login.go](https://github.com/DiheMoe/heyteago-diy/blob/25a56c4b5ebd9fb6da58b65198ee3fc2b288e7b4/internal/adapter/heyteaapi/login.go)：登录请求形状、版本标识、签名头及安全会话票据 Cookie。
- [signer.go](https://github.com/DiheMoe/heyteago-diy/blob/25a56c4b5ebd9fb6da58b65198ee3fc2b288e7b4/internal/adapter/appsign/signer.go)：公开实现中的客户端签名算法和内置常量。
- [client.go](https://github.com/DiheMoe/heyteago-diy/blob/25a56c4b5ebd9fb6da58b65198ee3fc2b288e7b4/internal/adapter/heyteaapi/client.go)：上传字段及版本标识。

本分支 `server/secureTransport.js` 在阅读上述资料后以 Node.js 标准 crypto 接口重新编写，未逐行移植 Go 函数或复制其测试。协议常量与算法信息确实来源于该实现，因此不声称 clean-room 或完全独立研究。没有做逐段法律相似性判断。参考仓库当时未发现 LICENSE；本仓库的 MIT 许可不代表取得对该仓库代码的再许可，也不代表第三方认可。

独立验证范围：仅向官方公开 tenant-config 和 handshake 端点做无账户请求；未用用户凭证验证或抓取官方客户端流量。完整短信、登录和上传兼容性仍需正常使用验证，遇到验证或限制不应绕过。

## UI 与依赖

交互使用 Reka UI（MIT），字体使用系统字体；界面样式在本分支编写。未复制喜茶官方 App 的商标插画或截图作为界面素材。官方服务名称用于说明兼容对象，并非官方背书。
