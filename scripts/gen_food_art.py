# -*- coding: utf-8 -*-
"""
为 foodDatabase 中的每一款食品生成「专属」矢量插画。

设计原则
--------
1. 一个 id 一个文件：public/images/foods/<id>.svg，绝不共用；
2. 每张图按该食物的真实形态绘制（巨无霸三层包、麦辣鸡腿堡脆皮鸡排、
   板烧长条包带烤痕、薯条红盒、麦乐鸡开口盒、麦旋风带奥利奥碎……），
   所以「名字 ↔ 图片」在视觉上就可校验，不靠随机分配；
3. 纯本地 SVG，无外链、无字体依赖，离线也不会出现裂图。

运行：python scripts/gen_food_art.py
"""
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "public" / "images" / "foods"

# ── 配色 ─────────────────────────────────────────────────────────
O = "#43260f"          # 统一描边（深可可色）
BUN = "#f2b45e"
BUN_DK = "#dd9340"
BUN_LT = "#fbd9a2"
BUN_PALE = "#f8d79b"
BUN_TOAST = "#e2a962"
BEEF = "#8d4a2b"
BEEF_LT = "#a75f3b"
CRISPY = "#eaa93f"
CRISPY_DK = "#c8862a"
LETTUCE = "#84c542"
LETTUCE_DK = "#5f9c2b"
CHEESE = "#ffc72c"
TOMATO = "#e2543c"
RED = "#d42b23"
RED_DK = "#a81c16"
CREAM = "#fff8ec"
WHITE = "#fdfdfb"
CHOC = "#55301e"
TARO = "#9061bd"
ICEBLUE = "#dcecf5"


def n(v):
    """统一数值格式，保持 SVG 干净。"""
    return f"{round(float(v), 1):g}"


# ── 基础图形 ─────────────────────────────────────────────────────
def ell(cx, cy, rx, ry, fill, stroke=O, sw=4, rot=None):
    st = f'stroke="{stroke}" stroke-width="{sw}"' if stroke else ""
    tr = f' transform="rotate({n(rot)} {n(cx)} {n(cy)})"' if rot is not None else ""
    return (
        f'<ellipse cx="{n(cx)}" cy="{n(cy)}" rx="{n(rx)}" ry="{n(ry)}" '
        f'fill="{fill}" {st}{tr}/>'
    )


def rr(x, y, w, h, r, fill, stroke=O, sw=4, rot=None):
    st = f'stroke="{stroke}" stroke-width="{sw}"' if stroke else ""
    tr = f' transform="rotate({n(rot)} {n(x + w / 2)} {n(y + h / 2)})"' if rot is not None else ""
    return (
        f'<rect x="{n(x)}" y="{n(y)}" width="{n(w)}" height="{n(h)}" rx="{n(r)}" '
        f'fill="{fill}" {st}{tr}/>'
    )


def pth(d, fill, stroke=O, sw=4, extra=""):
    st = f'stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round"' if stroke else ""
    return f'<path d="{d}" fill="{fill}" {st} {extra}/>'


def line(x1, y1, x2, y2, stroke, sw=4, cap="round"):
    return (
        f'<line x1="{n(x1)}" y1="{n(y1)}" x2="{n(x2)}" y2="{n(y2)}" '
        f'stroke="{stroke}" stroke-width="{sw}" stroke-linecap="{cap}"/>'
    )


def dome(cx, base, rx, rise, fill, sw=4):
    """面包顶：圆顶 + 平底，模拟汉堡胚。"""
    k = rise * 1.34
    d = (
        f"M{n(cx - rx)} {n(base)} "
        f"C{n(cx - rx)} {n(base - k)} {n(cx + rx)} {n(base - k)} {n(cx + rx)} {n(base)} Z"
    )
    return pth(d, fill, sw=sw)


def dome_y(cx, base, rx, rise, t):
    """圆顶上的取点（t: -1..1）。"""
    import math

    return cx + rx * t, base - rise * math.sqrt(max(0.0, 1 - t * t)) * 0.94


def sesame(cx, base, rx, rise, color="#fff6e2", count=7):
    out = []
    fr = [-0.62, -0.38, -0.13, 0.12, 0.37, 0.6, 0.0]
    for i in range(count):
        t = fr[i % len(fr)] + (0.16 if i >= len(fr) else 0)
        x, y = dome_y(cx, base, rx, rise, t)
        y -= 6 if i >= len(fr) else 0
        out.append(f'<ellipse cx="{n(x)}" cy="{n(y)}" rx="6" ry="3.4" fill="{color}" '
                   f'transform="rotate({-12 if i % 2 else 10} {n(x)} {n(y)})"/>')
    return "".join(out)


def scallop(x0, x1, y, h, bumps, amp, fill, sw=4):
    """生菜：顶部半圆瓣 + 底部波浪，做出蓬松感。"""
    w = (x1 - x0) / bumps
    d = f"M{n(x0)} {n(y)}"
    for _ in range(bumps):
        d += f" q{n(w / 2)} {n(-amp)} {n(w)} 0"
    d += f" L{n(x1)} {n(y + h)}"
    for _ in range(bumps):
        d += f" q{n(-w / 2)} {n(amp * 0.75)} {n(-w)} 0"
    d += " Z"
    return pth(d, fill, sw=sw)


def cheese(x, y, w, h, drips=4, fill=CHEESE, sw=4):
    """芝士片：下沿带融化的小尖角。"""
    step = w / (drips * 1.1)
    d = f"M{n(x)} {n(y)} h{n(w)} v{n(h)}"
    for _ in range(drips):
        d += f" l{n(-step * 0.55)} {n(7)} l{n(-step * 0.55)} {n(-4)}"
    d += " Z"
    return pth(d, fill, sw=sw)


def cup(cx, ty, tw, by, bw, fill, sw=4, r=10):
    """杯身（上宽下窄，底角圆润）。"""
    x1, x2 = cx - tw / 2, cx + tw / 2
    x3, x4 = cx + bw / 2, cx - bw / 2
    d = (
        f"M{n(x1)} {n(ty)} L{n(x2)} {n(ty)} L{n(x3)} {n(by - r)} "
        f"Q{n(x3)} {n(by)} {n(x3 - r)} {n(by)} L{n(x4 + r)} {n(by)} "
        f"Q{n(x4)} {n(by)} {n(x4)} {n(by - r)} Z"
    )
    return pth(d, fill, sw=sw)


def liquid(cx, ty, tw, by, bw, fill, inset=5, sw=None):
    x1, x2 = cx - tw / 2 + inset, cx + tw / 2 - inset
    x3, x4 = cx + bw / 2 - inset, cx - bw / 2 + inset
    r = 8
    d = (
        f"M{n(x1)} {n(ty)} L{n(x2)} {n(ty)} L{n(x3)} {n(by - r)} "
        f"Q{n(x3)} {n(by)} {n(x3 - r)} {n(by)} L{n(x4 + r)} {n(by)} "
        f"Q{n(x4)} {n(by)} {n(x4)} {n(by - r)} Z"
    )
    return pth(d, fill, stroke=None, sw=0)


def straw(cx, top_y, bottom_y, color, w=11, tilt=-8):
    r = rr(cx - w / 2, top_y, w, bottom_y - top_y, w / 2, color, sw=3.5, rot=tilt)
    return r


def bubbles(cx, cy, pts, color="#ffffff", op=0.55):
    out = []
    for dx, dy, r in pts:
        out.append(f'<circle cx="{n(cx + dx)}" cy="{n(cy + dy)}" r="{n(r)}" fill="{color}" opacity="{op}"/>')
    return "".join(out)


def speckles(pts, color=CRISPY_DK, r=2.6, op=0.75):
    out = []
    for x, y in pts:
        out.append(f'<circle cx="{n(x)}" cy="{n(y)}" r="{n(r)}" fill="{color}" opacity="{op}"/>')
    return "".join(out)


# ── 主食 ─────────────────────────────────────────────────────────
def bigmac():
    """巨无霸：三层包 + 两片牛肉 + 芝士 + 双份生菜（最高最厚）。"""
    return [
        rr(38, 148, 124, 20, 9, BUN_DK),
        rr(45, 151, 110, 7, 3.5, BUN_LT, stroke=None),
        rr(34, 134, 132, 16, 8, BEEF),
        rr(38, 136, 124, 4, 2, BEEF_LT, stroke=None),
        scallop(30, 170, 126, 10, 6, 6, LETTUCE),
        rr(40, 112, 120, 16, 8, BUN),
        rr(34, 98, 132, 16, 8, BEEF),
        rr(38, 100, 124, 4, 2, BEEF_LT, stroke=None),
        cheese(36, 90, 128, 10),
        scallop(32, 168, 79, 10, 6, 6, LETTUCE),
        dome(100, 82, 64, 41, BUN),
        sesame(100, 82, 62, 39),
    ]


def mcspicy():
    """麦辣鸡腿堡：单层厚脆皮鸡排 + 辣椒碎，胚子高、无中层包。"""
    return [
        rr(40, 150, 120, 18, 9, BUN_DK),
        rr(46, 152, 108, 6, 3, BUN_LT, stroke=None),
        # 脆皮鸡排（锯齿外沿）
        rr(30, 126, 140, 26, 11, CRISPY),
        ell(40, 149, 8, 8, CRISPY, stroke=None),
        ell(62, 151, 9, 8, CRISPY, stroke=None),
        ell(88, 152, 10, 8, CRISPY, stroke=None),
        ell(114, 151, 9, 8, CRISPY, stroke=None),
        ell(138, 149, 9, 8, CRISPY, stroke=None),
        ell(160, 147, 7, 7, CRISPY, stroke=None),
        speckles([(52, 136), (72, 142), (96, 134), (120, 143), (146, 136), (86, 146), (134, 133)]),
        # 辣椒碎
        speckles([(64, 132), (108, 138), (142, 130), (90, 130)], color="#d63b2a", r=3, op=0.9),
        scallop(34, 166, 118, 10, 5, 6, LETTUCE),
        dome(100, 120, 62, 44, BUN),
        sesame(100, 120, 60, 42, count=6),
    ]


def filet():
    """板烧鸡腿堡：长条椭圆包（无芝麻）+ 外露的烤鸡排 + 明显烤痕。"""
    marks = [rr(x, 118, 22, 8, 4, "#7d3f1f", sw=0, rot=-26) for x in (38, 66, 94, 122, 148)]
    return [
        rr(28, 146, 144, 16, 8, BUN_TOAST),
        rr(34, 148, 132, 5, 2.5, BUN_LT, stroke=None),
        # 烤鸡排：比包还宽，两侧露出来
        rr(24, 111, 152, 37, 16, "#dfa262"),
        rr(30, 114, 140, 7, 3.5, "#f0c084", stroke=None),
        *marks,
        # 酱汁
        pth("M30 140 q18 10 36 0 q18 10 36 0 q18 10 36 0 q16 9 32 0 l0 6 l-140 0 Z", CREAM, sw=0),
        # 长条包：扁圆顶、无芝麻
        dome(100, 108, 74, 25, BUN_TOAST),
        pth("M40 93 q26 -11 58 -11 q32 0 60 11", "none", stroke="#f0c084", sw=4),
    ]


def doublecheese():
    """双层吉士汉堡：两片牛肉 + 两片芝士，中间露出酸黄瓜。"""
    return [
        rr(40, 150, 120, 18, 9, BUN_DK),
        rr(36, 136, 128, 15, 7, BEEF),
        cheese(34, 128, 132, 9, drips=5),
        # 酸黄瓜
        ell(56, 141, 12, 6, "#7aa93c", sw=3.5),
        ell(88, 143, 12, 6, "#7aa93c", sw=3.5),
        ell(120, 141, 12, 6, "#7aa93c", sw=3.5),
        rr(40, 114, 120, 15, 7, BUN),
        rr(36, 114, 128, 15, 7, BEEF),
        cheese(34, 106, 132, 9, drips=5),
        dome(100, 100, 62, 34, BUN),
        sesame(100, 100, 60, 32, count=6),
    ]


def mchicken():
    """麦香鸡：发白的软包、鸡排比包还宽、生菜从两侧探出来。"""
    return [
        rr(42, 150, 116, 16, 8, BUN_PALE),
        rr(34, 132, 132, 18, 9, CRISPY),
        speckles([(50, 142), (76, 145), (104, 140), (128, 145), (150, 141)], r=2.4),
        # 生菜向左右探出
        ell(30, 128, 12, 8, LETTUCE, sw=3.5),
        ell(170, 128, 12, 8, LETTUCE, sw=3.5),
        scallop(26, 174, 118, 12, 7, 6, LETTUCE),
        # 沙拉酱
        pth("M40 128 q16 8 30 0 q16 8 30 0 q16 8 30 0 q14 7 28 0 l0 4 l-118 0 Z", CREAM, sw=0),
        dome(100, 116, 58, 37, BUN_PALE),
        sesame(100, 116, 56, 35, color="#fffaf0", count=5),
    ]


def fish():
    """麦香鱼：玉米面黄包 + 比包更宽的方形雪白鱼排 + 塔塔酱。"""
    return [
        rr(44, 154, 112, 14, 7, "#f6d688"),
        # 方形鱼排（直角露在包外）
        rr(34, 130, 132, 26, 5, "#f7ead1"),
        line(50, 138, 94, 138, "#ddcba6", 3),
        line(62, 144, 112, 144, "#ddcba6", 3),
        line(86, 150, 148, 150, "#ddcba6", 3),
        # 塔塔酱
        pth("M38 130 q14 8 28 0 q14 8 28 0 q14 8 28 0 q14 8 28 0 l0 5 l-112 0 Z", "#fffdf5", sw=0),
        # 半片芝士
        rr(52, 124, 44, 7, 2, CHEESE, sw=3),
        scallop(38, 162, 118, 11, 5, 6, LETTUCE),
        dome(100, 116, 58, 34, "#f7d98f"),
        # 玉米面颗粒
        speckles([(78, 94), (94, 86), (112, 92), (126, 102), (66, 104), (100, 76)],
                 color="#e0b04c", r=2.2, op=0.9),
    ]


def angus():
    """培根安格斯厚牛堡：最高、厚牛肉饼、折线培根、洋葱圈。"""
    return [
        rr(38, 154, 124, 20, 9, BUN_DK),
        rr(32, 132, 136, 24, 9, BEEF),
        rr(36, 135, 128, 5, 2.5, BEEF_LT, stroke=None),
        ell(62, 150, 3.4, 3.4, "#5d2c17", stroke=None),
        ell(100, 152, 3.4, 3.4, "#5d2c17", stroke=None),
        ell(134, 150, 3.4, 3.4, "#5d2c17", stroke=None),
        cheese(34, 124, 132, 9, drips=5),
        # 培根（两片波浪）
        pth("M36 122 q12 -9 24 0 q12 9 24 0 q12 -9 24 0 q12 9 24 0 q10 -8 22 0 l0 -9 q-12 -8 -22 0 q-12 -9 -24 0 q-12 9 -24 0 q-12 -9 -24 0 q-12 9 -24 0 Z",
            "#c65a3a", sw=3.5),
        pth("M44 112 q10 -7 20 0 q10 7 20 0 q10 -7 20 0 q10 7 20 0", "#f7d8c2", sw=3),
        # 洋葱圈
        ell(68, 112, 13, 6, "none", sw=3.5),
        ell(68, 112, 13, 6, "#f6e6cf", sw=0),
        ell(68, 112, 7, 3, "none", sw=0),
        ell(126, 112, 13, 6, "#f6e6cf", sw=3.5),
        dome(100, 106, 66, 48, BUN),
        sesame(100, 106, 64, 46, count=7),
    ]


def wrap():
    """酥酥多笋卷：斜放的面卷，切面露出笋丁与酱。"""
    return [
        f'<g transform="rotate(-20 100 108)">',
        # 包装纸
        pth("M52 128 q48 16 96 0 l0 22 q-48 14 -96 0 Z", "#f3e3c4", sw=4),
        # 卷身
        rr(48, 84, 104, 54, 26, "#f0d9a6"),
        rr(56, 88, 88, 10, 5, "#f8e8c6", stroke=None),
        # 切面
        ell(150, 108, 16, 27, "#f7e7c3", sw=4),
        ell(150, 108, 10, 19, "#e8d3a4", sw=0),
        # 馅料
        ell(147, 100, 5, 5, "#7fae3a", sw=0),
        ell(153, 108, 5, 5, "#a86a33", sw=0),
        ell(147, 116, 5, 5, "#7fae3a", sw=0),
        # 卷褶
        line(70, 90, 84, 128, "#e0c48c", 3),
        line(94, 88, 106, 130, "#e0c48c", 3),
        "</g>",
        # 探出的笋条
        rr(158, 58, 8, 30, 4, "#a9cc59", sw=3.5, rot=22),
    ]


def veggie():
    """培根蔬萃双层牛堡：大片生菜叶向两侧张开 + 番茄片。"""
    return [
        rr(40, 148, 120, 18, 9, BUN_DK),
        # 两侧大叶
        pth("M34 132 q-22 -14 -24 -34 q22 4 30 16 q8 12 -6 18 Z", LETTUCE, sw=3.5),
        pth("M166 132 q22 -14 24 -34 q-22 4 -30 16 q-8 12 6 18 Z", LETTUCE, sw=3.5),
        rr(36, 134, 128, 15, 7, BEEF),
        cheese(34, 126, 132, 8, drips=4),
        # 番茄片
        ell(100, 136, 46, 11, TOMATO, sw=3.5),
        ell(84, 136, 5, 4, "#f08a72", stroke=None),
        ell(104, 138, 5, 4, "#f08a72", stroke=None),
        scallop(32, 168, 116, 12, 6, 7, LETTUCE),
        rr(38, 114, 124, 14, 7, BEEF),
        cheese(36, 106, 128, 8, drips=4),
        dome(100, 100, 62, 34, BUN),
        sesame(100, 100, 60, 32, count=6),
    ]


def chickenwrap():
    """鸡肉蛋沙拉叠叠卷：两段立着的卷，切面是厚厚的蛋沙拉。"""
    out = []
    for cx, tilt, top in [(74, -6, 76), (128, 7, 84)]:
        out.append(f'<g transform="rotate({tilt} {cx} 116)">')
        out.append(rr(cx - 26, top, 52, 128 - top + 2, 22, "#f0d9a6"))
        # 切面
        out.append(ell(cx, top + 1, 22, 11, "#fbf1da", sw=4))
        out.append(ell(cx, top + 1, 17, 8, "#f8d76b", sw=0))
        out.append(ell(cx - 6, top - 1, 5, 4, "#fffdf2", sw=0))
        out.append(ell(cx + 6, top + 3, 5, 4, "#fffdf2", sw=0))
        out.append(ell(cx + 1, top + 4, 4, 3.4, "#8fbf46", sw=0))
        # 纸套
        out.append(pth(f"M{cx - 26} 128 q26 12 52 0 l0 26 q-26 12 -52 0 Z", "#efe2c8", sw=4))
        out.append(line(cx - 22, 140, cx + 22, 140, "#d9c9a4", 3))
        out.append("</g>")
    return out


# ── 小吃 ─────────────────────────────────────────────────────────
def fries():
    """薯条（中）：红盒 + 一堆长短不一的薯条 + 盐粒。"""
    sticks = []
    for i, (x, h, rot) in enumerate([
        (58, 62, -9), (70, 74, -4), (82, 66, -2), (94, 80, 0),
        (106, 70, 3), (118, 76, 6), (130, 60, 9), (64, 56, -14), (124, 54, 13),
    ]):
        sticks.append(rr(x, 108 - h, 11, h, 5, "#f8cc55", sw=3.5, rot=rot))
    return [
        *sticks,
        # 红盒
        pth("M54 104 L146 104 L138 168 Q100 176 62 168 Z", RED),
        pth("M54 104 L146 104 L144 118 L56 118 Z", "#f2f0e8", sw=0),
        # M 标
        pth("M74 154 q0 -30 15 -30 q13 0 13 24 q0 -24 13 -24 q15 0 15 30",
            "none", stroke="#ffc72c", sw=8),
        # 盒口投影
        line(58, 120, 142, 120, "#00000022", 3, cap="butt"),
    ]


def nuggets():
    """麦乐鸡（5 块）：敞口红盒里躺着 5 块鸡块 + 蘸酱。"""
    def nug(cx, cy, r=17, rot=0):
        return ell(cx, cy, r, r * 0.82, CRISPY, rot=rot)

    return [
        # 盒背
        rr(46, 104, 108, 60, 8, "#c9302b"),
        pth("M46 104 L154 104 L150 128 L50 128 Z", "#e0463a", sw=0),
        # 鸡块
        nug(72, 122, 18, -12),
        nug(100, 116, 19, 6),
        nug(128, 122, 18, 14),
        nug(84, 144, 18, -4),
        nug(116, 146, 18, 8),
        speckles([(72, 120), (100, 114), (128, 120), (84, 143), (116, 145)], r=2.2),
        # 盒前沿
        pth("M42 140 L158 140 L150 168 Q100 178 50 168 Z", "#d7352b"),
        pth("M42 140 L158 140 L156 150 L44 150 Z", "#f2f0e8", sw=0),
        # 蘸酱
        ell(168, 100, 15, 9, "#f4efe4", sw=3.5),
        ell(168, 99, 10, 5.5, "#b6412c", sw=0),
    ]


def wings():
    """麦辣鸡翅（2 块）：两根交叉的翅根，骨头顶端发白，带辣椒碎。"""
    def drum(cx, cy, rot):
        return (
            f'<g transform="rotate({rot} {cx} {cy})">'
            + rr(cx - 26, cy - 17, 46, 34, 16, "#e39a2c")
            + ell(cx - 7, cy - 5, 12, 6, "#f4bb58", stroke=None)
            + rr(cx + 16, cy - 5, 26, 10, 5, "#fdf3dd", sw=3.5)
            + ell(cx + 44, cy - 1, 7.5, 7.5, "#fdf3dd", sw=3.5)
            + speckles([(cx - 12, cy + 6), (cx + 4, cy - 6), (cx - 2, cy + 10)], r=2.4)
            + speckles([(cx - 16, cy - 4), (cx + 8, cy + 8)], color="#d63b2a", r=2.8, op=0.95)
            + "</g>"
        )

    return [drum(84, 140, -24), drum(116, 132, 22), drum(100, 160, 0)]


def bigchicken():
    """那么大鸡排：比手掌还大的扁鸡排，垫在纸套上。"""
    return [
        pth("M34 128 L166 128 L158 176 L42 176 Z", "#f4ead5"),
        pth("M34 128 L166 128 L164 140 L36 140 Z", RED, sw=0),
        # 鸡排本体（不规则外沿）
        pth("M46 118 q6 -34 34 -40 q22 -22 48 -8 q30 -2 34 24 q18 14 4 34 q-6 22 -34 20 q-24 14 -46 2 q-34 2 -40 -32 Z", CRISPY),
        ell(66, 106, 12, 9, "#f6c463", stroke=None),
        ell(126, 100, 14, 10, "#f6c463", stroke=None),
        speckles([(84, 112), (104, 96), (118, 120), (72, 128), (140, 116), (96, 132), (58, 96)], r=2.6),
        # 咬痕
        ell(150, 140, 9, 8, "#f4ead5", sw=3.5),
    ]


def corn():
    """玉米杯（大）：白色杯子里装满玉米粒。"""
    kernels = []
    rows = [
        (78, 6, 5), (90, 5, 5), (102, 5, 5), (114, 5, 5),
        (84, 4, 4), (96, 4, 4), (108, 4, 4), (72, 3, 3), (120, 3, 3),
    ]
    for y, cnt, r in rows:
        for i in range(cnt):
            x = 100 + (i - (cnt - 1) / 2) * (r * 2 + 2)
            kernels.append(f'<circle cx="{n(x)}" cy="{n(y + 96)}" r="{n(r)}" fill="#ffcf4a" stroke="#e0a326" stroke-width="2"/>')
    return [
        cup(100, 92, 116, 168, 92, "#fdfbf4"),
        # 杯口
        ell(100, 92, 58, 13, "#e8e2d2", sw=4),
        ell(100, 92, 52, 10, "#fff7e0", sw=0),
        *kernels,
        # 杯中玉米
        ell(100, 108, 48, 12, "#ffd257", sw=0),
        # 高光
        line(62, 112, 66, 150, "#ffffff", 5),
    ]


def apple():
    """苹果片：三片带红皮的切片，从同一底部扇形展开。"""
    def slice_(rot):
        d = "M100 150 L86 92 Q100 81 114 92 Z"
        return (
            f'<g transform="rotate({rot} 100 150)">'
            + pth(d, "#fbeec2")
            + pth("M86 92 Q100 81 114 92", "none", stroke="#d8462f", sw=6)
            + line(100, 100, 100, 140, "#ecd49b", 3)
            + ell(94, 126, 3.2, 5.2, "#8a5a33", sw=0, rot=-18)
            + ell(106, 126, 3.2, 5.2, "#8a5a33", sw=0, rot=18)
            + "</g>"
        )

    return [slice_(-36), slice_(0), slice_(36)]


def pie():
    """香芋派：长方形压花酥皮 + 中间挤出的紫色香芋馅（和薯饼明显不同）。"""
    crimps = []
    for x in range(56, 150, 15):
        crimps.append(ell(x, 86, 4, 4, "#e2a24f", sw=0))
        crimps.append(ell(x, 160, 4, 4, "#e2a24f", sw=0))
    return [
        rr(44, 82, 112, 84, 12, "#e9b45f"),
        rr(52, 90, 96, 68, 8, "#f3c882", stroke=None),
        # 排气口
        line(78, 104, 100, 118, "#cd9146", 3),
        line(122, 104, 104, 116, "#cd9146", 3),
        # 香芋馅
        pth("M88 108 q12 -9 24 0 q6 9 2 19 q-9 13 -22 13 q-13 0 -20 -13 q-3 -13 16 -19 Z", TARO, sw=3.5),
        pth("M95 138 q5 15 11 19 q8 -4 9 -19 Z", TARO, sw=3.5),
        *crimps,
    ]


def hashbrown():
    """脆薯饼：椭圆形土豆饼，表面是一丝丝薯丝（和香芋派完全不同）。"""
    out = [ell(100, 112, 62, 44, "#e6b055")]
    for dx, dy in [(62, 0), (44, 31), (-44, 31), (-62, 0), (-44, -31), (44, -31)]:
        out.append(f'<circle cx="{n(100 + dx)}" cy="{n(112 + dy)}" r="10" fill="#e6b055" stroke="{O}" stroke-width="4"/>')
    # 薯丝
    shreds = [(-34, -8, 26), (-18, -18, 22), (2, -12, 30), (22, -20, 24), (36, -6, 26),
              (-28, 6, 24), (-6, 8, 30), (16, 4, 26), (30, 16, 22),
              (-24, 20, 22), (0, 24, 26), (22, 26, 20)]
    for x, y, w in shreds:
        out.append(line(100 + x, 112 + y, 100 + x + w, 112 + y - 5, "#f2cd86", 4))
        out.append(line(100 + x, 112 + y + 4, 100 + x + w - 4, 112 + y + 1, "#cf9440", 3))
    out.append(speckles([(76, 96), (104, 88), (124, 108), (88, 124), (116, 130)], r=2.6))
    return out


# ── 饮料 ─────────────────────────────────────────────────────────
def coke():
    """可乐（中杯）：红色纸杯 + 白色波浪带 + 吸管 + 冰块。"""
    return [
        straw(124, 26, 96, "#e8e4da"),
        cup(100, 66, 96, 172, 74, WHITE),
        # 红色包边
        pth("M52 66 L148 66 L146 84 L54 84 Z", RED, sw=0),
        pth("M55 128 L145 128 L141 160 Q100 168 59 160 Z", RED, sw=0),
        # 液面
        ell(100, 84, 46, 10, "#4a2415", sw=0),
        # 冰块
        rr(76, 78, 18, 14, 4, "#efe9dd", sw=2.5),
        rr(104, 76, 16, 13, 4, "#efe9dd", sw=2.5),
        rr(92, 86, 15, 12, 4, "#efe9dd", sw=2.5),
        bubbles(100, 110, [(-22, 10, 3), (8, 22, 2.4), (24, 4, 2.8), (-6, 36, 2.2)]),
        # M 标
        pth("M80 116 q0 -22 10 -22 q9 0 9 18 q0 -18 9 -18 q10 0 10 22", "none", stroke="#ffc72c", sw=6),
    ]


def cokezero():
    """无糖可乐（中杯）：黑杯 + 黑色吸管 + 银灰带 + 0 标。"""
    return [
        straw(122, 30, 94, "#2f2f34"),
        cup(100, 66, 96, 172, 74, "#3a3a40"),
        ell(100, 68, 48, 10, "#24242a", sw=3.5),
        pth("M52 70 L148 70 L147 84 L53 84 Z", "#2a2a30", sw=0),
        # 银色带
        pth("M55 126 L145 126 L142 150 L58 150 Z", "#c9ccd2", sw=0),
        # ZERO 里的 0
        ell(100, 138, 11, 9, "none", stroke="#2a2a30", sw=5),
        # 液面高光
        line(74, 92, 70, 122, "#7a7a86", 4),
        bubbles(100, 108, [(-20, 6, 2.6), (14, 18, 2.2), (26, 2, 2)]),
    ]


def milk():
    """纯牛奶（盒装）：白色屋顶盒 + 蓝盖 + 奶牛斑。"""
    return [
        # 盒身
        pth("M60 78 L140 78 L140 172 L60 172 Z", "#fdfcf7"),
        # 屋顶
        pth("M60 78 L100 52 L140 78 Z", "#eaf1f8"),
        # 折脊
        line(100, 52, 100, 78, "#c8d8e6", 3),
        # 蓝色带
        pth("M60 126 L140 126 L140 150 L60 150 Z", "#2f6fb5", sw=0),
        # 奶牛斑
        pth("M72 88 q14 -6 16 8 q2 12 -12 12 q-12 0 -10 -12 Z", "#3a3a3a", sw=0),
        pth("M120 96 q12 -2 12 10 q0 10 -12 8 q-10 -2 -8 -10 Z", "#3a3a3a", sw=0),
        # 盖子
        rr(112, 46, 16, 12, 3, "#e94b3c", sw=3.5),
        # 高光
        line(68, 84, 68, 120, "#ffffff", 5),
        # 小标语条
        pth("M78 158 h44", "none", stroke="#cfd9e4", sw=6),
    ]


def americano():
    """麦咖啡美式（中杯）：白杯 + 牛皮纸杯套 + 黑杯盖 + 热气。"""
    return [
        # 热气
        pth("M84 44 q-8 -10 0 -18 q8 -8 0 -16", "none", stroke="#d9cdbb", sw=4),
        pth("M110 46 q-8 -10 0 -18 q8 -8 0 -16", "none", stroke="#d9cdbb", sw=4),
        cup(100, 74, 90, 172, 72, "#fdfcf7"),
        # 杯盖
        rr(50, 58, 100, 18, 9, "#2b2b2f", sw=3.5),
        rr(66, 50, 68, 10, 5, "#3a3a40", sw=3.5),
        # 杯套
        pth("M57 118 L143 118 L139 156 L61 156 Z", "#c39a68"),
        pth("M57 118 L143 118 L142 126 L58 126 Z", "#d3ad7d", sw=0),
        # 杯套上的咖啡豆
        ell(88, 138, 7, 9, "#6d4526", sw=0, rot=-18),
        ell(112, 138, 7, 9, "#6d4526", sw=0, rot=18),
        line(88, 132, 88, 144, "#c39a68", 2.4),
        line(112, 132, 112, 144, "#c39a68", 2.4),
    ]


def orange():
    """阳光橙麦炫酷：橙色杯 + 橙片 + 绿吸管 + 气泡。"""
    return [
        straw(120, 28, 96, "#3f9e52"),
        cup(100, 66, 96, 172, 74, "#fbe7c8"),
        liquid(100, 84, 90, 170, 72, "#f59120"),
        ell(100, 84, 45, 10, "#ffb04a", sw=3),
        bubbles(100, 116, [(-20, 12, 3.4), (10, 26, 2.6), (24, 6, 3), (-6, 42, 2.4)]),
        # 橙片
        ell(140, 76, 26, 26, "#ffb340", sw=4),
        ell(140, 76, 19, 19, "#ffd27a", sw=0),
        *[line(140 + 15 * __import__("math").cos(a), 76 + 15 * __import__("math").sin(a),
               140 + 19 * __import__("math").cos(a), 76 + 19 * __import__("math").sin(a),
               "#ffb340", 3) for a in [0.3, 1.2, 2.1, 3.0, 3.9, 4.8, 5.7]],
        # 杯身橙标
        pth("M62 134 q38 -12 76 0 l-4 14 q-34 -10 -68 0 Z", "#f59120", sw=0),
    ]


def soy():
    """优品豆浆（大杯）：米白杯 + 绿色叶子标 + 热气。"""
    return [
        pth("M86 44 q-7 -9 0 -16", "none", stroke="#d9cdbb", sw=3.6),
        pth("M108 46 q-7 -9 0 -16", "none", stroke="#d9cdbb", sw=3.6),
        cup(100, 72, 92, 174, 72, "#f7f1de"),
        ell(100, 72, 46, 11, "#efe4c6", sw=3.5),
        # 绿色带 + 叶子
        pth("M55 120 L145 120 L141 146 L59 146 Z", "#6fae4b", sw=0),
        pth("M100 152 q-14 -12 0 -24 q14 12 0 24 Z", "#6fae4b", sw=3),
        # 豆纹
        ell(78, 98, 6, 4, "#f2e7c9", sw=2.5),
        ell(100, 100, 6, 4, "#f2e7c9", sw=2.5),
        ell(122, 98, 6, 4, "#f2e7c9", sw=2.5),
    ]


# ── 其他（甜品） ─────────────────────────────────────────────────
def mcflurry():
    """奥利奥麦旋风：透明杯 + 白色冰淇淋 + 奥利奥碎 + 红勺。"""
    oreo = []
    for x, y, r, rot in [(84, 78, 7, 12), (104, 70, 7, -18), (118, 84, 6, 24),
                         (92, 92, 6, -6), (110, 96, 6.5, 16), (76, 92, 5.5, 0)]:
        oreo.append(rr(x - r / 2, y - r / 2, r, r, 2.2, "#3a2a22", sw=2.4, rot=rot))
    return [
        # 勺
        rr(118, 30, 10, 62, 5, "#d42b23", sw=3.5, rot=12),
        # 杯身（半透明）
        cup(100, 88, 96, 172, 74, "#e7f1f6"),
        # 冰淇淋
        pth("M56 96 q-2 -34 28 -38 q10 -18 30 -8 q22 -8 32 12 q20 10 12 34 Z", "#fdfcf7", sw=4),
        pth("M100 48 q12 4 8 14 q-2 8 -12 6", "none", stroke="#e6ddc9", sw=3.4),
        *oreo,
        # 杯口
        ell(100, 92, 48, 11, "none", sw=4),
        # 杯身透出的白色
        pth("M62 100 q38 14 76 0 l-6 54 q-32 8 -64 0 Z", "#ffffff", sw=0),
        # 杯身标识
        pth("M66 130 q34 10 68 0", "none", stroke="#bcd7e6", sw=4),
    ]


def cone():
    """圆筒冰淇淋：华夫筒 + 螺旋奶油。"""
    return [
        # 筒
        pth("M72 104 L128 104 L104 176 Q100 180 96 176 Z", "#e0a85c"),
        *[line(x, 104, x + 6, 168, "#c98b3f", 2.6) for x in (80, 92, 104, 116)],
        *[line(74, y, 126, y, "#c98b3f", 2.6) for y in (118, 134, 150)],
        # 奶油
        ell(100, 104, 32, 13, "#fdfbf3", sw=4),
        ell(100, 88, 27, 16, "#fdfbf3", sw=4),
        ell(100, 70, 20, 14, "#fdfbf3", sw=4),
        pth("M100 54 q10 2 8 12 q-2 8 -12 8", "#fdfbf3", sw=4),
        # 筒口
        ell(100, 104, 30, 8, "none", sw=3.4),
    ]


def sundae():
    """朱古力新地：杯装香草冰淇淋 + 巧克力酱淋下来。"""
    return [
        cup(100, 92, 92, 172, 70, "#fdfbf6"),
        # 冰淇淋
        ell(100, 96, 44, 18, "#fdfbf6", sw=4),
        ell(100, 80, 34, 20, "#fdfbf6", sw=4),
        pth("M100 52 q12 4 10 14 q-2 9 -14 8", "#fdfbf6", sw=4),
        # 巧克力酱
        pth("M66 82 q4 -18 20 -22 q6 -12 20 -10 q14 -6 22 6 q16 4 14 20 "
           "q-4 10 -12 6 q-6 8 -14 2 q-8 8 -16 0 q-8 8 -16 2 q-8 4 -12 -4 Z", CHOC, sw=3.5),
        pth("M88 96 q0 20 -3 30 q-2 8 -8 6 q-4 -2 0 -10 q6 -12 5 -26 Z", CHOC, sw=3),
        # 杯口
        ell(100, 96, 44, 10, "none", sw=4),
        # 杯身高光
        line(62, 112, 66, 152, "#ffffff", 5),
        # 甜品杯红边
        pth("M58 118 L142 118", "none", stroke="#e5433a", sw=5),
    ]


ARTS = {
    # 主食
    "bigmac": bigmac,
    "mcspicy": mcspicy,
    "filet": filet,
    "doublecheese": doublecheese,
    "mchicken": mchicken,
    "fish": fish,
    "angus": angus,
    "wrap": wrap,
    "veggie": veggie,
    "chickenwrap": chickenwrap,
    # 小吃
    "fries": fries,
    "nuggets": nuggets,
    "wings": wings,
    "bigchicken": bigchicken,
    "corn": corn,
    "apple": apple,
    "pie": pie,
    "hashbrown": hashbrown,
    # 饮料
    "coke": coke,
    "cokezero": cokezero,
    "milk": milk,
    "americano": americano,
    "orange": orange,
    "soy": soy,
    # 甜品
    "mcflurry": mcflurry,
    "cone": cone,
    "sundae": sundae,
}


def build_svg(parts):
    body = "".join(parts)
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" '
        'width="200" height="200" role="img">'
        f"{body}</svg>"
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    seen = {}
    for fid, fn in ARTS.items():
        parts = fn()
        svg = build_svg([p for p in parts if p])
        digest = hash(svg)
        if digest in seen:
            raise SystemExit(f"插画重复：{fid} 与 {seen[digest]} 完全一致")
        seen[digest] = fid
        (OUT / f"{fid}.svg").write_text(svg, encoding="utf-8")
        print(f"  ✓ {fid}.svg  {len(svg) / 1024:.1f} KB")
    print(f"\n共生成 {len(ARTS)} 张专属插画 → {OUT}")


if __name__ == "__main__":
    main()
