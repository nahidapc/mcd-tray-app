import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useTrayStore } from "../store/useTrayStore";

/** 轻提示：餐盘快满、新建成功、重置成功都走这里 */
export default function ToastHost() {
  const toast = useTrayStore((state) => state.toast);
  const dismiss = useTrayStore((state) => state.dismissToast);
  const addPlate = useTrayStore((state) => state.addPlate);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(dismiss, toast.action ? 5200 : 2800);
    return () => window.clearTimeout(timer);
  }, [toast, dismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 lg:bottom-8">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 22, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className={`pointer-events-auto flex items-center gap-3 rounded-full border-[3px] px-4 py-2.5 shadow-lg ${
              toast.tone === "warn"
                ? "border-[#ffcf7a] bg-[#fff6e2] text-[#a4600a]"
                : "border-[#bfe6cd] bg-[#f0fbf4] text-[#21784a]"
            }`}
          >
            <span className="text-[13px] font-extrabold">{toast.text}</span>

            {toast.action === "newPlate" && (
              <button
                type="button"
                onClick={() => {
                  addPlate();
                  dismiss();
                }}
                className="chunky shrink-0 bg-ink px-3 py-1.5 text-[11.5px] text-cream shadow-[0_4px_0_#241608]"
              >
                {toast.actionLabel ?? "＋ 新建餐盘"}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
