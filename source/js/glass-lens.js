// Liquid glass 折射层（渐进增强，Chromium 内核：桌面与 Android 皆可）。
//
// 材质本身（表面色 / 模糊 / 轻微压暗 / 发丝光 / 投影）全在 CSS（default.css「Liquid glass」区），
// 这里只补原作最有辨识度的一层：边缘把背景「卷」进来的 lens。移植 Kyant AndroidLiquidGlass
// 的 lens 效果（对照 martin65536/liquid-glass-webgl 的 GLSL 版 RoundedRectRefraction）：
// 圆角矩形的有向距离场给出离边深度与梯度，贴边 refractionHeight 宽的一圈里，取样点沿梯度
// 向内偏移
//   offset = −circleMap(1 − 深度 / refractionHeight) · refractionAmount · grad，circleMap(x) = 1 − √(1 − x²)
// 最外沿偏满 refractionAmount、往里迅速回落，于是边缘映出的是更靠里的内容且方向翻折，
// 像厚玻璃的圆边。梯度按放大 1.5 倍的圆角半径计算（原作的 gradRadius），拐角处法线转得更缓；
// depthEffect 再把法线往径向拧，大面板的折射像一块中间微鼓的透镜。参数取自元素的 CSS 变量：
//   --glass-refraction  refractionHeight 的上限（按钮 12px、面板 24px），实际不超过短边的 1/4
//   --glass-depth       depthEffect（0 / 1）
//   --glass-lens-strength  设置页的折射强度倍率（挂在 <html> 上继承下来），同时缩放折射带与偏移；
//                          为 0 或 html[data-glass="off"] 时撤掉透镜
// refractionAmount 恒为 refractionHeight 的 2 倍（原作按钮 12 / 24dp、对话框 24 / 48dp）：
// 按钮的最外沿正好映出中线处的内容。
//
// 偏移按元素实际尺寸与圆角烘成位移贴图，装进同一棵树里的 <filter>（feImage → feDisplacementMap），
// 再以 --glass-lens: url(#id) 接在 backdrop-filter 链尾——与原作 effects 的顺序一致：
// 压暗 → blur → lens，折射的是已处理的背景；偏移只向内，不会读到 backdrop 范围之外的空白。
//
// 性能：贴图 ≤ 384px 采样、只在尺寸变化时经空闲回调重算（toBlob 异步编码，不阻塞输入）；
// 滤镜只跑在少数常驻元素上；随输入改变高度的命令面板标 live，尺寸一变下一帧重烘。
// backdrop-filter: url() 只有 Chromium 真正渲染（Safari / Firefox 能解析却不生效，
// CSS.supports 无法区分），所以按引擎判断（isChromium）。

const SVG_NS = "http://www.w3.org/2000/svg";
const MAX_TEXELS = 384;
/** refractionHeight 占短边的上限：取满时 refractionAmount = 半个短边，最外沿映出中线 */
const MAX_BAND_RATIO = 0.25;
/** 原作 gradRadius = min(radius × 1.5, 短半边) */
const GRAD_RADIUS_SCALE = 1.5;

const registry = new WeakMap();
/** 已挂透镜的元素，设置页改参数时逐个重算 */
const attached = new Set();
let sequence = 0;
let resizeObserver = null;
let enabled = null;
let flushHandle = 0;
const dirty = new Set();

export function isChromium() {
  if (typeof navigator === "undefined") return false;
  if (navigator.userAgentData) return true;
  // userAgentData 只在安全上下文（HTTPS / localhost）暴露：手机经局域网 http 访问开发服务器时
  // 没有它，退回 UA 判断。iOS 上的 Chrome / Edge（CriOS / EdgiOS）是 WebKit，不算
  const ua = navigator.userAgent || "";
  return /\b(?:Chrome|Chromium)\/\d+/.test(ua) && !/\b(?:CriOS|EdgiOS)\//.test(ua);
}

export function glassLensSupported() {
  if (enabled !== null) return enabled;
  enabled = false;
  if (typeof window === "undefined" || typeof CSS === "undefined" || typeof CSS.supports !== "function") return enabled;
  if (!isChromium() || typeof ResizeObserver !== "function") return enabled;
  if (!CSS.supports("backdrop-filter", "blur(1px) url(#gnix-lens)")) return enabled;
  const matches = (query) => window.matchMedia(query).matches;
  if (matches("(prefers-reduced-transparency: reduce)")) return enabled;
  // 手机同样开启（Android Chrome / Edge 等 Chromium 内核），只挡掉明显吃力的低端机
  if ((navigator.hardwareConcurrency || 8) < 4 || (navigator.deviceMemory && navigator.deviceMemory < 2)) return enabled;
  enabled = true;
  return enabled;
}

function readRadius(style, width, height) {
  const raw = style.borderTopLeftRadius || "0";
  const value = Number.parseFloat(raw) || 0;
  const radius = raw.trim().endsWith("%") ? (Math.min(width, height) * value) / 100 : value;
  return Math.min(radius, width / 2, height / 2);
}

function readNumber(style, name, fallback) {
  const value = Number.parseFloat(style.getPropertyValue(name));
  return Number.isFinite(value) ? value : fallback;
}

/** 圆角矩形的有向距离（内负外正），坐标以中心为原点 */
function sdRoundedRect(x, y, hx, hy, r) {
  const qx = Math.abs(x) - (hx - r);
  const qy = Math.abs(y) - (hy - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - r + Math.min(Math.max(qx, qy), 0);
}

/** 距离场的梯度（外法线），写进 out 免得逐像素分配 */
function gradSdRoundedRect(x, y, hx, hy, r, out) {
  const qx = Math.abs(x) - (hx - r);
  const qy = Math.abs(y) - (hy - r);
  if (qx >= 0 || qy >= 0) {
    const vx = Math.max(qx, 0);
    const vy = Math.max(qy, 0);
    const length = Math.hypot(vx, vy);
    out[0] = length > 1e-6 ? (Math.sign(x) * vx) / length : 0;
    out[1] = length > 1e-6 ? (Math.sign(y) * vy) / length : 0;
    return;
  }
  const alongX = qx >= qy ? 1 : 0;
  out[0] = Math.sign(x) * alongX;
  out[1] = Math.sign(y) * (1 - alongX);
}

/**
 * 位移贴图：R / G 通道编码 x / y 方向的取样偏移，128 为不偏移；scale 是配套的
 * feDisplacementMap 满量程（通道 0 / 255 对应 ∓scale / 2 像素）。
 */
export function buildLensMap(width, height, radius, { refraction = 10, amount: amountPx, depth = 0 } = {}) {
  const texelScale = Math.min(1, MAX_TEXELS / Math.max(width, height));
  const w = Math.max(2, Math.round(width * texelScale));
  const h = Math.max(2, Math.round(height * texelScale));
  const data = new Uint8ClampedArray(w * h * 4);
  const hx = width / 2;
  const hy = height / 2;
  const r = Math.max(0, Math.min(radius, hx, hy));
  const band = Math.max(0, Math.min(refraction, Math.min(width, height) * MAX_BAND_RATIO));
  // 偏移量随折射带被短边截短时按同一比例缩小，避免小按钮边缘撕裂
  const ratio = refraction > 0 ? band / refraction : 0;
  const amount = (amountPx ?? band * 1.5) * (amountPx === undefined ? 1 : ratio) || 1;
  const gradRadius = Math.min(r * GRAD_RADIUS_SCALE, hx, hy);
  const sx = width / w;
  const sy = height / h;
  const grad = [0, 0];

  for (let y = 0; y < h; y += 1) {
    const py = (y + 0.5) * sy - hy;
    for (let x = 0; x < w; x += 1) {
      const px = (x + 0.5) * sx - hx;
      let dx = 0;
      let dy = 0;
      const inset = -sdRoundedRect(px, py, hx, hy, r);
      if (band > 0 && inset < band) {
        const t = 1 - Math.max(inset, 0) / band;
        const distance = (1 - Math.sqrt(1 - t * t)) * amount;
        gradSdRoundedRect(px, py, hx, hy, gradRadius, grad);
        let nx = grad[0];
        let ny = grad[1];
        const radial = Math.hypot(px, py);
        if (depth > 0 && radial > 1e-6) {
          nx += (depth * px) / radial;
          ny += (depth * py) / radial;
        }
        const length = Math.hypot(nx, ny);
        if (length > 1e-6) {
          dx = (-distance * nx) / length;
          dy = (-distance * ny) / length;
        }
      }
      const offset = (y * w + x) * 4;
      data[offset] = 127.5 + (127.5 * dx) / amount;
      data[offset + 1] = 127.5 + (127.5 * dy) / amount;
      data[offset + 2] = 128;
      data[offset + 3] = 255;
    }
  }

  return { width: w, height: h, data, scale: amount * 2 };
}

function ensureDefs(root) {
  const host = root instanceof ShadowRoot ? root : document.body;
  let svg = host.querySelector(":scope > svg[data-gnix-lens-defs]");
  if (svg) return svg;
  svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("data-gnix-lens-defs", "");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
  host.appendChild(svg);
  return svg;
}

function createFilter(root, id) {
  const filter = document.createElementNS(SVG_NS, "filter");
  filter.setAttribute("id", id);
  filter.setAttribute("filterUnits", "userSpaceOnUse");
  filter.setAttribute("primitiveUnits", "userSpaceOnUse");
  filter.setAttribute("x", "0");
  filter.setAttribute("y", "0");
  // sRGB 插值：贴图的 128 才对应零位移
  filter.setAttribute("color-interpolation-filters", "sRGB");

  const image = document.createElementNS(SVG_NS, "feImage");
  image.setAttribute("x", "0");
  image.setAttribute("y", "0");
  image.setAttribute("preserveAspectRatio", "none");
  image.setAttribute("result", "map");

  const displacement = document.createElementNS(SVG_NS, "feDisplacementMap");
  displacement.setAttribute("in", "SourceGraphic");
  displacement.setAttribute("in2", "map");
  displacement.setAttribute("xChannelSelector", "R");
  displacement.setAttribute("yChannelSelector", "G");

  filter.append(image, displacement);
  ensureDefs(root).appendChild(filter);
  return { filter, image, displacement };
}

function encode(map) {
  const canvas = document.createElement("canvas");
  canvas.width = map.width;
  canvas.height = map.height;
  canvas.getContext("2d").putImageData(new ImageData(map.data, map.width, map.height), 0, 0);
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ? URL.createObjectURL(blob) : canvas.toDataURL("image/png")), "image/png"));
}

async function update(element) {
  const entry = registry.get(element);
  if (!entry) return;
  if (!element.isConnected) {
    release(element);
    return;
  }
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  if (!width || !height) return;

  const style = getComputedStyle(element);
  const strength = document.documentElement.dataset.glass === "off" ? 0 : Math.max(0, readNumber(style, "--glass-lens-strength", 1));
  if (!strength) {
    entry.key = "off";
    element.style.removeProperty("--glass-lens");
    return;
  }
  const radius = readRadius(style, width, height);
  const baseRefraction = readNumber(style, "--glass-refraction", 10);
  const refraction = baseRefraction * strength;
  const amount = readNumber(style, "--glass-refraction-amount", baseRefraction * 1.5) * strength;
  const depth = readNumber(style, "--glass-depth", 0);
  const key = `${width}x${height}:${radius.toFixed(1)}:${refraction}:${amount}:${depth}`;
  if (entry.key === key) return;
  entry.key = key;

  const map = buildLensMap(width, height, radius, { refraction, amount, depth });
  const url = await encode(map);
  if (registry.get(element) !== entry || entry.key !== key) {
    if (url.startsWith("blob:")) URL.revokeObjectURL(url);
    return;
  }

  if (!entry.parts) entry.parts = createFilter(entry.root, entry.id);
  const { filter, image, displacement } = entry.parts;
  for (const node of [filter, image]) {
    node.setAttribute("width", String(width));
    node.setAttribute("height", String(height));
  }
  image.setAttribute("href", url);
  displacement.setAttribute("scale", String(map.scale));
  if (entry.url?.startsWith("blob:")) URL.revokeObjectURL(entry.url);
  entry.url = url;
  element.style.setProperty("--glass-lens", `url(#${entry.id})`);
}

function flush() {
  flushHandle = 0;
  const targets = Array.from(dirty);
  dirty.clear();
  for (const element of targets) update(element);
}

function schedule(element) {
  // 高度随内容变化的面板（命令面板，data-glass-lens="live"）下一帧就重烘，旧贴图错位只有一两帧
  if (element.dataset.glassLens === "live") {
    requestAnimationFrame(() => update(element));
    return;
  }
  dirty.add(element);
  if (flushHandle) return;
  flushHandle = typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(flush, { timeout: 400 }) : window.setTimeout(flush, 120);
}

function release(element) {
  const entry = registry.get(element);
  if (!entry) return;
  registry.delete(element);
  attached.delete(element);
  dirty.delete(element);
  resizeObserver?.unobserve(element);
  element.style.removeProperty("--glass-lens");
  entry.parts?.filter.remove();
  if (entry.url?.startsWith("blob:")) URL.revokeObjectURL(entry.url);
}

export function attachGlassLens(element) {
  if (!glassLensSupported() || !(element instanceof Element) || registry.has(element)) return;
  const root = element.getRootNode();
  if (!(root instanceof ShadowRoot) && root !== document) return;
  if (!resizeObserver) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) schedule(entry.target);
    });
  }
  sequence += 1;
  registry.set(element, { root, id: `gnix-lens-${sequence}`, key: "", parts: null, url: "" });
  attached.add(element);
  resizeObserver.observe(element);
}

export function detachGlassLens(element) {
  release(element);
}

export function scanGlassLens(root = document) {
  if (!glassLensSupported()) return;
  root.querySelectorAll("[data-glass-lens]").forEach(attachGlassLens);
}

/**
 * 全站入口（main.js 空闲时调用）：扫描 light DOM 中的 [data-glass-lens]，并为 shadow DOM
 * 组件提供全局桥 window.gnixGlassLens——组件模块不 import 本文件（保持可在 vm 里单测），
 * 早于本模块渲染的组件把元素压进 window.__gnixGlassLensQueue，这里统一补挂。
 */
export function installGlassLens() {
  if (!glassLensSupported()) return false;
  scanGlassLens(document);
  window.gnixGlassLens = { attach: attachGlassLens, detach: detachGlassLens };
  const queue = window.__gnixGlassLensQueue;
  window.__gnixGlassLensQueue = { push: attachGlassLens };
  if (Array.isArray(queue)) queue.forEach(attachGlassLens);
  // 设置页开关玻璃或调折射强度（include/util/glass.js 派发）：按新参数重烘贴图
  window.addEventListener("gnix:glass-settings-change", () => {
    for (const element of attached) schedule(element);
  });
  return true;
}
