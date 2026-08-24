/** AI 链接识别结果（价格 / 毛利留空，强约束 #8）。 */
export interface AiRecognizedProduct {
  url: string;
  categoryGroup: string; // 建议大类名
  subCategory: string; // 建议小类名
  name: string;
  brand: string;
  model: string;
  photoUrl: string;
  size: string;
  material: string;
  description: string;
  cost: number | null; // 留空 → 人工确认
  margin: number | null; // 留空 → 人工确认
}
