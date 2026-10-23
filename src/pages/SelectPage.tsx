import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { formatYuan } from "../data/coupons";
import { computeTotals, flattenItems, nutritionTargets } from "../utils/nutrition";
import { MAX_ITEMS_PER_PLATE, useBill, useTrayStore } from "../store/useTrayStore";
import type { ModeConfig } from "../types";
import CheckoutModal from "../components/CheckoutModal";
import FoodShelf from "../components/FoodShelf";
import PlateTabs from "../components/PlateTabs";
import StatsPanel from "../components/StatsPanel";
import ToastHost from "../components/Toast";
import Tray from "../components/Tray";

interface Props {
  mode: ModeConfig;
  onBack: () => void;
}

export default function SelectPage({ mode, onBack }: Props) {
  const init = useTrayStore((state) => state.init);
  const reset = useTrayStore((state) => state.reset);
  const plates = useTrayStore((state) => state.plates);
  const activePlateId = useTrayStore((state) => state.activePlateId);
  const diningSize = useTrayStore((state) => state.diningSize);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const bill = useBill();

  // 进入 / 切换模式时按配置重新摆盘
  useEffect(() => {
    init(mode.id, mode.initialItemIds);
  }, [init, mode.id, mode.initialItemIds]);

  const activePlate = plates.find((plate) => plate.plateId === activePlateId) ?? plates[0];

  const totals = useMemo(() => computeTotals(flattenItems(plates)), [plates]);
  const targets = nutritionTargets(diningSize);
  const overCalories = totals.calories > targets.calories;

  return (
    <div className="min-h-screen pb-28 lg:pb-10">
      {/* 顶栏 */}
      <header className="sticky top-0 z-30 border-b-2 border-[#f2dfbd] bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center gap-2 px-3 py-2.5 sm:px-5">
          <button
            type="button"
            onClick={onBack}
            className="chunky shrink-0 bg-white px-3 py-1.5 text-[12px] text-ink shadow-[0_4px_0_#eedcba]"
          >
            ← 返回
          </button>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-base"
              style={{ backgroundColor: `${mode.themeColor}22` }}
            >
              {mode.emoji}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-black leading-tight text-ink">
                {mode.name}
              </p>
              <p className="truncate text-[10px] font-bold leading-tight text-ink-soft">
                {diningSize} 人就餐 · 人人有份不浪费
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={reset}
            className="chunky shrink-0 bg-white px-3 py-1.5 text-[12px] font-black text-mcd-red shadow-[0_4px_0_#eedcba]"
          >
            重置为推荐套餐
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-3 pt-3 sm:px-5 sm:pt-4">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_336px] lg:items-start lg:gap-5">
          <div className="space-y-3 sm:space-y-4">
            <PlateTabs />

            <section className="rounded-[32px] border-2 border-[#f7e6c8] bg-white p-3 shadow-[0_8px_0_#f3e2c2] sm:p-4">
              <div className="mb-2 flex items-end justify-between px-1">
                <div>
                  <h2 className="text-[15px] font-black leading-none text-ink">
                    你的餐盘
                  </h2>
                  <p className="mt-1 text-[10.5px] font-bold text-ink-soft">
                    按住食物可自由拖动 · 双击转个方向 · 悬停出现删除
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-[3px] text-[10.5px] font-black ${
                    (activePlate?.items.length ?? 0) >= MAX_ITEMS_PER_PLATE
                      ? "bg-[#ffe1dc] text-[#c03326]"
                      : "bg-cream-deep text-ink-soft"
                  }`}
                >
                  {activePlate?.items.length ?? 0}/{MAX_ITEMS_PER_PLATE}
                </span>
              </div>

              {activePlate ? (
                <Tray plate={activePlate} />
              ) : (
                <div className="grid aspect-[16/10] place-items-center rounded-[52px] bg-cream-deep/60 text-[12px] font-bold text-ink-soft">
                  正在摆盘…
                </div>
              )}
            </section>

            <FoodShelf mode={mode} />
          </div>

          <aside className="hidden lg:sticky lg:top-[74px] lg:block">
            <StatsPanel mode={mode} onCheckout={() => setCheckoutOpen(true)} />
          </aside>
        </div>
      </main>

      {/* 移动端底部摘要条：明细 + 去结算（吸底） */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t-2 border-[#f2dfbd] bg-white/95 px-3 py-2 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="查看明细"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cream-deep text-[16px] shadow-[0_3px_0_#e3cdaa]"
          >
            🧾
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[10px] font-black text-ink-soft">实付</span>
              <span className="tabular text-[20px] font-black leading-none text-mcd-red">
                ¥{formatYuan(bill.payable)}
              </span>
              {bill.discount > 0 && (
                <span className="tabular text-[10px] font-bold text-ink-soft line-through">
                  ¥{formatYuan(bill.original)}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-[10px] font-bold text-ink-soft">
              {bill.count} 件 · {Math.round(totals.calories)} kcal
              {bill.discount > 0 && (
                <span className="ml-1 text-mint">· 省 ¥{formatYuan(bill.discount)}</span>
              )}
              {overCalories && <span className="ml-1 text-[#c03326]">· 热量偏高</span>}
            </p>
          </div>

          <motion.button
            type="button"
            disabled={bill.count === 0}
            whileTap={bill.count > 0 ? { y: 2 } : undefined}
            onClick={() => setCheckoutOpen(true)}
            className={`chunky shrink-0 px-4 py-2.5 text-[13px] font-black text-white ${
              bill.count === 0
                ? "bg-[#d8cbb8] shadow-[0_4px_0_#c2b39d]"
                : "bg-[linear-gradient(180deg,#f4503f,#d92c20)] shadow-[0_5px_0_#a81e14]"
            }`}
          >
            {bill.count === 0 ? "餐盘空了" : `去结算 ¥${formatYuan(bill.payable)}`}
          </motion.button>
        </div>
      </div>

      {/* 移动端明细弹层 */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
              className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="sheet fixed inset-x-0 bottom-0 z-50 max-h-[84vh] overflow-y-auto rounded-t-[32px] bg-cream px-3 pb-6 pt-2 lg:hidden"
            >
              <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-[#ddc8a4]" />
              <div className="mb-2 flex items-center justify-between px-1">
                <h2 className="text-[14px] font-black text-ink">本餐明细</h2>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-ink-soft"
                >
                  收起
                </button>
              </div>
              <StatsPanel
                mode={mode}
                showRadar={false}
                onCheckout={() => {
                  setSheetOpen(false);
                  setCheckoutOpen(true);
                }}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 结算弹窗 */}
      <CheckoutModal
        open={checkoutOpen}
        mode={mode}
        onClose={() => setCheckoutOpen(false)}
        onHome={onBack}
      />

      <ToastHost />
    </div>
  );
}
