# AI PhD Application Assistant

一个面向 PhD 申请场景的「导师检索 + 匹配评分 + 套磁邮件 + 跟进管理」助手。

当前版本已包含：
- 导师检索与信息抽取（Discover）
- 匹配评分（Match Score）
- 邮件生成（首封 + Follow-up #1/#2）
- 申请管道看板（Dashboard）
- 导师详情页与历史邮件线程
- Supabase 持久化（可选）
- 到期跟进提醒接口

---

## 目录

- [1. 核心功能](#1-核心功能)
- [2. 技术栈](#2-技术栈)
- [3. 快速启动（本地开发）](#3-快速启动本地开发)
- [4. 环境变量说明](#4-环境变量说明)
- [5. Supabase 配置（强烈建议）](#5-supabase-配置强烈建议)
- [6. 页面与 API 一览](#6-页面与-api-一览)
- [7. CSV 批量导入格式](#7-csv-批量导入格式)
- [8. 推荐工作流](#8-推荐工作流)
- [9. Reminder 自动提醒接入](#9-reminder-自动提醒接入)
- [10. 常见问题（FAQ）](#10-常见问题faq)
- [11. 分支与协作建议](#11-分支与协作建议)

---

## 1. 核心功能

### 1) Discover：导师检索
- 输入研究关键词（例如：`NLP UK PhD supervisor`）
- 支持模板选项（研究方向、地区）和快捷查询
- 抓取网页并用 LLM 抽取候选导师结构化信息

### 2) Match Score：个性化匹配
- 根据你的背景（项目、方法、成果）与目标项目
- 输出：
  - 总分（0-100）
  - 匹配优势（Strengths）
  - 潜在短板（Gaps）
  - 推荐切入角度（Suggested Angle）
  - 下一步行动（Next Actions）

### 3) Compose：首封套磁邮件
- 生成高个性化首封邮件
- 保存后自动进入 Dashboard / Lead 管理

### 4) Follow-up 自动生成
- 在导师详情页可一键生成 Follow-up #1 / #2
- 结合当前状态（sent/replied 等）调整语气
- 自动更新下一次跟进时间

### 5) Dashboard：申请管道
- 状态流转：`draft / sent / replied / interview / offer / rejected`
- 漏斗统计：回复率、offer率
- 到期跟进提醒（根据 `nextFollowUpAt`）

---

## 2. 技术栈

- **Frontend / Backend**: Next.js App Router
- **Language**: TypeScript
- **LLM**: OpenAI API（你已确认可用）
- **Storage**:
  - 默认：localStorage（本地）
  - 推荐：Supabase（持久化）
- **Validation**: Zod

---

## 3. 快速启动（本地开发）

```bash
# 1) 安装依赖
npm install

# 2) 启动开发环境
npm run dev

# 3) 打开
# http://localhost:3000
```

生产构建测试：

```bash
npm run build
npm run start
```

---

## 4. 环境变量说明

在项目根目录创建 `.env.local`：

```env
# LLM（至少填一个 key）
OPENAI_API_KEY=your_openai_key
LLM_API_KEY=
LLM_BASE_URL=
LLM_MODEL=gpt-4o-mini

# 搜索增强（可选）
BRAVE_SEARCH_API_KEY=

# Supabase（推荐）
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

说明：
- `OPENAI_API_KEY`：用于导师抽取、匹配评分、邮件生成
- `BRAVE_SEARCH_API_KEY`：可选，开启后检索质量通常更好
- `SUPABASE_*`：用于跨设备/长期持久化（推荐生产必开）

---

## 5. Supabase 配置（强烈建议）

### 步骤 1：创建项目
在 Supabase 控制台创建新项目。

### 步骤 2：执行建表 SQL
将 `supabase.sql` 内容复制到 Supabase SQL Editor 执行。

### 步骤 3：配置环境变量
将 `SUPABASE_URL` 和 `SUPABASE_SERVICE_ROLE_KEY` 写入 `.env.local`。

### 步骤 4：重启服务
```bash
npm run dev
```

### 可选：RLS
- 文件：`supabase_rls.sql`
- 用于后续多用户付费版隔离（需要接入 Supabase Auth 后启用）

---

## 6. 页面与 API 一览

### 页面
- `/`：Compose（首封邮件）
- `/discover`：导师检索 + 匹配评分 + CSV导入
- `/dashboard`：全局看板 + 统计 + 到期提醒
- `/professor/[id]`：导师详情 + 邮件线程 + Follow-up

### API
- `POST /api/discover/search`：检索导师
- `POST /api/match/score`：匹配评分
- `POST /api/email/generate`：首封邮件生成
- `POST /api/email/followup`：跟进邮件生成
- `GET/POST /api/leads`：Lead 查询/保存
- `GET/PATCH /api/leads/[id]`：单 Lead 查询/更新
- `POST /api/leads/[id]/emails`：追加邮件线程
- `GET /api/reminders/due`：获取已到期跟进

---

## 7. CSV 批量导入格式

在 Discover 页面点击 **Import CSV**。

支持列名（尽量使用下列之一）：
- `name` / `professor` / `professorname`
- `school` / `university`
- `department` / `dept`
- `url` / `homepage` / `link`
- `researchSummary` / `summary` / `research` / `interests`
- `keywords` / `tags`（多个关键词用 `;` 分隔）

最少要求：
- `name`
- `researchSummary`

示例：

```csv
name,school,department,url,researchSummary,keywords
Prof A,University X,Computer Science,https://example.com,"Works on LLM alignment and safety",LLM;alignment;safety
Prof B,University Y,AI Institute,https://example.org,"Focuses on medical vision-language models",medical ai;vision-language
```

---

## 8. 推荐工作流

1. 在 Discover 输入研究方向，检索导师
2. 对候选导师点击 Score Match
3. 保存最优候选到 Lead
4. 在 Compose 生成首封邮件并保存
5. 在 Dashboard 管理状态
6. 在 Professor 详情页生成 Follow-up
7. 根据 Reminder 到期提示持续跟进

---

## 9. Reminder 自动提醒接入

你可以用 OpenClaw cron 或任意定时器每 30~60 分钟请求：

```http
GET /api/reminders/due
```

当返回 `due.length > 0` 时，推送到 Telegram / 邮件 / Discord。

参考说明文件：`REMINDERS.md`

---

## 10. 常见问题（FAQ）

### Q1: 为什么检索结果不稳定？
- 搜索网页本身会变化
- 建议同时提供更具体 query（方向 + 地区 + 学校类型）
- 配置 `BRAVE_SEARCH_API_KEY` 会更稳

### Q2: Match 分数不满意怎么办？
- 补充更具体背景（项目名、方法、指标、论文）
- 目标项目写清楚（例如：`PhD in Computer Science, NLP track`）

### Q3: 数据会丢吗？
- 只用 localStorage：换设备会丢
- 开启 Supabase：可持久化，建议生产使用

### Q4: OpenAI key 已配置但报错？
- 检查 `.env.local` 是否重启后生效
- 检查 key 是否有额度和权限

---

## 11. 分支与协作建议

建议采用：
- `main`：稳定可用版本
- `dev`：持续开发版本

推荐流程：
1. 日常开发在 `dev`
2. 功能验证通过后合并到 `main`

---

## License

MIT
