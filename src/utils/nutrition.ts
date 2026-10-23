import { foodById } from "../data/foodDatabase";
import type { Food, ModeConfig, Plate, PlateItem } from "../types";

export interface Totals {
  price: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  /** 盘中“实体”总数（不是种类数） */
  count: number;
  /** 不同种类数 */
  kinds: number;
}

/** 把多个餐盘的实例拍平成一串食品 id */
export function flattenItems(plates: Plate[]): PlateItem[] {
  return plates.flatMap((plate) => plate.items);
}

export function computeTotals(items: PlateItem[]): Totals {
  const totals: Totals = {
    price: 0,
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    count: 0,
    kinds: 0,
  };
  const kinds = new Set<string>();

  items.forEach((item) => {
    const food = foodById.get(item.foodId);
    if (!food) return;
    totals.price += food.price;
    totals.calories += food.calories;
    totals.protein += food.protein;
    totals.fat += food.fat;
    totals.carbs += food.carbs;
    totals.count += 1;
    kinds.add(food.id);
  });

  totals.kinds = kinds.size;
  totals.price = Math.round(totals.price * 100) / 100;
  return totals;
}

/** 模式匹配度 0~1 */
export function matchScore(food: Food, mode: ModeConfig): number {
  const { taste, nutrition, value } = mode.weights;
  return (
    (food.scores.taste / 10) * taste +
    (food.scores.nutrition / 10) * nutrition +
    (food.scores.value / 10) * value
  );
}

/**
 * 每人每餐的热量参考上限（kcal）。
 * 侧栏预警、均衡评分、MCP calculateMealScore 共用这一个常数，
 * 改阈值只改这里，不会出现「侧栏说超标、评分说没超」的分裂。
 * 取 1000：一份汉堡 + 中薯 + 中可（≈950）属于正常一餐，
 * 再加一份小吃才应该提示浪费。
 */
export const CALORIE_LIMIT_PER_PERSON = 1000;

/** 每人每天的推荐摄入参考，用于侧栏进度条与热量预警 */
export function nutritionTargets(diningSize: number) {
  return {
    /** 整餐推荐热量上限：人数 × CALORIE_LIMIT_PER_PERSON */
    calories: diningSize * CALORIE_LIMIT_PER_PERSON,
    protein: diningSize * 55,
    fat: diningSize * 70,
    carbs: diningSize * 95,
  };
}

export interface BalancePart {
  key: string;
  label: string;
  value: number;
  max: number;
  hint: string;
}

export interface BalanceResult {
  score: number;
  label: string;
  parts: BalancePart[];
}

/**
 * 均衡评分（0~100），四段固定规则，结果稳定可复算：
 * 1. 结构完整 45：主食 / 小吃 / 饮料 各 15
 * 2. 热量区间 20：整餐人均 450–1000 kcal 满分
 * 3. 蛋白占比 20：蛋白质供能比 18%–35% 满分
 * 4. 模式匹配 15：已选食品对当前模式的平均匹配度
 */
export function computeBalance(
  items: PlateItem[],
  mode: ModeConfig,
  diningSize: number,
): BalanceResult {
  const totals = computeTotals(items);
  const hasCategory = (category: Food["category"]) =>
    items.some((item) => foodById.get(item.foodId)?.category === category);

  const structure =
    (hasCategory("主食") ? 15 : 0) +
    (hasCategory("小吃") ? 15 : 0) +
    (hasCategory("饮料") ? 15 : 0);

  // 人均热量，避免人数增加后误判为超标
  const perPersonCalories = totals.calories / Math.max(1, diningSize);

  let caloriePart = 0;
  if (perPersonCalories >= 450 && perPersonCalories <= CALORIE_LIMIT_PER_PERSON) {
    caloriePart = 20;
  } else if (
    (perPersonCalories >= 300 && perPersonCalories < 450) ||
    (perPersonCalories > CALORIE_LIMIT_PER_PERSON &&
      perPersonCalories <= CALORIE_LIMIT_PER_PERSON * 1.15)
  ) {
    caloriePart = 12;
  } else if (perPersonCalories > 0) {
    caloriePart = 6;
  }

  let proteinPart = 0;
  if (totals.calories > 0) {
    const ratio = (totals.protein * 4) / totals.calories;
    if (ratio >= 0.18 && ratio <= 0.35) proteinPart = 20;
    else if ((ratio >= 0.12 && ratio < 0.18) || (ratio > 0.35 && ratio <= 0.45))
      proteinPart = 12;
    else proteinPart = 6;
  }

  let matchSum = 0;
  items.forEach((item) => {
    const food = foodById.get(item.foodId);
    if (food) matchSum += matchScore(food, mode);
  });
  const matchPart =
    items.length > 0 ? Math.round((matchSum / items.length) * 15) : 0;

  const score = structure + caloriePart + proteinPart + matchPart;
  const label =
    score >= 85 ? "很均衡" : score >= 70 ? "还不错" : score >= 55 ? "一般" : "偏科啦";

  return {
    score,
    label,
    parts: [
      { key: "structure", label: "结构完整", value: structure, max: 45, hint: "主食 / 小吃 / 饮料 各 15 分" },
      {
        key: "calorie",
        label: "热量区间",
        value: caloriePart,
        max: 20,
        hint: `人均 450–${CALORIE_LIMIT_PER_PERSON} kcal 最佳`,
      },
      { key: "protein", label: "蛋白占比", value: proteinPart, max: 20, hint: "蛋白质供能比 18%–35% 最佳" },
      { key: "match", label: "模式匹配", value: matchPart, max: 15, hint: `按「${mode.name}」权重计算` },
    ],
  };
}

export interface MetricRow {
  key: "calories" | "protein" | "fat" | "carbs";
  label: string;
  unit: string;
  value: number;
  target: number;
  percent: number;
  tone: "good" | "warn" | "over";
}

/** 侧栏四个营养进度条的数据 */
export function buildMetrics(
  totals: Totals,
  diningSize: number,
): MetricRow[] {
  const targets = nutritionTargets(diningSize);
  const rows: Array<Omit<MetricRow, "percent" | "tone">> = [
    { key: "calories", label: "热量", unit: "kcal", value: Math.round(totals.calories), target: targets.calories },
    { key: "protein", label: "蛋白质", unit: "g", value: Math.round(totals.protein), target: targets.protein },
    { key: "fat", label: "脂肪", unit: "g", value: Math.round(totals.fat), target: targets.fat },
    { key: "carbs", label: "碳水", unit: "g", value: Math.round(totals.carbs), target: targets.carbs },
  ];

  return rows.map((row) => {
    const ratio = row.target > 0 ? row.value / row.target : 0;
    const percent = Math.min(100, Math.round(ratio * 100));
    const tone: MetricRow["tone"] =
      ratio > 1.1 ? "over" : ratio > 0.9 ? "warn" : "good";
    return { ...row, percent, tone };
  });
}

export interface RadarPoint {
  dim: string;
  value: number;
}

/** 雷达图五个维度（0~100） */
export function buildRadar(
  items: PlateItem[],
  mode: ModeConfig,
  diningSize: number,
): RadarPoint[] {
  const total = items.length;
  const avg = (pick: (food: Food) => number) => {
    if (total === 0) return 0;
    const sum = items.reduce((acc, item) => {
      const food = foodById.get(item.foodId);
      return acc + (food ? pick(food) : 0);
    }, 0);
    return Math.round((sum / total) * 10);
  };

  const totals = computeTotals(items);
  const targets = nutritionTargets(diningSize);
  const balance = computeBalance(items, mode, diningSize);
  const satiety = Math.min(
    100,
    Math.round((totals.calories / Math.max(1, targets.calories)) * 100),
  );

  return [
    { dim: "味觉", value: avg((food) => food.scores.taste) },
    { dim: "营养", value: avg((food) => food.scores.nutrition) },
    { dim: "性价比", value: avg((food) => food.scores.value) },
    { dim: "均衡", value: balance.score },
    { dim: "饱腹", value: satiety },
  ];
}
