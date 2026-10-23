import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { foodById } from "../data/foodDatabase";
import { useTrayStore } from "../store/useTrayStore";
import type { Plate } from "../types";
import TrayItem from "./TrayItem";

interface Props {
  plate: Plate;
}

/** 餐盘：拖拽放置目标 + 自由摆放的实物图 */
export default function Tray({ plate }: Props) {
  const addFood = useTrayStore((state) => state.addFood);
  const wellRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [isOver, setIsOver] = useState(false);

  // 盘子尺寸变了要重算像素坐标，保证响应式下摆位仍然准确
  useEffect(() => {
    const node = wellRef.current;
    if (!node) return;
    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsOver(false);
      const foodId = event.dataTransfer.getData("text/plain");
      if (!foodId || !foodById.get(foodId)) return;

      const node = wellRef.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      addFood(foodId, { x, y });
    },
    [addFood],
  );

  const isEmpty = plate.items.length === 0;
  // 盘子越窄，盘中食物越小，保证小屏也能看清每一样
  const itemScale = size.w > 0 ? Math.min(1, Math.max(0.6, size.w / 720)) : 0.8;

  return (
    <div
      className={`plate aspect-[16/9.6] w-full ${isOver ? "is-over" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        if (!isOver) setIsOver(true);
      }}
      onDragLeave={(event) => {
        // 只有真正离开盘子才取消高亮，避免划过子元素时闪烁
        const next = event.relatedTarget as Node | null;
        if (next && event.currentTarget.contains(next)) return;
        setIsOver(false);
      }}
      onDrop={onDrop}
    >
      <div className="plate__well" ref={wellRef}>
        <div className="plate__ring" />

        <AnimatePresence>
          {plate.items.map((item) => (
            <TrayItem
              key={item.instanceId}
              item={item}
              plateId={plate.plateId}
              plateRef={wellRef}
              plateSize={size}
              scale={itemScale}
            />
          ))}
        </AnimatePresence>

        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            className="pointer-events-none absolute inset-0 grid place-items-center"
          >
            <div className="grid place-items-center gap-1 rounded-[32px] border-[3px] border-dashed border-[#e0a14e] px-8 py-6 text-center text-[#a9782f]">
              <span className="text-3xl">🍟</span>
              <strong className="text-sm font-extrabold">把下面的餐品拖进来</strong>
              <span className="text-[11px] font-bold opacity-70">
                点一下卡片也能放进盘子
              </span>
            </div>
          </motion.div>
        )}

        {isOver && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pointer-events-none absolute inset-0 grid place-items-center rounded-[44px] bg-[#ffc72c]/25"
          >
            <span className="rounded-full bg-white/90 px-4 py-2 text-xs font-black text-[#b1711c] shadow">
              松手放进餐盘 👌
            </span>
          </motion.div>
        )}
      </div>
    </div>
  );
}
