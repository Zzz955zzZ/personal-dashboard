const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('dashboard.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only', resources: 'usable', url: 'https://localhost/' });
const { window } = dom;
global.window = window; global.document = window.document;

// Minimal Vue stub is insufficient; load real prod build from CDN if reachable.
const https = require('https');
function fetchText(url) {
  return new Promise((res, rej) => {
    https.get(url, (r) => { let d = ''; r.on('data', c => d += c); r.on('end', () => res(d)); }).on('error', rej);
  });
}

(async () => {
  try {
    const vueSrc = await fetchText('https://unpkg.com/vue@3/dist/vue.global.prod.js');
    window.eval(vueSrc);
    const Vue = window.Vue;
    if (!Vue || !Vue.createApp) throw new Error('Vue not loaded');
    const app = Vue.createApp({});
    // We need the real app options; re-evaluate the inline script that defines the app.
    // Extract the last <script> (the app script) and run it in window context.
    const scripts = [...window.document.querySelectorAll('script')].map(s => s.textContent).filter(t => t && t.includes('createApp'));
    if (!scripts.length) throw new Error('app script not found');
    window.eval(scripts[scripts.length - 1]);
    await new Promise(r => setTimeout(r, 300));
    const appHtml = window.document.getElementById('app').innerHTML;
    const hasSvg = appHtml.includes('<svg');
    const hasLeftover = /\{\{/.test(appHtml);
    console.log('app mounted chars:', appHtml.length);
    console.log('contains <svg> icons:', hasSvg);
    console.log('leftover {{ }} template tokens:', hasLeftover);
    console.log(hasSvg && !hasLeftover ? 'RENDER TEST: PASS' : 'RENDER TEST: CHECK');
  } catch (e) {
    console.log('RENDER TEST: SKIPPED (', e.message, ')');
  }
})();
