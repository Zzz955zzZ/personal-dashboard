/**
 * 撤销提示条 + 极简自动消失提示
 *
 * - pushUndo：保留「最近一次」可撤销操作，8 秒后自动消失，适合误删恢复。
 * - pushToast：无操作按钮，2 秒后自动消失，适合删除等「已发生」的轻反馈。
 * 刻意不做撤销栈 —— 单条撤销心智负担最低。
 */

import { onScopeDispose, reactive } from 'vue';

export interface UndoState {
  visible: boolean;
  message: string;
  mode: 'undo' | 'toast';
}

const state = reactive<UndoState>({ visible: false, message: '', mode: 'undo' });
let revertFn: (() => void) | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

const AUTO_HIDE_UNDO_MS = 8000;
const AUTO_HIDE_TOAST_MS = 2000;

function clearTimer(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

function hide(): void {
  state.visible = false;
  revertFn = null;
  clearTimer();
}

export function pushUndo(message: string, revert: () => void): void {
  state.message = message;
  state.mode = 'undo';
  state.visible = true;
  revertFn = revert;
  clearTimer();
  timer = setTimeout(hide, AUTO_HIDE_UNDO_MS);
}

export function pushToast(message: string): void {
  state.message = message;
  state.mode = 'toast';
  state.visible = true;
  revertFn = null;
  clearTimer();
  timer = setTimeout(hide, AUTO_HIDE_TOAST_MS);
}

export function executeUndo(): void {
  if (revertFn) revertFn();
  hide();
}

export function dismissUndo(): void {
  hide();
}

export function useUndo() {
  onScopeDispose(clearTimer);
  return { undoToast: state, pushUndo, pushToast, executeUndo, dismissUndo };
}
