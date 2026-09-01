<script setup lang="ts">
/**
 * 用户档案管理：新增 / 编辑 / 删除饮食模块的多用户档案。
 * 删除时会把该用户的记录并入其他档案（默认回落到第一个），避免数据丢失。
 */
import { reactive, ref, watch } from 'vue';

import BaseModal from '@/shared/components/BaseModal.vue';
import { EMOJI_OPTIONS, PROFILE_COLORS } from '../constants';
import { useDietStore } from '../store/diet-store';

const props = defineProps<{ open: boolean; editingId: string | null }>();
const emit = defineEmits<{ close: []; edit: [id: string] }>();

const store = useDietStore();

const form = reactive<{ name: string; emoji: string; color: string }>({
  name: '',
  emoji: '🙂',
  color: PROFILE_COLORS[0]!,
});

/** 待确认删除的档案 id（两步确认，避免误删） */
const confirmDeleteId = ref<string | null>(null);

function resetForm(): void {
  form.name = '';
  form.emoji = '🙂';
  form.color = PROFILE_COLORS[0]!;
}

watch(
  () => [props.open, props.editingId],
  () => {
    confirmDeleteId.value = null;
    const id = props.editingId;
    if (id) {
      const p = store.profiles.find((x) => x.id === id);
      if (p) {
        form.name = p.name;
        form.emoji = p.emoji;
        form.color = p.color;
        return;
      }
    }
    resetForm();
  },
  { immediate: true },
);

function save(): void {
  const name = form.name.trim() || '新用户';
  store.saveProfile(
    { name, emoji: form.emoji, color: form.color },
    props.editingId,
  );
  emit('close');
}

function askDelete(id: string): void {
  confirmDeleteId.value = id;
}

function confirmDelete(): void {
  if (confirmDeleteId.value) store.deleteProfile(confirmDeleteId.value);
  confirmDeleteId.value = null;
  emit('close');
}

function close(): void {
  emit('close');
}
</script>

<template>
  <BaseModal :open="open" title="用户档案" width="sm" @close="close">
    <div class="flex flex-col gap-4">
      <!-- 现有档案列表 -->
      <div class="space-y-2">
        <div
          v-for="p in store.profiles"
          :key="p.id"
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-paper-300/60 bg-white/70"
        >
          <span
            class="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0"
            :style="{ backgroundColor: p.color + '22', color: p.color }"
          >{{ p.emoji }}</span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-ink truncate">{{ p.name }}</div>
            <div v-if="store.currentUserId === p.id" class="text-[10px] text-coral-500">当前查看中</div>
          </div>
          <button
            class="text-[11px] text-paper-500 hover:text-coral-600 px-2 py-1"
            @click="store.setCurrentUser(p.id); close()"
          >切换</button>
          <button
            class="text-[11px] text-paper-500 hover:text-coral-600 px-2 py-1"
            @click="emit('edit', p.id)"
          >编辑</button>
          <button
            v-if="store.profiles.length > 1"
            class="text-[11px] text-red-400 hover:text-red-600 px-2 py-1"
            @click="askDelete(p.id)"
          >删除</button>
        </div>
      </div>

      <!-- 删除二次确认 -->
      <div v-if="confirmDeleteId" class="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
        删除该用户会将其全部饮食记录并入其他用户，确定继续？
        <div class="flex gap-2 mt-2">
          <button class="flex-1 px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-100" @click="confirmDelete">确认删除</button>
          <button class="flex-1 px-3 py-1.5 rounded-lg border border-paper-300 text-paper-500 hover:bg-paper-50" @click="confirmDeleteId = null">取消</button>
        </div>
      </div>

      <!-- 新增 / 编辑表单 -->
      <div v-if="!confirmDeleteId" class="border-t border-paper-100 pt-4 space-y-3">
        <div>
          <label class="text-[11px] text-paper-500 block mb-1">名称</label>
          <input
            v-model="form.name"
            type="text"
            maxlength="12"
            placeholder="如：我 / 女朋友"
            class="w-full px-3 py-2 rounded-lg border border-paper-300/60 bg-white text-sm focus:outline-none focus:border-coral-300"
          />
        </div>
        <div>
          <label class="text-[11px] text-paper-500 block mb-1">头像</label>
          <div class="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
            <button
              v-for="e in EMOJI_OPTIONS"
              :key="e"
              type="button"
              class="w-8 h-8 rounded-lg text-base border transition-colors"
              :class="form.emoji === e ? 'border-coral-400 bg-coral-50' : 'border-paper-200 hover:bg-paper-50'"
              @click="form.emoji = e"
            >{{ e }}</button>
          </div>
        </div>
        <div>
          <label class="text-[11px] text-paper-500 block mb-1">主题色（区分不同用户）</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="c in PROFILE_COLORS"
              :key="c"
              type="button"
              class="w-7 h-7 rounded-full border-2 transition-transform"
              :class="form.color === c ? 'scale-110 border-ink/40' : 'border-transparent'"
              :style="{ backgroundColor: c }"
              @click="form.color = c"
            />
          </div>
        </div>
        <button
          class="w-full px-4 py-2.5 rounded-xl bg-coral-400 text-white text-sm font-medium hover:bg-coral-500 active:scale-[0.98] transition-all"
          @click="save"
        >{{ props.editingId ? '保存修改' : '新增用户' }}</button>
      </div>
    </div>
  </BaseModal>
</template>
