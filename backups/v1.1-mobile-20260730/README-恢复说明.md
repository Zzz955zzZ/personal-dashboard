# 备份说明 — 2026-07-30 20:53

这是**开始 P2/P3 工程化迁移之前**的最终可用版本快照。

## 里面有什么

| 文件 | 说明 |
|---|---|
| `dashboard.html` | 当前正在用的正式版（168 KB），**需要同目录下有 `tailwind.css` 才有样式** |
| `tailwind.css` | 配套样式表（23 KB） |
| `dashboard-standalone.html` | **应急自包含版（342 KB）**：CSS 和 Vue 全部内联，双击即开，断网也能用 |

`dashboard-standalone.html` 仅剩 Google Fonts 一个外链，加载不到会自动回退到系统字体，功能不受影响。

## 怎么恢复

### 情况一：只是想用回旧版
把 `dashboard.html` 和 `tailwind.css` 两个文件一起拷回 `E:\955_WorkSpace\`，覆盖即可。

或者直接双击 `dashboard-standalone.html`，不用拷任何东西。

### 情况二：用 git 回退
```bash
cd E:\955_WorkSpace
git checkout v1.1-mobile -- dashboard.html tailwind.css
```

标签对照：
- `v1.0` → `2c01ada`（去暗色模式的稳定版）
- `v1.1-mobile` → `130be38`（**当前在用的版本**：预编译 Tailwind + 移动端优化）

### 情况三：整个仓库都没了
`backups/955_WorkSpace-full-history-20260730.bundle` 是完整 git 历史的单文件打包（99 KB），恢复方式：

```bash
git clone E:\955_WorkSpace\backups\955_WorkSpace-full-history-20260730.bundle 恢复目录
```

## 重要提醒

**你的饮食记录数据不在这些文件里。** 数据存在浏览器的 localStorage（键名 `pdash_v4`），跟着浏览器走，不跟着文件走。
- 换浏览器 / 清缓存 = 数据丢失，跟备不备份 html 没关系。
- 建议在应用里定期用「导出」功能存一份 JSON。
