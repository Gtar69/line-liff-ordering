/**
 * 共用型別，形狀對齊 docs/API.md，讓 Issue #2 的 mock adapter 之後可無痛替換為真實 API。
 * 金額一律整數（元）。
 */

export interface Store {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_open: boolean;
  pickup_methods: PickupMethod[];
}

export type PickupMethod = "self_pickup";

export interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export interface Option {
  id: string;
  label: string;
  price_delta: number;
}

export interface OptionGroup {
  id: string;
  name: string;
  is_required: boolean;
  min_select: number;
  max_select: number;
  options: Option[];
}

export interface MenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  is_available: boolean;
  option_groups: OptionGroup[];
}

export interface Menu {
  categories: Category[];
  items: MenuItem[];
}

export interface PickupSlot {
  /** ISO 8601 字串，送單用 */
  value: string;
  /** 顯示用，如「今天 06-24 17:00」 */
  label: string;
}

/** 購物車中一筆品項已選的單一選項（含快照欄位，供日後送單） */
export interface SelectedOption {
  group_id: string;
  group_name: string;
  option_id: string;
  label: string;
  price_delta: number;
}

/** 購物車品項；同商品不同選項組合視為不同 line（以 lineKey 區分） */
export interface CartLine {
  /** 前端唯一鍵：item_id + 已選 option_ids 排序組合 */
  lineKey: string;
  item_id: string;
  name: string;
  unit_price: number;
  quantity: number;
  options: SelectedOption[];
}
