import { useMemo } from "react";
import { getShelf } from "../utils/shelf";
import { useTrayStore } from "../store/useTrayStore";
import type { ModeConfig } from "../types";
import FoodCard from "./FoodCard";

interface Props {
  mode: ModeConfig;
}

export default function FoodShelf({ mode }: Props) {
  const { recommended, sections } = useMemo(() => getShelf(mode), [mode]);
  const plates = useTrayStore((state) => state.plates);
  const addFood = useTrayStore((state) => state.addFood);

  // 每款餐品当前一共放了几份（跨所有餐盘）
  const picked = useMemo(() => {
    const counter = new Map<string, number>();
    plates.forEach((plate) =>
      plate.items.forEach((item) => {
        counter.set(item.foodId, (counter.get(item.foodId) ?? 0) + 1);
      }),
    );
    return counter;
  }, [plates]);

  return (
    <section className="rounded-[30px] border-2 border-[#f7e6c8] bg-white/70 p-3 shadow-[0_8px_0_#f3e2c2] sm:p-4">
      <div className="mb-2 flex items-end justify-between px-1">
        <h2 className="text-base font-black text-ink">餐品货架</h2>
        <span className="text-[11px] font-bold text-ink-soft">
          按「{mode.name}」匹配度排序 · 拖拽或点击加入
        </span>
      </div>

      <div className="rounded-[24px] bg-cream-deep/60 p-2">
        <div className="mb-1 flex items-center gap-2 px-1">
          <span className="rounded-full bg-mcd-red px-2 py-[3px] text-[10px] font-black text-white">
            为你推荐
          </span>
          <span className="text-[11px] font-bold text-ink-soft">
            主食 / 小吃 / 饮料 已配齐
          </span>
        </div>
        <div className="scroll-thin flex gap-2 overflow-x-auto px-1 pb-1 pt-2">
          {recommended.map((food) => (
            <FoodCard
              key={food.id}
              food={food}
              recommended
              picked={picked.get(food.id) ?? 0}
              onPick={addFood}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {sections.map((section) => (
          <div key={section.category}>
            <div className="mb-1 flex items-center gap-2 px-1">
              <h3 className="text-[13px] font-black text-ink">{section.category}</h3>
              <span className="text-[10.5px] font-bold text-ink-soft">
                {section.foods.length} 款
              </span>
            </div>
            <div className="scroll-thin flex gap-2 overflow-x-auto px-1 pb-1 pt-2">
              {section.foods.map((food) => (
                <FoodCard
                  key={food.id}
                  food={food}
                  picked={picked.get(food.id) ?? 0}
                  onPick={addFood}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
