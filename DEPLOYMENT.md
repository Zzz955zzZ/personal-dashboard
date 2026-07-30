# 部署与发布方案 — Personal Dashboard v1.0

> 项目形态：单文件 `dashboard.html`（TailwindCSS Play CDN + Vue 3 Global CDN），无构建步骤。
> 数据持久化：浏览器 `localStorage`（`DB_KEY = 'pdash_v4'`）。所有静态资源走公共 CDN。

---

## 0. 当前状态
- 已部署（演示/内部分享）：**https://7cffd56058a944e0af4c48e3a200f7c5.bj10.agentos-app.net**
- 因为是纯静态单文件，三种部署场景实际都很轻量。

---

## 1. 公开网站部署

### 方案 A：CloudStudio（当前已用）
- 适合快速演示、内部分享。重新部署只需把最新 `dashboard.html` 上传到该工作区目录即可。

### 方案 B：Vercel / Netlify（推荐用于正式公开站点）
纯静态、零构建，配置极简：

**Vercel**
1. 登录 vercel.com → Import Git Repository（或直接将 `dashboard.html` 拖入 Dashboard）。
2. Framework Preset 选 **Other / Static**。
3. Build Command：**留空**；Output Directory：`.`（根目录）。
4. 无需任何环境变量。
5. 部署后自动获得 `*.vercel.app` 域名；在 Dashboard → **Domains** 绑定自定义域名（按提示改 DNS 的 CNAME / 添加 TXT 校验）。
6. **HTTPS** 由 Vercel 自动签发（Let's Encrypt），**CDN** 走 Vercel Edge Network，全球加速。

**Netlify**
1. 拖拽 `dashboard.html` 到 app.netlify.com/drop，或连接 Git 仓库。
2. Build command：留空；Publish directory：`.`。
3. 域名 / HTTPS / CDN 同样自动处理。

### ⚠️ 生产化必做建议（影响性能与体验）
当前页面用 `cdn.tailwindcss.com`（Play CDN），它会在**浏览器里实时编译** Tailwind：
- 体积大（含完整 JIT 编译器，数百 KB）；
- 首屏会出现 FOUC（样式闪烁）；
- 无法走 CDN 长缓存。

正式上线前建议改用 **Tailwind CLI 预编译为静态 CSS**：
```bash
npm i -D tailwindcss @tailwindcss/cli
npx tailwindcss -i ./src.css -o ./dist/styles.css --minify
```
- 把 `<script src="https://cdn.tailwindcss.com"></script>` + 内联 `tailwind.config` 替换为 `<link rel="stylesheet" href="dist/styles.css">`。
- 同时把 `vue.global.js` 换成 **`vue.global.prod.js`**（生产构建，更小、无开发期警告）。
改完后页面才是真正生产级静态站点，且可被 CDN 高效缓存。

---

## 2. Android 打包（APK / AAB）

用 **Capacitor** 把 Web 应用包成原生 WebView。

**前置**：Node.js + npm；Android Studio（含 Android SDK）；JDK 17。

**步骤**
1. 初始化（在项目目录）：
   ```bash
   npm init -y
   npm i @capacitor/core @capacitor/cli
   npx cap init "Personal Dashboard" "com.yourname.pdash" --web-dir .
   ```
   `--web-dir .` 指向当前单文件目录，Capacitor 会把它当作 `www` 复制。
2. 添加平台：`npx cap add android`
3. 同步资源：`npx cap copy`（或 `npx cap sync`）
4. 打开工程：`npx cap open android`
5. Android Studio 中：**Build → Generate Signed Bundle / APK**
   - 首次需生成上传密钥库：
     ```bash
     keytool -genkeypair -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
     ```
   - 在 `android/app/build.gradle` 的 `signingConfigs` 引用该 keystore（keystore 放 `android/app/` 并加入 `.gitignore`）。
6. 产出：
   - **AAB**（Google Play 强制要求）：`android/app/build/outputs/bundle/release/app-release.aab`
   - **APK**（直接分发）：`android/app/build/outputs/apk/release/app-release.apk`

**上架 / 分发**
- Google Play：Play Console 上传 AAB；建议启用 **Play App Signing**（密钥由 Google 托管）；需填隐私政策、内容分级、截图。
- 直接分发 APK：通过内测链接 / 官网下载；Android 需允许“未知来源”安装。

**注意**
- Capacitor 下 `localStorage` 仍可用；若需原生存储可接 `@capacitor/storage`。
- 本应用无需特殊权限；若启用拍照上传，需在 `AndroidManifest.xml` 声明 `CAMERA` 权限。

---

## 3. iOS 打包（IPA）

用 **Capacitor + Xcode**（**必须在 macOS 上完成**）。

**前置**：macOS + Xcode（最新稳定版）+ Apple Developer 账号（上架 App Store / TestFlight 必需，年费 $99）。

**步骤**
1. 安装并添加平台（若未装）：
   ```bash
   npm i @capacitor/core @capacitor/cli
   npx cap add ios
   npx cap copy   # 或 npx cap sync
   ```
2. `npx cap open ios` 打开 Xcode 工程。
3. **签名配置（关键）**：
   - Xcode → Signing & Capabilities → Team 选你的 Developer 账号。
   - 勾选 **Automatically manage signing**。
   - Bundle Identifier 与 `cap init` 时一致（如 `com.yourname.pdash`）。
4. **证书 / Provisioning Profile**：
   - 开发 / 内测：Xcode 自动生成开发证书 + Development Profile。
   - 上架 / TestFlight：在 developer.apple.com 创建 App ID、App Store Provisioning Profile（或启用自动签名由 Apple 托管）。
5. **构建**：Product → Archive → Organizer → Distribute。
   - TestFlight 内测：Distribute App → App Store Connect → 上传后在 App Store Connect 添加测试员。
   - App Store 上架：同上，提交审核（需隐私政策、截图、年龄分级）。
   - 企业 / 自签：Ad Hoc Distribution（需把设备 UDID 注册进 Profile）。

**注意**
- 模拟器可运行但**不能**生成可安装 IPA；真机 / 上架必须走 Archive。
- 常见审核卡点：隐私权限说明、账号体系、最低功能完整性。

---

## 4. 版本管理（v1.0）

- 本仓库已 `git init` 并打标签 **`v1.0`**（即当前去暗黑模式后的稳定版）。
- 回滚：`git checkout v1.0` 或 `git tag` 查看后切回。
- 归档：`backups/v1.0/dashboard.html` 为本版完整副本；`backups/pre-v1.0/` 为改动前快照，便于对比 / 回退。
- 备份策略建议：
  - **Git 标签** = 代码级精确回滚点；
  - **`backups/YYYYMMDD/` 全量归档** = 灾难恢复（与 Git 互补）。
