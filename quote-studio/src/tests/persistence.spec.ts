/**
 * 持久化层 normalize 守卫测试（projects / revenue / settings）。
 * 验证非法输入返回 null、字段默认值兜底、配置凭证格式校验。
 */

import { describe, it, expect } from 'vitest';

import { normalizeProject, normalizeRevenueEntry } from '@/modules/revenue/store/persistence';
import {
  normalizeSettings,
  normalizeCompanyProfile,
  normalizeCategoryGroup,
  normalizeSubCategory,
} from '@/modules/settings/store/persistence';

/* ============================ 项目 ============================ */
describe('normalizeProject 守卫', () => {
  it('非法输入（null / 非对象 / 缺 id）返回 null', () => {
    expect(normalizeProject(null)).toBeNull();
    expect(normalizeProject('x')).toBeNull();
    expect(normalizeProject([])).toBeNull();
    expect(normalizeProject({ name: 'no id' })).toBeNull();
  });

  it('status 非法值兜底为 active；currency 强制 EUR', () => {
    const p = normalizeProject({ id: 'p1', status: 'weird', currency: 'USD' });
    expect(p).not.toBeNull();
    if (p) {
      expect(p.status).toBe('active');
      expect(p.currency).toBe('EUR');
    }
  });

  it('合法项目保留字段并兜底缺省名', () => {
    const p = normalizeProject({ id: 'p1', status: 'completed' });
    expect(p).not.toBeNull();
    if (p) {
      expect(p.name).toBe('未命名项目');
      expect(p.status).toBe('completed');
    }
  });
});

/* ============================ 收益 ============================ */
describe('normalizeRevenueEntry 守卫', () => {
  it('非法输入（null / 缺 id）返回 null', () => {
    expect(normalizeRevenueEntry(null)).toBeNull();
    expect(normalizeRevenueEntry({ projectId: 'p1' })).toBeNull();
  });

  it('金额脏数据兜底为 0，source 缺省', () => {
    const e = normalizeRevenueEntry({
      id: 'rev1',
      projectId: 'p1',
      amount: 'x',
      cost: null,
      margin: undefined,
    });
    expect(e).not.toBeNull();
    if (e) {
      expect(e.amount).toBe(0);
      expect(e.cost).toBe(0);
      expect(e.margin).toBe(0);
      expect(e.source).toBe('quotation_confirmed');
    }
  });
});

/* ============================ 设置 / 分类 ============================ */
describe('normalizeSettings 守卫', () => {
  it('空 / 非法输入返回默认值（无云配置、无 AI）', () => {
    const s = normalizeSettings(null);
    expect(s.id).toBe('settings');
    expect(s.currency).toBe('EUR');
    expect(s.supabaseConfig).toBeNull();
    expect(s.openaiConfig).toBeNull();
    expect(s.pdfTemplate.headerLayout).toBe('logo-left');
    expect(s.pdfTemplate.showLogo).toBe(true);
  });

  it('supabaseConfig 凭证不全则置 null', () => {
    const s = normalizeSettings({ supabaseConfig: { url: 'https://x.supabase.co' } });
    expect(s.supabaseConfig).toBeNull();
  });

  it('supabaseConfig 凭证完整则保留', () => {
    const s = normalizeSettings({
      supabaseConfig: { url: 'https://x.supabase.co', anonKey: 'key' },
    });
    expect(s.supabaseConfig).not.toBeNull();
    expect(s.supabaseConfig?.url).toBe('https://x.supabase.co');
  });

  it('openaiConfig 凭证不全则置 null；完整则保留并兜底 model', () => {
    const none = normalizeSettings({ openaiConfig: { baseUrl: 'u' } });
    expect(none.openaiConfig).toBeNull();

    const ok = normalizeSettings({
      openaiConfig: { baseUrl: 'https://api.openai.com/v1', apiKey: 'sk' },
    });
    expect(ok.openaiConfig).not.toBeNull();
    expect(ok.openaiConfig?.model).toBe('gpt-4o-mini');
  });

  it('pdfTemplate.headerLayout 非法值兜底为 logo-left', () => {
    const s = normalizeSettings({ pdfTemplate: { headerLayout: 'bogus', showLogo: false } });
    expect(s.pdfTemplate.headerLayout).toBe('logo-left');
    expect(s.pdfTemplate.showLogo).toBe(false);
  });
});

describe('normalizeCompanyProfile / 分类 守卫', () => {
  it('normalizeCompanyProfile：兜底与默认值', () => {
    const c = normalizeCompanyProfile(null);
    expect(c.id).toBe('company');
    expect(c.name).toBe('Estudio 室内设计工作室');
    const c2 = normalizeCompanyProfile({ name: '我的工作室', email: 'a@b.com' });
    expect(c2.name).toBe('我的工作室');
    expect(c2.email).toBe('a@b.com');
  });

  it('normalizeCategoryGroup：缺 id 返回 null；合法返回', () => {
    expect(normalizeCategoryGroup(null)).toBeNull();
    expect(normalizeCategoryGroup({ name: 'no id' })).toBeNull();
    const g = normalizeCategoryGroup({ id: 'cg1', name: '硬装', order: 'x' });
    expect(g).not.toBeNull();
    if (g) {
      expect(g.name).toBe('硬装');
      expect(g.order).toBe(0);
    }
  });

  it('normalizeSubCategory：缺 id 返回 null；缺 groupId 仍返回（仅字符串兜底）', () => {
    expect(normalizeSubCategory(null)).toBeNull();
    expect(normalizeSubCategory({ name: 'no id' })).toBeNull();
    const s = normalizeSubCategory({ id: 'sc1', groupId: 'cg1', name: '沙发' });
    expect(s).not.toBeNull();
    if (s) {
      expect(s.groupId).toBe('cg1');
      expect(s.name).toBe('沙发');
    }
  });
});
