/**
 * ============================================================
 *  麦当劳 MCP Server 适配层（前端 ↔ MCP 的唯一出口）
 * ============================================================
 *  三个 Tool 一比一映射：
 *
 *    getFoodNutrition(foodId)   → 单个餐品的营养与价格（建库 / 刷新菜单）
 *    calculateMealScore(items)  → 整单三维评分（推荐与均衡度 / 防浪费判定）
 *    submitOrderMock(payload)   → 下单（演示环境，不产生真实扣款）
 *
 *  设计取舍：
 *  · 未配置 `VITE_MCD_MCP_URL` 时自动降级为「本地 mock」，数据直接取自
 *    foodDatabase —— 评委 clone 下来不配密钥也能完整跑通；
 *  · 配置了地址时按 MCP 规范（JSON-RPC 2.0 / tools/call）发起请求，
 *    响应结构与 Tool 的 outputSchema 对齐；
 *  · 任何 MCP 异常都不阻断主流程：营养回落到本地库、下单回落到本地取餐号，
 *    并在返回值的 `source` 上如实标注数据来源。
 */

import { foodById } from "../data/foodDatabase";
import type { ModeConfig, Plate } from "../types";
import { computeBalance, computeTotals, flattenItems, nutritionTargets } from "../utils/nutrition";

/** MCP Server 地址；空字符串代表「未接入，使用本地 mock」 */
export const MCP_ENDPOINT: string =
  (import.meta.env.VITE_MCD_MCP_URL as string | undefined)?.trim() ?? "";

/** 访问令牌（可选，真实 Server 一般要求 Bearer） */
export const MCP_TOKEN: string =
  (import.meta.env.VITE_MCD_MCP_TOKEN as string | undefined)?.trim() ?? "";

/** 是否已接入真实 MCP Server（界面与文档据此标注运行模式） */
export const MCP_CONNECTED = MCP_ENDPOINT.length > 0;

/** Tool 名常量，避免字符串散落在各处 */
export const MCP_TOOLS = {
  nutrition: "getFoodNutrition",
  mealScore: "calculateMealScore",
  submitOrder: "submitOrderMock",
} as const;

export interface NutritionPayload {
  foodId: string;
  name: string;
  price: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  /** 数据来源标识，方便界面标注「实时 / 本地」 */
  source: "mcp" | "local";
}

export interface MealScore {
  /** 0–100：整单健康度 */
  health: number;
  /** 0–100：口味丰富度 */
  variety: number;
  /** 0–10：营养均衡分（与侧栏展示一致） */
  balance: number;
  totalCalories: number;
  perPersonCalories: number;
  /** true 表示触发防浪费 / 热量超标的预警 */
  overLimit: boolean;
  source: "mcp" | "local";
}

export interface SubmitOrderPayload {
  items: { foodId: string; qty: number }[];
  payable: number;
  discount: number;
  originalPrice: number;
  diningSize: number;
  payMethod: string;
  modeId: string;
}

export interface OrderReceipt {
  orderNo: string;
  payable: number;
  itemCount: number;
  plateCount: number;
  /** 预计取餐时间（分钟），真实 Server 会按门店排队情况返回 */
  etaMinutes: number;
  /** 下单时 calculateMealScore 返回的均衡分；Server 不可用时为 null */
  balance?: number | null;
  source: "mcp" | "local";
}

/** 单次 Tool 调用的超时（毫秒）——演示环境不能让网络卡住 UI */
const TOOL_TIMEOUT = 4000;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let rpcSeq = 0;

/**
 * 按 MCP 规范调用一个 Tool（JSON-RPC 2.0）。
 * 未配置地址、网络错误、超时、Server 返回 isError —— 一律抛出，
 * 由调用方决定降级策略（本文件里统一「回落到本地 mock」）。
 */
async function callTool<T>(name: string, args: Record<string, unknown>): Promise<T> {
  if (!MCP_CONNECTED) throw new Error("[mcp] 未配置 VITE_MCD_MCP_URL");

  rpcSeq += 1;
  const response = await fetch(MCP_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(MCP_TOKEN ? { Authorization: `Bearer ${MCP_TOKEN}` } : {}),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: rpcSeq,
      method: "tools/call",
      params: { name, arguments: args },
    }),
    signal: AbortSignal.timeout(TOOL_TIMEOUT),
  });

  if (!response.ok) throw new Error(`[mcp] HTTP ${response.status}`);

  const body = (await response.json()) as {
    result?: {
      content?: { type: string; text?: string }[];
      structuredContent?: T;
      isError?: boolean;
    };
    error?: { code: number; message: string };
  };

  if (body.error) throw new Error(`[mcp] ${body.error.code}: ${body.error.message}`);
  if (body.result?.isError) throw new Error("[mcp] Tool 返回 isError");

  // 优先取 structuredContent；退化为解析第一个 text content 的 JSON
  if (body.result?.structuredContent) return body.result.structuredContent;
  const text = body.result?.content?.find((part) => part.type === "text")?.text;
  if (!text) throw new Error("[mcp] 响应缺少 content");
  return JSON.parse(text) as T;
}

/** 单份餐品的营养数据（MCP Tool: getFoodNutrition） */
export async function getFoodNutrition(foodId: string): Promise<NutritionPayload> {
  const local = foodById.get(foodId);
  if (!local) throw new Error(`[mcp] 未知餐品：${foodId}`);

  try {
    const remote = await callTool<Omit<NutritionPayload, "source">>(MCP_TOOLS.nutrition, {
      foodId,
      locale: "zh-CN",
    });
    return { ...remote, source: "mcp" };
  } catch {
    return {
      foodId: local.id,
      name: local.name,
      price: local.price,
      calories: local.calories,
      protein: local.protein,
      fat: local.fat,
      carbs: local.carbs,
      source: "local",
    };
  }
}

/** 整单评分（MCP Tool: calculateMealScore） */
export async function calculateMealScore(
  plates: Plate[],
  mode: ModeConfig,
  diningSize: number,
): Promise<MealScore> {
  const items = flattenItems(plates);
  const totals = computeTotals(items);
  const balance = computeBalance(items, mode, diningSize);
  const perPerson = totals.calories / Math.max(1, diningSize);
  // 与侧栏同一套口径（营养目标来自 nutritionTargets，阈值只在那里定义一次）
  const overLimit = totals.calories > nutritionTargets(diningSize).calories;

  try {
    const remote = await callTool<Omit<MealScore, "source">>(MCP_TOOLS.mealScore, {
      modeId: mode.id,
      diningSize,
      items: items.map((item) => ({ foodId: item.foodId, qty: 1 })),
    });
    return { ...remote, source: "mcp" };
  } catch {
    return {
      health: balance.score,
      variety: Math.min(100, Math.round((totals.kinds / 5) * 100)),
      balance: balance.score,
      totalCalories: totals.calories,
      perPersonCalories: Math.round(perPerson),
      overLimit,
      source: "local",
    };
  }
}

/** 下单（MCP Tool: submitOrderMock）——演示环境不产生真实扣款 */
export async function submitOrderMock(payload: SubmitOrderPayload): Promise<OrderReceipt> {
  const qty = payload.items.reduce((sum, item) => sum + item.qty, 0);

  if (payload.payable <= 0 || qty === 0) {
    throw new Error("[mcp] 空订单，服务端拒绝受理");
  }

  try {
    const remote = await callTool<Omit<OrderReceipt, "source">>(
      MCP_TOOLS.submitOrder,
      payload as unknown as Record<string, unknown>,
    );
    return { ...remote, source: "mcp" };
  } catch {
    // 模拟 Server 往返：保留支付动画的真实节奏
    await sleep(1250);
    return {
      orderNo: `MCD${Date.now().toString(36).toUpperCase().slice(-6)}`,
      payable: payload.payable,
      itemCount: qty,
      plateCount: 0, // 由调用方按当前餐盘数补齐
      etaMinutes: 5 + (qty > 4 ? 3 : 0),
      source: "local",
    };
  }
}
