#!/usr/bin/env node
/**
 * 数据自检：把「图文绑定」从人工检查变成 CI 可跑的断言。
 *
 *   node scripts/lint-data.mjs
 *
 * 检查项：
 *   1. 解析出的食品条数与 id 唯一性
 *   2. 每条都有 id / name / category / price / calories / imageUrl
 *   3. imageUrl 的文件名必须等于 id（/images/foods/<id>.svg）
 *   4. 全库 imageUrl 不重复（杜绝「所有汉堡共用一张图」）
 *   5. 图片文件真实存在、非空
 *   6. 反向检查：public/images/foods 下没有「无主」插画（说明数据漏了一条）
 * 任一项失败 → 退出码 1，可直接挂到 CI / pre-commit。
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA_FILE = join(ROOT, "src", "data", "foodDatabase.ts");
const ART_DIR = join(ROOT, "public", "images", "foods");
const CATEGORIES = new Set(["主食", "小吃", "饮料", "其他"]);

const problems = [];
const fail = (msg) => problems.push(msg);

const source = readFileSync(DATA_FILE, "utf8");
const body = source.slice(source.indexOf("export const foodDatabase"), source.indexOf("];", source.indexOf("export const foodDatabase")));

const blocks = body
  .split(/\n\s{2}\{\n/)
  .slice(1)
  .map((chunk) => chunk.split("\n  },")[0]);

const pick = (chunk, pattern) => chunk.match(pattern)?.[1]?.trim() ?? null;

const foods = blocks.map((chunk) => ({
  id: pick(chunk, /\bid:\s*"([^"]+)"/),
  name: pick(chunk, /\bname:\s*"([^"]+)"/),
  category: pick(chunk, /\bcategory:\s*"([^"]+)"/),
  price: pick(chunk, /\bprice:\s*([\d.]+)/),
  calories: pick(chunk, /\bcalories:\s*([\d.]+)/),
  artId: pick(chunk, /\bimageUrl:\s*ART\("([^"]*)"\)/),
}));

if (foods.length === 0) fail("没有解析到任何食品，检查 foodDatabase.ts 的格式");

const ids = new Set();
const arts = new Map();

for (const food of foods) {
  const label = food.name ?? food.id ?? "(未知记录)";

  if (!food.id) fail(`${label} 缺少 id`);
  if (!food.name) fail(`${food.id ?? label} 缺少 name`);
  if (!food.category) fail(`${label} 缺少 category`);
  else if (!CATEGORIES.has(food.category)) fail(`${label} 的 category「${food.category}」不在允许集合内`);
  if (!food.price || Number(food.price) <= 0) fail(`${label} 的 price 非法：${food.price}`);
  // 无糖饮料的热量可以合法为 0，这里只拦「缺失 / 非数字 / 负数」
  if (food.calories === null || !Number.isFinite(Number(food.calories)) || Number(food.calories) < 0) {
    fail(`${label} 的 calories 非法：${food.calories}`);
  }
  if (!food.artId) {
    fail(`${label} 的 imageUrl 不是 ART("<id>") 形式`);
    continue;
  }

  if (food.id && food.artId !== food.id) {
    fail(`${label}（${food.id}）的图片指向 ${food.artId}.svg，与 id 不一致`);
  }
  if (food.id && ids.has(food.id)) fail(`重复 id：${food.id}`);
  if (food.id) ids.add(food.id);

  const prev = arts.get(food.artId);
  if (prev) fail(`图片被共用：${prev} / ${label} → ${food.artId}.svg`);
  else arts.set(food.artId, label);

  const file = join(ART_DIR, `${food.artId}.svg`);
  if (!existsSync(file)) fail(`${label} 缺少插画文件 public/images/foods/${food.artId}.svg`);
  else if (statSync(file).size < 200) fail(`public/images/foods/${food.artId}.svg 内容过短，疑似占位`);
}

const onDisk = existsSync(ART_DIR)
  ? readdirSync(ART_DIR).filter((name) => name.endsWith(".svg"))
  : [];
for (const file of onDisk) {
  const id = file.replace(/\.svg$/, "");
  if (!ids.has(id)) fail(`插画 ${file} 没有对应的食品记录（数据漏了一条？）`);
}

const byCategory = foods.reduce((acc, food) => {
  acc[food.category] = (acc[food.category] ?? 0) + 1;
  return acc;
}, {});

if (problems.length > 0) {
  console.error(`✗ 数据自检失败，共 ${problems.length} 项：`);
  problems.forEach((msg) => console.error(`  - ${msg}`));
  process.exit(1);
}

console.log("✓ 数据自检通过");
console.log(`  食品 ${foods.length} 款 / 插画 ${arts.size} 张（一一对应，无共用）`);
console.log(
  "  分类：" + Object.entries(byCategory).map(([k, v]) => `${k} ${v}`).join(" · "),
);
