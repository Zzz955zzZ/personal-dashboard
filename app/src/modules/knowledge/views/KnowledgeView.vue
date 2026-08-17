<script setup lang="ts">
/**
 * 知识库 + 日记 主视图
 *
 * 双 Tab：知识库（链接/文本/视频）+ 日记（每日一记）。
 * 简约高级风格，与整体 app 协调。
 */
import { computed, onMounted, ref } from 'vue';

import { useKnowledgeStore } from '../store/knowledge-store';
import { DOMAINS, MOODS } from '../constants';
import KnowledgeFormModal from '../components/KnowledgeFormModal.vue';
import DiaryEntryModal from '../components/DiaryEntryModal.vue';

const store = useKnowledgeStore();

const showKnowledgeForm = ref(false);
const editKnowledgeId = ref<number | null>(null);
const showDiaryForm = ref(false);
const diaryDate = ref(new Date().toISOString().slice(0, 10));
const expandedKnowledgeId = ref<number | null>(null);

onMounted(() => {
  store.hydrate();
});

/** 今天日期字符串 */
const today = new Date().toISOString().slice(0, 10);

function getDomain(key: string) {
  return DOMAINS.find((d) => d.key === key);
}

function openAddKnowledge(): void {
  editKnowledgeId.value = null;
  showKnowledgeForm.value = true;
}

function openEditKnowledge(id: number): void {
  editKnowledgeId.value = id;
  showKnowledgeForm.value = true;
}

function openDiary(date?: string): void {
  diaryDate.value = date || today;
  showDiaryForm.value = true;
}

function toggleExpand(id: number): void {
  expandedKnowledgeId.value = expandedKnowledgeId.value === id ? null : id;
}

function onKnowledgeSaved(): void {
  showKnowledgeForm.value = false;
  editKnowledgeId.value = null;
}

function onDiarySaved(): void {
  showDiaryForm.value = false;
}

/** 日历日期列表（当月） */
const calendarDays = computed(() => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0);
  const days: { date: string; dayNum: number; isToday: boolean; hasDiary: boolean }[] = [];

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      date: dateStr,
      dayNum: d,
      isToday: dateStr === today,
      hasDiary: !!store.getDiaryByDate(dateStr),
    });
  }
  return days;
});
</script>

<template>
  <div class="min-h-screen bg-paper-50">
    <!-- 顶栏 -->
    <div class="sticky top-16 z-20 bg-paper-50/95 backdrop-blur border-b border-paper-200/60 px-4 sm:px-5 pt-2 sm:pt-3 pb-0">
      <!-- Tab 切换 -->
      <div class="flex gap-4 sm:gap-6 mb-2">
        <button
          class="pb-2 sm:pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors"
          :class="
            store.activeTab === 'knowledge'
              ? 'border-coral-500 text-ink'
              : 'border-transparent text-paper-500 hover:text-paper-700'
          "
          @click="store.activeTab = 'knowledge'"
        >
          📚 知识库
          <span
            v-if="store.filteredKnowledge.length > 0"
            class="ml-1.5 text-xs font-normal text-paper-400"
          >
            ({{ store.filteredKnowledge.length }})
          </span>
        </button>
        <button
          class="pb-2 sm:pb-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors"
          :class="
            store.activeTab === 'diary'
              ? 'border-coral-500 text-ink'
              : 'border-transparent text-paper-500 hover:text-paper-700'
          "
          @click="store.activeTab = 'diary'"
        >
          📔 日记
        </button>
      </div>
    </div>

    <!-- ====== 知识库 Tab ====== -->
    <div v-if="store.activeTab === 'knowledge'" class="px-4 sm:px-5 pb-24">
      <!-- 工具栏 -->
      <div class="flex items-center gap-2 sm:gap-3 py-2 sm:py-3">
        <!-- 搜索 -->
        <div class="flex-1 relative">
          <input
            v-model="store.searchQuery"
            type="text"
            placeholder="搜索知识..."
            class="w-full pl-8 sm:pl-9 pr-2 sm:pr-3 py-1.5 sm:py-2 rounded-xl border border-paper-200/80 bg-white text-xs sm:text-sm outline-none focus:border-coral-300 transition-colors placeholder:text-paper-400"
          />
          <span class="absolute left-3 top-1/2 -translate-y-1/2 text-paper-400 text-sm">🔍</span>
        </div>
        <!-- 新建按钮 -->
        <button
          class="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-coral-500 text-white shadow-sm hover:bg-coral-400 active:scale-95 transition-all shrink-0"
          @click="openAddKnowledge()"
        >
          +
        </button>
      </div>

      <!-- 领域筛选 + 星标 -->
      <div class="flex items-center gap-1.5 sm:gap-2 pb-2 sm:pb-3 overflow-x-auto scrollbar-hide">
        <button
          class="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all"
          :class="
            store.filterDomain === 'all'
              ? 'bg-ink text-white'
              : 'bg-white border border-paper-200 text-paper-600 hover:border-coral-300'
          "
          @click="store.filterDomain = 'all'"
        >
          全部
        </button>
        <button
          v-for="d in DOMAINS"
          :key="d.key"
          class="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-medium whitespace-nowrap transition-all"
          :class="
            store.filterDomain === d.key
              ? 'bg-ink text-white'
              : `bg-white border border-paper-200 text-paper-600 hover:border-coral-300`
          "
          @click="store.filterDomain = d.key"
        >
          {{ d.emoji }} {{ d.label }}
          <span v-if="store.domainStats.get(d.key)" class="ml-1 opacity-50">{{ store.domainStats.get(d.key) }}</span>
        </button>
        <button
          class="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all"
          :class="
            store.showStarredOnly
              ? 'bg-amber-100 text-amber-700 border border-amber-300'
              : 'bg-white border border-paper-200 text-paper-400 hover:text-amber-600'
          "
          @click="store.showStarredOnly = !store.showStarredOnly"
        >
          ⭐ 星标
        </button>
      </div>

      <!-- 复习提示 -->
      <div
        v-if="store.dueForReview.length > 0"
        class="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200/60"
      >
        <span class="text-xs font-medium text-amber-700">
          💡 有 {{ store.dueForReview.length }} 条知识待复习（超过7天未回顾）
        </span>
      </div>

      <!-- 知识卡片列表 -->
      <div class="space-y-3">
        <div
          v-for="item in store.filteredKnowledge"
          :key="item.id"
          class="rounded-xl border border-paper-200/60 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow"
        >
          <!-- 卡片头部 -->
          <div class="p-4 cursor-pointer" @click="toggleExpand(item.id)">
            <div class="flex items-start gap-3">
              <!-- 域标签 -->
              <span
                class="mt-0.5 w-8 h-8 flex items-center justify-center rounded-lg text-base shrink-0"
                :class="getDomain(item.domain)?.color || 'bg-gray-50'"
              >
                {{ getDomain(item.domain)?.emoji || '📌' }}
              </span>

              <!-- 标题行 -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2">
                  <h4 class="text-sm font-semibold text-ink truncate leading-snug">
                    {{ item.title }}
                  </h4>
                  <button
                    v-if="item.starred"
                    class="text-amber-400 shrink-0"
                    @click.stop="store.toggleStar(item.id)"
                  >
                    ★
                  </button>
                  <button
                    v-else
                    class="text-paper-300 shrink-0"
                    @click.stop="store.toggleStar(item.id)"
                  >
                    ☆
                  </button>
                </div>

                <!-- 摘要 -->
                <p v-if="item.summary" class="mt-1 text-xs text-paper-500 line-clamp-2 leading-relaxed">
                  {{ item.summary }}
                </p>

                <!-- 元信息 -->
                <div class="flex items-center gap-2 mt-2 flex-wrap">
                  <span
                    v-for="tag in item.tags.slice(0, 3)"
                    :key="tag"
                    class="text-[10px] px-1.5 py-0.5 rounded-full bg-paper-100 text-paper-500"
                  >
                    #{{ tag }}
                  </span>
                  <a
                    v-if="item.sourceType === 'link' && item.url"
                    :href="item.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    @click.stop
                    class="text-[10px] text-blue-500 truncate max-w-[140px] hover:underline"
                  >
                    🔗 {{ item.url.replace(/^https?:\/\/(www\.)?/, '') }}
                  </a>
                  <span v-if="item.sourceType === 'video'" class="text-[10px] text-purple-400">
                    🎬 视频
                  </span>
                </div>
              </div>

              <!-- 展开/收起箭头 -->
              <span class="text-paper-400 text-xs shrink-0 mt-1 transition-transform" :class="{ 'rotate-180': expandedKnowledgeId === item.id }">
                ▾
              </span>
            </div>
          </div>

          <!-- 展开内容 -->
          <div
            v-if="expandedKnowledgeId === item.id"
            class="px-4 pb-4 border-t border-paper-100 space-y-3"
          >
            <!-- 要点 -->
            <div v-if="item.keyPoints.length > 0">
              <h5 class="text-xs font-semibold text-paper-600 uppercase tracking-wide">要点</h5>
              <ul class="list-none space-y-1 mt-1.5">
                <li
                  v-for="(point, i) in item.keyPoints"
                  :key="i"
                  class="text-xs text-paper-700 pl-4 relative before:content-['•'] before:absolute before:left-0 before:text-coral-400"
                >
                  {{ point }}
                </li>
              </ul>
            </div>

            <!-- 完整内容 -->
            <div v-if="item.content">
              <h5 class="text-xs font-semibold text-paper-600 uppercase tracking-wide">笔记</h5>
              <p class="text-xs text-paper-700 mt-1.5 leading-relaxed whitespace-pre-wrap">{{ item.content }}</p>
            </div>

            <!-- 操作按钮 -->
            <div class="flex items-center gap-2 pt-1">
              <button
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-coral-50 text-coral-600 hover:bg-coral-100 transition-colors"
                @click.stop="openEditKnowledge(item.id)"
              >
                编辑
              </button>
              <button
                class="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                @click.stop="store.markReviewed(item.id)"
              >
                ✓ 已复习
              </button>
              <button
                class="px-3 py-1.5 rounded-lg text-xs font-medium text-red-50 text-red-500 hover:bg-red-100 transition-colors"
                @click.stop="store.deleteKnowledge(item.id)"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div
        v-if="store.filteredKnowledge.length === 0"
        class="flex flex-col items-center justify-center py-20 text-paper-400"
      >
        <span class="text-4xl mb-3">🧠</span>
        <span class="text-sm font-medium">知识库还是空的</span>
        <span class="text-xs mt-1">记录链接、要点与感悟，构建你的第二大脑</span>
        <button
          class="mt-4 px-5 py-2.5 rounded-xl bg-coral-500 text-white text-sm font-medium hover:bg-coral-400 transition-colors"
          @click="openAddKnowledge()"
        >
          添加第一条知识
        </button>
      </div>
    </div>

    <!-- ====== 日记 Tab ====== -->
    <div v-if="store.activeTab === 'diary'" class="px-5 pb-24">
      <!-- 日历迷你条 -->
      <div class="py-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <button
          v-for="day in calendarDays"
          :key="day.date"
          class="w-9 h-9 flex flex-col items-center justify-center rounded-xl text-xs shrink-0 transition-all"
          :class="
            day.isToday
              ? 'bg-coral-500 text-white font-bold shadow-sm'
              : day.hasDiary
                ? 'bg-coral-50 text-coral-600 font-medium'
                : 'bg-white border border-paper-200 text-paper-500 hover:border-coral-300'
          "
          @click="openDiary(day.date)"
        >
          <span class="text-[10px] opacity-70">{{ ['日','一','二','三','四','五','六'][new Date(day.date).getDay()] }}</span>
          <span>{{ day.dayNum }}</span>
        </button>
      </div>

      <!-- 今日日记快捷入口 -->
      <div
        class="my-4 p-4 rounded-xl border border-dashed border-paper-300 bg-white cursor-pointer hover:border-coral-300 hover:bg-coral-50/30 transition-colors"
        @click="openDiary(today)"
      >
        <div class="flex items-center gap-3">
          <span class="text-2xl">{{ MOODS.find(m => m.key === store.getDiaryByDate(today)?.mood)?.emoji || '✏️' }}</span>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium text-paper-500">今日 · {{ today }}</div>
            <div class="text-sm text-ink font-medium truncate mt-0.5">
              {{ store.getDiaryByDate(today)?.content || '点击写今天的日记...' }}
            </div>
          </div>
          <span class="text-paper-400 text-sm">→</span>
        </div>
      </div>

      <!-- 日记列表 -->
      <div class="space-y-3">
        <div
          v-for="entry in store.recentDiary"
          :key="entry.id"
          class="p-4 rounded-xl bg-white border border-paper-200/60 shadow-sm"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="text-lg">{{ MOODS.find(m => m.key === entry.mood)?.emoji || '😐' }}</span>
              <span class="text-xs font-semibold text-ink">{{ entry.date }}</span>
            </div>
            <button
              class="text-xs text-coral-500 font-medium hover:text-coral-600"
              @click="openDiary(entry.date)"
            >
              编辑
            </button>
          </div>
          <p class="text-sm text-paper-700 line-clamp-3 leading-relaxed whitespace-pre-wrap">
            {{ entry.content || '(空)' }}
          </p>
          <div v-if="entry.gratitude" class="mt-2 pt-2 border-t border-paper-100">
            <span class="text-[10px] text-amber-600 font-medium">🙏 {{ entry.gratitude }}</span>
          </div>
        </div>
      </div>

      <!-- 日记空状态 -->
      <div
        v-if="store.recentDiary.length === 0"
        class="flex flex-col items-center justify-center py-20 text-paper-400"
      >
        <span class="text-4xl mb-3">📔</span>
        <span class="text-sm font-medium">还没有日记</span>
        <span class="text-xs mt-1">记录每天的想法和感悟</span>
        <button
          class="mt-4 px-5 py-2.5 rounded-xl bg-coral-500 text-white text-sm font-medium hover:bg-coral-400 transition-colors"
          @click="openDiary()"
        >
          写第一篇日记
        </button>
      </div>
    </div>

    <!-- 弹窗 -->
    <KnowledgeFormModal
      :open="showKnowledgeForm"
      :item-id="editKnowledgeId"
      @save="onKnowledgeSaved"
      @close="showKnowledgeForm = false"
    />
    <DiaryEntryModal
      :open="showDiaryForm"
      :date="diaryDate"
      @save="onDiarySaved"
      @close="showDiaryForm = false"
    />
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
