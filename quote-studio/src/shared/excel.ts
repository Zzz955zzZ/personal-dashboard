/**
 * Excel 导入导出工具（基于 xlsx）。
 * 报价单导出：客户版 + 内部版双 Sheet。
 * 导入：按标准列读取产品行。
 */
import * as XLSX from 'xlsx';

import type { Quotation } from '@/modules/quotation';
import { computeQuoteTotals } from '@/modules/quotation/totals';
import type { Project } from '@/modules/revenue';
import type { CategoryGroup, CompanyProfile } from '@/modules/settings';

const EUR_FMT = '#,##0.00 €';

interface CellStyle {
  font?: Record<string, unknown>;
  fill?: Record<string, unknown>;
  alignment?: Record<string, unknown>;
  border?: Record<string, unknown>;
  [k: string]: unknown;
}

function mkCell(v: string | number, style?: CellStyle): XLSX.CellObject {
  const cell: XLSX.CellObject = { v, t: typeof v === 'number' ? 'n' : 's' };
  if (style) cell.s = style;
  return cell;
}

function setCell(ws: XLSX.WorkSheet, r: number, c: number, cell: XLSX.CellObject): void {
  ws[XLSX.utils.encode_cell({ r: r - 1, c: c - 1 })] = cell;
}

function headerStyle(): CellStyle {
  return {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1A1A1A' }, patternType: 'solid' },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'BFBFBF' } },
      bottom: { style: 'thin', color: { rgb: 'BFBFBF' } },
      left: { style: 'thin', color: { rgb: 'BFBFBF' } },
      right: { style: 'thin', color: { rgb: 'BFBFBF' } },
    },
  };
}

function cellStyle(opts?: { bold?: boolean; fill?: string; align?: 'left' | 'center' | 'right' }): CellStyle {
  return {
    font: { bold: opts?.bold ?? false, color: { rgb: '000000' } },
    fill: opts?.fill ? { fgColor: { rgb: opts.fill }, patternType: 'solid' } : undefined,
    alignment: { horizontal: opts?.align ?? 'left', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: 'BFBFBF' } },
      bottom: { style: 'thin', color: { rgb: 'BFBFBF' } },
      left: { style: 'thin', color: { rgb: 'BFBFBF' } },
      right: { style: 'thin', color: { rgb: 'BFBFBF' } },
    },
  };
}

/** 深色汇总行（Neto / Dto / Base / IVA / TOTAL）。 */
function darkRow(ws: XLSX.WorkSheet, r: number, label: string, value: number, big = false): void {
  const row = ['', '', '', '', '', label, value];
  row.forEach((v, c) => {
    const cell = mkCell(v as string | number, cellStyle({ bold: true, fill: '1A1A1A', align: c === 5 ? 'right' : 'left' }));
    if (c === 5 || c === 6) {
      cell.s = {
        ...(cell.s || {}),
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: big ? 12 : undefined },
        fill: { fgColor: { rgb: '1A1A1A' }, patternType: 'solid' },
      };
    }
    setCell(ws, r, c + 1, cell);
  });
  ws[XLSX.utils.encode_cell({ r: r - 1, c: 6 })].z = EUR_FMT;
}

export interface ExcelContext {
  quotation: Quotation;
  project: Project;
  company: CompanyProfile;
  groups: CategoryGroup[];
}

export function exportQuotationToExcel(ctx: ExcelContext): void {
  const { quotation, project, company, groups } = ctx;
  const wb = XLSX.utils.book_new();

  // ---- Sheet 1: 客户版 ----
  const ws = XLSX.utils.aoa_to_sheet([]);
  const merges: XLSX.Range[] = [];

  // 公司抬头
  let r = 1;
  setCell(ws, r, 1, mkCell(company.name || 'Estudio 室内设计工作室', { font: { bold: true, sz: 14 } }));
  r++;
  if (company.address || company.phone || company.email) {
    setCell(ws, r, 1, mkCell([company.address, company.phone, company.email].filter(Boolean).join(' · ')));
    r++;
  }
  r++;

  // 项目信息
  setCell(ws, r, 1, mkCell('报价编号', { font: { bold: true } }));
  setCell(ws, r, 2, mkCell(quotation.quoteNumber || '—'));
  r++;
  setCell(ws, r, 1, mkCell('客户 / Cliente', { font: { bold: true } }));
  setCell(ws, r, 2, mkCell(project.clientName || '—'));
  r++;
  setCell(ws, r, 1, mkCell('项目 / Proyecto', { font: { bold: true } }));
  setCell(ws, r, 2, mkCell(project.projectNo || project.name));
  r++;
  setCell(ws, r, 1, mkCell('地址 / Dirección', { font: { bold: true } }));
  setCell(ws, r, 2, mkCell(project.address || '—'));
  r++;
  setCell(ws, r, 1, mkCell('日期 / Fecha', { font: { bold: true } }));
  setCell(ws, r, 2, mkCell(new Date(quotation.updatedAt || Date.now()).toLocaleDateString('es-ES')));
  r += 2;

  // 表头
  const heads = ['#', '项目 / Concepto', '型号 / Modelo', '描述 / Descripción', '单价 P.U.', '数量', '总价 Total'];
  heads.forEach((h, i) => setCell(ws, r, i + 1, mkCell(h, headerStyle())));
  r++;

  let idx = 1;

  for (const g of groups) {
    const items = quotation.items.filter((it) => it.categoryGroupId === g.id);
    if (items.length === 0) continue;

    // 分类标题行
    const titleCell = mkCell(`${g.name} / ${g.nameEs || ''}`, {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '5C4F42' }, patternType: 'solid' },
    });
    setCell(ws, r, 1, titleCell);
    merges.push({ s: { r: r - 1, c: 0 }, e: { r: r - 1, c: 6 } });
    r++;

    let groupSubtotal = 0;
    for (const it of items) {
      const row = [String(idx), it.name, it.model, it.customerNote, it.salePrice, `${it.quantity} ${it.unit}`, it.lineTotal];
      row.forEach((v, c) => setCell(ws, r, c + 1, mkCell(v as string | number, cellStyle({ align: c >= 4 ? 'right' : 'left' }))));
      groupSubtotal += it.lineTotal;
      idx++;
      r++;
    }

    // 小计行
    setCell(ws, r, 1, mkCell(`小计 Subtotal ${g.name}`, cellStyle({ bold: true, fill: 'F0EDE6', align: 'right' })));
    merges.push({ s: { r: r - 1, c: 0 }, e: { r: r - 1, c: 5 } });
    const subVal = mkCell(groupSubtotal, cellStyle({ bold: true, fill: 'F0EDE6', align: 'right' }));
    subVal.z = EUR_FMT;
    setCell(ws, r, 7, subVal);
    r++;
  }

  // 合计（含折扣 dto% 与逐行税率 iva%）
  const t = computeQuoteTotals(quotation.items);
  const ivaRate = t.base > 0 ? (t.iva / t.base) * 100 : quotation.vatRate;
  const dtoRate = t.neto > 0 ? (t.dto / t.neto) * 100 : 0;

  darkRow(ws, r, '税前小计 Neto', t.neto);
  r++;
  if (t.dto > 0) {
    darkRow(ws, r, `折扣 Dto ${dtoRate.toFixed(1)}%`, -t.dto);
    r++;
  }
  darkRow(ws, r, '折后税前 Base Imponible', t.base);
  r++;
  darkRow(ws, r, `IVA ${ivaRate.toFixed(1)}%`, t.iva);
  r++;
  darkRow(ws, r, '含税总价 TOTAL CON IVA', t.total, true);
  r += 2;

  // 备注
  if (quotation.notes || company.footerNote) {
    const noteCell = mkCell(`Notas / 说明：\n${quotation.notes || company.footerNote}`, {
      alignment: { wrapText: true, vertical: 'top' },
    });
    setCell(ws, r, 1, noteCell);
    merges.push({ s: { r: r - 1, c: 0 }, e: { r: r - 1, c: 6 } });
    const rowInfos: any[] = (ws['!rows'] as any[]) ?? [];
    rowInfos[r - 1] = { hpt: 60 };
    ws['!rows'] = rowInfos as any;
    r++;
  }

  ws['!merges'] = merges;
  ws['!cols'] = [
    { wch: 6 },
    { wch: 34 },
    { wch: 24 },
    { wch: 32 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, '01 · Presupuesto Cliente');

  // ---- Sheet 2: 内部版 ----
  const ws2 = XLSX.utils.aoa_to_sheet([]);
  const merges2: XLSX.Range[] = [];
  let r2 = 1;
  setCell(ws2, r2, 1, mkCell(`${company.name || '工作室'} — CONTROL INTERNO（机密）`, {
    font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '7A1F1F' }, patternType: 'solid' },
  }));
  merges2.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } });
  r2++;
  r2++;

  const heads2 = ['#', '大类', '产品', '型号', '成本', '售价', '利润', '数量', '小计', '内部备注'];
  heads2.forEach((h, i) => setCell(ws2, r2, i + 1, mkCell(h, headerStyle())));
  r2++;

  idx = 1;
  for (const g of groups) {
    const items = quotation.items.filter((it) => it.categoryGroupId === g.id);
    if (items.length === 0) continue;
    setCell(ws2, r2, 1, mkCell(g.name, {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '7A1F1F' }, patternType: 'solid' },
    }));
    merges2.push({ s: { r: r2 - 1, c: 0 }, e: { r: r2 - 1, c: 9 } });
    r2++;

    for (const it of items) {
      const row = [
        String(idx),
        g.name,
        it.name,
        it.model,
        it.cost,
        it.salePrice,
        it.margin,
        `${it.quantity} ${it.unit}`,
        it.lineTotal,
        it.internalNote,
      ];
      row.forEach((v, c) => setCell(ws2, r2, c + 1, mkCell(v as string | number, cellStyle({ align: c >= 4 && c <= 8 ? 'right' : 'left' }))));
      [4, 5, 6, 8].forEach((c) => {
        ws2[XLSX.utils.encode_cell({ r: r2 - 1, c })].z = EUR_FMT;
      });
      idx++;
      r2++;
    }
  }

  ws2['!merges'] = merges2;
  ws2['!cols'] = [
    { wch: 6 },
    { wch: 14 },
    { wch: 30 },
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 26 },
  ];

  XLSX.utils.book_append_sheet(wb, ws2, '02 · Control Interno');

  // 生成并触发下载（显式 Blob，避免某些环境下 XLSX.writeFile 不生效）
  const fileName = `${quotation.quoteNumber || 'presupuesto'}_${project.projectNo || project.name || 'proyecto'}.xlsx`.replace(
    /[\\/:*?"<>|]/g,
    '_',
  );
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([new Uint8Array(wbout)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface ExcelRow {
  categoryGroupName: string;
  name: string;
  nameEs: string;
  model: string;
  customerNote: string;
  cost: number;
  salePrice: number;
  quantity: number;
  unit: string;
  photoUrl: string;
  internalNote: string;
}

export function parseQuotationExcel(file: File): Promise<ExcelRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as (string | number)[][];

        const out: ExcelRow[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.every((c) => !c)) continue;
          const name = String(row[1] || '').trim();
          if (!name) continue;
          out.push({
            categoryGroupName: String(row[0] || '').trim(),
            name,
            nameEs: String(row[2] || '').trim(),
            model: String(row[3] || '').trim(),
            customerNote: String(row[4] || '').trim(),
            cost: Number(row[5]) || 0,
            salePrice: Number(row[6]) || 0,
            quantity: Number(row[7]) || 1,
            unit: String(row[8] || '').trim() || '个',
            photoUrl: String(row[9] || '').trim(),
            internalNote: String(row[10] || '').trim(),
          });
        }
        resolve(out);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
