import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { Food } from "../types";
import { fallbackPalette } from "../utils/imageFallback";

interface Props {
  /** 整条数据记录，src / alt 都从这里取，禁止外部再传图片地址 */
  food: Food;
  /** 外框尺寸与定位（相对父级铺满即可） */
  className?: string;
  /** 给 <img> 本身的类名（悬停位移、投影等） */
  imgClassName?: string;
  /** 额外的 img 内联样式 */
  style?: CSSProperties;
  loading?: "eager" | "lazy";
}

/**
 * 全站唯一的食品图片渲染入口。
 *
 * 三条硬规则：
 *  1. src 只能是 food.imageUrl，alt 只能是 food.name —— 同一个对象里取，天然不会错位；
 *  2. 统一 object-fit: contain，插画不被裁切；
 *  3. 加载失败时降级为「该食品名字首字 + 全名」的专属色块，
 *     绝不用另一张食物图兜底。
 */
export default function FoodImage({
  food,
  className = "",
  imgClassName = "",
  style,
  loading = "lazy",
}: Props) {
  const [failed, setFailed] = useState(false);

  // 换食品时清空失败态，避免上一张的失败标记串到这一张
  useEffect(() => {
    setFailed(false);
  }, [food.id]);

  const palette = fallbackPalette(food.id, food.name);

  if (failed) {
    return (
      <span
        role="img"
        aria-label={food.name}
        data-image-fallback={food.id}
        title={`${food.name}（插画加载失败）`}
        className={`grid place-items-center rounded-[18px] text-center ${className}`}
        style={{
          background: palette.bg,
          border: `2.5px dashed ${palette.ring}`,
          color: palette.fg,
        }}
      >
        <span className="grid place-items-center leading-none">
          <b
            className="block font-black"
            style={{ fontSize: "1.55rem", lineHeight: 1.05, color: palette.fg }}
          >
            {palette.label}
          </b>
          <span
            className="mt-1 block max-w-full truncate px-1 text-[9.5px] font-extrabold"
            style={{ color: palette.fg, opacity: 0.78 }}
          >
            {food.name}
          </span>
        </span>
      </span>
    );
  }

  return (
    <span className={`block ${className}`}>
      <img
        src={food.imageUrl}
        alt={food.name}
        loading={loading}
        decoding="async"
        draggable={false}
        onError={() => setFailed(true)}
        className={`h-full w-full ${imgClassName}`}
        style={{ objectFit: "contain", ...style }}
        data-food-id={food.id}
      />
    </span>
  );
}
