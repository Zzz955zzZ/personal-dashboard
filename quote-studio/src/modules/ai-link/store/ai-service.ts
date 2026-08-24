/**
 * AI 链接识别服务（P1）。
 *
 * 经本地零依赖代理 server/proxy.mjs 抓取页面 + 调用 OpenAI 兼容 LLM，
 * 返回结构化字段。强约束 #8：cost / margin 一律返回 null，由人工确认后填价。
 *
 * 若设置中心未配置 openaiConfig，recognize 会直接抛错（前端据此禁用 AI 按钮）。
 */

import { ref } from 'vue';
import { defineStore } from 'pinia';

import { useSettingsStore } from '@/modules/settings';
import { DEFAULT_PROXY_URL } from '../constants';
import type { AiRecognizedProduct } from '../types';

type AiStatus = 'idle' | 'fetching' | 'parsing' | 'done' | 'error';

const SYSTEM_PROMPT = `你是室内设计工作室的报价助理。用户会给你一个产品网页的标题与正文（可能含 HTML）。
请从中提取产品信息，并只返回一个 JSON 对象，字段严格如下（不要任何解释、不要 markdown 代码块）：
{
  "categoryGroup": "建议的大类（如 硬装 / 软装 / 主材 / 灯具 / 家具）",
  "subCategory": "建议的小类（如 沙发 / 瓷砖 / 吊灯）",
  "name": "产品名称",
  "brand": "品牌",
  "model": "型号",
  "photoUrl": "主图 URL（若没有则为空字符串）",
  "size": "尺寸",
  "material": "材质",
  "description": "简短描述"
}
注意：不要猜测价格，"cost" 与 "margin" 字段不要返回（由人工确认）。`;

export const useAIService = defineStore('ai-link', () => {
  const status = ref<AiStatus>('idle');
  const error = ref<string | null>(null);
  const lastRaw = ref<string>('');

  function isConfigured(): boolean {
    const cfg = useSettingsStore().settings.openaiConfig;
    return !!(cfg && cfg.baseUrl && cfg.apiKey);
  }

  async function recognize(url: string): Promise<AiRecognizedProduct> {
    const cfg = useSettingsStore().settings.openaiConfig;
    if (!cfg || !cfg.baseUrl || !cfg.apiKey) {
      status.value = 'error';
      error.value = '未配置 OpenAI 兼容 API（请在设置中心填写 baseUrl / apiKey / model）。';
      throw new Error(error.value);
    }
    const target = url.trim();
    if (!/^https?:\/\//i.test(target)) {
      status.value = 'error';
      error.value = '请输入合法的 http(s) 链接。';
      throw new Error(error.value);
    }

    error.value = null;
    try {
      // 1) 抓取页面
      status.value = 'fetching';
      const fetchResp = await fetch(`${DEFAULT_PROXY_URL}/api/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });
      const fetchJson = await fetchResp.json();
      if (!fetchJson?.ok) {
        throw new Error(fetchJson?.error || '页面抓取失败。');
      }

      // 2) 调用 LLM 结构化
      status.value = 'parsing';
      const userPrompt = `页面标题：${fetchJson.title || ''}\n页面内容：\n${String(fetchJson.html || '').slice(0, 20000)}`;
      const llmResp = await fetch(`${DEFAULT_PROXY_URL}/api/llm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: SYSTEM_PROMPT,
          prompt: userPrompt,
          model: cfg.model,
          baseUrl: cfg.baseUrl,
          apiKey: cfg.apiKey,
        }),
      });
      const llmJson = await llmResp.json();
      if (!llmJson?.ok) {
        throw new Error(llmJson?.error || 'LLM 识别失败。');
      }
      const data = llmJson.data ?? {};
      lastRaw.value = typeof llmJson.raw === 'string' ? llmJson.raw : JSON.stringify(data);

      // 3) 映射（cost / margin 强制为 null —— 强约束 #8）
      const product: AiRecognizedProduct = {
        url: target,
        categoryGroup: String(data.categoryGroup || ''),
        subCategory: String(data.subCategory || ''),
        name: String(data.name || ''),
        brand: String(data.brand || ''),
        model: String(data.model || ''),
        photoUrl: String(data.photoUrl || ''),
        size: String(data.size || ''),
        material: String(data.material || ''),
        description: String(data.description || ''),
        cost: null,
        margin: null,
      };
      status.value = 'done';
      return product;
    } catch (e) {
      status.value = 'error';
      error.value = e instanceof Error ? e.message : String(e);
      throw e;
    }
  }

  function reset(): void {
    status.value = 'idle';
    error.value = null;
    lastRaw.value = '';
  }

  return { status, error, lastRaw, isConfigured, recognize, reset };
});
