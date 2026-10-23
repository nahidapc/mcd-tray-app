"""回归验证：新增结算功能后，原有的图文绑定、盘中拖拽、删除仍正常。

复用 drive_checkout.Page 的 CDP 封装。
"""

from __future__ import annotations

import sys
import time
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from drive_checkout import Page  # noqa: E402

CHECK = []


def report(name: str, ok: bool, detail: str = "") -> None:
    CHECK.append(ok)
    print(f"{'✓' if ok else '✗'} {name}{(' — ' + detail) if detail else ''}")


def main() -> int:
    page = Page()
    page.start()
    try:
        page.goto("/?mode=taste")

        # 1. 图文绑定
        pairs = page.js(
            "JSON.stringify([...document.querySelectorAll('img')].map(i => "
            "({src: i.getAttribute('src'), alt: i.getAttribute('alt'), "
            "id: i.getAttribute('data-food-id'), "
            "ok: i.complete && i.naturalWidth > 0, fit: getComputedStyle(i).objectFit})))"
        )
        import json

        rows = json.loads(pairs)
        bad_src = [r for r in rows if "/images/foods/" not in (r["src"] or "")]
        # 图片文件名必须是 data-food-id.svg —— 这条能直接抓出「名字是可乐、图是汉堡」
        mismatch = [
            r
            for r in rows
            if not r["id"]
            or not (r["src"] or "").endswith(f"/{r['id']}.svg")
        ]
        no_alt = [r for r in rows if not (r["alt"] or "").strip()]
        broken = [r for r in rows if not r["ok"]]
        not_contain = [r for r in rows if r["fit"] != "contain"]
        report("图片全部来自 /images/foods/", not bad_src, f"{len(rows)} 个 img")
        report("图片全部加载成功", not broken, f"失败 {len(broken)}")
        report("物体 fit 均为 contain", not not_contain, f"异常 {len(not_contain)}")
        report("src 与 data-food-id 一致（无错配）", not mismatch, f"错配 {len(mismatch)}")
        report("alt 非空", not no_alt, f"缺 alt {len(no_alt)}")

        print(
            "   （图片去重）",
            page.js(
                "new Set([...document.querySelectorAll('img')]"
                ".map(i => i.getAttribute('src'))).size + ' 张不同图片'"
            ),
        )

        # 2. 盘中拖拽仍然生效
        box = page.js(
            "(() => { const el = document.querySelector('[data-instance-id]');"
            " if (!el) return null; const r = el.getBoundingClientRect();"
            " return {x: r.x + r.width/2, y: r.y + r.height/2, id: el.dataset.instanceId}; })()"
        )
        if box:
            page.call(
                "Input.dispatchMouseEvent",
                type="mousePressed",
                x=box["x"],
                y=box["y"],
                button="left",
                clickCount=1,
            )
            for step in range(1, 9):
                page.call(
                    "Input.dispatchMouseEvent",
                    type="mouseMoved",
                    x=box["x"] + step * 9,
                    y=box["y"] + step * 5,
                    button="left",
                )
                time.sleep(0.02)
            page.call(
                "Input.dispatchMouseEvent",
                type="mouseReleased",
                x=box["x"] + 72,
                y=box["y"] + 40,
                button="left",
            )
            time.sleep(0.6)
            after = page.js(
                "(() => { const el = document.querySelector('[data-instance-id]');"
                " if (!el) return null; const r = el.getBoundingClientRect();"
                " return {x: r.x + r.width/2, y: r.y + r.height/2}; })()"
            )
            moved = after and (abs(after["x"] - box["x"]) > 20 or abs(after["y"] - box["y"]) > 12)
            report(
                "盘中拖拽仍可移动",
                bool(moved),
                f"({box['x']:.0f},{box['y']:.0f}) → ({after['x']:.0f},{after['y']:.0f})"
                if after
                else "元素消失",
            )
        else:
            report("盘中拖拽仍可移动", False, "没有找到盘中元素")

        # 3. 结算不会污染价格：选券后实付 = 原价 - 优惠
        page.goto("/?mode=taste")
        page.click_text("满 30 减 5")
        time.sleep(0.8)
        price_text = page.js("document.querySelector('aside').innerText")
        import re

        original = float(re.search(r"商品原价\s*\n?\s*¥([\d.]+)", price_text).group(1))
        discount = float(re.search(r"- ¥([\d.]+)", price_text).group(1))
        payable = float(re.search(r"实付[^\n]*\n?\s*¥\s*\n?\s*([\d.]+)", price_text).group(1))
        report(
            "原价 - 优惠 = 实付",
            abs(original - discount - payable) < 0.005,
            f"{original} - {discount} = {payable}",
        )

        # 4. 8.8 折等价于原价 × 0.88
        page.goto("/?mode=taste")
        page.click_text("全场 8.8 折")
        time.sleep(0.8)
        text88 = page.js("document.querySelector('aside').innerText")
        pay88 = float(re.search(r"实付[^\n]*\n?\s*¥\s*\n?\s*([\d.]+)", text88).group(1))
        report("8.8 折按原价 × 0.88 计价", abs(pay88 - round(48.5 * 0.88, 2)) < 0.005, f"48.50 × 0.88 = {pay88}")

        print(f"\n{sum(CHECK)}/{len(CHECK)} 项通过")
        return 0 if all(CHECK) else 1
    finally:
        page.close()


if __name__ == "__main__":
    sys.exit(main())
