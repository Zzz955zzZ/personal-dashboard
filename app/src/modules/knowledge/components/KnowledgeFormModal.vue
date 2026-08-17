<script setup lang="ts">
/**
 * 知识条目表单弹窗 — 新建/编辑
 *
 * 表单顺序：标题 → 一句话总结 → 关键要点 → 链接 → 笔记 → 领域/类型 → 标签。
 * 一句话总结与要点各带中性字数计数（纯信息，不做精简提醒）。
 */
import { computed, onMounted, ref, watch } from 'vue';

import { useKnowledgeStore } from '../store/knowledge-store';
import { DOMAINS } from '../constants';
import type { KnowledgeItem } from '../types';

const props = defineProps<{
  open: boolean;
  itemId: number | null;
}>();

const emit = defineEmits<{
  (e: 'save'): void;
  (e: 'close'): void;
}>();

const store = useKnowledgeStore();

const title = ref('');
const url = ref('');
const urlStatus = ref('');
const summary = ref('');
const keyPointInputs = ref(['', '', '']);
const content = ref('');
const domain = ref('other');
const tagInput = ref('');
const tags = ref<string[]>([]);
const sourceType = ref<KnowledgeItem['sourceType']>('text');

const isEdit = computed(() => props.itemId !== null);

function reset(): void {
  title.value = '';
  url.value = '';
  urlStatus.value = '';
  summary.value = '';
  keyPointInputs.value = ['', '', ''];
  content.value = '';
  domain.value = 'other';
  tagInput.value = '';
  tags.value = [];
  sourceType.value = 'text';
}

function loadItem(): void {
  if (!props.itemId) return;
  const item = store.knowledge.find((k) => k.id === props.itemId);
  if (!item) return;
  title.value = item.title;
  url.value = item.url;
  summary.value = item.summary;
  keyPointInputs.value = [...item.keyPoints, '', '', ''].slice(0, 3);
  content.value = item.content;
  domain.value = item.domain;
  tags.value = [...item.tags];
  sourceType.value = item.sourceType;
  handleUrl();
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      if (isEdit.value) loadItem();
      else reset();
    }
  },
);

onMounted(() => {
  if (props.open) {
    if (isEdit.value) loadItem();
    else reset();
  }
});

/** 归一化链接：补全协议、去追踪参数、解析短链域名、移动端→桌面端 */
function normalizeUrl(raw: string): string {
  let u = raw.trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) {
    if (u.startsWith('//')) u = 'https:' + u;
    else u = 'https://' + u;
  }
  try {
    const urlObj = new URL(u);
    // 各平台分享链接常见追踪/无用参数（抖音 / 微信 / B站 / 知乎 / 小红书 等）
    const DROP = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'msclkid', 'mc_cid', 'mc_eid', 'igshid',
      'spm', 'spm_id_from', 'from', 'share', 'share_id', 'timestamp', 't', 'tk',
      'scene', 'subScene', 'channel_id', 'platform', 'business', 'ref', 'referrer',
      '_t', 'wt_scene', 'app', 'openId', 'chInfo', 'weixin', 'wxwork', 'bd_vid',
      'feature', 'si', 'ab_channel', 'click_id', 'vd_source', 'is_redirect',
    ];
    DROP.forEach((p) => urlObj.searchParams.delete(p));
    // 短链 / 移动端域名归一
    if (urlObj.hostname === 'youtu.be') {
      const v = urlObj.pathname.slice(1);
      urlObj.hostname = 'www.youtube.com';
      urlObj.pathname = '/watch';
      urlObj.searchParams.set('v', v);
    }
    urlObj.hostname = urlObj.hostname.replace(/^m\./, '').replace(/^mobile\./, '');
    urlObj.pathname = urlObj.pathname.replace(/\/+$/, '') || '/';
    return urlObj.toString();
  } catch {
    return u;
  }
}

/** 平台中文名映射 + 路径语义化，用作建议标题 */
function suggestTitleFromUrl(u: string): string {
  try {
    const urlObj = new URL(u);
    const host = urlObj.hostname.replace(/^www\./, '');
    const map: Record<string, string> = {
      'youtube.com': 'YouTube 视频',
      'bilibili.com': 'B 站视频',
      'douyin.com': '抖音视频',
      'v.douyin.com': '抖音视频',
      'x.com': 'X 帖子',
      'twitter.com': 'Twitter 帖子',
      'zhihu.com': '知乎文章',
      'xiaohongshu.com': '小红书笔记',
      'mp.weixin.qq.com': '微信公众号文章',
      'github.com': 'GitHub 项目',
      'openai.com': 'OpenAI 文档',
    };
    if (map[host]) return map[host];
    const seg = urlObj.pathname.split('/').filter(Boolean).pop() || host;
    const cleaned = seg.replace(/[-_]/g, ' ').replace(/\.\w+$/, '');
    return cleaned ? cleaned.slice(0, 40) : host;
  } catch {
    return '';
  }
}

/** 粘贴/输入链接时：归一化 + 识别类型 + 建议标题 + 状态提示 */
function handleUrl(): void {
  const norm = normalizeUrl(url.value);
  if (norm && norm !== url.value) url.value = norm;
  if (!url.value) {
    sourceType.value = 'text';
    urlStatus.value = '';
    return;
  }
  const lower = url.value.toLowerCase();
  const VIDEO = /douyin\.com|youtube\.com|youtu\.be|bilibili\.com|v\.qq\.com|xiaohongshu|v\.kuaishou|ixigua/;
  if (VIDEO.test(lower) || lower.includes('video')) {
    sourceType.value = 'video';
    urlStatus.value = '🎬 已识别为视频链接';
  } else {
    sourceType.value = 'link';
    urlStatus.value = '🔗 已识别为文章 / 网页链接';
  }
  if (!title.value.trim()) {
    const sug = suggestTitleFromUrl(url.value);
    if (sug) title.value = sug;
  }
}

function addTag(): void {
  const t = tagInput.value.trim();
  if (t && !tags.value.includes(t)) {
    tags.value.push(t);
    tagInput.value = '';
  }
}

function removeTag(t: string): void {
  tags.value = tags.value.filter((x) => x !== t);
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    e.preventDefault();
    addTag();
  }
}

function save(): void {
  const t = title.value.trim();
  if (!t) return;

  const keyPoints = keyPointInputs.value.map((s) => s.trim()).filter(Boolean);

  if (isEdit.value && props.itemId) {
    store.updateKnowledge(props.itemId, {
      title: t,
      url: url.value.trim(),
      summary: summary.value.trim(),
      keyPoints,
      content: content.value.trim(),
      domain: domain.value,
      tags: [...tags.value],
      sourceType: sourceType.value,
    });
  } else {
    store.addKnowledge({
      title: t,
      url: url.value.trim(),
      summary: summary.value.trim(),
      keyPoints,
      content: content.value.trim(),
      domain: domain.value,
      tags: [...tags.value],
      sourceType: sourceType.value,
    });
  }

  emit('save');
}
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" @click.self="emit('close')">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="emit('close')" />

        <div class="relative w-full sm:max-w-lg bg-coral-50 rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
          <!-- 标题 -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-paper-200/60">
            <h3 class="text-base font-semibold text-ink">{{ isEdit ? '编辑知识' : '添加知识' }}</h3>
            <button
              class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-paper-100 text-paper-400"
              @click="emit('close')"
            >
              ✕
            </button>
          </div>

          <!-- 表单 -->
          <div class="px-5 py-4 space-y-4">
            <!-- 标题 -->
            <div>
              <label class="block text-xs font-medium text-paper-600 mb-1">标题 *</label>
              <input
                v-model="title"
                type="text"
                placeholder="这条知识关于什么？"
                class="w-full px-3 py-2.5 rounded-xl border border-paper-300/60 bg-white text-sm outline-none focus:border-coral-400 transition-colors placeholder:text-paper-400"
                maxlength="300"
                autofocus
              />
            </div>

            <!-- 一句话总结 -->
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="text-xs font-medium text-paper-600">一句话总结 *</label>
                <span class="text-[10px] text-paper-400 tabular-nums">{{ summary.length }}</span>
              </div>
              <textarea
                v-model="summary"
                placeholder="用一句话说清核心观点"
                rows="2"
                class="w-full px-3 py-2.5 rounded-xl border border-paper-300/60 bg-white text-sm outline-none focus:border-coral-400 transition-colors resize-none placeholder:text-paper-400"
                maxlength="150"
              />
            </div>

            <!-- 关键要点 -->
            <div>
              <label class="block text-xs font-medium text-paper-600 mb-1">关键要点（最多 3 条）</label>
              <div class="space-y-2">
                <div v-for="(_, i) in keyPointInputs" :key="i" class="relative">
                  <input
                    v-model="keyPointInputs[i]"
                    type="text"
                    :placeholder="`要点 ${i + 1}`"
                    class="w-full px-3 py-2 pr-12 rounded-lg border border-paper-300/60 bg-white text-sm outline-none focus:border-coral-400 transition-colors placeholder:text-paper-400"
                    maxlength="100"
                  />
                  <span
                    class="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-paper-300 tabular-nums"
                  >
                    {{ keyPointInputs[i].length }}
                  </span>
                </div>
              </div>
            </div>

            <!-- 链接（可选） -->
            <div>
              <label class="block text-xs font-medium text-paper-600 mb-1">链接（可选）</label>
              <div class="flex gap-2">
                <input
                  v-model="url"
                  type="text"
                  placeholder="粘贴链接，自动识别…"
                  class="flex-1 px-3 py-2.5 rounded-xl border border-paper-300/60 bg-white text-sm outline-none focus:border-coral-400 transition-colors placeholder:text-paper-400"
                  @input="handleUrl"
                  @change="handleUrl"
                />
                <a
                  v-if="url"
                  :href="url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="shrink-0 px-3 py-2.5 rounded-xl border border-paper-300/60 text-xs font-medium text-paper-600 hover:bg-paper-100 transition-colors flex items-center"
                >
                  打开 ↗
                </a>
              </div>
              <p v-if="urlStatus" class="mt-1 text-[10px] text-coral-500 font-medium">{{ urlStatus }}</p>
              <p v-else class="mt-1 text-[10px] text-paper-400">
                粘贴链接自动识别类型
              </p>
            </div>

            <!-- 详细笔记 -->
            <div>
              <label class="block text-xs font-medium text-paper-600 mb-1">详细笔记（可选）</label>
              <textarea
                v-model="content"
                placeholder="完整记录你的想法、摘抄、感悟..."
                rows="4"
                class="w-full px-3 py-2.5 rounded-xl border border-paper-300/60 bg-white text-sm outline-none focus:border-coral-400 transition-colors resize-none placeholder:text-paper-400"
                maxlength="10000"
              />
            </div>

            <!-- 领域 + 来源类型 横排 -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-paper-600 mb-1">领域</label>
                <select
                  v-model="domain"
                  class="w-full px-3 py-2 rounded-lg border border-paper-300/60 bg-white text-sm outline-none cursor-pointer"
                >
                  <option v-for="d in DOMAINS" :key="d.key" :value="d.key">
                    {{ d.emoji }} {{ d.label }}
                  </option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-medium text-paper-600 mb-1">来源类型</label>
                <select
                  v-model="sourceType"
                  class="w-full px-3 py-2 rounded-lg border border-paper-300/60 bg-white text-sm outline-none cursor-pointer"
                >
                  <option value="text">📝 文本/笔记</option>
                  <option value="link">🔗 链接/文章</option>
                  <option value="video">🎬 视频</option>
                </select>
              </div>
            </div>

            <!-- 标签 -->
            <div>
              <label class="block text-xs font-medium text-paper-600 mb-1">标签</label>
              <div class="flex flex-wrap gap-1.5 mb-2">
                <span
                  v-for="t in tags"
                  :key="t"
                  class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-coral-100 text-coral-700"
                >
                  #{{ t }}
                  <button class="text-coral-500 leading-none" @click="removeTag(t)">×</button>
                </span>
              </div>
              <input
                v-model="tagInput"
                type="text"
                placeholder="输入标签按回车..."
                class="w-full px-3 py-2 rounded-lg border border-paper-300/60 bg-white text-sm outline-none focus:border-coral-400 transition-colors placeholder:text-paper-400"
                maxlength="30"
                @keydown="handleKeydown"
              />
            </div>
          </div>

          <!-- 底部按钮 -->
          <div class="flex gap-3 px-5 py-4 border-t border-paper-200/60">
            <button
              class="flex-1 px-4 py-2.5 rounded-xl border border-paper-300/60 text-sm font-medium text-paper-600 hover:bg-paper-100 transition-colors"
              @click="emit('close')"
            >
              取消
            </button>
            <button
              class="flex-1 px-4 py-2.5 rounded-xl bg-coral-500 text-sm font-medium text-white hover:bg-coral-400 transition-colors disabled:opacity-40"
              :disabled="!title.trim() || !summary.trim()"
              @click="save"
            >
              {{ isEdit ? '保存' : '添加' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>
