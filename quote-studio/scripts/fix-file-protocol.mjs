// 让 dist-single/index.html 在 file:// 协议下（双击直接打开）也能运行。
//
// 背景：vite 单文件产物入口是 `<script type="module" crossorigin>`，且内部用了
// import.meta。浏览器在 file:// 下会因 CORS（origin=null）拦截 module 脚本导致白屏；
// 但 import.meta 又只能在 module 上下文使用 —— 形成死结。
//
// 修复：把内联 module 脚本改为普通（classic）脚本：
//   1. 将 import.meta 替换为安全的全局 __importMeta（url 退化为 location.href）
//   2. 移除 type="module"/crossorigin，并把脚本整体移到 </body> 之前同步执行
// 这样双击 file:// 与用本地服务器访问都能正常工作。
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// 从脚本自身位置（scripts/）解析到项目根下的构建产物，避免硬编码绝对路径。
const file = fileURLToPath(new URL('../dist-single/index.html', import.meta.url));

let s;
try {
  s = readFileSync(file, 'utf8');
} catch {
  console.warn('[fix-file-protocol] 未找到构建产物，跳过（可能 build 失败或 outDir 已变更）');
  process.exit(0);
}

const re = /<script type="module"[^>]*>([\s\S]*?)<\/script>/;
const m = s.match(re);
if (!m) {
  console.warn('[fix-file-protocol] 未找到内联 module 脚本，跳过');
  process.exit(0);
}

let code = m[1].replace(/import\.meta\b/g, '__importMeta');
const patched = `var __importMeta={url:location.href};\n${code}`;

// 移除原 module 标签
s = s.replace(re, '');

// 放到 body 末尾（DOM 已解析，mount('#app') 可找到容器）
const marker = s.includes('</body>') ? '</body>' : '</html>';
s = s.replace(marker, `<script>${patched}</script>${marker}`);

try {
  writeFileSync(file, s);
} catch (e) {
  console.error('[fix-file-protocol] 写入失败：', e);
  process.exit(1);
}
console.log('[fix-file-protocol] 已输出 file:// 兼容的单文件构建');
