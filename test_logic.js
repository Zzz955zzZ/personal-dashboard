const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'dashboard.html'), 'utf8');

// ---- Extract ING_DB array source ----
const dbStart = html.indexOf('const ING_DB = [');
const dbEnd = html.indexOf('\n        ];', dbStart);
const dbSrc = html.slice(dbStart, dbEnd + '\n        ];'.length);
const ING_DB = (new Function(dbSrc + '\n return ING_DB;'))();

// ---- Helper: extract a function by name with brace matching ----
function extractFn(name) {
  const sig = 'function ' + name + '(';
  const start = html.indexOf(sig);
  if (start === -1) throw new Error('function not found: ' + name);
  const open = html.indexOf('{', start);
  let depth = 0, i = open;
  for (; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) break; }
  }
  return html.slice(start, i + 1);
}

const inferSrc = extractFn('inferCategory');
const aiSrc = extractFn('aiRecognize');

const api = (new Function('ING_DB', inferSrc + '\n' + aiSrc + '\n return { aiRecognize: aiRecognize, inferCategory: inferCategory };'))(ING_DB);
const { aiRecognize } = api;

function show(label, name) {
  const r = aiRecognize(name);
  console.log('--- ' + label + ' (' + name + ') ---');
  console.log('  match:', r.match, '| estimated:', r.estimated, '| category:', r.category);
  console.log('  macros:', JSON.stringify(r.macros));
  console.log('  micros:', r.micros.map(x => x.name).join(', ') || '(none)');
  console.log('  note:', r.note);
  return r;
}

let fails = 0;
function assert(cond, msg) { if (!cond) { fails++; console.log('  ✗ FAIL: ' + msg); } else { console.log('  ✓ ' + msg); } }

console.log('ING_DB size:', ING_DB.length);

const r1 = show('Exact DB hit', '螃蟹');
assert(r1.match && !r1.estimated, '螃蟹 is an exact (verified) DB hit, not an estimate');
assert(r1.macros && r1.macros.protein === 18, '螃蟹 macros carry real protein=18');
assert(r1.micros.some(x => x.name === '锌'), '螃蟹 micros include 锌');

const r2 = show('Exact DB hit (chicken breast)', '鸡胸肉');
assert(r2.match && !r2.estimated && r2.macros.protein === 31, '鸡胸肉 exact hit, protein=31');

const r3 = show('Unknown seafood -> estimate', '海胆');
assert(r3.match && r3.estimated, '海胆 (unknown, not in DB) yields an ESTIMATE (not silent)');
assert(r3.category === '海鲜/水产', 'category inferred as 海鲜/水产');
assert(r3.macros && r3.macros.protein === 18, 'estimate uses seafood protein=18');

const r4 = show('Unknown veg -> estimate', '空心菜');
assert(r4.match && r4.estimated && r4.category === '蔬菜', '空心菜 estimated as 蔬菜');

const r5 = show('Unknown fruit -> estimate', '榴莲');
assert(r5.match && r5.estimated && r5.category === '水果', '榴莲 estimated as 水果');

const r6 = show('Gibberish -> no match', 'asdfqwer');
assert(!r6.match && !r6.estimated, 'gibberish produces no match (honest)');

const r7 = show('Empty -> no match', '');
assert(!r7.match, 'empty string -> no match');

console.log('\nTotal failures: ' + fails);
process.exit(fails ? 1 : 0);
