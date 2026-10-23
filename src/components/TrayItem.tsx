import { motion, useMotionValue } from "framer-motion";
import { useEffect, useState, type RefObject } from "react";
import { foodById } from "../data/foodDatabase";
import { useTrayStore } from "../store/useTrayStore";
import type { PlateItem } from "../types";
import FoodImage from "./FoodImage";

/** 各品类的视觉份量，让大盘稳、小件轻 */
const SIZE: Record<string, { w: number; h: number }> = {
  主食: { w: 154, h: 154 },
  小吃: { w: 122, h: 122 },
  饮料: { w: 104, h: 130 },
  其他: { w: 110, h: 110 },
};

function itemSize(foodId: string) {
  const food = foodById.get(foodId);
  const base = SIZE[food?.category ?? "小吃"] ?? SIZE.小吃;
  const scale = food?.imageScale ?? 1;
  return { w: Math.round(base.w * scale), h: Math.round(base.h * scale) };
}

interface Props {
  item: PlateItem;
  plateId: string;
  plateRef: RefObject<HTMLDivElement | null>;
  plateSize: { w: number; h: number };
  /** 小屏时按盘子宽度等比缩小，避免食物挤成一团 */
  scale?: number;
}

/**
 * 盘中一个「实体」。
 * 拖拽坐标交给 MotionValue 管，松手才写回 store（百分比），
 * 所以拖的时候是 60fps 的纯 CSS transform，不会触发 React 重渲染。
 */
export default function TrayItem({
  item,
  plateId,
  plateRef,
  plateSize,
  scale = 1,
}: Props) {
  const food = foodById.get(item.foodId);
  const moveItem = useTrayStore((state) => state.moveItem);
  const rotateItem = useTrayStore((state) => state.rotateItem);
  const removeItem = useTrayStore((state) => state.removeItem);

  const base = itemSize(item.foodId);
  const w = Math.round(base.w * scale);
  const h = Math.round(base.h * scale);
  const [dragging, setDragging] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const ready = plateSize.w > 0 && plateSize.h > 0;

  // 尺寸或存储坐标变化时，把百分比换算成像素
  useEffect(() => {
    if (!ready) return;
    x.set((item.x / 100) * plateSize.w - w / 2);
    y.set((item.y / 100) * plateSize.h - h / 2);
  }, [item.x, item.y, plateSize.w, plateSize.h, ready, w, h, x, y]);

  if (!food) return null;

  return (
    <motion.div
      className="plate-item group absolute left-0 top-0 select-none"
      data-food-id={food.id}
      data-instance-id={item.instanceId}
      drag
      dragConstraints={plateRef}
      dragElastic={0.14}
      dragMomentum={false}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => {
        setDragging(false);
        if (!ready) return;
        // 松手时把像素位置折算回百分比存进 store；
        // 位置本身只由 x/y 两个 MotionValue 决定，所以这里不会出现跳变。
        const centerX = x.get() + w / 2;
        const centerY = y.get() + h / 2;
        moveItem(
          plateId,
          item.instanceId,
          (centerX / plateSize.w) * 100,
          (centerY / plateSize.h) * 100,
        );
      }}
      style={{ x, y, width: w, height: h, zIndex: dragging ? 40 : 10 }}
      whileHover={{ scale: 1.07 }}
      whileDrag={{ scale: 1.12, rotate: item.rotate + 9, zIndex: 40 }}
      animate={{ rotate: item.rotate }}
      exit={{ scale: 0, opacity: 0, transition: { duration: 0.16 } }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      onDoubleClick={() => rotateItem(plateId, item.instanceId)}
      title="按住可拖动 · 双击旋转"
    >
      {/* 入场：从上方弹簧落入 */}
      <motion.div
        className="relative h-full w-full"
        initial={{ scale: 0.35, opacity: 0, y: -56 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 16, mass: 0.7 }}
      >
        <FoodImage
          food={food}
          className="h-full w-full"
          imgClassName="food-shadow"
          loading="eager"
        />

        {/* 悬停浮出的删除按钮 */}
        <button
          type="button"
          aria-label={`删掉 ${food.name}`}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            removeItem(plateId, item.instanceId);
          }}
          className="absolute -top-3 left-1/2 z-10 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full border-[2.5px] border-white bg-[#e23a2e] text-[15px] font-black text-white opacity-0 shadow-[0_3px_6px_rgba(140,40,20,.45)] transition group-hover:opacity-100 hover:scale-110 hover:brightness-110"
        >
          ✕
        </button>
      </motion.div>
    </motion.div>
  );
}
