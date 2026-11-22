# 圣诞 H5 信件后台

零依赖 Node 服务，负责跨设备保存 / 取阅祝福信。

## 接口说明

| 方法 | 路径 | 说明 | 入参 / 返回 |
|---|---|---|---|
| POST | `/api/letters` | 封存一封信 | 入参 `{ "password": "4-12位密码", "message": "祝福内容" }` |
| GET | `/api/letters/:password` | 凭密码取信 | 存在返回 `{ "message": "..." }`，不存在返回 404 |
| GET | `/api/health` | 健康检查 | `{ "ok": true }` |

数据保存在服务端 `data/letters.json`，不依赖浏览器本地存储，换手机 / 换设备扫码都能取到。

## 本地运行

```bash
cd backend
npm start
# 默认 http://localhost:3000 ，端口可用环境变量 PORT 覆盖
```

## 当前临时公网隧道（本机托管）

- 后台地址：`https://tries-cornell-resulting-dubai.trycloudflare.com`
- 该地址已回填到 H5 顶部 `API_BASE`，H5 重新发布后即走此后台存取信件。
- 重启步骤：先启动 `node server.js`，再运行
  `tools\extract\cloudflared\cloudflared.exe tunnel --url http://localhost:3000 --no-autoupdate`；
  隧道日志里会打印新的 `https://xxxx.trycloudflare.com`，若地址变了，需把新地址更新进 H5 的 `API_BASE` 并重新发布。
- **临时隧道限制**：本机关机 / 断网 / 进程退出后隧道失效；快速隧道域名每次重启都会变，不保证长期可用。正式售卖请改用下面的常驻托管方式。

## 部署到公网（让微信扫码能访问）

任选一种 Node 托管方式：

### 方式一：Render（免费额度）
1. 把 `backend` 文件夹推送到一个 GitHub 仓库；
2. 打开 [Render](https://render.com) → New → Web Service → 选中该仓库；
3. Runtime 选 `Node`，Start Command 填 `node server.js`，Build Command 留空；
4. 部署完成后拿到类似 `https://xxx.onrender.com` 的地址；
5. 打开 H5 源码，把该地址填到顶部 `const API_BASE = "https://xxx.onrender.com";`，重新发布即可。

### 方式二：自己的云服务器 / Railway
- 安装 Node 18+，上传 `backend` 目录，执行 `npm start`；
- 反向代理到 80 / 443 端口；`PORT` 环境变量可指定监听端口。

## 注意事项

- Render 免费实例长时间无访问会休眠，首次打开会有几秒冷启动；
- 信件内容以明文存在服务端数据库，适合普通节日祝福场景；不要在密码里使用重要账号密码；
- 同一密码重复写信会覆盖原内容。
