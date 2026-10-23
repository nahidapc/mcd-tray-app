import { useMemo } from "react";
import { create } from "zustand";
import { couponById, couponGap, formatYuan, isCouponUsable } from "../data/coupons";
import { getMode } from "../data/modes";
import {
  calculateMealScore,
  submitOrderMock,
  type OrderReceipt,
} from "../services/mcp";
import { buildBill, type Bill } from "../utils/billing";
import { computeTotals, flattenItems } from "../utils/nutrition";
import {
  clampPercent,
  createPlacement,
  scatterFor,
  takenPoints,
  type Point,
} from "../utils/placement";
import type { ModeId, Plate, PlateItem, Toast, ToastAction } from "../types";

/** 单个餐盘的硬上限：超过就引导用户新建餐盘，避免餐盘挤成一团 */
export const MAX_ITEMS_PER_PLATE = 7;

let seq = 0;
function uid(prefix: string): string {
  seq += 1;
  return `${prefix}-${seq}`;
}

let toastSeq = 0;

interface TrayState {
  plates: Plate[];
  activePlateId: string;
  diningSize: number;
  modeId: ModeId | null;
  /** 当前模式的初始套餐，用于「重置为推荐套餐」 */
  seedItemIds: string[];
  toast: Toast | null;

  /** 当前选中的优惠券 id；null 表示不使用 */
  selectedCouponId: string | null;

  /** 最近一次成功下单的回执（由 MCP submitOrderMock 返回） */
  lastOrder: OrderReceipt | null;

  /** 进入模式时按配置摆好初始套餐 */
  init: (modeId: ModeId, initialItemIds: string[]) => void;
  reset: () => void;

  /** 选券 / 取消选券（只接受当前金额达标的券） */
  selectCoupon: (couponId: string | null) => void;
  /** 折后账单：原价 / 优惠 / 实付，界面统一读它 */
  getBill: () => Bill;
  /**
   * 结算：把当前账单快照成 MCP 的行项目，调用 submitOrderMock 拿回执。
   * 界面只负责展示 returned receipt，不自己编造订单号。
   */
  submitOrder: (payMethod: string) => Promise<OrderReceipt>;
  /** 支付完成或返回首页时清空整单 */
  clearOrder: () => void;

  setDiningSize: (size: number) => void;
  setActivePlate: (plateId: string) => void;
  addPlate: () => void;

  /** 放一份新的（点几份就有几个独立实例） */
  addFood: (foodId: string, preferred?: Point) => void;
  moveItem: (plateId: string, instanceId: string, x: number, y: number) => void;
  rotateItem: (plateId: string, instanceId: string) => void;
  removeItem: (plateId: string, instanceId: string) => void;

  pushToast: (text: string, options?: { tone?: Toast["tone"]; action?: ToastAction; actionLabel?: string }) => void;
  dismissToast: () => void;
}

function buildPlate(initialItemIds: string[], name = "餐盘 1"): Plate {
  const placements = scatterFor(initialItemIds.length);
  const items: PlateItem[] = initialItemIds.map((foodId, index) => ({
    instanceId: uid("item"),
    foodId,
    ...placements[index],
  }));
  return { plateId: uid("plate"), name, items };
}

/**
 * 餐盘变动后复核已选券。
 * 金额跌破门槛就把选择摘掉（并告诉调用方是哪张券、差多少），
 * 保证「已选券」与「实际可享受的优惠」永远一致。
 */
function guardCoupon(
  plates: Plate[],
  couponId: string | null,
): { couponId: string | null; dropped: { name: string; gap: number } | null } {
  if (!couponId) return { couponId: null, dropped: null };
  const coupon = couponById.get(couponId);
  if (!coupon) return { couponId: null, dropped: null };
  const price = computeTotals(flattenItems(plates)).price;
  if (isCouponUsable(coupon, price)) return { couponId, dropped: null };
  return {
    couponId: null,
    dropped: { name: coupon.name, gap: couponGap(coupon, price) },
  };
}

export const useTrayStore = create<TrayState>((set, get) => ({
  plates: [],
  activePlateId: "",
  diningSize: 1,
  modeId: null,
  seedItemIds: [],
  toast: null,
  selectedCouponId: null,
  lastOrder: null,

  init: (modeId, initialItemIds) => {
    const plate = buildPlate(initialItemIds);
    set({
      modeId,
      seedItemIds: initialItemIds,
      plates: [plate],
      activePlateId: plate.plateId,
      toast: null,
      // 换模式 = 换一单，旧的券不跟过来
      selectedCouponId: null,
    });
  },

  reset: () => {
    const { seedItemIds, modeId, selectedCouponId } = get();
    if (!modeId) return;
    const plate = buildPlate(seedItemIds);
    // 重置后金额变了，券可能不再达标
    const guard = guardCoupon([plate], selectedCouponId);
    set({
      plates: [plate],
      activePlateId: plate.plateId,
      toast: null,
      selectedCouponId: guard.couponId,
    });
    get().pushToast("已经恢复到推荐套餐啦", { tone: "info" });
  },

  setDiningSize: (size) => set({ diningSize: Math.min(6, Math.max(1, size)) }),

  setActivePlate: (plateId) => set({ activePlateId: plateId }),

  addPlate: () => {
    const { plates } = get();
    const plate: Plate = {
      plateId: uid("plate"),
      name: `餐盘 ${plates.length + 1}`,
      items: [],
    };
    set({ plates: [...plates, plate], activePlateId: plate.plateId });
    get().pushToast("新餐盘准备好了，接着放吧～", { tone: "info" });
  },

  addFood: (foodId, preferred) => {
    const { plates, activePlateId } = get();
    const active = plates.find((plate) => plate.plateId === activePlateId) ?? plates[0];
    if (!active) return;

    if (active.items.length >= MAX_ITEMS_PER_PLATE) {
      get().pushToast(`「${active.name}」放不下啦，新建一个餐盘吧`, {
        tone: "warn",
        action: "newPlate",
        actionLabel: "＋ 新建餐盘",
      });
      return;
    }

    const placement = createPlacement(
      takenPoints(active.items),
      active.items.length,
      preferred,
    );
    const item: PlateItem = {
      instanceId: uid("item"),
      foodId,
      x: clampPercent(placement.x),
      y: clampPercent(placement.y),
      rotate: placement.rotate,
    };

    const nextPlates = plates.map((plate) =>
      plate.plateId === active.plateId
        ? { ...plate, items: [...plate.items, item] }
        : plate,
    );
    set({ plates: nextPlates });

    if (active.items.length + 1 >= MAX_ITEMS_PER_PLATE) {
      get().pushToast("餐盘快满了，请添加新餐盘", {
        tone: "warn",
        action: "newPlate",
        actionLabel: "＋ 新建餐盘",
      });
    }
  },

  moveItem: (plateId, instanceId, x, y) => {
    set((state) => ({
      plates: state.plates.map((plate) =>
        plate.plateId === plateId
          ? {
              ...plate,
              items: plate.items.map((item) =>
                item.instanceId === instanceId
                  ? { ...item, x: clampPercent(x), y: clampPercent(y) }
                  : item,
              ),
            }
          : plate,
      ),
    }));
  },

  rotateItem: (plateId, instanceId) => {
    set((state) => ({
      plates: state.plates.map((plate) =>
        plate.plateId === plateId
          ? {
              ...plate,
              items: plate.items.map((item) =>
                item.instanceId === instanceId
                  ? { ...item, rotate: item.rotate + 45 }
                  : item,
              ),
            }
          : plate,
      ),
    }));
  },

  removeItem: (plateId, instanceId) => {
    const { plates, selectedCouponId } = get();
    const nextPlates = plates.map((plate) =>
      plate.plateId === plateId
        ? {
            ...plate,
            items: plate.items.filter((item) => item.instanceId !== instanceId),
          }
        : plate,
    );

    // 减掉东西后金额可能跌破券门槛 → 当场摘券，而不是等到结算才发现
    const guard = guardCoupon(nextPlates, selectedCouponId);
    set({ plates: nextPlates, selectedCouponId: guard.couponId });

    if (guard.dropped) {
      get().pushToast(
        `还差 ¥${formatYuan(guard.dropped.gap)} 才能用「${guard.dropped.name}」，已为你取消`,
        { tone: "warn" },
      );
    }
  },

  selectCoupon: (couponId) => {
    if (!couponId) {
      set({ selectedCouponId: null });
      return;
    }
    const coupon = couponById.get(couponId);
    if (!coupon) return;

    const price = computeTotals(flattenItems(get().plates)).price;
    if (!isCouponUsable(coupon, price)) {
      get().pushToast(
        `还差 ¥${formatYuan(couponGap(coupon, price))} 才能用「${coupon.name}」`,
        { tone: "warn" },
      );
      return;
    }
    set({ selectedCouponId: couponId });
  },

  getBill: () => buildBill(get().plates, get().selectedCouponId),

  submitOrder: async (payMethod) => {
    const { plates, selectedCouponId, diningSize, modeId } = get();
    const bill = buildBill(plates, selectedCouponId);
    if (bill.count === 0) throw new Error("餐盘还是空的，先放点吃的吧");

    const mode = getMode(modeId ?? "taste");
    // 先让 Server 算一次整单评分（失败不阻断下单，评分置空即可）
    const score = mode
      ? await calculateMealScore(plates, mode, diningSize).catch(() => null)
      : null;

    // 同一款放了两份 → 聚合成 { foodId, qty }，与 MCP 行项目结构一致
    const qty = new Map<string, number>();
    flattenItems(plates).forEach((item) => {
      qty.set(item.foodId, (qty.get(item.foodId) ?? 0) + 1);
    });

    const receipt = await submitOrderMock({
      items: [...qty].map(([foodId, count]) => ({ foodId, qty: count })),
      payable: bill.payable,
      discount: bill.discount,
      originalPrice: bill.original,
      diningSize,
      payMethod,
      modeId: mode?.id ?? "taste",
    });

    // 取餐号与金额都来自「下单那一刻」的快照，
    // 之后即使用户返回首页清了单，小票仍然是准确的。
    const order: OrderReceipt = {
      ...receipt,
      plateCount: bill.plateCount,
      balance: score?.balance ?? null,
    };
    set({ lastOrder: order });
    return order;
  },

  clearOrder: () =>
    set({
      plates: [],
      activePlateId: "",
      selectedCouponId: null,
      lastOrder: null,
      seedItemIds: [],
      modeId: null,
      diningSize: 1,
      toast: null,
    }),

  pushToast: (text, options) => {
    toastSeq += 1;
    set({
      toast: {
        id: toastSeq,
        text,
        tone: options?.tone ?? "info",
        action: options?.action,
        actionLabel: options?.actionLabel,
      },
    });
  },

  dismissToast: () => set({ toast: null }),
}));

/** 只取当前盘的 items，组件里少写一层 find */
export function useActivePlate(): Plate | undefined {
  return useTrayStore((state) =>
    state.plates.find((plate) => plate.plateId === state.activePlateId),
  );
}

/**
 * 组件读账单的唯一入口。
 * 用 useMemo 包住 buildBill：plates 与券 id 都没变时返回同一个引用，
 * 既不会因为每次 selector 产生新对象而重渲染，也不会漏掉金额变化。
 */
export function useBill(): Bill {
  const plates = useTrayStore((state) => state.plates);
  const couponId = useTrayStore((state) => state.selectedCouponId);
  return useMemo(() => buildBill(plates, couponId), [plates, couponId]);
}
