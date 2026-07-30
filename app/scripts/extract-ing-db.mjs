/**
 * 从 v1.0 单文件版 dashboard.html 精确提取 ING_DB 字面量，生成 TS 数据模块。
 * 一次性迁移工具：数据搬完后即可归档，保留它是为了迁移过程可复现、可比对。
 *
 * 用法: node scripts/extract-ing-db.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, '../../dashboard.html');
const OUT = resolve(here, '../src/modules/diet/data/ing-db.ts');

const html = readFileSync(SRC, 'utf8');
const start = html.indexOf('const ING_DB = [');
if (start === -1) throw new Error('ING_DB not found in ' + SRC);

const open = html.indexOf('[', start);
let depth = 0;
let end = -1;
for (let i = open; i < html.length; i++) {
  const ch = html[i];
  if (ch === '[') depth++;
  else if (ch === ']') {
    depth--;
    if (depth === 0) {
      end = i;
      break;
    }
  }
}
if (end === -1) throw new Error('unbalanced ING_DB array');

const literal = html
  .slice(open, end + 1)
  .split('\n')
  .map((line, i) => (i === 0 ? line : line.replace(/^ {8}/, '')))
  .join('\n');

const rows = new Function(`return ${literal};`)();
const cats = new Set(rows.flatMap((r) => r.m.map((m) => m.cat)));

const out = `/**
 * 食材知识库 — 由 scripts/extract-ing-db.mjs 从 v1.0 dashboard.html 提取，请勿手改格式。
 * 共 ${rows.length} 条，覆盖微量营养素分类：${[...cats].join(' / ')}。
 * 新增条目直接追加即可，kw[0] 会作为命中时展示的类别名。
 */
import type { IngredientDbRow } from '../types';

export const ING_DB: IngredientDbRow[] = ${literal};

export default ING_DB;
`;

writeFileSync(OUT, out, 'utf8');
console.log(`extracted ${rows.length} rows -> ${OUT}`);
console.log(`micro categories: ${[...cats].join(', ')}`);
