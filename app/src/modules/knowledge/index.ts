/**
 * 知识库 + 日记模块公开 API
 */
export { useKnowledgeStore } from './store/knowledge-store';
export { knowledgeRoutes } from './routes';
export { DOMAINS, MOODS, KNOWLEDGE_DB_KEY } from './constants';
export type {
  KnowledgeItem,
  DiaryEntry,
  KnowledgeStatus,
  MoodType,
  DomainDef,
  KnowledgePersistedState,
} from './types';
