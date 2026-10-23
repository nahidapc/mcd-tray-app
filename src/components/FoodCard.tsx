import type { Food } from "../types";
import { createDragGhost } from "../utils/dragGhost";
import FoodImage from "./FoodImage";

interface Props {
  food: Food;
  /** 是否出现在推荐区 */
  recommended?: boolean;
  /** 当前已放进餐盘的数量（用于轻提示，不是盘中角标） */
  picked: number;
  onPick: (foodId: string) => void;
}

/** 货架卡片：大图 + 弱化文字，图与名严格来自同一条记录 */
export default function FoodCard({ food, recommended, picked, onPick }: Props) {
  const onDragStart = (event: React.DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData("text/plain", food.id);
    event.dataTransfer.effectAllowed = "copy";

    // 拖拽时跟随鼠标的是这个食品自己的实物图（加载失败则显示首字色块）
    try {
      const ghost = createDragGhost(food);
      document.body.appendChild(ghost);
      event.dataTransfer.setDragImage(ghost, 56, 56);
      window.setTimeout(() => ghost.remove(), 0);
    } catch {
      // 某些浏览器不支持自定义拖拽图，静默降级
    }
  };

  return (
    <button
      type="button"
      draggable
      onDragStart={onDragStart}
      onClick={() => onPick(food.id)}
      className="food-card group relative w-[124px] shrink-0 rounded-[26px] border-2 border-[#f7e6c8] bg-white px-2 pb-2 pt-3 text-center"
      aria-label={`添加 ${food.name}`}
      data-food-id={food.id}
    >
      {recommended && (
        <span className="absolute -left-1 -top-2 rotate-[-8deg] rounded-full bg-[#e23a2e] px-2 py-[2px] text-[10px] font-black text-white shadow">
          推荐
        </span>
      )}
      {picked > 0 && (
        <span className="absolute -right-1 -top-2 grid h-6 min-w-6 place-items-center rounded-full border-2 border-white bg-[#2f9e5f] px-1 text-[10px] font-black text-white shadow">
          {picked}
        </span>
      )}

      <FoodImage
        food={food}
        className="pointer-events-none h-[76px] w-full"
        imgClassName="food-shadow--soft transition-transform duration-200 group-hover:-translate-y-1 group-hover:scale-105"
      />

      <span className="mt-1 block truncate text-[12.5px] font-extrabold leading-tight text-ink">
        {food.name}
      </span>
      <span className="mt-[2px] flex items-center justify-center gap-1 text-[10.5px] font-bold text-ink-soft">
        <b className="text-[12px] text-mcd-red">¥{food.price.toFixed(1)}</b>
        <i className="not-italic opacity-60">·</i>
        <span>{food.calories} kcal</span>
      </span>
    </button>
  );
}
