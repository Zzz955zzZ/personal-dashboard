/**
 * 撤销提示条
 *
 * 与 v1.0 行为一致：只保留「最近一次」可撤销操作，8 秒后自动消失。
 * 刻意不做撤销栈 —— 单条撤销心智负担最低，也不会让用户误以为能一路回退。
 */

import { onScopeDispose, reactive } from 'vue';

export interface UndoState {
  visible: boolean;
  message: string;
}

const state = reactive<UndoState>({ visible: false, message: '' });
let revertFn: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

const AUTO_HIDE_MS = 8000;

function clearTimer(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

export function pushUndo(message: string, revert: () => void): void {
  state.message = message;
  state.visible = true;
  revertFn = revert;
  clearTimer();
  timer = setTimeout(() => {
    state.visible = false;
    revertFn = null;
  }, AUTO_HIDE_MS);
}

export function executeUndo(): void {
  if (revertFn) revertFn();
  state.visible = false;
  revertFn = null;
  clearTimer();
}

export function dismissUndo(): void {
  state.visible = false;
  revertFn = null;
  clearTimer();
}

export function useUndo() {
  onScopeDispose(clearTimer);
  return { undoToast: state, pushUndo, executeUndo, dismissUndo };
}
