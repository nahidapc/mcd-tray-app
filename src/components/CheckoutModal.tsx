import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatYuan } from "../data/coupons";
import { useBill, useTrayStore } from "../store/useTrayStore";
import type { ModeConfig } from "../types";
import PriceBreakdown from "./PriceBreakdown";

type Step = "confirm" | "paying" | "done";
type PayMethodId = "wechat" | "alipay" | "applepay";

const METHODS: { id: PayMethodId; name: string; icon: string; color: string; note?: string }[] = [
  { id: "wechat", name: "微信支付", icon: "💬", color: "#22a55a", note: "推荐" },
  { id: "alipay", name: "支付宝", icon: "🅰️", color: "#1677ff" },
  { id: "applepay", name: "Apple Pay", icon: "", color: "#2c2c2e" },
];

interface Props {
  open: boolean;
  mode: ModeConfig;
  onClose: () => void;
  /** 支付成功后返回首页 */
  onHome: () => void;
}

export default function CheckoutModal({ open, mode, onClose, onHome }: Props) {
  const bill = useBill();
  const clearOrder = useTrayStore((state) => state.clearOrder);
  const [step, setStep] = useState<Step>("confirm");
  const [method, setMethod] = useState<PayMethodId>("wechat");
  const [receipt, setReceipt] = useState<{ no: string; amount: number; count: number; plates: number } | null>(
    null,
  );
  const timer = useRef<number | null>(null);

  // 每次打开都回到「确认」态
  useEffect(() => {
    if (open) {
      setStep("confirm");
      setReceipt(null);
    }
  }, [open]);

  // 弹窗打开时锁住背景滚动
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // 组件卸载时清掉定时器，避免支付中途关页面后 setState
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const chips = useMemo(
    () =>
      (["主食", "小吃", "饮料"] as const)
        .map((key) => ({ key, value: bill.byCategory[key] }))
        .filter((chip) => chip.value > 0),
    [bill.byCategory],
  );

  const pay = () => {
    if (step !== "confirm") return;
    setStep("paying");
    // 支付过程先把金额快照下来 —— 后面 clearOrder 了也还能显示小票
    setReceipt({
      no: `MCD${Date.now().toString(36).toUpperCase().slice(-6)}`,
      amount: bill.payable,
      count: bill.count,
      plates: bill.plateCount,
    });
    timer.current = window.setTimeout(() => setStep("done"), 1500);
  };

  const close = () => {
    if (step === "paying") return; // 支付中不允许关闭
    onClose();
  };

  const backHome = () => {
    clearOrder();
    onHome();
  };

  const methodName = METHODS.find((item) => item.id === method)?.name ?? "在线支付";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 背景：模糊 + 变暗 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
            className="fixed inset-0 z-[60] bg-ink/45 backdrop-blur-md"
          />

          <div className="pointer-events-none fixed inset-0 z-[61] grid place-items-center p-3 sm:p-4">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="确认订单"
              initial={{ scale: 0.84, y: 36, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 21, mass: 0.8 }}
              className="pointer-events-auto w-full max-w-[420px] overflow-hidden rounded-[34px] border-[3px] border-[#f2d7ae] bg-cream shadow-[0_16px_0_rgba(163,108,40,0.18),0_28px_70px_-12px_rgba(120,70,10,0.5)]"
            >
              {/* 顶部条 */}
              <div className="flex items-center justify-between border-b-2 border-[#f2dfbd] bg-white/70 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span
                    className="grid h-8 w-8 place-items-center rounded-full text-base"
                    style={{ backgroundColor: `${mode.themeColor}22` }}
                  >
                    {mode.emoji}
                  </span>
                  <div>
                    <p className="text-[13.5px] font-black leading-tight text-ink">
                      {step === "done" ? "支付完成" : "确认订单"}
                    </p>
                    <p className="text-[10px] font-bold leading-tight text-ink-soft">
                      {mode.name} · 到店自取
                    </p>
                  </div>
                </div>
                {step !== "paying" && (
                  <button
                    type="button"
                    onClick={close}
                    aria-label="关闭"
                    className="grid h-8 w-8 place-items-center rounded-full bg-white text-[13px] font-black text-ink-soft shadow-[0_2px_0_#e6d3b0] hover:text-mcd-red"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="max-h-[78vh] overflow-y-auto px-4 pb-4 pt-3">
                <AnimatePresence mode="wait" initial={false}>
                  {step === "confirm" && (
                    <motion.div
                      key="confirm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      {/* 订单摘要 */}
                      <div className="rounded-[24px] border-2 border-[#f4e5cc] bg-white p-3.5">
                        <div className="flex items-baseline justify-between">
                          <h3 className="text-[12.5px] font-black text-ink">订单摘要</h3>
                          <span className="text-[10px] font-bold text-ink-soft">
                            共 {bill.count} 份 · {bill.plateCount} 个餐盘
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {chips.map((chip) => (
                            <span
                              key={chip.key}
                              className="rounded-full bg-cream-deep px-2.5 py-[3px] text-[10.5px] font-extrabold text-ink"
                            >
                              {chip.key} {chip.value} 份
                            </span>
                          ))}
                          {bill.byCategory.其他 > 0 && (
                            <span className="rounded-full bg-cream-deep px-2.5 py-[3px] text-[10.5px] font-extrabold text-ink">
                              甜品 {bill.byCategory.其他} 份
                            </span>
                          )}
                          <span className="rounded-full bg-[#e6f5ec] px-2.5 py-[3px] text-[10.5px] font-extrabold text-mint">
                            {bill.kinds} 种搭配
                          </span>
                        </div>
                      </div>

                      {/* 金额明细 */}
                      <div className="rounded-[24px] border-2 border-[#f4e5cc] bg-white p-3.5">
                        <h3 className="mb-2 text-[12.5px] font-black text-ink">支付金额</h3>
                        <PriceBreakdown bill={bill} tone="modal" />
                      </div>

                      {/* 支付方式 */}
                      <div className="rounded-[24px] border-2 border-[#f4e5cc] bg-white p-3.5">
                        <h3 className="mb-2 text-[12.5px] font-black text-ink">支付方式</h3>
                        <div className="space-y-1.5">
                          {METHODS.map((item) => {
                            const active = method === item.id;
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setMethod(item.id)}
                                aria-pressed={active}
                                className={`flex w-full items-center gap-2.5 rounded-2xl border-2 px-2.5 py-2 text-left transition ${
                                  active
                                    ? "border-mcd-red bg-[#fff3f0]"
                                    : "border-[#f2e6d2] bg-white hover:border-[#f0d4b8]"
                                }`}
                              >
                                <span
                                  className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[13px] font-black text-white"
                                  style={{ backgroundColor: item.color }}
                                >
                                  {item.icon}
                                </span>
                                <span className="flex-1 text-[12px] font-extrabold text-ink">
                                  {item.name}
                                  {item.note && (
                                    <span className="ml-1.5 rounded-full bg-[#ffe9c2] px-1.5 py-[1px] text-[9px] font-black text-[#b06a00]">
                                      {item.note}
                                    </span>
                                  )}
                                </span>
                                <span
                                  className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
                                    active
                                      ? "border-mcd-red bg-mcd-red text-white"
                                      : "border-[#dcc9ab] bg-white text-transparent"
                                  }`}
                                >
                                  <span className="text-[10px] font-black">✓</span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {step === "paying" && (
                    <motion.div
                      key="paying"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid place-items-center px-4 py-10"
                    >
                      <div className="relative h-24 w-24">
                        <motion.span
                          className="absolute inset-0 rounded-full border-[6px] border-[#f4e2c4] border-t-mcd-red"
                          animate={{ rotate: 360 }}
                          transition={{ repeat: Infinity, duration: 1.05, ease: "linear" }}
                        />
                        <motion.span
                          className="absolute inset-0 grid place-items-center text-3xl"
                          animate={{ scale: [1, 1.12, 1], rotate: [0, -6, 6, 0] }}
                          transition={{ repeat: Infinity, duration: 1.4 }}
                        >
                          🍔
                        </motion.span>
                      </div>
                      <p className="mt-4 text-[13px] font-black text-ink">正在处理支付…</p>
                      <p className="mt-1 text-[10.5px] font-bold text-ink-soft">
                        {methodName} · ¥{formatYuan(receipt?.amount ?? bill.payable)}
                      </p>
                    </motion.div>
                  )}

                  {step === "done" && receipt && (
                    <motion.div
                      key="done"
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: "spring", stiffness: 280, damping: 22 }}
                      className="grid place-items-center px-2 py-4 text-center"
                    >
                      {/* 成功插画：小票 + 对勾 */}
                      <motion.svg
                        viewBox="0 0 200 200"
                        className="h-[150px] w-[150px]"
                        initial={{ y: 12, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 240, damping: 18 }}
                      >
                        <ellipse cx="100" cy="180" rx="56" ry="9" fill="#efdcc0" />
                        {[
                          { cx: 42, cy: 52, r: 4, c: "#ffc72c" },
                          { cx: 160, cy: 44, r: 5, c: "#e23a2e" },
                          { cx: 172, cy: 108, r: 3.5, c: "#2f9e5f" },
                          { cx: 30, cy: 118, r: 3, c: "#f0a30a" },
                        ].map((dot, index) => (
                          <motion.circle
                            key={index}
                            cx={dot.cx}
                            cy={dot.cy}
                            r={dot.r}
                            fill={dot.c}
                            animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
                            transition={{ repeat: Infinity, duration: 1.8, delay: index * 0.2 }}
                          />
                        ))}
                        <path
                          d="M62 40h76a10 10 0 0 1 10 10v104l-12-8-12 8-12-8-12 8-12-8-12 8-14-8V50a10 10 0 0 1 10-10Z"
                          fill="#fffdf7"
                          stroke="#3a2a1a"
                          strokeWidth="5"
                          strokeLinejoin="round"
                        />
                        <rect x="78" y="64" width="46" height="7" rx="3.5" fill="#ecdcc2" />
                        <rect x="78" y="80" width="30" height="7" rx="3.5" fill="#ecdcc2" />
                        <circle cx="100" cy="120" r="24" fill="#2f9e5f" />
                        <motion.path
                          d="M88 120l9 9 16-18"
                          stroke="#fff"
                          strokeWidth="7"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.45, delay: 0.15 }}
                        />
                      </motion.svg>

                      <p className="mt-1 text-[16px] font-black text-ink">支付成功，订单已提交</p>
                      <p className="mt-1 text-[10.5px] font-bold text-ink-soft">
                        取餐号 <b className="text-ink">{receipt.no}</b> · {methodName}
                      </p>

                      <div className="mt-3 w-full rounded-[20px] border-2 border-[#f4e5cc] bg-white px-3.5 py-2.5">
                        <div className="flex items-center justify-between text-[10.5px] font-bold text-ink-soft">
                          <span>共 {receipt.count} 份 · {receipt.plates} 个餐盘</span>
                          <span className="tabular text-[19px] font-black text-mcd-red">
                            ¥{formatYuan(receipt.amount)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={backHome}
                        className="chunky mt-3 w-full bg-[linear-gradient(180deg,#f4503f,#d92c20)] px-5 py-3 text-[14px] font-black text-white shadow-[0_6px_0_#a81e14]"
                      >
                        返回首页
                      </button>
                      <p className="mt-2 text-[9.5px] font-bold text-ink-soft">
                        演示环境，未发生真实扣款
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 底部操作 */}
              {step === "confirm" && (
                <div className="flex gap-2 border-t-2 border-[#f2dfbd] bg-white/70 px-4 py-3">
                  <button
                    type="button"
                    onClick={close}
                    className="chunky flex-1 bg-white px-3 py-2.5 text-[12.5px] font-black text-ink-soft shadow-[0_4px_0_#e7d5b4]"
                  >
                    继续选餐
                  </button>
                  <motion.button
                    type="button"
                    onClick={pay}
                    whileTap={{ y: 3 }}
                    className="chunky flex flex-[1.35] items-center justify-center gap-1.5 bg-[linear-gradient(180deg,#f4503f,#d92c20)] px-3 py-2.5 text-[13.5px] font-black text-white shadow-[0_5px_0_#a81e14]"
                  >
                    确认支付
                    <span className="tabular">¥{formatYuan(bill.payable)}</span>
                  </motion.button>
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
