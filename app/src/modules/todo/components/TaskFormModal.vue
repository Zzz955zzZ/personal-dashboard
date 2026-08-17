<script setup lang="ts">
/**
 * 任务表单弹窗 — 新建/编辑
 *
 * 支持标题、描述、象限、域、优先级、截止日期、标签。
 */
import { computed, onMounted, ref, watch } from 'vue';

import { useTodoStore } from '../store/todo-store';
import { QUADRANTS, QUADRANT_LIST, DOMAINS, HORIZONS } from '../constants';
import type { Quadrant, TaskDomain, TodoTask } from '../types';

const props = defineProps<{
  open: boolean;
  taskId: number | null;
  initialQuadrant?: Quadrant;
}>();

const emit = defineEmits<{
  (e: 'save'): void;
  (e: 'close'): void;
}>();

const store = useTodoStore();

const title = ref('');
const description = ref('');
const quadrant = ref<Quadrant>('Q1');
const domain = ref<TaskDomain>('personal');
const priority = ref<TodoTask['priority']>('medium');
const horizon = ref<TodoTask['horizon']>('week');

const isEdit = computed(() => props.taskId !== null);

function reset(): void {
  title.value = '';
  description.value = '';
  quadrant.value = props.initialQuadrant ?? 'Q1';
  domain.value = 'personal';
  priority.value = 'medium';
  horizon.value = 'week';
}

function loadTask(): void {
  if (!props.taskId) return;
  const task = store.tasks.find((t) => t.id === props.taskId);
  if (!task) return;
  title.value = task.title;
  description.value = task.description;
  quadrant.value = task.quadrant;
  domain.value = task.domain;
  priority.value = task.priority;
  horizon.value = task.horizon;
}

watch(
  () => props.open,
  (v) => {
    if (v) {
      if (isEdit.value) loadTask();
      else reset();
    }
  },
);

onMounted(() => {
  if (props.open) {
    if (isEdit.value) loadTask();
    else reset();
  }
});

function save(): void {
  const t = title.value.trim();
  if (!t) return;

  if (isEdit.value && props.taskId) {
    store.updateTask(props.taskId, {
      title: t,
      description: description.value.trim(),
      quadrant: quadrant.value,
      domain: domain.value,
      priority: priority.value,
      horizon: horizon.value,
    });
  } else {
    store.addTask({
      title: t,
      description: description.value.trim(),
      quadrant: quadrant.value,
      domain: domain.value,
      priority: priority.value,
      horizon: horizon.value,
    });
  }

  emit('save');
}
</script>

<template>
  <Teleport to="body">
    <transition name="fade">
      <div v-if="open" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" @click.self="emit('close')">
        <!-- 遮罩 -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="emit('close')" />

        <!-- 弹窗 -->
        <div class="relative w-full sm:max-w-lg bg-coral-50 rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] overflow-y-auto">
          <!-- 标题栏 -->
          <div class="flex items-center justify-between px-5 py-4 border-b border-paper-200/60">
            <h3 class="text-base font-semibold text-ink">{{ isEdit ? '编辑任务' : '新建任务' }}</h3>
            <button
              class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-paper-200 text-paper-400 transition-colors"
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
                placeholder="做什么？"
                class="w-full px-3 py-2.5 rounded-xl border border-paper-300/60 bg-white text-sm text-ink outline-none focus:border-coral-400 transition-colors placeholder:text-paper-400"
                maxlength="200"
                autofocus
              />
            </div>

            <!-- 描述 -->
            <div>
              <label class="block text-xs font-medium text-paper-600 mb-1">描述（可选）</label>
              <textarea
                v-model="description"
                placeholder="补充细节..."
                rows="2"
                class="w-full px-3 py-2.5 rounded-xl border border-paper-300/60 bg-white text-sm text-ink outline-none focus:border-coral-400 transition-colors resize-none placeholder:text-paper-400"
                maxlength="2000"
              />
            </div>

            <!-- 象限 + 域 + 优先级 横排 -->
            <div class="grid grid-cols-3 gap-3">
              <!-- 象限 -->
              <div>
                <label class="block text-xs font-medium text-paper-600 mb-1">象限</label>
                <select
                  v-model="quadrant"
                  class="w-full px-3 py-2 rounded-lg border border-paper-300/60 bg-white text-sm text-ink outline-none cursor-pointer"
                >
                  <option v-for="q in QUADRANT_LIST" :key="q" :value="q">
                    {{ QUADRANTS[q].label }}
                  </option>
                </select>
              </div>

              <!-- 域 -->
              <div>
                <label class="block text-xs font-medium text-paper-600 mb-1">域</label>
                <select
                  v-model="domain"
                  class="w-full px-3 py-2 rounded-lg border border-paper-300/60 bg-white text-sm text-ink outline-none cursor-pointer"
                >
                  <option v-for="d in DOMAINS" :key="d.key" :value="d.key">
                    {{ d.emoji }} {{ d.label }}
                  </option>
                </select>
              </div>

              <!-- 优先级 -->
              <div>
                <label class="block text-xs font-medium text-paper-600 mb-1">优先级</label>
                <select
                  v-model="priority"
                  class="w-full px-3 py-2 rounded-lg border border-paper-300/60 bg-white text-sm text-ink outline-none cursor-pointer"
                >
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
            </div>

            <!-- 时间粒度 -->
            <div>
              <label class="block text-xs font-medium text-paper-600 mb-1">时间粒度</label>
              <div class="grid grid-cols-4 gap-2">
                <button
                  v-for="h in HORIZONS"
                  :key="h.key"
                  type="button"
                  class="flex flex-col items-center gap-0.5 py-2 rounded-lg border text-sm transition-all"
                  :class="
                    horizon === h.key
                      ? 'border-coral-400 bg-coral-50 text-coral-600 font-medium'
                      : 'border-paper-300/60 text-paper-500 hover:border-coral-300'
                  "
                  @click="horizon = h.key"
                >
                  <span class="text-base leading-none">{{ h.emoji }}</span>
                  <span>{{ h.label }}</span>
                </button>
              </div>
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
              :disabled="!title.trim()"
              @click="save"
            >
              {{ isEdit ? '保存修改' : '创建任务' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>
