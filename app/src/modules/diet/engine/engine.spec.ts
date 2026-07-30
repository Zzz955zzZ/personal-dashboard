/**
 * 估算引擎回归测试。
 * 由根目录 test_logic.js（靠正则从 dashboard.html 抠源码执行）转正而来，
 * 现在直接测真实模块，改动引擎必须先跑这里。
 */
import { describe, expect, it } from 'vitest';
import { ING_DB } from '../data/ing-db';
import { aiRecognize } from './recognize';
import { inferCategory } from './infer-category';
import { healthTags } from './health-tags';
import { fromGrams, toGrams, unitLabel } from './units';
import { classifyTag, micronGroups } from './tags';

describe('ING_DB 知识库', () => {
  it('保有 85 条记录（v1.0 基线）', () => {
    expect(ING_DB.length).toBe(85);
  });

  it('每条都有关键词和完整宏量', () => {
    for (const row of ING_DB) {
      expect(row.kw.length).toBeGreaterThan(0);
      expect(row.macros).toBeTruthy();
      for (const k of ['calories', 'carbs', 'protein', 'fat'] as const) {
        expect(typeof row.macros[k]).toBe('number');
      }
    }
  });
});

describe('aiRecognize — 知识库精确命中', () => {
  it('螃蟹是核实值而非估算', () => {
    const r = aiRecognize('螃蟹');
    expect(r.match).toBe(true);
    expect(r.estimated).toBe(false);
    expect(r.macros?.protein).toBe(18);
    expect(r.micros.some((m) => m.name === '锌')).toBe(true);
  });

  it('鸡胸肉 protein=31', () => {
    const r = aiRecognize('鸡胸肉');
    expect(r.match).toBe(true);
    expect(r.estimated).toBe(false);
    expect(r.macros?.protein).toBe(31);
  });

  it('鸡蛋带出「个」单位与 50g 换算', () => {
    const r = aiRecognize('鸡蛋');
    expect(r.unit).toBe('个');
    expect(r.gramsPerUnit).toBe(50);
  });
});

describe('aiRecognize — 未知食材必须给估算而非沉默', () => {
  it.each([
    ['海胆', '海鲜/水产'],
    ['空心菜', '蔬菜'],
    ['榴莲', '水果'],
  ])('%s 估算为 %s', (name, category) => {
    const r = aiRecognize(name);
    expect(r.match).toBe(true);
    expect(r.estimated).toBe(true);
    expect(r.category).toBe(category);
  });

  it('海鲜估算沿用 protein=18 基线', () => {
    expect(aiRecognize('海胆').macros?.protein).toBe(18);
  });

  it('估算结果的提示语带「仅供参考」，供 UI 打参考值标签', () => {
    expect(aiRecognize('空心菜').note).toContain('仅供参考');
  });
});

describe('aiRecognize — 认不出时保持诚实', () => {
  it.each(['asdfqwer', '', '   '])('%s 不产生任何结果', (name) => {
    const r = aiRecognize(name);
    expect(r.match).toBe(false);
    expect(r.estimated).toBe(false);
    expect(r.macros).toBeNull();
    expect(r.micros).toEqual([]);
  });
});

describe('inferCategory 规则顺序', () => {
  it('豆类沿用历史提示语「豆类」而非 label 全名', () => {
    const est = inferCategory('豆浆');
    expect(est?.label).toBe('豆类及制品');
    expect(est?.note).toBe('按“豆类”类别估算');
  });

  it('强特征词优先于宽泛后缀：带鱼判为海鲜而非蔬菜', () => {
    expect(inferCategory('带鱼')?.label).toBe('海鲜/水产');
  });

  it('无法识别返回 null', () => {
    expect(inferCategory('zzzz')).toBeNull();
  });
});

describe('单位换算', () => {
  const egg = { unit: '个' as const, gramsPerUnit: 50 };
  const rice = { unit: 'g' as const, gramsPerUnit: undefined };

  it('按个计量的往返换算', () => {
    expect(unitLabel(egg)).toBe('个');
    expect(toGrams(egg, 2)).toBe(100);
    expect(fromGrams(egg, 100)).toBe(2);
  });

  it('按克计量原值返回', () => {
    expect(unitLabel(rice)).toBe('g');
    expect(toGrams(rice, 120)).toBe(120);
    expect(fromGrams(rice, 120)).toBe(120);
  });

  it('空对象降级为克', () => {
    expect(unitLabel(null)).toBe('g');
    expect(toGrams(null, 80)).toBe(80);
  });
});

describe('健康标签', () => {
  it('鸡胸肉 = 高蛋白 + 低脂 + 低碳水', () => {
    const tags = healthTags({ nutrition: { calories: 165, carbs: 0, protein: 31, fat: 3.6 } }).map((t) => t.text);
    expect(tags).toContain('高蛋白');
    expect(tags).toContain('低碳水');
    expect(tags).not.toContain('高热量');
  });

  it('橄榄油 = 高热量', () => {
    const tags = healthTags({ nutrition: { calories: 884, carbs: 0, protein: 0, fat: 100 } }).map((t) => t.text);
    expect(tags).toContain('高热量');
  });

  it('无营养数据返回空数组', () => {
    expect(healthTags(null)).toEqual([]);
  });
});

describe('标签分组与归类', () => {
  it('按分类分组并去重', () => {
    const groups = micronGroups({
      microns: [
        { cat: '矿物质', name: '锌' },
        { cat: '矿物质', name: '锌' },
        { cat: '矿物质', name: '硒' },
        { cat: '维生素', name: '维生素D' },
      ],
    });
    expect(groups).toEqual([
      { cat: '矿物质', items: ['锌', '硒'] },
      { cat: '维生素', items: ['维生素D'] },
    ]);
  });

  it('自由文本标签归类', () => {
    expect(classifyTag('维生素C')).toBe('维生素');
    expect(classifyTag('钙')).toBe('矿物质');
    expect(classifyTag('Omega-3')).toBe('脂肪酸');
    expect(classifyTag('膳食纤维')).toBe('功能性');
    expect(classifyTag('好吃')).toBe('custom');
  });
});
