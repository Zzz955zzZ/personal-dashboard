import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import NumberInput from './NumberInput.vue';

async function flush() {
  await nextTick();
}

async function type(wrapper: ReturnType<typeof mount>, value: string) {
  const input = wrapper.find('input').element as HTMLInputElement;
  input.value = value;
  await input.dispatchEvent(new Event('input'));
  await input.dispatchEvent(new Event('blur'));
  await flush();
}

async function focusInput(wrapper: ReturnType<typeof mount>) {
  const input = wrapper.find('input').element as HTMLInputElement;
  await input.dispatchEvent(new Event('focus'));
  await flush();
}

describe('NumberInput', () => {
  it('renders initial formatted value', async () => {
    const wrapper = mount(NumberInput, {
      props: { modelValue: 720, step: 0.1, unit: 'g' },
    });
    await flush();
    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('720');
  });

  it('filters illegal characters', async () => {
    const model = ref<number | null>(0);
    const wrapper = mount(NumberInput, {
      props: {
        modelValue: 0,
        step: 0.1,
        decimalPlaces: 1,
        'onUpdate:modelValue': (v: number | null) => {
          model.value = v;
        },
      },
    });
    await type(wrapper, 'abc12.3.4xyz');
    expect(model.value).toBe(12.3);
  });

  it('clamps to min', async () => {
    const model = ref<number | null>(10);
    const wrapper = mount(NumberInput, {
      props: {
        modelValue: 10,
        min: 0,
        max: 100,
        step: 1,
        allowNegative: true,
        'onUpdate:modelValue': (v: number | null) => {
          model.value = v;
        },
      },
    });
    await type(wrapper, '-20');
    expect(model.value).toBe(0);
  });

  it('clamps to max', async () => {
    const model = ref<number | null>(10);
    const wrapper = mount(NumberInput, {
      props: {
        modelValue: 10,
        min: 0,
        max: 100,
        step: 1,
        'onUpdate:modelValue': (v: number | null) => {
          model.value = v;
        },
      },
    });
    await type(wrapper, '999');
    expect(model.value).toBe(100);
  });

  it('limits decimal places based on step', async () => {
    const model = ref<number | null>(0);
    const wrapper = mount(NumberInput, {
      props: {
        modelValue: 0,
        step: 0.1,
        'onUpdate:modelValue': (v: number | null) => {
          model.value = v;
        },
      },
    });
    await type(wrapper, '12.345');
    expect(model.value).toBe(12.3);
  });

  it('respects explicit decimalPlaces', async () => {
    const model = ref<number | null>(0);
    const wrapper = mount(NumberInput, {
      props: {
        modelValue: 0,
        step: 1,
        decimalPlaces: 2,
        'onUpdate:modelValue': (v: number | null) => {
          model.value = v;
        },
      },
    });
    await type(wrapper, '12.3456');
    expect(model.value).toBe(12.35);
  });

  it('focus selects all content by default', async () => {
    const wrapper = mount(NumberInput, {
      props: { modelValue: 720, step: 0.1 },
    });
    await flush();
    const input = wrapper.find('input').element as HTMLInputElement;
    input.setSelectionRange(0, 0);
    await focusInput(wrapper);
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe(String(720).length);
  });

  it('emits unit changes', async () => {
    const unit = ref('g');
    const wrapper = mount(NumberInput, {
      props: {
        modelValue: 100,
        modelUnit: 'g',
        units: [
          { value: 'g', label: '克' },
          { value: '两', label: '两' },
        ],
        'onUpdate:modelUnit': (v: string) => {
          unit.value = v;
        },
      },
    });
    await flush();
    const buttons = wrapper.findAll('button');
    const liang = buttons.find((b) => b.text() === '两');
    expect(liang).toBeTruthy();
    await liang?.trigger('click');
    expect(unit.value).toBe('两');
  });
});
