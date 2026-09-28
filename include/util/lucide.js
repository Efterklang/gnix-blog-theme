/**
 * lucide 图标（服务端）：按名称从 lucide 包取图标节点，渲染期直接输出内联 SVG。
 * 客户端脚本里的图标同样 import 自 lucide 包，生成时由 include/hexo/bundle.js 打包进脚本
 * @module util/lucide
 */
const { createElement } = require("inferno-create-element");

// lucide 的默认属性；线宽取 1.75，与主题其余图标一致
const SVG_ATTRIBUTES = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  "aria-hidden": "true",
  focusable: "false",
};

// 整包有上千个图标，首次用到时才加载
let icons = null;

// 名称与 lucide.dev 一致（kebab-case）：chevron-right → icons.ChevronRight
function getIconNode(name) {
  icons ??= require("lucide").icons;
  const node = icons[name.replace(/(?:^|-)(\w)/g, (_, char) => char.toUpperCase())];
  if (!node) throw new Error(`[gnix] Unknown lucide icon: ${name}`);
  return node;
}

/** <Icon name="search" size={18} />：其余属性原样落到 <svg> 上 */
function Icon({ name, size = 16, strokeWidth = 1.75, ...attributes }) {
  return createElement(
    "svg",
    { ...SVG_ATTRIBUTES, width: size, height: size, "stroke-width": strokeWidth, ...attributes },
    getIconNode(name).map(([tag, attrs]) => createElement(tag, attrs)),
  );
}

module.exports = { Icon };
