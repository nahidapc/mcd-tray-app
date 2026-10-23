import type { Food } from "../types";

/**
 * ============================================================
 *  全站唯一食品数据源 foodDatabase
 * ============================================================
 *  图片与名称的绑定规则（不再靠约定，靠断言保证）：
 *
 *  1. 每一条记录都自带 imageUrl，图片文件名为 `/images/foods/<id>.svg`，
 *     即「一个 id 一张专属插画」，插画按该食物的真实形态绘制
 *     （巨无霸三层包/麦辣鸡腿堡脆皮/板烧长包带烤痕/薯条红盒/可乐杯…）；
 *  2. 模块加载时执行 assertUniqueArtworks()：
 *       · 任意两条 imageUrl 相同 → 直接抛错，杜绝「所有汉堡共用一张图」；
 *       · imageUrl 文件名与 id 不一致 → 直接抛错，杜绝张冠李戴；
 *  3. 渲染层（FoodImage）只读 food.imageUrl，alt 固定为 food.name，
 *     加载失败时降级为「带食品名首字的色块」，不会拿别的食物图顶替。
 *
 *  改菜单时唯一要同步的额外动作：在 scripts/gen_food_art.py 里为新 id
 *  补一个绘制函数，再跑一次脚本。
 */

const ART = (id: string) => `/images/foods/${id}.svg`;

export const foodDatabase: Food[] = [
  // ---------------- 主食 ----------------
  {
    id: "bigmac",
    name: "巨无霸",
    category: "主食",
    price: 25.5,
    calories: 513,
    protein: 27,
    fat: 26,
    carbs: 42,
    imageUrl: ART("bigmac"),
    imageScale: 1.02,
    tags: ["招牌", "双层牛肉"],
    recommendedForModes: ["taste"],
    scores: { taste: 10, nutrition: 5, value: 4 },
  },
  {
    id: "mcspicy",
    name: "麦辣鸡腿堡",
    category: "主食",
    price: 22.5,
    calories: 485,
    protein: 24,
    fat: 24,
    carbs: 42,
    imageUrl: ART("mcspicy"),
    imageScale: 1,
    tags: ["招牌", "香辣"],
    recommendedForModes: ["taste"],
    scores: { taste: 10, nutrition: 5, value: 5 },
  },
  {
    id: "filet",
    name: "板烧鸡腿堡",
    category: "主食",
    price: 23.5,
    calories: 391,
    protein: 23,
    fat: 17,
    carbs: 35,
    imageUrl: ART("filet"),
    imageScale: 0.98,
    tags: ["高蛋白", "板烧"],
    recommendedForModes: ["nutrition"],
    scores: { taste: 9, nutrition: 7, value: 5 },
  },
  {
    id: "doublecheese",
    name: "双层吉士汉堡",
    category: "主食",
    price: 23,
    calories: 429,
    protein: 27,
    fat: 22,
    carbs: 31,
    imageUrl: ART("doublecheese"),
    imageScale: 0.9,
    tags: ["高蛋白", "双层芝士"],
    recommendedForModes: ["nutrition"],
    scores: { taste: 9, nutrition: 8, value: 5 },
  },
  {
    id: "mchicken",
    name: "麦香鸡",
    category: "主食",
    price: 17,
    calories: 369,
    protein: 15,
    fat: 17,
    carbs: 39,
    imageUrl: ART("mchicken"),
    imageScale: 0.92,
    tags: ["平价"],
    recommendedForModes: ["value"],
    scores: { taste: 8, nutrition: 6, value: 6 },
  },
  {
    id: "fish",
    name: "麦香鱼",
    category: "主食",
    price: 22.5,
    calories: 325,
    protein: 16,
    fat: 13,
    carbs: 35,
    imageUrl: ART("fish"),
    imageScale: 0.94,
    tags: ["清淡"],
    recommendedForModes: ["nutrition", "value"],
    scores: { taste: 8, nutrition: 7, value: 5 },
  },
  {
    id: "angus",
    name: "培根安格斯厚牛堡",
    category: "主食",
    price: 34.5,
    calories: 707,
    protein: 34,
    fat: 44,
    carbs: 43,
    imageUrl: ART("angus"),
    imageScale: 1.06,
    tags: ["高蛋白", "重磅"],
    recommendedForModes: ["taste"],
    scores: { taste: 9, nutrition: 3, value: 3 },
  },
  {
    id: "wrap",
    name: "酥酥多笋卷",
    category: "主食",
    price: 20.5,
    calories: 342,
    protein: 14,
    fat: 15,
    carbs: 36,
    imageUrl: ART("wrap"),
    imageScale: 1,
    tags: ["轻负担"],
    recommendedForModes: ["value"],
    scores: { taste: 7, nutrition: 6, value: 5 },
  },
  {
    id: "veggie",
    name: "培根蔬萃双层牛堡",
    category: "主食",
    price: 24.5,
    calories: 442,
    protein: 24,
    fat: 23,
    carbs: 34,
    imageUrl: ART("veggie"),
    imageScale: 0.96,
    tags: ["有蔬菜"],
    recommendedForModes: ["nutrition"],
    scores: { taste: 8, nutrition: 7, value: 5 },
  },
  {
    id: "chickenwrap",
    name: "鸡肉蛋沙拉叠叠卷",
    category: "主食",
    price: 17,
    calories: 387,
    protein: 17,
    fat: 21,
    carbs: 31,
    imageUrl: ART("chickenwrap"),
    imageScale: 0.9,
    tags: ["有蛋白质"],
    recommendedForModes: ["value"],
    scores: { taste: 7, nutrition: 6, value: 6 },
  },

  // ---------------- 小吃 ----------------
  {
    id: "fries",
    name: "薯条",
    category: "小吃",
    price: 13.5,
    calories: 289,
    protein: 4,
    fat: 12,
    carbs: 38,
    imageUrl: ART("fries"),
    imageScale: 1,
    tags: ["招牌", "必点", "中份"],
    recommendedForModes: ["taste"],
    scores: { taste: 10, nutrition: 4, value: 7 },
  },
  {
    id: "nuggets",
    name: "麦乐鸡（5 块）",
    category: "小吃",
    price: 14,
    calories: 213,
    protein: 12,
    fat: 12,
    carbs: 13,
    imageUrl: ART("nuggets"),
    imageScale: 0.98,
    tags: ["高蛋白"],
    recommendedForModes: ["taste", "value"],
    scores: { taste: 9, nutrition: 5, value: 7 },
  },
  {
    id: "wings",
    name: "麦辣鸡翅（2 块）",
    category: "小吃",
    price: 15,
    calories: 224,
    protein: 13,
    fat: 15,
    carbs: 9,
    imageUrl: ART("wings"),
    imageScale: 0.96,
    tags: ["香辣"],
    recommendedForModes: ["taste"],
    scores: { taste: 9, nutrition: 6, value: 7 },
  },
  {
    id: "bigchicken",
    name: "那么大鸡排",
    category: "小吃",
    price: 14,
    calories: 385,
    protein: 24,
    fat: 21,
    carbs: 24,
    imageUrl: ART("bigchicken"),
    imageScale: 0.94,
    tags: ["高蛋白", "顶饱"],
    recommendedForModes: ["taste"],
    scores: { taste: 9, nutrition: 6, value: 8 },
  },
  {
    id: "corn",
    name: "玉米杯",
    category: "小吃",
    price: 13,
    calories: 87,
    protein: 4,
    fat: 1,
    carbs: 12,
    imageUrl: ART("corn"),
    imageScale: 0.96,
    tags: ["低卡", "有蔬菜", "大杯"],
    recommendedForModes: ["nutrition", "value"],
    scores: { taste: 8, nutrition: 9, value: 7 },
  },
  {
    id: "apple",
    name: "苹果片",
    category: "小吃",
    price: 7,
    calories: 32,
    protein: 0,
    fat: 0,
    carbs: 7,
    imageUrl: ART("apple"),
    imageScale: 0.88,
    tags: ["低卡", "有蔬果"],
    recommendedForModes: ["nutrition", "value"],
    scores: { taste: 5, nutrition: 9, value: 9 },
  },
  {
    id: "pie",
    name: "香芋派",
    category: "小吃",
    price: 8.5,
    calories: 232,
    protein: 2,
    fat: 12,
    carbs: 28,
    imageUrl: ART("pie"),
    imageScale: 0.9,
    tags: ["甜品"],
    recommendedForModes: [],
    scores: { taste: 8, nutrition: 3, value: 9 },
  },
  {
    id: "hashbrown",
    name: "脆薯饼",
    category: "小吃",
    price: 9,
    calories: 146,
    protein: 1,
    fat: 9,
    carbs: 14,
    imageUrl: ART("hashbrown"),
    imageScale: 0.82,
    tags: ["早餐时段"],
    recommendedForModes: [],
    scores: { taste: 9, nutrition: 4, value: 8 },
  },

  // ---------------- 饮料 ----------------
  {
    id: "coke",
    name: "可口可乐",
    category: "饮料",
    price: 9.5,
    calories: 147,
    protein: 0,
    fat: 0,
    carbs: 36,
    imageUrl: ART("coke"),
    imageScale: 1,
    tags: ["经典", "中杯"],
    recommendedForModes: ["taste", "value"],
    scores: { taste: 9, nutrition: 5, value: 8 },
  },
  {
    id: "cokezero",
    name: "无糖可乐",
    category: "饮料",
    price: 11,
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 1,
    imageUrl: ART("cokezero"),
    imageScale: 1,
    tags: ["零卡", "中杯"],
    recommendedForModes: ["nutrition"],
    scores: { taste: 6, nutrition: 6, value: 7 },
  },
  {
    id: "milk",
    name: "纯牛奶",
    category: "饮料",
    price: 10.5,
    calories: 129,
    protein: 7,
    fat: 7,
    carbs: 10,
    imageUrl: ART("milk"),
    imageScale: 0.92,
    tags: ["高钙", "高蛋白", "盒装"],
    recommendedForModes: ["nutrition"],
    scores: { taste: 6, nutrition: 7, value: 8 },
  },
  {
    id: "americano",
    name: "麦咖啡美式",
    category: "饮料",
    price: 11.9,
    calories: 13,
    protein: 1,
    fat: 0,
    carbs: 2,
    imageUrl: ART("americano"),
    imageScale: 0.95,
    tags: ["零糖", "低卡", "中杯"],
    recommendedForModes: ["nutrition"],
    scores: { taste: 6, nutrition: 7, value: 7 },
  },
  {
    id: "orange",
    name: "阳光橙麦炫酷",
    category: "饮料",
    price: 13,
    calories: 228,
    protein: 1,
    fat: 2,
    carbs: 50,
    imageUrl: ART("orange"),
    imageScale: 1,
    tags: ["果味"],
    recommendedForModes: [],
    scores: { taste: 7, nutrition: 6, value: 7 },
  },
  {
    id: "soy",
    name: "优品豆浆",
    category: "饮料",
    price: 10,
    calories: 202,
    protein: 8,
    fat: 4,
    carbs: 33,
    imageUrl: ART("soy"),
    imageScale: 0.98,
    tags: ["植物蛋白", "大杯"],
    recommendedForModes: ["nutrition"],
    scores: { taste: 7, nutrition: 5, value: 8 },
  },

  // ---------------- 其他（甜品） ----------------
  {
    id: "mcflurry",
    name: "奥利奥麦旋风",
    category: "其他",
    price: 15.5,
    calories: 266,
    protein: 5,
    fat: 9,
    carbs: 40,
    imageUrl: ART("mcflurry"),
    imageScale: 0.98,
    tags: ["甜品", "人气"],
    recommendedForModes: ["taste"],
    scores: { taste: 9, nutrition: 4, value: 7 },
  },
  {
    id: "cone",
    name: "圆筒冰淇淋",
    category: "其他",
    price: 5,
    calories: 93,
    protein: 2,
    fat: 3,
    carbs: 14,
    imageUrl: ART("cone"),
    imageScale: 1,
    tags: ["低价甜品"],
    recommendedForModes: ["value"],
    scores: { taste: 8, nutrition: 5, value: 10 },
  },
  {
    id: "sundae",
    name: "朱古力新地",
    category: "其他",
    price: 12,
    calories: 282,
    protein: 5,
    fat: 9,
    carbs: 44,
    imageUrl: ART("sundae"),
    imageScale: 0.98,
    tags: ["甜品"],
    recommendedForModes: [],
    scores: { taste: 8, nutrition: 3, value: 8 },
  },
];

/**
 * 图文绑定的运行时断言。
 * 数据一旦出现「一图多用」或「图片文件名与 id 不符」，直接抛错，
 * 让问题在开发/构建阶段暴露，而不是留到页面上变成图文不符。
 */
function assertUniqueArtworks(foods: Food[]): void {
  const problems: string[] = [];
  const byUrl = new Map<string, string[]>();
  const byId = new Set<string>();

  for (const food of foods) {
    if (byId.has(food.id)) problems.push(`重复 id：${food.id}`);
    byId.add(food.id);

    if (!food.imageUrl || !food.imageUrl.trim()) {
      problems.push(`${food.name}（${food.id}）缺少 imageUrl`);
      continue;
    }
    // 文件名必须等于 id：/images/foods/<id>.svg
    const file = food.imageUrl.split("/").pop() ?? "";
    if (file !== `${food.id}.svg`) {
      problems.push(`${food.name}（${food.id}）的图片指向 ${food.imageUrl}，应为 ${food.id}.svg`);
    }
    const list = byUrl.get(food.imageUrl) ?? [];
    list.push(food.name);
    byUrl.set(food.imageUrl, list);
  }

  for (const [url, names] of byUrl) {
    if (names.length > 1) problems.push(`图片被共用：${names.join(" / ")} → ${url}`);
  }

  if (problems.length > 0) {
    throw new Error(`[foodDatabase] 图文绑定校验失败：\n- ${problems.join("\n- ")}`);
  }
}

assertUniqueArtworks(foodDatabase);

/** 按 id 取食品，供货架、餐盘、统计共用 */
export const foodById = new Map(foodDatabase.map((food) => [food.id, food]));

export function getFood(id: string): Food | undefined {
  return foodById.get(id);
}

/** 开发期自检用：返回（图片地址 → 食品名）对照表 */
export const artworkManifest: Record<string, string> = Object.fromEntries(
  foodDatabase.map((food) => [food.imageUrl, food.name]),
);
