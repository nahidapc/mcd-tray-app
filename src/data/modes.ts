import type { ModeConfig, ModeId } from "../types";

/**
 * 三种模式的全部配置集中在这里。
 * 改成「均衡 / 高蛋白 / 轻卡」只需替换下面六个字段，
 * 组件里没有任何模式名或食品名硬编码。
 */
export const MODES: ModeConfig[] = [
  {
    id: "taste",
    name: "主打味觉",
    desc: "好吃优先，招牌全上，快乐值拉满",
    themeColor: "#e23a2e",
    accentColor: "#ff9d3d",
    emoji: "🍔",
    initialItemIds: ["bigmac", "fries", "coke"],
    weights: { taste: 0.6, nutrition: 0.15, value: 0.25 },
    recommendedFoodIds: [
      "bigmac",
      "mcspicy",
      "angus",
      "fries",
      "nuggets",
      "wings",
      "coke",
      "mcflurry",
    ],
  },
  {
    id: "nutrition",
    name: "营养均衡",
    desc: "控卡控脂，蛋白质优先，吃得干净",
    themeColor: "#2f9e5f",
    accentColor: "#8fd46b",
    emoji: "🥗",
    initialItemIds: ["filet", "corn", "milk"],
    weights: { taste: 0.15, nutrition: 0.65, value: 0.2 },
    recommendedFoodIds: [
      "filet",
      "doublecheese",
      "veggie",
      "corn",
      "apple",
      "milk",
      "americano",
      "fish",
      "soy",
    ],
  },
  {
    id: "value",
    name: "省钱模式",
    desc: "预算有限，先看单价，再谈其他",
    themeColor: "#e0a014",
    accentColor: "#ffd451",
    emoji: "💰",
    initialItemIds: ["mchicken", "apple", "coke"],
    weights: { taste: 0.2, nutrition: 0.2, value: 0.6 },
    recommendedFoodIds: [
      "mchicken",
      "fish",
      "wrap",
      "apple",
      "corn",
      "coke",
      "cone",
      "nuggets",
    ],
  },
];

export const DEFAULT_MODE_ID: ModeId = MODES[0].id;

export function getMode(id: string | null): ModeConfig | null {
  if (!id) return null;
  return MODES.find((mode) => mode.id === id) ?? null;
}
