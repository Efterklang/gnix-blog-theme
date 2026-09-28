/**
 * Liquid glass 的按压反馈——移植 Kyant AndroidLiquidGlass 的 InteractiveHighlight 与 LiquidButton
 * 的 layerBlock（对照 martin65536/liquid-glass-webgl 的 WebGL 版）。全站只有一个委托监听：
 * .glass-button 与 [data-glass-press] 都归它管，shadow DOM 里的按钮经 composedPath 一并接管。
 *
 * - 按压进度：欠阻尼弹簧 spring(dampingRatio = 0.5, stiffness = 300) 奔向 1、松手回 0，两头都有
 *   约 16% 的过冲，玻璃按下胀起、松开回落时都像水滴一样荡一下
 * - 缩放：1 + 4px / 高度 × 进度，按下时整体胀大约 4px
 * - 拖动：位移 = 短边 · tanh(0.05 · 偏移 / 短边)，越拉越沉；同时沿拖动方向拉伸，
 *   宽扁的形状横向拉得少、纵向拉得多
 * - 光：铺满 8% 的白，指尖处再亮起一团 15% 的径向光（半径 1.5 × 短边，smoothstep 衰减），
 *   两层都是 Plus 混合；光点跟手，松手随弹簧回到按下的位置
 *
 * 结果只以 CSS 变量交给样式：--glass-press-translate / --glass-press-scale 喂给 translate /
 * scale 属性，--glass-press-layer 是按压层（::before）的背景；从按下到回弹结束，元素带
 * data-glass-pressed，静止后变量与属性一并移除。
 */

const SELECTOR = ".glass-button, [data-glass-press]";
const DAMPING_RATIO = 0.5;
const STIFFNESS = 300;
const OMEGA = Math.sqrt(STIFFNESS);
const DECAY = DAMPING_RATIO * OMEGA;
const OMEGA_D = OMEGA * Math.sqrt(1 - DAMPING_RATIO * DAMPING_RATIO);
/** 按下时胀大的像素数（原作 4dp） */
const GROWTH = 4;
/** 拖动跟手的初始斜率（原作 initialDerivative） */
const DRAG_SLOPE = 0.05;
/** 径向光 smoothstep(r, r / 2, d) 在 5/8、3/4、7/8 r 处的取值，渐变按这几档插值 */
const GLOW_FALLOFF = [
  [0.84375, "62.5%"],
  [0.5, "75%"],
  [0.15625, "87.5%"],
];

const pressed = new Map();
let installed = false;
let frame = 0;
let lastTime = 0;

function createSpring(value, threshold) {
  return { value, target: value, velocity: 0, threshold };
}

function snap(spring, value) {
  spring.value = value;
  spring.target = value;
  spring.velocity = 0;
}

/**
 * 按解析解推进一步（与原作 spring.ts 的 springStep1D 同式，任意帧间隔都精确）；
 * 振荡包络——位移与速度折算出的振幅——低于阈值即落定，返回是否仍在运动
 */
function advance(spring, dt) {
  const x0 = spring.value - spring.target;
  const b0 = (spring.velocity + DECAY * x0) / OMEGA_D;
  if (Math.hypot(x0, b0) < spring.threshold) {
    snap(spring, spring.target);
    return false;
  }
  const decay = Math.exp(-DECAY * dt);
  const cos = Math.cos(OMEGA_D * dt);
  const sin = Math.sin(OMEGA_D * dt);
  spring.value = spring.target + decay * (x0 * cos + b0 * sin);
  spring.velocity = decay * ((b0 * OMEGA_D - DECAY * x0) * cos - (x0 * OMEGA_D + DECAY * b0) * sin);
  return true;
}

const white = (alpha) => `rgb(255 255 255 / ${Math.max(0, alpha).toFixed(4)})`;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function render(element, state) {
  const { width, height } = state;
  const progress = state.press.value;
  const minSide = Math.min(width, height);
  const maxSide = Math.max(width, height);
  const offsetX = state.x.value - state.originX;
  const offsetY = state.y.value - state.originY;

  const scale = 1 + (GROWTH / height) * progress;
  const stretch = GROWTH / height;
  const angle = Math.atan2(offsetY, offsetX);
  const scaleX = scale + stretch * Math.abs((Math.cos(angle) * offsetX) / maxSide) * Math.min(width / height, 1);
  const scaleY = scale + stretch * Math.abs((Math.sin(angle) * offsetY) / maxSide) * Math.min(height / width, 1);
  state.translateX = minSide * Math.tanh((DRAG_SLOPE * offsetX) / minSide);
  state.translateY = minSide * Math.tanh((DRAG_SLOPE * offsetY) / minSide);

  const glow = 0.15 * progress;
  const stops = GLOW_FALLOFF.map(([ratio, at]) => `${white(glow * ratio)} ${at}`).join(", ");
  const x = clamp(state.x.value, 0, width).toFixed(1);
  const y = clamp(state.y.value, 0, height).toFixed(1);

  const style = element.style;
  style.setProperty("--glass-press-translate", `${state.translateX.toFixed(2)}px ${state.translateY.toFixed(2)}px`);
  style.setProperty("--glass-press-scale", `${scaleX.toFixed(4)} ${scaleY.toFixed(4)}`);
  style.setProperty("--glass-press-layer", `radial-gradient(circle ${(minSide * 1.5).toFixed(1)}px at ${x}px ${y}px, ${white(glow)} 50%, ${stops}, ${white(0)}), ${white(0.08 * progress)}`);
}

function settle(element) {
  pressed.delete(element);
  element.removeAttribute("data-glass-pressed");
  for (const name of ["--glass-press-translate", "--glass-press-scale", "--glass-press-layer"]) element.style.removeProperty(name);
}

function tick(now) {
  frame = 0;
  const dt = clamp((now - lastTime) / 1000, 0, 0.05);
  lastTime = now;
  let running = false;
  for (const [element, state] of pressed) {
    // 三个弹簧都要推进，不能短路
    const moving = [state.press, state.x, state.y].map((spring) => advance(spring, dt)).includes(true);
    if (!element.isConnected || (!moving && state.pointerId === null)) {
      settle(element);
      continue;
    }
    render(element, state);
    running ||= moving;
  }
  if (running) frame = requestAnimationFrame(tick);
  if (!Array.from(pressed.values()).some((state) => state.pointerId !== null)) unlisten();
}

/** 静止状态下（按下、拖动、松手）起一帧；已在逐帧推进时什么也不做 */
function requestFrame() {
  if (frame || !pressed.size) return;
  lastTime = performance.now();
  frame = requestAnimationFrame(tick);
}

function findTarget(event) {
  for (const node of event.composedPath()) {
    if (node instanceof Element && node.matches(SELECTOR)) return node;
  }
  return null;
}

function handlePointerDown(event) {
  if (event.button !== 0) return;
  // 设置页关掉按压反馈或整个玻璃时（include/util/glass.js 写到 <html>），退回 CSS 的 :active 反馈
  const { glass, glassPressEffect } = document.documentElement.dataset;
  if (glass === "off" || glassPressEffect === "off") return;
  const element = findTarget(event);
  if (!element || element.matches(":disabled, [aria-disabled='true']")) return;
  const width = element.offsetWidth;
  const height = element.offsetHeight;
  if (!width || !height) return;

  // 以未变换的布局盒为参照：缩放绕中心进行，中心只随拖动位移平移
  let state = pressed.get(element);
  const rect = element.getBoundingClientRect();
  const left = rect.left + rect.width / 2 - (state?.translateX || 0) - width / 2;
  const top = rect.top + rect.height / 2 - (state?.translateY || 0) - height / 2;
  const x = event.clientX - left;
  const y = event.clientY - top;
  if (!state) {
    state = { press: createSpring(0, 0.001), x: createSpring(x, 0.5), y: createSpring(y, 0.5), translateX: 0, translateY: 0 };
    pressed.set(element, state);
    element.setAttribute("data-glass-pressed", "");
  }
  Object.assign(state, { width, height, left, top, originX: x, originY: y, pointerId: event.pointerId });
  snap(state.x, x);
  snap(state.y, y);
  state.press.target = 1;
  listen();
  requestFrame();
}

function handlePointerMove(event) {
  for (const state of pressed.values()) {
    if (state.pointerId !== event.pointerId) continue;
    snap(state.x, event.clientX - state.left);
    snap(state.y, event.clientY - state.top);
    requestFrame();
  }
}

function releasePointer(pointerId) {
  for (const state of pressed.values()) {
    if (pointerId !== null && state.pointerId !== pointerId) continue;
    state.pointerId = null;
    state.press.target = 0;
    state.x.target = state.originX;
    state.y.target = state.originY;
  }
  requestFrame();
}

const handlePointerUp = (event) => releasePointer(event.pointerId);
const handleBlur = () => releasePointer(null);

function listen() {
  window.addEventListener("pointermove", handlePointerMove, { passive: true });
  window.addEventListener("pointerup", handlePointerUp, { passive: true });
  window.addEventListener("pointercancel", handlePointerUp, { passive: true });
  window.addEventListener("blur", handleBlur);
}

function unlisten() {
  window.removeEventListener("pointermove", handlePointerMove);
  window.removeEventListener("pointerup", handlePointerUp);
  window.removeEventListener("pointercancel", handlePointerUp);
  window.removeEventListener("blur", handleBlur);
}

/** 全站入口（main.js 启动时调用）：捕获阶段委托，按钮自己的 pointer 监听照常收到事件 */
export function installGlassPress() {
  if (installed || typeof PointerEvent !== "function") return;
  installed = true;
  document.addEventListener("pointerdown", handlePointerDown, { capture: true, passive: true });
}
