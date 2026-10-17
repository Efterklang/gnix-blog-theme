/**
 * Hershey 单线矢量字体（服务端）：把归档页季节标签的固定文案在构建期转成单线笔画 SVG，
 * 悬浮或点按时逐笔书写（动画见 source/css/archive.css 的 archive-label-write）。
 * 字体数据为 Dr. A. V. Hershey 1967 年的公共领域矢量字体，取自
 * https://github.com/kamalmostafa/hershey-fonts（permissive use and redistribution）：
 * 字母用 Cursive（cursive.jhf），数字用 Script Simplex（scripts.jhf，斜体笔势更手写）。
 * .jhf 格式：每行一个字形，按行序从 ASCII 32 起；前 5 字符为字形号（忽略）、
 * 接着 3 字符为坐标对数、再 2 字符为左右边界；坐标值 = 字符码 - 82，
 * " R"（空格 + R）为抬笔。y 向下为正，基线在 y = 9。
 * @module util/hershey
 */
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { createElement } = require("inferno-create-element");

// 纵向范围对所有标签固定（放大后的字母顶 -17.25 到降部 +24，各留余量），
// 保证不同文案按同一比例缩放、各组字号一致；横向按各自笔画包围盒收紧
const VIEW_TOP = -17.5;
const VIEW_HEIGHT = 42;
const PAD_X = 2;
// 字体基线（y 向下为正；大写字高 21 单位、x 高 10 单位）
const BASELINE = 9;
// 手写字母相对数字的放大倍数：Cursive 的数字满字高、字母只有 x-height，
// 同比例下字母显小，放大后与数字同一笔势（数字与斜杠保持原尺寸）
const LETTER_SCALE = 1.25;

let fonts = null;

// 数字（0-9）取自 Script Simplex：Cursive 的数字偏几何，小字号下会被读成印刷体，
// scripts 的斜体数字与手写字母同一笔势；两字体纵向范围一致（基线 y=9、字高 21）
function parseFont(file) {
  const glyphs = new Map();
  const lines = readFileSync(join(__dirname, "hershey", file), "utf8").split(/\r?\n/);
  let index = 0;
  for (const line of lines) {
    if (line.length < 10) continue;
    const code = 32 + index;
    index += 1;
    const vertices = Number.parseInt(line.slice(5, 8), 10);
    if (!Number.isFinite(vertices) || vertices * 2 !== line.length - 8) continue;
    const strokes = [];
    let stroke = [];
    for (let p = 0; p < vertices - 1; p += 1) {
      const pair = line.slice(10 + p * 2, 12 + p * 2);
      if (pair === " R") {
        if (stroke.length) strokes.push(stroke);
        stroke = [];
      } else {
        stroke.push([line.charCodeAt(10 + p * 2) - 82, line.charCodeAt(11 + p * 2) - 82]);
      }
    }
    if (stroke.length) strokes.push(stroke);
    glyphs.set(code, { left: line.charCodeAt(8) - 82, advance: line.charCodeAt(9) - line.charCodeAt(8), strokes });
  }
  return glyphs;
}

function loadFonts() {
  fonts ??= { cursive: parseFont("cursive.jhf"), scripts: parseFont("scripts.jhf") };
  return fonts;
}

/** 把一行文案转成单线笔画 <svg>；含无法映射的字符时返回 null（调用侧回退为普通文字） */
function StrokeLabel({ text, className = "archive-label__strokes" }) {
  const loaded = loadFonts();
  const strokes = [];
  let x = 0;
  for (const char of text) {
    let code = char.codePointAt(0);
    if (code === 0x2019) code = 39; // ’ → Hershey 撇号
    const isDigit = code >= 48 && code <= 57;
    const glyph = (isDigit ? loaded.scripts : loaded.cursive).get(code);
    if (!glyph) return null;
    // 数字与斜杠保持原尺寸，其余字符（手写字母、撇号、空格）绕基线放大
    const scale = isDigit || code === 47 ? 1 : LETTER_SCALE;
    const origin = x - glyph.left * scale;
    for (const stroke of glyph.strokes) strokes.push(stroke.map(([sx, sy]) => [origin + sx * scale, BASELINE + (sy - BASELINE) * scale]));
    x += glyph.advance * scale;
  }
  if (!strokes.length) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  for (const stroke of strokes) {
    for (const [px] of stroke) {
      if (px < minX) minX = px;
      if (px > maxX) maxX = px;
    }
  }
  const round = (n) => Math.round(n * 10) / 10;
  const viewBox = `${round(minX - PAD_X)} ${VIEW_TOP} ${round(maxX - minX + PAD_X * 2)} ${VIEW_HEIGHT}`;
  const stagger = Math.max(18, Math.min(32, Math.round(950 / strokes.length)));

  return createElement(
    "svg",
    { class: className, viewBox, style: `--stagger:${stagger}ms`, role: "img", "aria-label": text, focusable: "false" },
    strokes.map((stroke, index) =>
      createElement("path", {
        key: index,
        class: "archive-label__stroke",
        style: `--i:${index}`,
        pathLength: 1,
        d: `M${stroke.map(([px, py]) => `${round(px)} ${round(py)}`).join(" L")}`,
      }),
    ),
  );
}

module.exports = { StrokeLabel };
