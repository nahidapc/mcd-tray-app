/**
 * 图片加载失败时的降级配色。
 * 颜色由 food.id 哈希得出，所以同一款食品永远得到同一个色块，
 * 且色块上写着该食品的名字首字 —— 绝不会退化成「另一张食物图」。
 */
export interface FallbackPalette {
  /** 色块底色 */
  bg: string;
  /** 文字色 */
  fg: string;
  /** 虚线描边色 */
  ring: string;
  /** 名字首字 */
  label: string;
}

function hashHue(key: string): number {
  let h = 7;
  for (let i = 0; i < key.length; i += 1) {
    h = (h * 31 + key.charCodeAt(i)) % 360;
  }
  return h;
}

export function fallbackPalette(id: string, name: string): FallbackPalette {
  const hue = hashHue(id);
  const first = name.trim().charAt(0) || "?";
  return {
    bg: `hsl(${hue} 80% 91%)`,
    fg: `hsl(${hue} 55% 30%)`,
    ring: `hsl(${hue} 62% 74%)`,
    label: /[a-z]/.test(first) ? first.toUpperCase() : first,
  };
}
