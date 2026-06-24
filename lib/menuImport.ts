/**
 * 菜單匯入檔的驗證與解析（DB 無關，可單元測試）。
 * 對應 docs/DB_SCHEMA.md 的菜單結構；商家可用此格式提供自己的菜單。
 * 金額為整數（元）。檔案內 id 僅供檔案內關聯，匯入時會重新產生 DB uuid。
 */
import { z } from "zod";

const optionSchema = z.object({
  id: z.string(),
  label: z.string().min(1),
  price_delta: z.number().int().min(0).default(0),
  is_available: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

const optionGroupSchema = z
  .object({
    id: z.string(),
    name: z.string().min(1),
    is_required: z.boolean().default(false),
    min_select: z.number().int().min(0).default(0),
    max_select: z.number().int().min(1).default(1),
    sort_order: z.number().int().default(0),
    options: z.array(optionSchema).min(1),
  })
  .refine((g) => g.min_select <= g.max_select, {
    message: "min_select 不可大於 max_select",
  })
  .refine((g) => !g.is_required || g.min_select >= 1, {
    message: "必填群組的 min_select 需 >= 1",
  });

const menuItemSchema = z.object({
  id: z.string(),
  category_id: z.string(),
  name: z.string().min(1),
  description: z.string().nullable().default(null),
  image_url: z.string().nullable().default(null),
  price: z.number().int().min(0),
  is_available: z.boolean().default(true),
  sort_order: z.number().int().default(0),
  option_groups: z.array(optionGroupSchema).default([]),
});

const categorySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

const storeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  address: z.string().nullable().default(null),
  phone: z.string().nullable().default(null),
  timezone: z.string().default("Asia/Taipei"),
  is_open: z.boolean().default(true),
  business_hours: z.record(z.any()).nullish(),
});

export const menuFileSchema = z
  .object({
    store: storeSchema,
    menu: z.object({
      categories: z.array(categorySchema).min(1),
      items: z.array(menuItemSchema),
    }),
  })
  .superRefine((data, ctx) => {
    const catIds = new Set(data.menu.categories.map((c) => c.id));
    data.menu.items.forEach((item, i) => {
      if (!catIds.has(item.category_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `item「${item.id}」的 category_id「${item.category_id}」不存在於 categories`,
          path: ["menu", "items", i, "category_id"],
        });
      }
    });
  });

export type MenuFile = z.infer<typeof menuFileSchema>;

/** 驗證並解析菜單匯入檔；不合法則丟出 ZodError。 */
export function parseMenuFile(raw: unknown): MenuFile {
  return menuFileSchema.parse(raw);
}
