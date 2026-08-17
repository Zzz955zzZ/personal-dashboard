/**
 * 知识库 + 日记 Pinia Store
 *
 * 双引擎：知识条目管理 + 日记管理。
 * 支持领域筛选、搜索、星标、与待办联动。
 */

import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import type { DiaryEntry, KnowledgeItem } from '../types';
import { DOMAINS } from '../constants';
import { loadKnowledgeState, saveKnowledgeState } from './persistence';

export const useKnowledgeStore = defineStore('knowledge', () => {
  /* ---- 状态 ---- */
  const knowledge = ref<KnowledgeItem[]>([]);
  const diaries = ref<DiaryEntry[]>([]);
  const nextKid = ref(1);
  const nextDid = ref(1);

  // UI 状态
  const activeTab = ref<'knowledge' | 'diary'>('knowledge');
  const filterDomain = ref<string>('all');
  const searchQuery = ref('');
  const showStarredOnly = ref(false);

  let dirty = false;

  /* ---- 初始化 ---- */
  function hydrate(): void {
    const { found, state } = loadKnowledgeState();
    if (found) {
      knowledge.value = state.knowledge;
      diaries.value = state.diaries;
      nextKid.value = state.nextKid;
      nextDid.value = state.nextDid;
    }
  }

  function persist(): void {
    if (!dirty) return;
    saveKnowledgeState({
      knowledge: knowledge.value,
      diaries: diaries.value,
      nextKid: nextKid.value,
      nextDid: nextDid.value,
    });
    dirty = false;
  }

  function markDirty(): void {
    dirty = true;
  }

  /* ---- 知识 CRUD ---- */
  function addKnowledge(payload: {
    title: string;
    url: string;
    summary: string;
    keyPoints: string[];
    content: string;
    domain: string;
    tags: string[];
    sourceType: KnowledgeItem['sourceType'];
  }): KnowledgeItem {
    const now = new Date().toISOString();
    const item: KnowledgeItem = {
      id: nextKid.value++,
      title: payload.title,
      url: payload.url,
      summary: payload.summary,
      keyPoints: payload.keyPoints,
      content: payload.content,
      domain: payload.domain,
      tags: payload.tags,
      starred: false,
      status: 'active',
      sourceType: payload.sourceType,
      reviewedAt: '',
      createdAt: now,
      updatedAt: now,
    };
    knowledge.value.unshift(item); // 新的排前面
    markDirty();
    persist();
    return item;
  }

  function updateKnowledge(id: number, changes: Partial<Omit<KnowledgeItem, 'id' | 'createdAt'>>): boolean {
    const idx = knowledge.value.findIndex((k) => k.id === id);
    if (idx === -1) return false;
    knowledge.value[idx] = { ...knowledge.value[idx], ...changes, updatedAt: new Date().toISOString() };
    markDirty();
    persist();
    return true;
  }

  function deleteKnowledge(id: number): boolean {
    const idx = knowledge.value.findIndex((k) => k.id === id);
    if (idx === -1) return false;
    knowledge.value.splice(idx, 1);
    markDirty();
    persist();
    return true;
  }

  function toggleStar(id: number): boolean {
    const item = knowledge.value.find((k) => k.id === id);
    if (!item) return false;
    item.starred = !item.starred;
    item.updatedAt = new Date().toISOString();
    markDirty();
    persist();
    return true;
  }

  function markReviewed(id: number): boolean {
    return updateKnowledge(id, { reviewedAt: new Date().toISOString().slice(0, 10) });
  }

  /* ---- 日记 CRUD ---- */
  function getOrCreateDiary(date: string): DiaryEntry {
    let entry = diaries.value.find((d) => d.date === date);
    if (!entry) {
      entry = {
        id: nextDid.value++,
        date,
        mood: 'okay',
        content: '',
        gratitude: '',
        todoSummary: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      diaries.value.push(entry);
      markDirty();
      persist();
    }
    return entry;
  }

  function saveDiary(date: string, changes: Partial<Omit<DiaryEntry, 'id' | 'date' | 'createdAt'>>): boolean {
    const idx = diaries.value.findIndex((d) => d.date === date);
    if (idx === -1) {
      // 不存在则创建
      const entry = getOrCreateDiary(date);
      Object.assign(entry, changes, { updatedAt: new Date().toISOString() });
      return true;
    }
    Object.assign(diaries.value[idx], changes, { updatedAt: new Date().toISOString() });
    markDirty();
    persist();
    return true;
  }

  /* ---- 查询：知识过滤 ---- */
  const filteredKnowledge = computed(() => {
    let list = knowledge.value.filter((k) => k.status === 'active');

    if (filterDomain.value !== 'all') {
      list = list.filter((k) => k.domain === filterDomain.value);
    }
    if (showStarredOnly.value) {
      list = list.filter((k) => k.starred);
    }
    const q = searchQuery.value.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (k) =>
          k.title.toLowerCase().includes(q) ||
          k.summary.toLowerCase().includes(q) ||
          k.keyPoints.some((p) => p.toLowerCase().includes(q)) ||
          k.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    // 星标排前，然后按更新时间降序
    return [...list].sort((a, b) => {
      if (a.starred !== b.starred) return a.starred ? -1 : 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  });

  /** 需要复习的知识（超过7天未复习） */
  const dueForReview = computed(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const cutoff = weekAgo.toISOString().slice(0, 10);

    return knowledge.value.filter(
      (k) =>
        k.status === 'active' &&
        (!k.reviewedAt || k.reviewedAt < cutoff),
    );
  });

  /** 各领域统计 */
  const domainStats = computed(() => {
    const map = new Map<string, number>();
    for (const k of knowledge.value) {
      if (k.status !== 'active') continue;
      map.set(k.domain, (map.get(k.domain) || 0) + 1);
    }
    return map;
  });

  /** 获取某天的日记 */
  function getDiaryByDate(date: string): DiaryEntry | undefined {
    return diaries.value.find((d) => d.date === date);
  }

  /** 最近 N 条日记 */
  const recentDiaries = computed(() =>
    [...diaries.value].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 30),
  );

  return {
    // 状态
    knowledge,
    diaries,
    activeTab,
    filterDomain,
    searchQuery,
    showStarredOnly,

    // 操作
    hydrate,
    persist,
    addKnowledge,
    updateKnowledge,
    deleteKnowledge,
    toggleStar,
    markReviewed,
    getOrCreateDiary,
    saveDiary,

    // 查询
    filteredKnowledge,
    dueForReview,
    domainStats,
    getDiaryByDate,
    recentDiary: recentDiaries,

    // 常量
    DOMAINS,
  };
});
