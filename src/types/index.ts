export type Category = "主食" | "小吃" | "饮料" | "其他";

export type ModeId = "taste" | "nutrition" | "value";

/**
 * 食品数据模型 —— 全站唯一数据源。
 *
 * 绑定约束（由 foodDatabase 里的 assertUniqueArtworks 强制执行）：
 *   · 每个 id 只能有一张图，路径固定为 /images/foods/<id>.svg；
 *   · 全库不允许出现两条相同的 imageUrl；
 *   · 渲染层只读 food.imageUrl，img 的 alt 固定绑定 food.name。
 */
export interface Food {
  id: string;
  name: string;
  category: Category;
  /** 单价（元） */
  price: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  /** 该食品专属插画，一个 id 一张，不复用别人的图 */
  imageUrl: string;

  /** —— 以下是同一份数据的附加维度，供推荐排序使用 —— */
  /** 口碑 / 营养 / 性价比 三个 0–10 分 */
  scores: { taste: number; nutrition: number; value: number };
  tags: string[];
  recommendedForModes: ModeId[];
  /** 盘中视觉份量，1 为品类基准（只影响大小，不影响用哪张图） */
  imageScale?: number;
}

/** 模式推荐权重，三项之和为 1 */
export interface ModeWeights {
  taste: number;
  nutrition: number;
  value: number;
}

export interface ModeConfig {
  id: ModeId;
  name: string;
  desc: string;
  themeColor: string;
  /** 卡片的强调色（渐变尾色） */
  accentColor: string;
  emoji: string;
  /** 进入该模式时自动摆上餐盘的食品 id */
  initialItemIds: string[];
  weights: ModeWeights;
  /** 推荐食品 id，展示在货架最前面 */
  recommendedFoodIds: string[];
}

/** 盘中的一个「实体」：同一款食品放两份，就是两个独立实例 */
export interface PlateItem {
  instanceId: string;
  foodId: string;
  /** 相对餐盘内区的百分比坐标（0–100），随尺寸缩放不会跑偏 */
  x: number;
  y: number;
  rotate: number;
}

export interface Plate {
  plateId: string;
  name: string;
  items: PlateItem[];
}

export type ToastAction = "newPlate" | "reset";

export interface Toast {
  id: number;
  text: string;
  tone: "warn" | "info";
  action?: ToastAction;
  actionLabel?: string;
}
