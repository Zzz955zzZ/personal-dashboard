/**
 * 知识库 + 日记模块类型定义
 *
 * 双引擎：知识条目（Knowledge）+ 日记（Diary）。
 */

/* ---- 知识条目 ---- */
export type KnowledgeStatus = 'active' | 'archived';

export interface KnowledgeItem {
  id: number;
  title: string;           // 自动抓取或手动输入
  url: string;             // 原始链接（可为空，纯文本知识）
  summary: string;         // 一句话总结（AI 辅助或手写）
  keyPoints: string[];     // 3-5 个要点
  content: string;         // 完整内容/笔记
  domain: string;          // 领域分类 key
  tags: string[];          // 自定义标签
  starred: boolean;        // 星标
  status: KnowledgeStatus;
  sourceType: 'link' | 'text' | 'video';
  reviewedAt: string;      // 上次复习时间 YYYY-MM-DD 或 ''
  createdAt: string;
  updatedAt: string;
}

/* ---- 日记 ---- */
export type MoodType = 'great' | 'good' | 'okay' | 'meh' | 'bad';

export interface DiaryEntry {
  id: number;
  date: string;            // YYYY-MM-DD
  mood: MoodType;
  content: string;         // 正文
  gratitude: string;       // 今日感恩（一句话）
  todoSummary: string;     // 当日待办完成情况摘要
  createdAt: string;
  updatedAt: string;
}

/** 领域定义 */
export interface DomainDef {
  key: string;
  label: string;
  emoji: string;
  color: string;           // Tailwind bg class
}

/** 持久化 */
export interface KnowledgePersistedState {
  knowledge: KnowledgeItem[];
  diaries: DiaryEntry[];
  nextKid: number;
  nextDid: number;
}
