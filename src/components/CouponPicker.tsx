import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import {
  bestCoupon,
  couponFaceValue,
  couponGap,
  coupons,
  formatYuan,
  isCouponUsable,
} from "../data/coupons";
import { useTrayStore } from "../store/useTrayStore";

interface Props {
  /** 商品原价，用于判断门槛与差额 */
  price: number;
}

/**
 * 优惠券选择器：横向卡片，点一下选中，再点一下取消。
 * 未达门槛的券不隐藏 —— 置灰并写清「差 ¥X 可用」，让用户知道再点什么能更便宜。
 */
export default function CouponPicker({ price }: Props) {
  const selectedId = useTrayStore((state) => state.selectedCouponId);
  const selectCoupon = useTrayStore((state) => state.selectCoupon);
  const best = bestCoupon(price);

  // 金额变了之后，已选的券可能已经失效（store 会同步清除，这里再兜一层显示判断）
  const activeId = (() => {
    if (!selectedId) return null;
    const picked = coupons.find((coupon) => coupon.id === selectedId);
    return picked && isCouponUsable(picked, price) ? selectedId : null;
  })();

  // 选中的券可能被横向滚动挤到可视区外，选中后自动滚回来
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!activeId) return;
    const card = listRef.current?.querySelector<HTMLElement>(`[data-coupon="${activeId}"]`);
    card?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [activeId]);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-[13px] font-black text-ink">
          优惠券
          <span className="rounded-full bg-cream-deep px-1.5 py-[1px] text-[9.5px] font-bold text-ink-soft">
            {coupons.filter((coupon) => isCouponUsable(coupon, price)).length} 张可用
          </span>
        </h3>
        {activeId && (
          <button
            type="button"
            onClick={() => selectCoupon(null)}
            className="rounded-full px-2 py-[2px] text-[10px] font-bold text-ink-soft underline decoration-dotted underline-offset-2 hover:text-mcd-red"
          >
            不使用
          </button>
        )}
      </div>

      <div
        ref={listRef}
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {coupons.map((coupon) => {
          const usable = isCouponUsable(coupon, price);
          const selected = activeId === coupon.id;
          const gap = couponGap(coupon, price);
          const isBest = usable && best?.id === coupon.id;

          return (
            <motion.button
              key={coupon.id}
              type="button"
              disabled={!usable}
              aria-pressed={selected}
              data-coupon={coupon.id}
              onClick={() => selectCoupon(selected ? null : coupon.id)}
              whileTap={usable ? { scale: 0.96 } : undefined}
              animate={selected ? { y: -2 } : { y: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
              className={`relative w-[112px] shrink-0 overflow-hidden rounded-[16px] border-2 px-2 pb-2 pt-1.5 text-left transition-colors ${
                selected
                  ? "border-mcd-red bg-[#fff2ef] shadow-[0_4px_0_#f5c3ba]"
                  : usable
                    ? "border-[#f0dcbb] bg-white shadow-[0_3px_0_#f0e2c8] hover:border-[#f3cfa0]"
                    : "cursor-not-allowed border-[#eae2d4] bg-[#f7f4ee]"
              }`}
            >
              {/* 券的齿孔装饰 */}
              <span className="pointer-events-none absolute -left-[6px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-[#f3e2c2] bg-cream" />
              <span className="pointer-events-none absolute -right-[6px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-[#f3e2c2] bg-cream" />

              <span className="flex items-baseline justify-between">
                <span
                  className={`tabular text-[16px] font-black leading-none ${
                    usable ? "text-mcd-red" : "text-[#b9ae9e]"
                  }`}
                >
                  {couponFaceValue(coupon)}
                </span>
                {isBest && !selected ? (
                  <span className="rounded-full bg-[#ffe9c2] px-1 py-[1px] text-[8.5px] font-black text-[#b06a00]">
                    最优
                  </span>
                ) : (
                  <span
                    className={`rounded-full px-1 py-[1px] text-[8.5px] font-black ${
                      usable ? "bg-cream-deep text-ink-soft" : "bg-[#eee7da] text-[#b3a795]"
                    }`}
                  >
                    {coupon.badge}
                  </span>
                )}
              </span>

              <span
                className={`mt-1 block truncate text-[10px] font-extrabold ${
                  usable ? "text-ink" : "text-[#b3a795]"
                }`}
              >
                {coupon.name}
              </span>

              <span
                className={`mt-0.5 block text-[9px] font-bold ${
                  selected ? "text-mcd-red" : usable ? "text-mint" : "text-[#c0a48f]"
                }`}
              >
                {selected
                  ? "已选用 ✓"
                  : usable
                    ? "可使用"
                    : `差 ¥${formatYuan(gap)} 可用`}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
