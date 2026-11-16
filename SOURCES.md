# 参考资料

- [SuInk/HeyTea-DIY-Toolkit](https://github.com/SuInk/HeyTea-DIY-Toolkit)：本项目的 fork 来源。
- [FuQuan233/HeyTea_AutoUpload](https://github.com/FuQuan233/HeyTea_AutoUpload)：接口思路。
- [DiheMoe/heyteago-diy](https://github.com/DiheMoe/heyteago-diy/tree/25a56c4b5ebd9fb6da58b65198ee3fc2b288e7b4)：安全传输与签名协议参考，使用 Node.js crypto 实现。

## 协议参考文件

参考版本：`25a56c4b5ebd9fb6da58b65198ee3fc2b288e7b4`。

- [secure.go](https://github.com/DiheMoe/heyteago-diy/blob/25a56c4b5ebd9fb6da58b65198ee3fc2b288e7b4/internal/adapter/appsecure/secure.go)：握手、加密流程与报文字段。
- [login.go](https://github.com/DiheMoe/heyteago-diy/blob/25a56c4b5ebd9fb6da58b65198ee3fc2b288e7b4/internal/adapter/heyteaapi/login.go)：登录请求与会话字段。
- [signer.go](https://github.com/DiheMoe/heyteago-diy/blob/25a56c4b5ebd9fb6da58b65198ee3fc2b288e7b4/internal/adapter/appsign/signer.go)：客户端签名算法与常量。
- [client.go](https://github.com/DiheMoe/heyteago-diy/blob/25a56c4b5ebd9fb6da58b65198ee3fc2b288e7b4/internal/adapter/heyteaapi/client.go)：上传字段与版本标识。
