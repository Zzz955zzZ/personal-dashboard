<script setup lang="ts">
/**
 * 日记条目弹窗 — 写/编辑日记
 *
 * 支持心情选择、正文、感恩、待办摘要。
 */
import { computed, onMounted, ref, watch } from 'vue';

import { useKnowledgeStore } from '../store/knowledge-store';
import { MOODS } from '../constants';
import type { MoodType } from '../types';

const props = defineProps<{
  open: boolean;
  date: string;
}>();

const emit = defineEmits<{
  (e: 'save'): void;
  (e: 'close'): void;
}>();

const store = useKnowledgeStore();

const mood = ref<MoodType>('okay');
const content = ref('');
const gratitude = ref('');
const todoSummary = ref('');

function reset(): void {
  mood.value = 'okay';
  content.value = '';
  gratitude.value = '';
  todoSummary.value = '';
}

function loadDiary(): void {
  const entry = store.getDiaryByDate(props.date);
  if (!entry) return;
  mood.value = entry.mood;
  content.value = entry.content;
  gratitude.value = entry.gratitude;
  todoSummary.value = entry.todoSummary;
}

watch(
  () => props.open,
  (v) => {
    if (v) loadDiary();
    else reset();
  },
);

watch(
  () => props.date,
  () => {
    if (props.open) loadDiary();
  },
);

onMounted(() => {
  if (props.open) loadDiary();
});

/** 格式化日期显示 */
const dateLabel = computed(() => {
  if (!props.date) return '';
  const d = new Date(props.date + 'T00:00:00');
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${props.date} ${weekdays[d.getDay()]}`;
});

function save(): void {
  store.saveDiary(props.date, {
    mood: mood.value,
    content: content.value.trim(),
    gratitude: gratitude.value.trim(),
    todoSummary: todoSummary.value.trim(),
  });
  emit('save');
}
</script>

<template>
  <Teleport to="body">
    <transition name="slide-up">
      <div v-if="open" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center" @click.self="emit('close')">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="emit('close')" />

        <div class="relative w-full sm:max-w-lg bg-coral-50 rounded-t-3xl sm:rounded-3xl shadow-xl max-h-[90vh] overflow-y-auto">
          <!-- 标题 + 日期 -->
          <div class="flex items-center justify-between px-5 pt-5 pb-3">
            <div>
              <h3 class="text-base font-bold text-ink">写日记</h3>
              <p v-if="dateLabel" class="text-xs text-paper-500 mt-0.5">{{ dateLabel }}</p>
            </div>
            <button
              class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-paper-100 text-paper-400"
              @click="emit('close')"
            >
              ✕
            </button>
          </div>

          <!-- 心情选择 -->
          <div class="px-5 pb-4">
            <label class="block text-xs font-medium text-paper-600 mb-2">今天心情如何？</label>
            <div class="flex gap-2">
              <button
                v-for="m in MOODS"
                :key="m.key"
                class="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl border transition-all"
                :class="
                  mood === m.key
                    ? 'border-coral-300 bg-coral-50 shadow-sm scale-[1.02]'
                    : 'border-paper-200 hover:border-paper-300'
                "
                @click="mood = m.key"
              >
                <span class="text-xl">{{ m.emoji }}</span>
                <span class="text-[10px] font-medium" :class="mood === m.key ? 'text-coral-600' : 'text-paper-500'">
                  {{ m.label }}
                </span>
              </button>
            </div>
          </div>

          <!-- 正文 -->
          <div class="px-5 pb-4">
            <label class="block text-xs font-medium text-paper-600 mb-1">今日记录</label>
            <textarea
              v-model="content"
              placeholder="今天发生了什么？有什么想法或感悟..."
              rows="6"
              class="w-full px-4 py-3 rounded-xl border border-paper-300/60 bg-white text-sm outline-none focus:border-coral-400 transition-colors resize-none placeholder:text-paper-400 leading-relaxed"
              maxlength="5000"
            />
            <div class="text-right text-[10px] text-paper-400 mt-1">{{ content.length }} / 5000</div>
          </div>

          <!-- 感恩 -->
          <div class="px-5 pb-4">
            <label class="block text-xs font-medium text-paper-600 mb-1">🙏 今日感恩（一句话）</label>
            <input
              v-model="gratitude"
              type="text"
              placeholder="今天有什么值得感谢的..."
              class="w-full px-3 py-2.5 rounded-xl border border-paper-300/60 bg-white text-sm outline-none focus:border-coral-400 transition-colors placeholder:text-paper-400"
              maxlength="300"
            />
          </div>

          <!-- 待办摘要 -->
          <div class="px-5 pb-4">
            <label class="block text-xs font-medium text-paper-600 mb-1">✅ 待办完成情况</label>
            <input
              v-model="todoSummary"
              type="text"
              placeholder="今天完成了哪些重要的事..."
              class="w-full px-3 py-2.5 rounded-xl border border-paper-300/60 bg-white text-sm outline-none focus:border-coral-400 transition-colors placeholder:text-paper-400"
              maxlength="500"
            />
          </div>

          <!-- 保存按钮 -->
          <div class="px-5 pb-6 pt-1">
            <button
              class="w-full py-3.5 rounded-2xl bg-coral-500 text-base font-bold text-white shadow-lg active:scale-[0.98] transition-all hover:bg-coral-400"
              @click="save"
            >
              保存日记
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
