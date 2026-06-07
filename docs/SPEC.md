# POPOP 创作页 — 规格与技术方案（评审稿 v0.2）

> 状态：评审中。本文件是创作页这一期的需求规格 + 技术方案，也是后续与专业后端联调的契约草案。
> 范围：创作页全部 9 块能力（账号 / 草稿箱 / 表单 / AI生图 / 音色 / 介绍页美化 / 预览 / 动态 / 发布）。

## 0. 关键决策（已与产品对齐）

| # | 决策 | 说明 |
|---|---|---|
| 账号 | creapopop 独立 | 邮箱+密码登录，密码 mock `123456`；所有数据按 email 隔离；预留验证码扩展 |
| 存储 | PG 表 | 参考 newcreation `creation_projects`（payload JSONB + user 隔离 + 软删）；地址走环境变量，联调时切 Arca |
| 三类模型 | 复用 newcreation | 生图=APIMart images；通用聊天=Ark/OpenRouter；代码模型=APIMart Claude Messages |
| 介绍页渲染 | iframe 沙箱 | Claude 生成的 HTML 放隔离 iframe，防注入；与 newcreation `CharacterShowcaseSheet` 一致 |
| 审核 | mock | 提交即过，留审核钩子 |
| 音乐/音色库 | mock 数据 | 角色形象库=用户上传图片的虚拟集合，可复用到动态 |
| 自动保存 | 防抖 | 停止输入 1-2s 后存全量角色信息 |

## 1. 产品架构（模块树）

```
创作页 (creapopop)
├── 账号           登录(邮箱+密码 mock 123456) / 退出 / 按 email 隔离数据
├── 角色管理
│   ├── 创作空态    无角色时引导新建
│   ├── 草稿箱      新建 / 编辑 / 发布 / 删除(二次确认)
│   └── 已发布      查看详情 / 编辑(改完回草稿重新发布) / 发布动态 / 删除
│
├── 新建/编辑角色表单 ★核心（三栏 + 两个并列能力）
│   ├── 左侧:快捷导航
│   ├── 中间:表单填写区
│   │   ├── ① 基本信息(必填)
│   │   ├── ② 角色形象(必填)
│   │   ├── ③ 更多细节(选填)
│   │   ├── ④ 开场白(多条)
│   │   └── ⑤ 介绍页UI美化(模版 + Claude agent 对话 + 选择展示内容)
│   ├── 右侧:悬浮预览面板  ← 基于角色信息+模板 实时展示/生成(介绍页/聊天页/动态页)
│   └── 实时自动保存       ← 保存角色全部信息(与预览面板并列，互不从属)
│
├── 角色动态        新建动态(图+音乐+文本) / 历史动态(编辑·删除)
└── 发布审核        提交即过(mock)，留审核钩子
```



## 2. 数据模型

```typescript
interface Character {
  id: string
  ownerEmail: string                 // 数据隔离维度
  status: 'draft' | 'reviewing' | 'published'

  // ① 基本信息
  name: string                       // ≤8字
  tags: string[]                     // 预设36个+自建，≤3选中
  species: 'human'|'elf'|'beast'|'animal'|'other'
  gender: 'male'|'female'|'unknown'
  voiceId: string | null             // 音色(mock库)
  intro: string                      // ≤200字
  personality: string                // ≤200字
  visibility: 'private'|'public'     // 默认 private
  anonymousTags: string[]            // 匿名身份标签，≤3

  // ② 形象（上传图集 = 虚拟形象库，复用到动态）
  images: { id: string; url: string; source: 'upload'|'ai' }[]  // ≤9
  primaryImageId: string | null

  // ③ 更多细节
  details: Record<string, string>    // 16类字段+愿望清单+自定义条目

  // ④ 开场白
  greetings: string[]

  // ⑤ 介绍页
  introPage: {
    template: 'none'|'tpl1'|'tpl2'
    customHtml?: string              // Claude 生成，iframe 沙箱渲染
    visibleSections: string[]        // 基础信息/形象(锁定) + 更多细节/开场白(可选)
  }

  // 动态
  dynamics: {
    id: string
    text: string
    images: string[]                 // 复用 images 或新上传
    musicId: string | null           // mock 音乐库
    createdAt: number
  }[]

  createdAt: number
  updatedAt: number
}
```

预设标签常量（36个）：心机/坏男人/傲娇/专情/反差萌/能干/财阀/执着/追妻火葬场/非人类/傲慢/温柔/偶像·名人/双重生活/油嘴滑舌/年下/冷酷/大叔·年上你/外国人·混血/直接/冷淡/三角恋/契约婚姻/身份差距/单恋/禁忌之恋/一夜情缘/破镜重圆/初恋/职场恋爱/青梅竹马/爱恨交织·厌恶关系/权力关系/命定之恋/师徒关系/恋人关系。



## 3. API 契约（临时后端，联调时对齐 Arca）

所有接口走临时 Node 后端（端口 9527），前端只调本后端，模型 key 全在后端。
鉴权：登录返回 token，后续请求带 `Authorization: Bearer <token>`，后端解析出 email 做隔离。

```
# 账号（creapopop 独立）
POST /api/auth/login      { email, password }        → { token, email }
POST /api/auth/logout     {}                          → { success }

# 角色 CRUD（按 email 隔离，PG creapopop_characters 表）
POST /api/character/save  { id?, ...Character }        → { success, character }
GET  /api/character/list  ?status=draft|published      → { characters: [...] }
GET  /api/character/get   ?id=                         → { character }
POST /api/character/delete{ id }                        → { success }    // 软删
POST /api/character/publish{ id }                       → { success }    // mock审核即过

# AI 能力（代理三类模型）
POST /api/ai/image        { prompt, ... }              → 复用 apimart images
POST /api/ai/chat         { messages }                 → 复用 Ark/OpenRouter（试聊）
POST /api/ai/intro-page   { messages }                 → 复用 apimart Claude /v1/messages（介绍页HTML）

# Mock 数据
GET  /api/mock/voices                                  → 音色库
GET  /api/mock/music                                   → 音乐库
```

PG 表（参考 newcreation `creation_projects`）：
```sql
CREATE TABLE creapopop_characters (
  id          TEXT PRIMARY KEY,
  owner_email TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'draft',
  name        TEXT NOT NULL DEFAULT '',
  payload     JSONB NOT NULL DEFAULT '{}',   -- 全量 Character
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);
CREATE INDEX idx_creapopop_owner_status
  ON creapopop_characters(owner_email, status, updated_at DESC)
  WHERE deleted_at IS NULL;
```



## 4. 六类场景关键点

- **空态**：创作空态画板(1836:45348)引导新建；图库为空引导上传/生图；草稿箱/已发布为空
- **加载态**：AI生图/介绍页生成 >3s，进度提示 + 防重复点击；自动保存静默指示
- **错误态**：生图/生成/发布失败，区分网络错误 vs 业务错误，可重试；非 `Something went wrong`
- **边界**：名字8字/标签3个/简介性格200字/图片9张 的截断与提示；超长文本溢出；连点防抖
- **权限**：未登录拦截→登录后回原页；私密/公开可见性
- **网络恢复**：自动保存断网重试；刷新/重进草稿不丢（后端持久化兜底）

## 5. 技术方案

| 决策点 | 选型 | 理由 |
|---|---|---|
| 前端框架 | React 19 + TS + Vite | 对齐 newcreation，能力可直接搬 |
| 状态管理 | Zustand | 表单状态多、跨组件共享；对齐旧项目 |
| 数据请求 | React Query | 缓存/重试/loading 态开箱即用 |
| 样式 | Tailwind v4 | 对齐旧项目 |
| 后端 | Node 原生 http | 轻量、零框架，对齐旧项目 server/ 结构 |
| 持久化 | PG（payload JSONB） | 参考 `creation_projects` |
| 鉴权 | 自建邮箱+密码(mock) | creapopop 独立，不复用 Arca 鉴权 |
| 介绍页渲染 | iframe sandbox | 防 AI 生成 HTML 的注入风险 |
| 部署 | Docker + GitHub Actions → 新子域 | 对齐旧项目，新子域待定 |

复用 newcreation 的具体文件：
- 生图：`src/services/apimartImageProvider.ts` + `server/routes/apimart.cjs#handleImageGen`
- 通用聊天：`src/services/llm.ts` + `server/routes/llmProxy.cjs`
- 代码模型：`server/routes/apimart.cjs#handleMessages`（Claude，x-api-key）
- 介绍页 iframe 渲染：参考 `src/components/character/CharacterShowcaseSheet.tsx`
- 后端结构：`server.cjs` + `server/{config,utils,services,routes}`

## 6. 实现批次（9块全做，分三批降风险）

| 批次 | 内容 | 可验证产出 |
|---|---|---|
| P0 主干闭环 | 工程脚手架 + 后端骨架 + 账号登录 + 草稿箱/空态 + 表单①②③④ + 防抖自动保存 + 右侧预览(静态介绍页) | 建角色→存草稿→刷新仍在→看预览 |
| P1 AI 接入 | AI生图 + 音色TTS + 聊天页试聊 + 介绍页美化(Claude) | 三类模型跑通，创作体验完整 |
| P2 发布与扩展 | 发布/mock审核/已发布/编辑回草稿 + 角色动态 | 完整生命周期闭环 |

## 7. 待确认/联调遗留

1. 角色介绍页 HTML 的具体 prompt 与模板，P1 实现时细化（参考旧项目 Claude 调用）
2. Arca 正式的角色/草稿表接口与字段，联调时对齐替换临时后端
3. 新部署子域名 + 服务器信息（你后续提供）
4. 音色/音乐 mock 数据的具体内容（可由我先造一批占位）
5. 邮箱验证码登录（后续迭代）

