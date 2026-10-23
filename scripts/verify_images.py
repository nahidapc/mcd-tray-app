# -*- coding: utf-8 -*-
"""校验渲染后的 DOM：每个 img 的 alt 与该食品的 imageUrl 是否严格对应。"""
import collections
import pathlib
import sys
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
dom = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
ts = (ROOT / "src" / "data" / "foodDatabase.ts").read_text(encoding="utf-8")

rows = re.findall(r'id:\s*"(\w+)",\s*name:\s*"([^"]+)"', ts)
name2id = {name: fid for fid, name in rows}
print(f"数据源解析：{len(rows)} 条")

imgs = re.findall(r"<img[^>]*>", dom)
pairs = []
for tag in imgs:
    src = re.search(r'src="([^"]+)"', tag)
    alt = re.search(r'alt="([^"]*)"', tag)
    pairs.append((src.group(1) if src else "", alt.group(1) if alt else ""))

print(f"页面 img 数：{len(imgs)}；不同图片：{len({s for s, _ in pairs})}")
bad = []
unknown = []
for src, alt in pairs:
    fid = name2id.get(alt)
    if fid is None:
        unknown.append(alt)
    elif not src.endswith(f"/{fid}.svg"):
        bad.append((alt, src))
print("图文不符：", bad or "无")
print("名字不在库中：", unknown or "无")
counts = collections.Counter(s for s, _ in pairs)
print("同一图片被多款食品使用：",
      {s: c for s, c in counts.items() if c > 1 and len({a for ss, a in pairs if ss == s}) > 1} or "无")
print("出现降级色块：", "是" if "data-image-fallback" in dom else "否")
print("缺 alt 的图：", [s for s, a in pairs if not a] or "无")
