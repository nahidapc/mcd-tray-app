import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import { formatYuan } from "../data/coupons";
import type { Bill } from "../utils/billing";

/**
 * 金额滚动数字。
 * 值变化时用动效把旧数字「滚」到新数字，而不是瞬间替换 ——
 * 选券、删菜、改人数时，用户能看清钱是怎么变的。
 */
export function AnimatedMoney({
  value,
  className = "",
  decimals = true,
}: {
  value: number;
  className?: string;
  decimals?: boolean;
}) {
  const motionValue = useMotionValue(value);
  const text = useTransform(motionValue, (latest) =>
    decimals ? formatYuan(latest) : String(Math.round(latest)),
  );
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      motionValue.set(value);
      return;
    }
    const controls = animate(motionValue, value, {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [value, motionValue]);

  return (
    <motion.span
      // key 变化 → 重新挂载并弹一下，数字滚动 + 轻微回弹，两层动画不打架
      key={value}
      initial={{ scale: 0.92, opacity: 0.7 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 18 }}
      className={`tabular inline-block origin-right ${className}`}
    >
      {text}
    </motion.span>
  );
}

interface Props {
  bill: Bill;
  /** 结算弹窗里用 compact，尺寸小一点 */
  tone?: "panel" | "modal";
}

/**
 * 金额明细：原价（有优惠时加删除线）→ 优惠（绿色减项）→ 实付（红色大字）。
 * 全站只有这一处定义「钱怎么排版」，侧栏与弹窗共用。
 */
export default function PriceBreakdown({ bill, tone = "panel" }: Props) {
  const hasDiscount = bill.discount > 0;
  const compact = tone === "modal";

  return (
    <div className={compact ? "space-y-1.5" : "space-y-1"}>
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-bold text-ink-soft">商品原价</span>
        <span
          className={`tabular text-[12px] font-extrabold ${
            hasDiscount
              ? "text-ink-soft/80 line-through decoration-[1.5px] decoration-[#c9ab87]"
              : "text-ink"
          }`}
        >
          ¥{formatYuan(bill.original)}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {hasDiscount && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="flex min-w-0 items-center gap-1.5 text-[11.5px] font-bold text-mint">
                <span className="shrink-0 rounded-full bg-[#e6f5ec] px-1.5 py-[1px] text-[9px] font-black text-mint">
                  券
                </span>
                <span className="truncate">{bill.coupon?.name ?? "优惠"}</span>
              </span>
              <span className="tabular shrink-0 text-[12px] font-black text-mint">
                - ¥{formatYuan(bill.discount)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={`flex items-end justify-between border-t-2 border-dashed border-[#f0dfc2] ${
          compact ? "mt-2 pt-2" : "mt-1.5 pt-2"
        }`}
      >
        <span className="pb-1 text-[11.5px] font-black text-ink">
          实付
          {hasDiscount && (
            <span className="ml-1 rounded-full bg-[#ffe9c2] px-1.5 py-[1px] text-[9px] font-black text-[#b06a00]">
              已省 ¥{formatYuan(bill.discount)}
            </span>
          )}
        </span>
        <span className="flex items-baseline gap-0.5 text-mcd-red">
          <span className={`font-black ${compact ? "text-[15px]" : "text-[14px]"}`}>¥</span>
          <AnimatedMoney
            value={bill.payable}
            className={`${compact ? "text-[34px]" : "text-[32px]"} font-black leading-none tracking-tight text-mcd-red`}
          />
        </span>
      </div>
    </div>
  );
}
