import type { Food } from "../types";
import { fallbackPalette } from "./imageFallback";

/**
 * 拖拽跟随图：直接用 food.imageUrl 生成，不会退化成别的食物。
 * 图片加载失败时移除 img，露出下面的「首字色块」。
 */
export function createDragGhost(food: Food): HTMLElement {
  const palette = fallbackPalette(food.id, food.name);

  const box = document.createElement("div");
  box.setAttribute("aria-hidden", "true");
  box.dataset.ghostFoodId = food.id;
  box.textContent = palette.label;
  box.style.cssText = [
    "position:fixed",
    "top:-400px",
    "left:-400px",
    "width:112px",
    "height:112px",
    "display:grid",
    "place-items:center",
    "border-radius:26px",
    `background:${palette.bg}`,
    `color:${palette.fg}`,
    "font:900 44px/1 system-ui,-apple-system,'PingFang SC','Microsoft YaHei',sans-serif",
    "pointer-events:none",
    "z-index:9999",
  ].join(";");

  const img = document.createElement("img");
  img.src = food.imageUrl;
  img.alt = "";
  img.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;object-fit:contain;" +
    "filter:drop-shadow(0 10px 10px rgba(160,90,10,.35));";
  img.onerror = () => img.remove();

  box.appendChild(img);
  return box;
}
