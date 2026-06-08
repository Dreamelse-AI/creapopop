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
GOOGLE_API_PROXY=<香港 NLB 代理地址>   # 关键：国内服务器经此代理访问海外 AI 服务
AIGC_TARGET=<TTS 地址>
TOKEN_SECRET=<随机串>                  # 登录 token 签名密钥
```

> ⚠️ **国内服务器必须配 `GOOGLE_API_PROXY`**：本服务器在国内，直连 `api.apimart.ai`（生图/Claude）和 Gemini 海外域名都会超时。
> 后端代码会让 APIMart 与 Gemini 请求统一走这个代理。值与 newcreation 的 `GOOGLE_API_PROXY` 相同。

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

## 六、踩坑记录（首次部署排错经验）

### 1. AI 全部超时 / 生图提交无响应
**现象**：生图、Claude 介绍页、Gemini 试聊全部超时或报错。
**根因**：国内服务器直连海外 AI 域名（`api.apimart.ai`、Gemini）被墙超时。
**解决**：`.env` 配 `GOOGLE_API_PROXY`（香港 NLB 代理），后端会让 APIMart/Gemini 请求都走它。
注意后端读取的环境变量名是 `GOOGLE_API_PROXY`（兼容旧名 `NLB_PROXY_URL`），别写错。

### 2. Docker 构建失败 `pnpm install` 退出码 1
**根因**：① Dockerfile 用 `pnpm@latest` 拉到 11.x，与本地 10.x 的 lockfile 冲突；
② pnpm 10+ 把 esbuild 的 build script 当错误退出（`ERR_PNPM_IGNORED_BUILDS`）。
**解决**：`package.json` 用 `packageManager: "pnpm@10.33.0"` 锁版本，Dockerfile 用 `corepack prepare --activate`（读该字段）并设 `ENV CI=true`。

### 3. 登录报「邮箱或密码错误」/ 生图查询 404
**根因**：共享网关上 Traefik dashboard 注册了无 Host 限制的路由
`PathPrefix(`/api`) || PathPrefix(`/dashboard`)`，会拦截**所有域名**下的 `/api` 请求。
本服务器为团队共享（30+ 服务），不能擅自改公共 traefik。
**解决**：给本服务路由显式设 `traefik.http.routers.creapopop.priority=1000`，
让 `Host(...)` 规则优先级高于 dashboard 的 `/api`。这是 Traefik 官方的标准优先级机制。
> 注：主站与 newcreation 同样存在该 `/api` 拦截隐患，只是未显式处理。

### 4. CI 部署 rsync `Permission denied`
**根因**：手动在部署目录跑过容器（root 身份），残留 `node_modules`/`.pnpm-store` 等 root 文件，
rsync 以普通用户 `--delete` 时无权删除。
**解决**：`sudo rm -rf <DEPLOY_PATH>/{node_modules,dist,.pnpm-store}`，保留 `.env`/`secrets`/`.data`。

## 七、数据存储说明

- 当前为 **本地 JSON 文件模式**（未配 PG），数据存于 Docker 数据卷 `creapopop_creapopop-data`（`/app/.data/characters.json`）。
- 数据按 `ownerEmail` 隔离，**重启/重新部署不丢**（卷独立于容器）。
- 本地开发数据与线上完全隔离，互不同步。
- 配置 `PG_*` 环境变量后会自动切换到 PostgreSQL（见 `server/services/store.cjs`）。
