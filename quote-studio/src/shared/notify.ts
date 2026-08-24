import { reactive } from 'vue';

/**
 * 极简全局提示（toast）。
 *
 * 用于把"后台静默失败"暴露给用户——最典型的是 persist() 写入 localStorage 失败
 * （隐私模式 / 配额已满 / 序列化异常）。此前这些失败被丢弃，用户误以为已保存。
 * 组件通过 useToasts() 拿到同一个响应式 state 渲染宿主；notify() 推入即显示。
 */

export type ToastType = 'error' | 'warn' | 'info' | 'success';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

const state = reactive<{ items: ToastItem[] }>({ items: [] });
let seq = 0;

export function notify(type: ToastType, message: string, ttl = 6000): void {
  const id = ++seq;
  state.items.push({ id, type, message });
  if (ttl > 0) {
    window.setTimeout(() => dismiss(id), ttl);
  }
}

export function dismiss(id: number): void {
  const idx = state.items.findIndex((t) => t.id === id);
  if (idx >= 0) state.items.splice(idx, 1);
}

export function useToasts(): { items: ToastItem[] } {
  return state;
}
