/**
 * Quote Studio — E:\ 盘 safe-delete shim
 *
 * 递归删除项目根下的 `dist/` 与 `dist-single/`，带路径护栏：
 * 仅允许删除项目根目录下名为 `dist` 或 `dist-single` 的目录，拒绝任何越界删除。
 *
 * 之所以需要本脚本：E:\ 盘的 safe-delete 策略会拦截 Vite 自带的 `emptyOutDir` 的 rm 操作，
 * 因此改为「构建前显式手动清理」，且清理范围被严格限制。
 */

import { existsSync, statSync, rmSync } from 'node:fs';
import { resolve, basename, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOWED = new Set(['dist', 'dist-single']);

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

function safeRemove(target) {
  const abs = isAbsolute(target) ? target : resolve(projectRoot, target);
  const name = basename(abs);

  // 护栏 1：只允许白名单目录名
  if (!ALLOWED.has(name)) {
    console.warn(`[clean] 跳过（不在允许列表）: ${abs}`);
    return false;
  }
  // 护栏 2：必须位于项目根目录内，不得越界
  if (!abs.startsWith(projectRoot + '/') && !abs.startsWith(projectRoot + '\\')) {
    console.warn(`[clean] 拒绝越界删除: ${abs}`);
    return false;
  }
  // 护栏 3：必须是目录
  if (!existsSync(abs) || !statSync(abs).isDirectory()) {
    return false;
  }
  try {
    rmSync(abs, { recursive: true, force: true });
    console.log(`[clean] 已删除: ${abs}`);
    return true;
  } catch (e) {
    console.warn(`[clean] 删除失败: ${abs} — ${String(e?.message || e)}`);
    return false;
  }
}

let removed = 0;
for (const dir of ALLOWED) {
  if (safeRemove(resolve(projectRoot, dir))) removed++;
}
console.log(`[clean] 完成，共清理 ${removed} 个目录。`);
