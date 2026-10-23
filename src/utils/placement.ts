import type { PlateItem } from "../types";

/**
 * 盘中散落摆位。
 * 坐标是相对餐盘内区的百分比（0–100），
 * 所以窗口缩放、手机端切换都不会让食物飞出盘子。
 */

/** 候选落点：中间留一枚“主位”，外圈按 8 个方位铺开 */
const SLOTS: Array<[number, number]> = [
  [50, 52],
  [30, 35],
  [70, 35],
  [30, 69],
  [70, 69],
  [50, 24],
  [50, 79],
  [16, 51],
  [84, 51],
  [23, 21],
  [77, 21],
  [23, 82],
  [77, 82],
];

const TILTS = [-9, 7, -4, 11, -12, 5, 0, 9, -7, 4, -11, 8];

function tilt(index: number): number {
  return TILTS[index % TILTS.length];
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  // y 轴视觉上更“扁”，加权让落点分布更接近椭圆的观感
  return Math.hypot(a.x - b.x, (a.y - b.y) * 1.15);
}

export interface Point {
  x: number;
  y: number;
}

/** 找一个离已有食物最远的候选点 */
export function pickSlot(taken: Point[]): Point {
  if (taken.length === 0) return { x: SLOTS[0][0], y: SLOTS[0][1] };

  let best: [number, number] = SLOTS[0];
  let bestScore = -1;
  SLOTS.forEach(([x, y]) => {
    const nearest = Math.min(...taken.map((point) => distance(point, { x, y })));
    if (nearest > bestScore) {
      bestScore = nearest;
      best = [x, y];
    }
  });
  return { x: best[0], y: best[1] };
}

/** 生成一个实例的初始姿态（落点 + 角度） */
export function createPlacement(
  taken: Point[],
  index: number,
  preferred?: Point,
): { x: number; y: number; rotate: number } {
  const slot = preferred ?? pickSlot(taken);
  return {
    x: Math.min(88, Math.max(12, slot.x)),
    y: Math.min(86, Math.max(14, slot.y)),
    rotate: tilt(index),
  };
}

/** 初始套餐的整套摆位 */
export function scatterFor(
  count: number,
): Array<{ x: number; y: number; rotate: number }> {
  const taken: Point[] = [];
  return Array.from({ length: count }, (_, index) => {
    const placement = createPlacement(taken, index);
    taken.push({ x: placement.x, y: placement.y });
    return placement;
  });
}

export function clampPercent(value: number, min = 8, max = 92): number {
  return Math.min(max, Math.max(min, value));
}

/** 从实例里提取已占用的点，喂给 pickSlot */
export function takenPoints(items: PlateItem[]): Point[] {
  return items.map((item) => ({ x: item.x, y: item.y }));
}
