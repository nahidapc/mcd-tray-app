import { applyCoupon, couponById, isCouponUsable, type Coupon } from "../data/coupons";
import { foodById } from "../data/foodDatabase";
import { computeTotals, flattenItems } from "./nutrition";
import type { Category, Plate } from "../types";

/**
 * 一张「账单」：原价、优惠、实付，以及结算弹窗要的份数统计。
 *
 * 关键约束：Bill 只由 buildBill 生成，任何界面都不许自己拿 price 减去 discount，
 * 否则侧栏和弹窗很容易出现一分钱对不上的情况。
 */
export interface Bill {
  /** 商品原价合计 */
  original: number;
  /** 优惠金额，未用券为 0 */
  discount: number;
  /** 实付 = original - discount */
  payable: number;
  /** 实际生效的券（选择失效时为 null） */
  coupon: Coupon | null;
  /** 盘中实体总数 */
  count: number;
  /** 种类数 */
  kinds: number;
  /** 有食物的餐盘数 */
  plateCount: number;
  /** 各品类件数 */
  byCategory: Record<Category, number>;
}

const EMPTY_BY_CATEGORY: Record<Category, number> = {
  主食: 0,
  小吃: 0,
  饮料: 0,
  其他: 0,
};

/**
 * 纯函数：给定餐盘与所选券 id，算出一张完整账单。
 * 券若因金额跌破门槛而失效，这里直接按「未用券」计价 ——
 * 即使 store 里的选择还没来得及清空，金额也不会算错。
 */
export function buildBill(plates: Plate[], couponId: string | null): Bill {
  const items = flattenItems(plates);
  const totals = computeTotals(items);

  const byCategory = { ...EMPTY_BY_CATEGORY };
  items.forEach((item) => {
    const food = foodById.get(item.foodId);
    if (food) byCategory[food.category] += 1;
  });

  const picked = couponId ? couponById.get(couponId) ?? null : null;
  const coupon =
    picked && totals.count > 0 && isCouponUsable(picked, totals.price) ? picked : null;

  const { discount, payable } = coupon
    ? applyCoupon(totals.price, coupon)
    : { discount: 0, payable: totals.price };

  return {
    original: totals.price,
    discount,
    payable,
    coupon,
    count: totals.count,
    kinds: totals.kinds,
    plateCount: plates.filter((plate) => plate.items.length > 0).length,
    byCategory,
  };
}
