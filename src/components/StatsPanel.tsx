import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import {
  buildMetrics,
  buildRadar,
  computeBalance,
  computeTotals,
  flattenItems,
  nutritionTargets,
} from "../utils/nutrition";
import { formatYuan } from "../data/coupons";
import { MCP_CONNECTED } from "../services/mcp";
import { useBill, useTrayStore } from "../store/useTrayStore";
import type { ModeConfig } from "../types";
import CouponPicker from "./CouponPicker";
import PriceBreakdown from "./PriceBreakdown";

const TONE_COLOR: Record<string, string> = {
  good: "#2f9e5f",
  warn: "#f0a30a",
  over: "#e23a2e",
};

interface Props {
  mode: ModeConfig;
  /** 移动端弹层里可以不画雷达图，省点空间 */
  showRadar?: boolean;
  /** 点击「去结算」——由 SelectPage 打开结算弹窗 */
  onCheckout: () => void;
}

export default function StatsPanel({ mode, showRadar = true, onCheckout }: Props) {
  const plates = useTrayStore((state) => state.plates);
  const diningSize = useTrayStore((state) => state.diningSize);
  const bill = useBill();

  const items = useMemo(() => flattenItems(plates), [plates]);
  const totals = useMemo(() => computeTotals(items), [items]);
  const metrics = useMemo(() => buildMetrics(totals, diningSize), [totals, diningSize]);
  const balance = useMemo(
    () => computeBalance(items, mode, diningSize),
    [items, mode, diningSize],
  );
  const radar = useMemo(
    () => buildRadar(items, mode, diningSize),
    [items, mode, diningSize],
  );

  const targets = nutritionTargets(diningSize);
  const overCalories = totals.calories > targets.calories;

  return (
    <div className="space-y-3">
      {/* 热量预警气泡 */}
      <AnimatePresence>
        {overCalories && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            className="relative rounded-[22px] border-[3px] border-[#f6b8ae] bg-[#fff1ee] px-3.5 pb-3 pt-2.5"
          >
            <div className="flex items-start gap-2">
              <motion.span
                animate={{ rotate: [0, -12, 12, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 0.8 }}
                className="text-lg leading-none"
              >
                ⚠️
              </motion.span>
              <p className="text-[12px] font-extrabold leading-snug text-[#c03326]">
                当前热量偏高，建议适量减量，拒绝浪费哦！
              </p>
            </div>
            <p className="mt-1 pl-7 text-[10.5px] font-bold text-[#c07a70]">
              {Math.round(totals.calories)} / {targets.calories} kcal · 超出{" "}
              {Math.round(totals.calories - targets.calories)} kcal
            </p>
            <span className="absolute -bottom-[9px] left-8 h-3 w-3 rotate-45 border-b-[3px] border-r-[3px] border-[#f6b8ae] bg-[#fff1ee]" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 合计 + 金额明细 */}
      <div className="rounded-[28px] border-2 border-[#f7e6c8] bg-white p-4 shadow-[0_8px_0_#f3e2c2]">
        <div className="flex items-end justify-between">
          <span className="text-[12px] font-black text-ink-soft">合计</span>
          <span className="rounded-full bg-cream-deep px-2 py-[2px] text-[10px] font-bold text-ink-soft">
            {bill.count} 件 · {bill.kinds} 种
          </span>
        </div>

        <div className="mt-2">
          <PriceBreakdown bill={bill} />
        </div>

        <p className="mt-2 text-[10.5px] font-bold text-ink-soft">
          {diningSize} 人就餐 · 人均 ¥{formatYuan(bill.payable / diningSize)} · 人均{" "}
          {Math.round(totals.calories / diningSize)} kcal
        </p>
      </div>

      {/* 优惠券 */}
      <div className="rounded-[28px] border-2 border-[#f7e6c8] bg-white p-4 shadow-[0_8px_0_#f3e2c2]">
        <CouponPicker price={bill.original} />
        <p className="mt-2 rounded-xl bg-cream px-2.5 py-1.5 text-[10px] font-bold leading-relaxed text-ink-soft">
          {bill.coupon
            ? `已选用「${bill.coupon.name}」，优惠 ¥${formatYuan(bill.discount)}，实付按券面规则四舍五入到分。`
            : "未达门槛的券会置灰；把菜品删到金额不足时，已选券会自动取消。"}
        </p>
      </div>

      {/* 去结算 */}
      <div>
        <motion.button
          type="button"
          disabled={bill.count === 0}
          onClick={onCheckout}
          whileHover={bill.count > 0 ? { y: -2 } : undefined}
          whileTap={bill.count > 0 ? { y: 3 } : undefined}
          className={`chunky flex w-full items-center justify-center gap-2 px-5 py-3.5 text-[16px] font-black tracking-wide text-white ${
            bill.count === 0
              ? "cursor-not-allowed bg-[#d8cbb8] shadow-[0_6px_0_#c2b39d]"
              : "bg-[linear-gradient(180deg,#f4503f,#d92c20)] shadow-[0_7px_0_#a81e14]"
          }`}
        >
          <span>{bill.count === 0 ? "餐盘还是空的" : "去结算"}</span>
          {bill.count > 0 && (
            <span className="tabular text-[19px]">¥{formatYuan(bill.payable)}</span>
          )}
        </motion.button>
        <p className="mt-1.5 text-center text-[10px] font-bold text-ink-soft">
          {bill.discount > 0
            ? `已优惠 ¥${formatYuan(bill.discount)}，共省下一份小吃的钱～`
            : `${bill.count} 件 · ${bill.plateCount} 个餐盘 · 无门槛券可直接用`}
        </p>
      </div>

      {/* 营养进度条 */}
      <div className="rounded-[28px] border-2 border-[#f7e6c8] bg-white p-4 shadow-[0_8px_0_#f3e2c2]">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[13px] font-black text-ink">营养成分</h3>
          <span className="text-[10px] font-bold text-ink-soft">
            参考 {diningSize} 人份
          </span>
        </div>

        <div className="space-y-3">
          {metrics.map((row) => (
            <div key={row.key}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-[11.5px] font-extrabold text-ink">
                  {row.label}
                </span>
                <span className="tabular text-[11px] font-bold text-ink-soft">
                  <b style={{ color: TONE_COLOR[row.tone] }}>{row.value}</b>
                  <span className="opacity-60">
                    {" "}
                    / {row.target} {row.unit}
                  </span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-cream-deep">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: TONE_COLOR[row.tone] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${row.percent}%` }}
                  transition={{ type: "spring", stiffness: 140, damping: 20 }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 雷达 + 均衡评分 */}
      <div className="rounded-[28px] border-2 border-[#f7e6c8] bg-white p-4 shadow-[0_8px_0_#f3e2c2]">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-[13px] font-black text-ink">搭配雷达</h3>
          <span
            className="rounded-full px-2 py-[2px] text-[10px] font-black text-white"
            style={{ backgroundColor: mode.themeColor }}
          >
            均衡 {balance.score} · {balance.label}
          </span>
        </div>

        {showRadar && (
          <div className="h-[190px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar} outerRadius="72%">
                <PolarGrid stroke="#efdcbd" />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <PolarAngleAxis
                  dataKey="dim"
                  tick={{ fontSize: 10.5, fill: "#8a715a", fontWeight: 800 }}
                />
                <Radar
                  dataKey="value"
                  stroke={mode.themeColor}
                  strokeWidth={2.5}
                  fill={mode.themeColor}
                  fillOpacity={0.26}
                  dot={{ r: 3, fill: "#fff", stroke: mode.themeColor, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="mt-1 space-y-1.5">
          {balance.parts.map((part) => {
            const percent = Math.round((part.value / part.max) * 100);
            return (
              <div key={part.key} className="flex items-center gap-2">
                <span className="w-[52px] shrink-0 text-[10.5px] font-bold text-ink-soft">
                  {part.label}
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream-deep">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: `linear-gradient(90deg, ${mode.accentColor}, ${mode.themeColor})`,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ type: "spring", stiffness: 140, damping: 20 }}
                  />
                </div>
                <span className="tabular w-9 shrink-0 text-right text-[10px] font-black text-ink-soft">
                  {part.value}/{part.max}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-2.5 rounded-xl bg-cream px-2.5 py-1.5 text-[10px] font-bold leading-relaxed text-ink-soft">
          规则固定：结构 45 + 热量 20 + 蛋白 20 + 模式匹配 15，结果可复算。
        </p>
      </div>

      {/* 数据来源：接没接 MCP 一眼可见，不靠文档自说自话 */}
      <p className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-ink-soft/80">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: MCP_CONNECTED ? "#2f9e5f" : "#f0a30a" }}
        />
        {MCP_CONNECTED
          ? "MCP 实时数据 · getFoodNutrition / calculateMealScore"
          : "MCP 未接入 · 使用本地营养库（可接 .env 切换）"}
      </p>
    </div>
  );
}
