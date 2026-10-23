/**
 * 优惠券数据层 —— 只描述「券本身」，不含任何界面状态。
 *
 * 计价规则统一收在文件底部（applyCoupon），
 * 全站（侧栏、结算弹窗）都必须调它，避免两处算法算出差一分的价。
 */

export type CouponType = "discount" | "minus";

export interface Coupon {
  id: string;
  name: string;
  /** minus：立减；discount：打折 */
  type: CouponType;
  /** minus 为减免金额（元）；discount 为折扣率，0.88 表示 8.8 折 */
  value: number;
  /** 使用门槛（元），0 表示无门槛；按「原价」判断 */
  minSpend: number;
  /** 卡片角标 */
  badge: string;
}

export const coupons: Coupon[] = [
  {
    id: "minus-10",
    name: "满 50 减 10",
    type: "minus",
    value: 10,
    minSpend: 50,
    badge: "满 50",
  },
  {
    id: "discount-88",
    name: "全场 8.8 折",
    type: "discount",
    value: 0.88,
    minSpend: 0,
    badge: "无门槛",
  },
  {
    id: "minus-5",
    name: "满 30 减 5",
    type: "minus",
    value: 5,
    minSpend: 30,
    badge: "满 30",
  },
  {
    id: "minus-18",
    name: "满 80 减 18",
    type: "minus",
    value: 18,
    minSpend: 80,
    badge: "满 80",
  },
  {
    id: "discount-95",
    name: "满 20 享 9.5 折",
    type: "discount",
    value: 0.95,
    minSpend: 20,
    badge: "满 20",
  },
];

export const couponById = new Map(coupons.map((coupon) => [coupon.id, coupon]));

/* ------------------------------ 金额工具 ------------------------------ */

/** 元 → 分。所有比较与四则运算都在分上做，最后再转回元 */
export const toCents = (yuan: number): number => Math.round(yuan * 100);

/** 分 → 元，并修掉二进制浮点尾巴（7.000000000000001 → 7） */
export const fromCents = (cents: number): number => toCents(cents / 100) / 100;

/** 统一的两位小数展示 */
export const formatYuan = (yuan: number): string => fromCents(toCents(yuan)).toFixed(2);

/** 券面文案：立减 ¥10 / 8.8 折（整数金额不补 .00，券面更清爽） */
export function couponFaceValue(coupon: Coupon): string {
  if (coupon.type === "minus") {
    const text = Number.isInteger(coupon.value)
      ? String(coupon.value)
      : formatYuan(coupon.value);
    return `¥${text}`;
  }
  return `${(coupon.value * 10).toFixed(1).replace(/\.0$/, "")} 折`;
}

/** 还差多少钱可用（0 表示已达标） */
export function couponGap(coupon: Coupon, price: number): number {
  return fromCents(Math.max(0, toCents(coupon.minSpend) - toCents(price)));
}

/** 原价是否达到门槛 */
export function isCouponUsable(coupon: Coupon, price: number): boolean {
  return toCents(price) >= toCents(coupon.minSpend);
}

export interface CouponResult {
  /** 优惠金额（元） */
  discount: number;
  /** 实付（元） */
  payable: number;
}

/**
 * 计算优惠。
 *  · minus   ：实付 = 原价 - 减免额（不超过原价）
 *  · discount：实付 = 原价 × 折扣率，即 优惠 = 原价 × (1 - 折扣率)
 * 结果四舍五入到分，保证「原价 = 优惠 + 实付」永远成立。
 */
export function applyCoupon(price: number, coupon: Coupon): CouponResult {
  const cents = toCents(price);
  const rawDiscount =
    coupon.type === "minus"
      ? toCents(coupon.value)
      : cents - Math.round(cents * coupon.value);

  const discountCents = Math.min(cents, Math.max(0, rawDiscount));
  return {
    discount: fromCents(discountCents),
    payable: fromCents(cents - discountCents),
  };
}

/** 当前金额下优惠力度最大的那张券（用于「推荐」角标），无可用券返回 null */
export function bestCoupon(price: number): Coupon | null {
  let best: Coupon | null = null;
  let bestDiscount = 0;
  for (const coupon of coupons) {
    if (!isCouponUsable(coupon, price)) continue;
    const { discount } = applyCoupon(price, coupon);
    if (discount > bestDiscount) {
      bestDiscount = discount;
      best = coupon;
    }
  }
  return best;
}
