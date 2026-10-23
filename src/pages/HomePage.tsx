import { motion } from "framer-motion";
import { useTrayStore } from "../store/useTrayStore";
import type { ModeConfig } from "../types";

interface Props {
  modes: ModeConfig[];
  onSelect: (modeId: string) => void;
}

function peopleLabel(size: number): string {
  return size >= 3 ? `${size} 人+` : `${size} 人`;
}

export default function HomePage({ modes, onSelect }: Props) {
  const diningSize = useTrayStore((state) => state.diningSize);
  const setDiningSize = useTrayStore((state) => state.setDiningSize);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-8 sm:pt-12">
      <header className="text-center">
        <span className="inline-block rotate-[-2deg] rounded-full bg-mcd-yellow px-3 py-1 text-[11px] font-black tracking-wide text-ink shadow-[0_4px_0_#e0a30a]">
          麦麦餐盘 · 三维选餐
        </span>
        <h1 className="mt-4 text-[30px] font-black leading-tight text-ink sm:text-[42px]">
          今天想怎么吃
          <span className="relative mx-1 inline-block text-mcd-red">
            麦当劳
            <svg
              viewBox="0 0 120 14"
              className="absolute -bottom-1 left-0 h-3 w-full"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path
                d="M2 9c22-8 52-8 74-3 12 3 24 4 42-2"
                stroke="#ffc72c"
                strokeWidth="6"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </span>
          ？
        </h1>
        <p className="mx-auto mt-3 max-w-md text-[13px] font-bold leading-relaxed text-ink-soft">
          先说说几个人吃，再挑一个模式。餐盘会自动配好主食、小吃、饮料齐全的一份，
          之后随便拖、随便换。
        </p>
      </header>

      {/* 就餐人数步进器 */}
      <div className="mx-auto mt-7 flex w-full max-w-md items-center justify-between gap-4 rounded-[28px] border-2 border-[#f7e6c8] bg-white px-4 py-3 shadow-[0_8px_0_#f3e2c2]">
        <div>
          <p className="text-[13px] font-black text-ink">就餐人数</p>
          <p className="text-[10.5px] font-bold text-ink-soft">
            影响热量阈值与人均统计
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="减少一位"
            onClick={() => setDiningSize(diningSize - 1)}
            className="chunky grid h-9 w-9 place-items-center bg-cream-deep text-lg text-ink disabled:opacity-40"
            disabled={diningSize <= 1}
          >
            −
          </button>
          <div className="min-w-[68px] text-center">
            <motion.span
              key={diningSize}
              initial={{ scale: 0.7, opacity: 0.4 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 480, damping: 18 }}
              className="tabular block text-lg font-black leading-none text-mcd-red"
            >
              {peopleLabel(diningSize)}
            </motion.span>
          </div>
          <button
            type="button"
            aria-label="增加一位"
            onClick={() => setDiningSize(diningSize + 1)}
            className="chunky grid h-9 w-9 place-items-center bg-mcd-yellow text-lg text-ink shadow-[0_5px_0_#d99b04] disabled:opacity-40"
            disabled={diningSize >= 6}
          >
            ＋
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {modes.map((mode, index) => (
          <motion.button
            key={mode.id}
            type="button"
            onClick={() => onSelect(mode.id)}
            data-mode-id={mode.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 * index, type: "spring", stiffness: 200, damping: 20 }}
            whileHover={{ y: -6 }}
            whileTap={{ scale: 0.98 }}
            className="group relative overflow-hidden rounded-[32px] border-[3px] border-white bg-white p-5 text-left shadow-[0_10px_0_#f0dcba,0_20px_30px_-18px_rgba(150,100,40,.6)]"
          >
            <div
              className="absolute inset-x-0 top-0 h-1.5"
              style={{
                background: `linear-gradient(90deg, ${mode.themeColor}, ${mode.accentColor})`,
              }}
            />
            <div className="flex items-start justify-between">
              <span
                className="grid h-12 w-12 place-items-center rounded-[18px] text-2xl"
                style={{ backgroundColor: `${mode.themeColor}18` }}
              >
                {mode.emoji}
              </span>
              <span className="text-[11px] font-black text-ink-soft/60">
                0{index + 1}
              </span>
            </div>

            <h2 className="mt-3 text-lg font-black text-ink">{mode.name}</h2>
            <p className="mt-1 min-h-[36px] text-[11.5px] font-bold leading-snug text-ink-soft">
              {mode.desc}
            </p>

            <div className="mt-3 flex flex-wrap gap-1">
              {[
                ["口味", mode.weights.taste],
                ["营养", mode.weights.nutrition],
                ["性价比", mode.weights.value],
              ].map(([label, weight]) => (
                <span
                  key={label as string}
                  className="rounded-full bg-cream px-2 py-[3px] text-[10px] font-bold text-ink-soft"
                >
                  {label as string} {Math.round((weight as number) * 100)}%
                </span>
              ))}
            </div>

            <div
              className="mt-4 flex items-center justify-between rounded-full px-3 py-2 text-[12px] font-black text-white"
              style={{
                background: `linear-gradient(90deg, ${mode.themeColor}, ${mode.accentColor})`,
              }}
            >
              进入选餐
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </div>
          </motion.button>
        ))}
      </div>

      <p className="mt-8 text-center text-[11px] font-bold text-ink-soft/70">
        模式、权重、初始套餐集中在 <code>src/data/modes.ts</code>；食品数据集中在{" "}
        <code>src/data/foodDatabase.ts</code>；MCP 适配层在{" "}
        <code>src/services/mcp.ts</code>
      </p>
    </div>
  );
}
