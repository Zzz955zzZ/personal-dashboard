# PRD · 工作室报价与收益管理 PWA（Quote Studio）

> 版本：v0.1（MVP 范围）　|　语言：中文　|　货币默认：€ (EUR)　|　技术栈：Vite 6 + Vue 3.5 + TS(strict) + Pinia + vue-router(hash) + Tailwind 3 + vite-plugin-pwa + vite-plugin-singlefile
> 复用脚手架：`E:\955_WorkSpace\app\`（模块式结构 `src/modules/<module>/`，含 `index/routes/store/views/components/types`）

---

## 1. 产品目标

为马德里室内设计工作室打造一款**以项目为中心**的、可安装到多设备（桌面/平板/手机，含离线）的报价与收益管理 PWA。它把"项目"作为唯一核心实体，让工作室在一处维护客户项目的报价单（含成本、毛利、客户可见说明），在报价**确认**后自动把利润/收益同步到项目收益看板；同时提供面向客户的只读"展示视图"与 PDF 导出，用于面对面谈单。目标是在保证数据机密性（成本/毛利/内部备注仅管理员可见）的前提下，将报价编制、收益核算与谈单展示三件事合并到一个轻量、可离线、可多设备同步的工作台中，替代散落的 Excel 与截图沟通。

---

## 2. 用户角色

| 角色 | 标识 | 能力范围 | 数据可见性 |
|------|------|----------|------------|
| 管理员 (Admin) | `admin` | 全部功能：建项目、编报价、管理分类/公司资料/设置、确认报价、导出 PDF/Excel/JSON、AI 链接识别 | 可见**全部字段**（含成本、毛利、内部备注） |
| 客户 (Customer) | `customer` | 只读：查看"客户视图"下的报价、查看品牌化 PDF | **隐藏**成本、毛利、内部备注、销售价构成；仅见产品名/品牌型号/图片/客户说明/数量/应付金额 |

> 说明：MVP 中"客户"不是独立登录账号，而是通过"客户视图"开关 + 只读态呈现；账户体系与多租户留待后期（见第 8 节依赖）。

---

## 3. 功能模块清单（含优先级）

优先级定义：**P0** 必须（MVP 上线门槛）｜**P1** 应有（MVP 强烈建议，可首版即做）｜**P2** 可选（后续迭代）

### 3.1 Home Dashboard（首页工作台）
- P0 以"功能模块卡片"网格呈现；MVP 仅两张卡片：**① 项目收入/收益管理**、**② 报价系统**。
- P0 卡片区结构需**可扩展**，为后续模块预留位（基础报价 / 主材报价 / 物料图册 / 增减项）。
- P1 卡片支持角标（如待确认报价数、本月收益）。

### 3.2 项目收入/收益管理 (Project Revenue)
- P0 项目列表/卡片视图，展示每个项目的总收益、总利润、状态。
- P0 项目为收益聚合根：读取其下已确认报价的同步数据。
- P1 收益汇总（按项目、按时间）、趋势概览（简易图表）。
- P2 多维筛选/搜索、收益导出。

### 3.3 报价系统 (Quotation)
- P0 项目卡片网格首页（参照图：卡面含项目名、总金额、日期、操作图标）。
- P0 筛选 / 搜索 / 自定义分类。
- P0 点击项目 → 进入该项目的报价（默认**管理态**）。
- P0 报价内**两级分类**：大类（按工种/类型）→ 小类 → 产品行。
- P0 产品行字段：名称、品牌/型号、照片、客户可见备注、管理员内部备注、成本、手填毛利、销售价（=成本+毛利，自动）、数量、行小计。
- P0 管理视图显示成本/毛利/内部备注；客户视图隐藏。
- P0 整单"确认"：确认后把本单毛利/利润同步到项目收益（见第 7 节规则）。
- P0 "客户视图"开关：只读、品牌化展示。
- P1 报价草稿/已确认状态切换、历史版本留痕。
- P2 行级复制/拖拽排序、批量改毛利。

### 3.4 设置中心 (Settings) ——独立页面，不在报价屏内
- P0 全局**大类 / 小类**分类管理（增删改、排序）。
- P0 公司资料（logo / 名称 / 地址 / 电话 / 邮箱 / 税号 / 页脚注）。
- P0 PDF 模板设置（页眉布局、是否显示 logo）。
- P0 货币与语言设置（默认 € / 中文）。
- P1 云同步配置入口（Supabase URL / anon key 占位，待凭证）。
- P1 OpenAI 兼容 API 配置（baseUrl / apiKey / model）。

### 3.5 AI 链接识别 (AI Link)
- P1 粘贴产品 URL → 本地零依赖 Node 代理 `server/proxy.mjs` 抓取页面并调用 OpenAI 兼容 LLM，返回结构化字段（大类、小类、名称、品牌、型号、图片 URL、尺寸、材质、描述）。
- P1 价格/毛利**留给人工确认**（AI 不擅自填价）。
- P2 识别结果一键写入报价行；识别失败兜底为手动录入。

### 跨模块（P0/P1）
- P0 导入/导出：Excel（SheetJS）导入导出、JSON 备份。
- P0 PDF 导出：可配置页眉（公司 logo/资料），客户视图为 PDF 数据源。
- P1 云同步：基于托管后端的自动多设备同步（EU 区域，推荐 Supabase；凭证待提供）。

---

## 4. 用户故事 / 核心流程

**故事 A — 新建项目到收益入账**
> 作为管理员，我想新建一个项目并为其编制报价，确认后能在收益看板看到该项目利润，以便实时掌握每个项目的盈利情况。

流程：`新建项目 (Project)` → `进入报价 → 添加产品行(填成本/毛利/数量)` → `编辑/核对 → 点击"确认"` → `系统按规则把本单毛利/总销售额写入该项目 RevenueEntry` → `项目收益卡片金额更新`。

**故事 B — 管理态到客户谈单**
> 作为管理员，我想把报价切换为客户视图展示给客户看，并导出带公司 logo 的 PDF，以便面对面谈单且不让客户看到成本与毛利。

流程：`报价(管理态) → 切"客户视图"(只读,隐藏成本/毛利/内部备注)` → `客户浏览品牌化报价` → `导出 PDF(按设置页眉/logo)` → `客户留存 PDF 或现场查看`。

**故事 C — AI 辅助录入（P1）**
> 作为管理员，我想粘贴供应商产品链接让 AI 提取字段，再人工确认价格，以便加快报价录入。

流程：`粘贴 URL → proxy.mjs 抓取 + LLM 结构化` → `回填大类/小类/名称/品牌/型号/图片等` → `人工填成本/毛利` → `写入报价行`。

---

## 5. 数据实体定义

| 实体 | 关键字段 | 关系 / 说明 |
|------|----------|-------------|
| **Project** (项目·聚合根) | `id, name, clientName, address, status, currency(默认EUR), coverUrl, createdAt, updatedAt` | 中心实体；含 0..1 个 MVP 报价、0..n 收益记录 |
| **Quotation** (报价单) | `id, projectId, title, status(draft/confirmed), confirmedAt, totalAmount, totalCost, totalMargin, createdAt, updatedAt` | 每项目 MVP 限 1 单；确认后驱动收益同步 |
| **QuoteItem** (报价行/产品行) | `id, quotationId, categoryGroupId, subCategoryId, name, brand, model, photoUrl, customerNote, internalNote, cost, margin, salePrice(=cost+margin), quantity, lineTotal(=salePrice*qty)` | 归属两级分类；成本/毛利/内部备注为管理员字段 |
| **RevenueEntry** (收益记录) | `id, projectId, source(如'quotation_confirmed'), amount(销售额), cost, margin(利润), linkedQuotationId, recordedAt` | 报价确认时生成/更新；项目收益由其聚合 |
| **CategoryGroup** (大类) | `id, name, icon, order` | 全局；按工种/类型（如 硬装/软装/主材） |
| **SubCategory** (小类) | `id, groupId, name, order` | 归属大类；报价行引用 |
| **CompanyProfile** (公司资料·单例) | `id(固定), logoUrl, name, address, phone, email, taxId, footerNote` | 设置中心维护；用于 PDF 页眉 |
| **Settings** (设置·单例) | `id(固定), language(zh), currency(EUR), supabaseConfig{url,anonKey}|null, openaiConfig{baseUrl,apiKey,model}|null, pdfTemplate{headerLayout,showLogo}` | 含云同步与 AI 配置占位（依赖第 8 节） |

---

## 6. 页面结构 & 导航

路由（hash 模式，沿用脚手架 `src/modules/<module>/routes.ts`）：

```
/                         Home Dashboard（功能卡片网格）
/projects                 Project Revenue 列表/卡片（收益聚合）
/projects/:id             Project 详情 + 收益概览
/quotation                Quotation 项目卡片网格（筛选/搜索/自定义分类）
/quotation/:projectId     Quotation 编辑（管理态，默认）；含"客户视图"开关
/settings                 Settings 中心（分类管理 / 公司资料 / PDF 模板 / 同步 / AI）
```

- 顶部/侧边导航：Home、项目收益、报价、设置（四入口）。
- 报价屏内：管理态 ⇄ 客户视图 同路由内切换（不新增路由），客户视图为只读。
- 模块落地约定：`src/modules/{revenue,quotation,settings,ai-link}/` 各含 `index/routes/store/views/components/types`，与脚手架一致。
- PWA：可安装、离线可用（singlefile 构建 + Workbox 缓存）；`server/proxy.mjs` 为本地 Node 代理，不参与前端打包。

---

## 7. 关键规则（强约束）

1. **销售价计算**：`salePrice = cost + margin`，系统自动计算，**毛利(margin)由人工录入**，不允许反向推导覆盖成本。
2. **行小计**：`lineTotal = salePrice × quantity`，自动计算。
3. **整单汇总**：`totalAmount = Σ lineTotal`，`totalCost = Σ(cost×qty)`，`totalMargin = Σ(margin×qty)`，自动汇总。
4. **确认即同步**：报价从 `draft` → `confirmed` 时，必须生成/刷新该项目一条 `RevenueEntry`（amount=totalAmount, cost=totalCost, margin=totalMargin, linkedQuotationId）；仅"确认"动作触发同步，草稿编辑**不**写入收益。
5. **客户视图隐藏**：客户视图与导出的客户 PDF **必须**剥离成本、毛利、内部备注、销售价构成，仅展示产品名/品牌型号/图片/客户说明/数量/应付金额。
6. **管理员字段隔离**：成本、毛利、内部备注仅在管理态可见可编辑；任何"客户视图/导出"路径不得泄露。
7. **分类全局唯一**：大类/小类在设置中心集中管理，报价行引用而非内联创建，保证统计一致性。
8. **AI 不定价**：AI 链接识别结果的价格/毛利字段留空，须经人工确认后写入。

---

## 8. 待确认 / 依赖事项

| 事项 | 状态 | 影响 |
|------|------|------|
| **云同步后端凭证**：Supabase（EU 区域）URL + anon key，或备选后端方案 | ❏ 未提供 | 阻塞"自动多设备同步"P1 功能；上线前需确定；在此之前可用本地持久化(Pinia + localStorage)作为临时态 |
| **OpenAI 兼容 API key / baseUrl / model** | ❏ 未提供 | 阻塞 AI 链接识别 P1；设置中心预留配置位，缺失时该功能禁用并提示 |
| 账户与多租户（admin/customer 独立账号、权限模型） | 待定（MVP 不做） | 影响客户视图是否需要鉴权；当前以"视图开关+只读"实现 |
| 报价单与项目一对多 vs 一对一 | 已定：MVP 每项目 1 单 | 架构预留后期扩展为多版本/多报价 |
| 货币/语言是否支持多币种切换 | 已定：默认 € / 中文 | 如需多币种汇率换算列为 P2 |

---

*备注：本 PRD 为 MVP 简单版，不含竞品分析与详细技术实现；代码实现不在本文档范围。*
