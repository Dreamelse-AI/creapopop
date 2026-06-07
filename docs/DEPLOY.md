# creapopop 部署说明

> 复用 newcreation 同款部署方案（Docker + GitHub Actions + Traefik）。
> 当前部署到与 newcreation 相同的服务器，后续迁移到海外服务器时只需改 Secrets。

## 一、与 newcreation 的隔离

| 项 | newcreation | creapopop |
|---|---|---|
| 容器名 | newcreation | creapopop |
| 宿主机端口 | 9527 | **9528**（避免冲突，容器内仍是 9527） |
| 子域 | newcreation.imaginewithu.com | **creapopop.imaginewithu.com** |
| 部署路径 | (其 DEPLOY_PATH) | 独立 DEPLOY_PATH，不可与 newcreation 相同 |

## 二、首次部署前置（只需做一次）

### 1. GitHub 仓库配置 Secrets

仓库 → Settings → Secrets and variables → Actions，新增：

| Secret | 值 | 说明 |
|---|---|---|
| `DEPLOY_SSH_KEY` | 服务器 SSH 私钥 | 与 newcreation 同台可复用同一把 |
| `DEPLOY_HOST` | 服务器 IP/域名 | |
| `DEPLOY_USER` | SSH 用户名 | |
| `DEPLOY_PATH` | 如 `/opt/creapopop` | **不可与 newcreation 路径相同** |

### 2. 服务器上手动放置密钥（不经 CI，不入库）

```bash
ssh <user>@<host>
mkdir -p /opt/creapopop/secrets
# 上传 .env（含 APIMART_API_KEY 等，参考 .env.example）
vim /opt/creapopop/.env
# 上传 Gemini service account
vim /opt/creapopop/secrets/service-account.json
```

`.env` 关键项：
```
PORT=9527
APIMART_API_KEY=<真实值>
APIMART_API_BASE=https://api.apimart.ai
GOOGLE_APPLICATION_CREDENTIALS=./secrets/service-account.json
AIGC_TARGET=<TTS 地址>
```

### 3. Traefik 网络

服务器需已有名为 `web` 的 external docker network（newcreation 已在用，同台无需新建）。
DNS 把 `creapopop.imaginewithu.com` 解析到该服务器。

## 三、日常部署

```bash
git push origin main   # 命中 paths 白名单即自动触发 Actions
```

Actions 自动：rsync 代码 → `docker compose build` → `up -d` → `curl /health` 验证。

## 四、推了没生效？排查

1. 看 Actions run：`https://github.com/Dreamelse-AI/creapopop/actions`
2. 确认改的文件在 `paths` 白名单内
3. 服务器 `.env` / `secrets/` 是否就位（CI 不传这俩）
4. `docker logs creapopop --tail 50`

## 五、验证在线生成

部署成功后访问 `https://creapopop.imaginewithu.com`：
- 登录（邮箱 + 123456）→ 新建角色 → 形象页 AI 生图
- 若服务器网络能访问 APIMart，则可正常出图（本地访问不到是网络问题，非代码问题）
