<script setup lang="ts">
/**
 * 四象限待办主视图
 *
 * 浅色主题（与工作台整体协调）。功能：4象限展示、工作/生活域切换、搜索、月筛选、任务操作。
 */
import { computed, onMounted, ref } from 'vue';

import { useTodoStore } from '../store/todo-store';
import { QUADRANTS, QUADRANT_LIST, DOMAINS, horizonLabel } from '../constants';
import TaskFormModal from '../components/TaskFormModal.vue';

const store = useTodoStore();

const showForm = ref(false);
const editTaskId = ref<number | null>(null);
const initialQuadrant = ref<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');

onMounted(() => {
  store.hydrate();
});

/** 当前月份选项（最近6个月+全部） */
const monthOptions = computed(() => {
  const now = new Date();
  const opts = [{ value: '', label: '全部' }];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    opts.push({ value: v, label: `${d.getFullYear()}年${d.getMonth() + 1}月` });
  }
  return opts;
});

function openAdd(q: 'Q1' | 'Q2' | 'Q3' | 'Q4'): void {
  editTaskId.value = null;
  initialQuadrant.value = q;
  showForm.value = true;
}

function openEdit(taskId: number): void {
  editTaskId.value = taskId;
  showForm.value = true;
}

function toggleComplete(taskId: number): void {
  const task = store.tasks.find((t) => t.id === taskId);
  if (!task) return;
  if (task.status === 'completed') {
    store.uncompleteTask(taskId);
  } else {
    store.completeTask(taskId);
  }
}

function handleDelete(taskId: number): void {
  store.deleteTask(taskId);
}

function onFormSave(): void {
  showForm.value = false;
  editTaskId.value = null;
}

function moveToLeft(taskId: number, currentQ: string): void {
  const idx = QUADRANT_LIST.indexOf(currentQ as any);
  if (idx > 0) {
    store.moveTask(taskId, QUADRANT_LIST[idx - 1]);
  }
}

function moveToRight(taskId: number, currentQ: string): void {
  const idx = QUADRANT_LIST.indexOf(currentQ as any);
  if (idx < QUADRANT_LIST.length - 1) {
    store.moveTask(taskId, QUADRANT_LIST[idx + 1]);
  }
}
</script>

<template>
  <div class="min-h-screen bg-paper-50">
    <!-- 顶栏工具区 -->
    <div class="sticky top-0 z-20 bg-paper-50/95 backdrop-blur border-b border-paper-200/60 px-3 sm:px-4 py-2">
      <!-- 第一行：月份 + 搜索 -->
      <div class="flex items-center gap-2 mb-2">
        <select
          v-model="store.selectedMonth"
          class="bg-white border border-paper-300/60 rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm text-ink outline-none cursor-pointer"
        >
          <option v-for="m in monthOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
        <div class="flex-1 relative">
          <input
            v-model="store.searchQuery"
            type="text"
            placeholder="搜索..."
            class="w-full bg-white border border-paper-300/60 rounded-lg pl-7 sm:pl-9 pr-2 sm:pr-3 py-1.5 text-xs sm:text-sm text-ink placeholder:text-paper-400 outline-none focus:border-coral-400 transition-colors"
          />
          <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-paper-400 text-xs">🔍</span>
        </div>
      </div>

      <!-- 第二行：域切换 + 已完成 -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-1">
          <button
            v-for="d in DOMAINS"
            :key="d.key"
            class="px-2 py-1 rounded-full text-[11px] font-medium transition-all"
            :class="
              store.filterDomain === d.key
                ? 'bg-ink text-white'
                : 'bg-white border border-paper-200 text-paper-500 hover:border-coral-300'
            "
            @click="store.filterDomain = d.key"
          >
            {{ d.label }}
          </button>
          <button
            class="px-2 py-1 rounded-full text-[11px] font-medium transition-all"
            :class="
              store.filterDomain === 'all'
                ? 'bg-ink text-white'
                : 'bg-white border border-paper-200 text-paper-500 hover:border-coral-300'
            "
            @click="store.filterDomain = 'all'"
          >
            全部
          </button>
        </div>
        <label class="flex items-center gap-1 text-[11px] text-paper-500 cursor-pointer select-none">
          <input
            v-model="store.showCompleted"
            type="checkbox"
            class="rounded border-paper-300 bg-transparent text-coral-500 w-3.5 h-3.5"
          />
          完成
        </label>
      </div>
    </div>

    <!-- 四象限矩阵 -->
    <div class="grid grid-cols-2 gap-2 sm:gap-2 p-2 sm:p-2">
      <div
        v-for="q in QUADRANT_LIST"
        :key="q"
        class="rounded-xl border overflow-hidden flex flex-col min-h-[280px] sm:min-h-[340px]"
        :class="[QUADRANTS[q].bgClass, QUADRANTS[q].borderClass]"
      >
        <!-- 象限标题栏 -->
        <div class="flex items-center justify-between px-2.5 sm:px-3 py-1.5 sm:py-2 border-b border-paper-200/70">
          <span class="text-[11px] sm:text-xs font-semibold tracking-wide" :class="QUADRANTS[q].textClass">
            {{ QUADRANTS[q].label }}
          </span>
          <span class="flex items-center gap-1.5">
            <span
              v-if="store.quadrantCounts[q] > 0"
              class="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              :class="QUADRANTS[q].textClass"
            >
              {{ store.quadrantCounts[q] }}
            </span>
            <button
              class="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-md text-paper-400 hover:text-ink hover:bg-white/70 transition-colors text-sm font-bold"
              title="添加"
              @click="openAdd(q)"
            >
              +
            </button>
          </span>
        </div>

        <!-- 任务列表 -->
        <div class="flex-1 overflow-y-auto p-1.5 sm:p-2 space-y-1 sm:space-y-1.5">
          <template v-for="task in store.tasksByQuadrant(q)" :key="task.id">
            <div
              class="group rounded-lg px-2.5 sm:px-3 py-2 bg-white/90 hover:bg-white border border-paper-200/70 transition-all cursor-pointer"
              :class="{ 'opacity-50': task.status === 'completed' }"
            >
              <div class="flex items-start gap-2">
                <!-- 完成状态圆圈 -->
                <button
                  class="mt-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
                  :class="
                    task.status === 'completed'
                      ? 'border-green-500 bg-green-500/15 text-green-600'
                      : 'border-paper-300 hover:border-ink'
                  "
                  @click.stop="toggleComplete(task.id)"
                >
                  <svg
                    v-if="task.status === 'completed'"
                    viewBox="0 0 12 12"
                    width="8"
                    height="8"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M2 6l3 3 5-5" />
                  </svg>
                </button>

                <!-- 内容：强制不折行，截断 -->
                <div class="flex-1 min-w-0" @click="openEdit(task.id)">
                  <div
                    class="text-xs sm:text-sm font-medium leading-snug line-clamp-3 break-words"
                    :class="task.status === 'completed' ? 'line-through text-paper-400' : 'text-ink'"
                  >
                    {{ task.title }}
                  </div>
                  <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span class="text-[9px] sm:text-[10px] px-1 py-px rounded bg-paper-100 text-paper-500">
                      {{ task.domain === 'work' ? '工' : '生' }}
                    </span>
                    <span class="text-[9px] sm:text-[10px] text-paper-400">
                      {{ horizonLabel(task.horizon) }}
                    </span>
                  </div>
                </div>

                <!-- 操作按钮（仅桌面端hover显示） -->
                <div class="hidden sm:flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    v-if="q !== 'Q1'"
                    class="w-6 h-6 flex items-center justify-center rounded text-paper-400 hover:text-ink hover:bg-paper-100 text-xs"
                    title="左移"
                    @click.stop="moveToLeft(task.id, q)"
                  >
                    ←
                  </button>
                  <button
                    v-if="q !== 'Q4'"
                    class="w-6 h-6 flex items-center justify-center rounded text-paper-400 hover:text-ink hover:bg-paper-100 text-xs"
                    title="右移"
                    @click.stop="moveToRight(task.id, q)"
                  >
                    →
                  </button>
                  <button
                    class="w-6 h-6 flex items-center justify-center rounded text-paper-400 hover:text-red-500 hover:bg-red-50 text-xs"
                    @click.stop="handleDelete(task.id)"
                  >
                    ✕
                  </button>
                </div>

                <!-- 移动端：滑动删除用的小按钮 -->
                <button
                  class="sm:hidden flex-shrink-0 text-paper-300 hover:text-red-500 text-[10px] px-1"
                  @click.stop="handleDelete(task.id)"
                >
                  ✕
                </button>
              </div>
            </div>
          </template>

          <!-- 空状态 -->
          <div
            v-if="store.tasksByQuadrant(q).length === 0"
            class="flex flex-col items-center justify-center py-6 sm:py-8 text-paper-400"
          >
            <span class="text-lg sm:text-2xl mb-1">📭</span>
            <span class="text-[11px]">暂无</span>
            <button
              class="mt-1.5 text-[11px] text-coral-500 hover:text-coral-600"
              @click="openAdd(q)"
            >
              添加
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务表单弹窗 -->
    <TaskFormModal
      :open="showForm"
      :task-id="editTaskId"
      :initial-quadrant="initialQuadrant"
      @save="onFormSave"
      @close="showForm = false"
    />
  </div>
</template>
