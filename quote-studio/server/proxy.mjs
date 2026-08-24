/**
 * Quote Studio — 本地零依赖代理（AI 链接识别用）
 *
 * 仅使用 Node 内置模块（http / https / url / crypto），不引入任何 npm 依赖。
 * Node 20+ 使用全局 fetch 抓取页面与调用 LLM。
 *
 * 经 `npm run proxy` 独立启动（默认端口 8787，可用 PORT 覆盖）。
 * 前端通过可配置的 proxyUrl（默认 http://localhost:8787）访问：
 *   GET  /api/health
 *   POST /api/fetch   { url }
 *   POST /api/llm     { system, prompt, model, baseUrl, apiKey }
 */

import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT) || 8787;
const FETCH_TIMEOUT_MS = 20_000;
const LLM_TIMEOUT_MS = 60_000;

function sendJson(res, status, body, headers = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...headers,
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > 5 * 1024 * 1024) {
        reject(new Error('请求体过大'));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (m) return m[1].replace(/\s+/g, ' ').trim();
  const og = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i);
  if (og) return og[1].trim();
  return '';
}

async function handleFetch(payload) {
  const target = String(payload?.url || '').trim();
  if (!target || !/^https?:\/\//i.test(target)) {
    return { ok: false, error: '缺少合法的 url（需以 http(s):// 开头）' };
  }
  const resp = await fetchWithTimeout(
    target,
    { method: 'GET', headers: { 'User-Agent': 'QuoteStudio/0.1 (+local proxy)' } },
    FETCH_TIMEOUT_MS,
  );
  const text = await resp.text();
  return {
    ok: true,
    url: target,
    status: resp.status,
    title: extractTitle(text),
    html: text.slice(0, 200_000), // 截断，避免把整页塞进 LLM
  };
}

async function handleLlm(payload) {
  const { system, prompt, model, baseUrl, apiKey } = payload || {};
  if (!baseUrl || !apiKey) {
    return { ok: false, error: '缺少 baseUrl 或 apiKey（请在设置中心配置 OpenAI 兼容 API）' };
  }
  const endpoint = String(baseUrl).replace(/\/+$/, '') + '/chat/completions';
  const resp = await fetchWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: String(system || '') },
          { role: 'user', content: String(prompt || '') },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    },
    LLM_TIMEOUT_MS,
  );
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    return { ok: false, error: `LLM 调用失败 (${resp.status}): ${errText.slice(0, 300)}` };
  }
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content ?? '';
  let parsed = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = null;
  }
  return { ok: true, raw: content, data: parsed };
}

const server = createServer(async (req, res) => {
  // CORS 预检
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    if (path === '/api/health' && req.method === 'GET') {
      sendJson(res, 200, { ok: true, service: 'quote-studio-proxy', ts: new Date().toISOString() });
      return;
    }

    if (path === '/api/fetch' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)) || '{}');
      const result = await handleFetch(body);
      sendJson(res, result.ok ? 200 : 400, result);
      return;
    }

    if (path === '/api/llm' && req.method === 'POST') {
      const body = JSON.parse((await readBody(req)) || '{}');
      const result = await handleLlm(body);
      sendJson(res, result.ok ? 200 : 400, result);
      return;
    }

    sendJson(res, 404, { ok: false, error: '未找到该接口' });
  } catch (err) {
    sendJson(res, 500, { ok: false, error: String(err?.message || err), reqId: randomUUID() });
  }
});

server.listen(PORT, () => {
  console.log(`[quote-studio] 代理已启动: http://localhost:${PORT}`);
  console.log('  接口: GET /api/health · POST /api/fetch · POST /api/llm');
});
