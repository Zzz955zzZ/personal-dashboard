const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'dashboard.html');
const html = fs.readFileSync(file, 'utf8');

// Extract inline <script> blocks (no src attribute) and syntax-check each
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
let m, idx = 0, errors = 0;
while ((m = re.exec(html)) !== null) {
  const code = m[1];
  idx++;
  try {
    new Function(code);
    console.log('inline script #' + idx + ': OK (' + code.length + ' chars)');
  } catch (e) {
    errors++;
    console.error('inline script #' + idx + ': SYNTAX ERROR -> ' + e.message);
  }
}

function check(name, ok, desc) {
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + '  (' + desc + ')');
  if (!ok) errors++;
}

const hasCrab = html.indexOf("kw:['螃蟹'") !== -1;
const hasInfer = /function inferCategory\(/.test(html);
const hasAiResultComputed = /const aiResult = computed\(/.test(html);
const hasAiResultReturned = /aiResult, micronGroups/.test(html);
const hasEstimated = /estimated: true/.test(html);
const hasAmber = html.indexOf('已智能估算营养（参考值）') !== -1;
const hasDedup = html.indexOf('dedupedMicrons') !== -1;
const hasSwitch = html.indexOf('_lastAiName') !== -1;

check('螃蟹 in ING_DB', hasCrab, 'crab keyword present in DB');
check('inferCategory defined', hasInfer, 'category inference helper exists');
check('aiResult computed', hasAiResultComputed, 'aiResult computed defined');
check('aiResult returned', hasAiResultReturned, 'aiResult exposed to template');
check('estimated flag', hasEstimated, 'estimate flag returned');
check('amber estimate UI', hasAmber, 'estimate badge in template');
check('tag dedup logic', hasDedup, 'saveIng dedup present');
check('switch refresh', hasSwitch, 'switch-refresh tracking present');

const dbMatch = html.match(/const ING_DB = \[([\s\S]*?)\n        \];/);
const entryCount = dbMatch ? (dbMatch[1].match(/kw:\[/g) || []).length : 0;
console.log('ING_DB entries: ' + entryCount);

console.log('\nTotal errors: ' + errors);
process.exit(errors ? 1 : 0);
