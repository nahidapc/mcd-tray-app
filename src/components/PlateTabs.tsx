import { motion } from "framer-motion";
import { MAX_ITEMS_PER_PLATE, useTrayStore } from "../store/useTrayStore";

/** 多餐盘切换：每个盘子最多 7 件，满了就引导新建 */
export default function PlateTabs() {
  const plates = useTrayStore((state) => state.plates);
  const activePlateId = useTrayStore((state) => state.activePlateId);
  const setActivePlate = useTrayStore((state) => state.setActivePlate);
  const addPlate = useTrayStore((state) => state.addPlate);

  const active = plates.find((plate) => plate.plateId === activePlateId);
  const isFull = (active?.items.length ?? 0) >= MAX_ITEMS_PER_PLATE;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {plates.map((plate) => {
        const isActive = plate.plateId === activePlateId;
        return (
          <button
            key={plate.plateId}
            type="button"
            onClick={() => setActivePlate(plate.plateId)}
            className={`chunky relative px-4 py-2 text-[12.5px] transition ${
              isActive
                ? "bg-ink text-cream shadow-[0_5px_0_#241608]"
                : "bg-white text-ink-soft shadow-[0_5px_0_#f0dcba] hover:text-ink"
            }`}
          >
            {plate.name}
            <span
              className={`ml-1.5 rounded-full px-1.5 py-[1px] text-[10px] font-black ${
                isActive ? "bg-mcd-yellow text-ink" : "bg-cream-deep text-ink-soft"
              }`}
            >
              {plate.items.length}/{MAX_ITEMS_PER_PLATE}
            </span>
          </button>
        );
      })}

      <motion.button
        type="button"
        onClick={addPlate}
        animate={isFull ? { scale: [1, 1.06, 1] } : { scale: 1 }}
        transition={
          isFull
            ? { duration: 1.1, repeat: Infinity, repeatDelay: 0.4 }
            : { duration: 0.2 }
        }
        className={`chunky px-4 py-2 text-[12.5px] ${
          isFull
            ? "bg-mcd-yellow text-ink shadow-[0_5px_0_#c98d05]"
            : "bg-white text-mcd-red shadow-[0_5px_0_#f0dcba]"
        }`}
        data-testid="new-plate"
      >
        ＋ 新建餐盘
      </motion.button>
    </div>
  );
}
