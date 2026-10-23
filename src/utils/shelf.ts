import { foodDatabase } from "../data/foodDatabase";
import type { Category, Food, ModeConfig } from "../types";
import { matchScore } from "./nutrition";

export const CATEGORY_ORDER: Category[] = ["主食", "小吃", "饮料", "其他"];

/** 初始套餐必须覆盖的三类 */
export const CORE_CATEGORIES: Category[] = ["主食", "小吃", "饮料"];

function byMatch(mode: ModeConfig) {
  return (a: Food, b: Food) => matchScore(b, mode) - matchScore(a, mode);
}

/**
 * 推荐区：配置里的 recommendedFoodIds 按匹配度排序，
 * 再兜底补齐主食 / 小吃 / 饮料，保证推荐不会缺品类。
 */
export function getRecommendedFoods(mode: ModeConfig): Food[] {
  const list: Food[] = [];
  const seen = new Set<string>();

  mode.recommendedFoodIds.forEach((id) => {
    const food = foodDatabase.find((item) => item.id === id);
    if (food && !seen.has(id)) {
      list.push(food);
      seen.add(id);
    }
  });

  CORE_CATEGORIES.forEach((category) => {
    if (list.some((food) => food.category === category)) return;
    const fallback = foodDatabase
      .filter((food) => food.category === category)
      .sort(byMatch(mode))[0];
    if (fallback && !seen.has(fallback.id)) {
      list.push(fallback);
      seen.add(fallback.id);
    }
  });

  return list.sort(byMatch(mode));
}

export interface ShelfSection {
  category: Category;
  foods: Food[];
}

export function getShelf(mode: ModeConfig): {
  recommended: Food[];
  sections: ShelfSection[];
} {
  const recommended = getRecommendedFoods(mode);
  const recommendedIds = new Set(recommended.map((food) => food.id));

  const sections = CATEGORY_ORDER.map((category) => ({
    category,
    foods: foodDatabase
      .filter((food) => food.category === category && !recommendedIds.has(food.id))
      .sort(byMatch(mode)),
  })).filter((section) => section.foods.length > 0);

  return { recommended, sections };
}
