# 增量 PRD：报价工作室 UI/UX 体验优化（6 项）

- **文档版本**：v1.0
- **日期**：2026-08-24
- **作者**：许清楚（产品经理）
- **范围**：仅本次 6 项增量变更，不复述既有产品整体定义
- **技术栈上下文**：Vite 6 + Vue 3.5 + TypeScript strict + Pinia + vue-router(hash) + Tailwind CSS 3（coral/paper 配色）；产物为单文件 `dist-single/index.html`

## 变更总览

| # | 变更 | 优先级 |
|---|------|--------|
| 1 | 进入页面/弹窗时名称立即显示 | P0 |
| 2 | Enter 键跳到下一个输入框 | P1 |
| 3 | 售价为「售价」增加可管理单位 | P1 |
| 4 | DTO（折扣）/ IVA（税率%）列单行显示 | P0 |
| 5 | 输入框统一左对齐/左置顶 | P1 |
| 6 | 删除「操作」列，改为悬停角落删除 | P1 |

> 优先级约定：**P0** = 必须修复（数据可见性/视觉缺陷，影响信任与读取效率）；**P1** = 应当实现（显著体验提升）。

---

## 1. 进入页面/弹窗时名称立即显示

**变更点**
- 打开页面/弹窗或点入某条记录/产品时，名称类字段（如产品名称、项目标题）应**立即渲染**已保存的值，而非在首次交互（点击/输入）后才出现。
- 预期表现：初次打开即显示，无需任何点击。

**用户故事**
- As a 报价员，I want 打开报价单/产品时名称直接可见，so that 我能立刻确认是否点对了记录，避免误改。

**优先级**：P0（数据不可见类缺陷，直接影响信任）

**验收标准**
- 打开含已存名称的页面/弹窗，名称字段显示保存值，肉眼可见且无延迟（≤1 帧）。
- 不做任何操作、刷新/重开后，名称仍直接显示。
- 无控制台报错；不依赖用户点击/输入才触发渲染。

**涉及的已有模块/组件推测**
- `src/modules/quotation/components/QuoteItemRow.vue`：产品名称内联输入 `nameModel`（computed `get` 返回 `props.item.name`）。
- 数据加载/弹窗：`useQuotationStore` / `useProjectsStore` 的 hydrate 时机；`BaseModal.vue` 及引用它的弹窗（`AiLinkModal.vue`、`DataModal.vue`）。
- **疑似根因**：`props.item` 在首次渲染时尚未完成响应式绑定（异步 hydrate 后未触发重渲染），或某元素初始有 transition/opacity 动画需交互才收尾。**需结合截图与 store hydrate 时机确认（见待确认问题 1）。**

---

## 2. Enter 键跳到下一个输入框

**变更点**
- 任意表单填写时按 Enter，焦点自动移动到**下一个输入框**（按视觉/文档流顺序）。
- 重点场景：报价单录入（产品行各字段的连续填写）。
- 多行文本（备注/内部备注）的 Enter **仍换行**，不被拦截；已显式绑定的 `@keyup.enter` 动作（如新增单位/状态）不受影响。

**用户故事**
- As a 报价员，I want 按 Enter 就跳到下一格，so that 不用频繁切换鼠标，快速录完一行产品。

**优先级**：P1

**验收标准**
- 在报价单产品行的「产品 / 型号 / 备注 / 售价 / 数量」等文本/数字输入框连续按 Enter，焦点依次下移/右移到下一输入框。
- 同组最后一个输入框按 Enter 的行为合理（跳到下一行首个输入框，或停在末格——由团队定，见待确认问题 2）。
- 备注类多行输入 Enter 正常换行；Select/下拉不触发误跳转。
- 不破坏既有 `@keyup.enter` 显式逻辑（如 `ProductDefaultsSettings.vue` 的单位/状态新增）。

**涉及的已有模块/组件推测**
- 建议新增聚焦指令/组合式函数（如 `src/shared/composables/use-focus-next.ts` 或 `v-focus-next` 指令），统一注册。
- 应用点：`QuoteItemRow.vue` 各内联 `<input>`；`ProductDefaultsSettings.vue`；`DataModal.vue` 等表单。
- 现有表单输入 = 原生 `<input>`（`QuoteItemRow.vue` 内联）与封装 `<Input>`（`src/components/ui/input/Input.vue`），均需纳入聚焦序列。

---

## 3. 售价为「售价」增加可管理单位

**变更点**
- 在「产品默认设置」中，为「售价」增加一套可管理的单位，与现有「数量单位」**同构**：默认售价单位 + 可选售价单位列表，支持新增/删除/规范化。
- 现有 `Settings.unitOptions` / `defaultUnit` 仅服务于数量列；本次新增 `salePriceUnitOptions` / `defaultSalePriceUnit`（命名待定）。
- 报价单产品行增加「售价单位」选择（与数量单位可不同）。

**用户故事**
- As a 设置管理员，I want 单独管理售价的单位，so that 不同产品可按「件 / 平方米 / 小时」等单位报价，单位更规范。

**优先级**：P1

**验收标准**
- 设置中心「产品默认设置」出现「售价单位」配置区：可设默认售价单位、可增删可选售价单位（复用现有单位 chip + 输入框 + 删除交互）。
- 新增/删除售价单位即时持久化（`useSettingsStore`），刷新后保留。
- 报价单产品行的售价旁出现售价单位下拉，默认取设置中的默认售价单位；可随产品单独修改。
- 规范化逻辑与现有单位一致（空白/重复/trim 处理）；删除单位时给出二次确认。

**涉及的已有模块/组件推测**
- `src/modules/settings/components/ProductDefaultsSettings.vue`：现有「单位选项」「产品状态」两区，需新增第三区。
- `src/modules/settings/types.ts`：`Settings` 接口需新增字段。
- `src/modules/settings/store`（`useSettingsStore`）：新增 `addSalePriceUnitOption` / `removeSalePriceUnitOption` / `setDefaultSalePriceUnit` 等 action。
- `src/modules/quotation/types.ts`：`QuoteItem` 需新增 `salePriceUnit` 字段。
- `src/modules/quotation/components/QuoteItemRow.vue`：售价 `td` 旁增加单位 `Select`，类似既有 `unitModel`。

---

## 4. DTO（折扣）/ IVA（税率%）列单行显示

**变更点**
- 报价单表格中「折扣%」「税率%」两列表头与内容当前因列宽过窄被折成两行，优化为**强制单行**（不换行）；必要时适度加宽或精简表头文案。
- 注：代码当前表头为「折扣%」「税率%」，对应需求中的 DTO/IVA；若实际展示为「DTO%」「IVA%」以截图为准。

**用户故事**
- As a 报价员，I want 折扣/税率列在一行内显示，so that 表格更紧凑、横向滚动更少，一眼看全。

**优先级**：P0（视觉缺陷，影响读取效率）

**验收标准**
- 「折扣%」「税率%」表头与单元格内容均单行显示，不出现折行（如「折扣」与「%」分两行）。
- 单列宽度足以容纳表头（或表头允许缩写如「折扣」「税率」、内容行仍为单行数字）。
- 窄屏触发横向滚动时仍保持单行。
- 不影响对齐与边框分隔样式。

**涉及的已有模块/组件推测**
- `src/modules/quotation/components/CategorySection.vue`：表头 `th`——折扣% `w-16`、税率% `w-16`（line 143-144），需加 `whitespace-nowrap`，必要时加宽。
- `src/modules/quotation/components/QuoteItemRow.vue`：折扣 `dtoPctModel`、税率 `ivaPctModel` 单元格（line 400-423），需加 `whitespace-nowrap` 并确认列宽。

---

## 5. 输入框统一左对齐/左置顶

**变更点**
- 表格内数字/文本输入框当前多为右对齐（`text-right` / `ml-auto`，如售价、进价、折扣%、税率%），点选不方便。统一调整为**左对齐/左置顶**（`text-left`，移除 `ml-auto`/居中）。
- 文本类（产品/型号/备注）本就左对齐，仅确认不变。

**用户故事**
- As a 报价员，I want 输入框内容靠左，so that 我点最左侧就能定位光标，录入更顺手。

**优先级**：P1

**验收标准**
- 报价单表格中所有可编辑输入框（售价、数量、进价、折扣%、税率%、内部备注等）内容左对齐，无右置顶/居中。
- 输入光标默认落在左端。
- 不破坏数字 `tabular-nums` 与表头对齐。

**涉及的已有模块/组件推测**
- `src/modules/quotation/components/QuoteItemRow.vue`：
  - 售价 input：`text-right` + `ml-auto`（line 304）
  - 数量 input：`text-center`（line 329）
  - 进价/折扣/税率 input：`text-right`（line 395 / 408 / 421）
- 封装 `<Input>`（`src/components/ui/input/Input.vue`）默认即为左对齐，无需改；主要改内联表格输入。

---

## 6. 删除「操作」列，改为悬停角落删除

**变更点**
- 移除报价单产品表独立的「操作」列（整列垃圾桶按钮）。
- 删除按钮改为**低调样式**，仅在鼠标悬停到对应产品行时，于该行某一角落（建议右上角绝对定位）显示。
- 保留二次确认删除逻辑（现有 `window.confirm`）。

**用户故事**
- As a 报价员，I want 删除键只在悬停时低调出现，so that 表格更整洁，也不会误点删除。

**优先级**：P1

**验收标准**
- 表头与表格中均不再有独立「操作」列（含 sticky 右列样式一并移除）。
- 鼠标悬停某产品行时，该行右上角出现低调删除按钮（如浅灰、无边框/小图标）；移出后隐藏。
- 点击删除仍先二次确认，确认后移除该产品行。
- 客户视图（`isCustomer`）本就无操作列，保持不变。
- 删除按钮不被横向滚动遮挡（注意原 sticky 列的定位与堆叠上下文）。

**涉及的已有模块/组件推测**
- `src/modules/quotation/components/CategorySection.vue`：移除表头 `操作` `th`（line 140）；并相应调整 `colspan` 计数（14 → 13）、空态 colspan 等。
- `src/modules/quotation/components/QuoteItemRow.vue`：移除 `操作` `td`（line 366-376）；利用已有 `isRowHovered` ref，在行内新增 `v-if="isRowHovered"` 的绝对定位删除按钮。

---

## 待确认问题（Open Questions）

1. **变更 1 的触发场景与根因**：能否提供截图或具体路径（哪个页面/弹窗、哪种记录）？怀疑是 store 异步 hydrate 后未触发重渲染，或某弹窗初始 opacity/transition 动画需交互收尾。需确认是 `QuoteItemRow` 内联名称，还是某个弹窗（如项目/报价编辑弹窗）的标题字段。
2. **变更 2 的末端行为**：产品行最后一个输入框（如税率%）按 Enter 后，焦点应跳到下一行首个输入框，还是停在末格？是否允许 Enter 触发「添加新产品」？
3. **变更 3 的字段命名与数据迁移**：新增设置字段命名（`salePriceUnitOptions` / `defaultSalePriceUnit`）是否合适？旧数据无该字段时默认值如何（沿用 `defaultUnit`？）；`QuoteItem.salePriceUnit` 缺省迁移策略需定义。
4. **变更 4 的表头文案**：截图里表头到底显示「折扣% / 税率%」还是「DTO% / IVA%」？是否需要统一为西文 DTO/IVA 或保留中文。
5. **变更 6 的角落位置**：删除按钮放右上角还是左上角（避免与状态列冲突）？是否需兼顾触屏（无 hover）提供长按/替代入口。
6. **变更 5 的数字对齐惯例**：数字列左对齐是否符合团队/客户预期（通常财务数字右对齐）？若不强制，可仅对「点选困难」的售价列左对齐，其余保留右对齐。

---

## 优先级汇总

- **P0**：#1（名称立即显示）、#4（DTO/IVA 单行）
- **P1**：#2（Enter 跳转）、#3（售价单位）、#5（左对齐）、#6（悬停删除）

## 涉及文件速查

| 变更 | 主要文件 |
|------|----------|
| 1 | `QuoteItemRow.vue`、`BaseModal.vue`、各 store hydrate |
| 2 | 新增 `use-focus-next` 组合式/指令；`QuoteItemRow.vue`、`ProductDefaultsSettings.vue`、`DataModal.vue` |
| 3 | `ProductDefaultsSettings.vue`、`settings/types.ts`、`useSettingsStore`、`quotation/types.ts`、`QuoteItemRow.vue` |
| 4 | `CategorySection.vue`、`QuoteItemRow.vue` |
| 5 | `QuoteItemRow.vue` |
| 6 | `CategorySection.vue`、`QuoteItemRow.vue` |
