/**
 * 季节涂鸦图标（服务端）：归档分组标题里跟在手写标签后面的小图标。
 * 单线笔画风格与 Hershey 标签一致，线条坐标手调；描边、书写与摇曳动画
 * 统一在 source/css/archive.css 的 .archive-label__icon 下。
 * @module util/season_icons
 */
const { createElement } = require("inferno-create-element");

// viewBox 24×24：春=萌发的小草，夏=带吸管的饮料，秋=落叶，冬=雪花
const SEASONS = {
  spring: [
    "M4 20.6 Q12 18.6 20 20.6",
    "M10.8 19.3 C10.1 15.9 8.7 13.1 6.6 10.7",
    "M12 19.3 C12.4 14.6 12.3 10.4 12.1 7.3",
    "M13.2 19.3 C13.9 15.5 15.3 12.9 17.4 10.5",
  ],
  summer: [
    "M8 9.6 L9.8 21.1 C9.9 21.7 10.3 22 10.9 22 L13.1 22 C13.7 22 14.1 21.7 14.2 21.1 L16 9.6",
    "M7.2 9.6 L16.8 9.6",
    "M8.8 12.4 L15.2 12.4",
    "M13.4 13 L15.7 3.8",
  ],
  autumn: [
    "M8.5 4 C6.6 8 6.8 12.6 9.4 15.6 C11.4 17.9 14.6 18.3 16.7 16.4 C18.9 14.4 18.6 10.2 15.9 7.2 C13.9 5 11 3.9 8.5 4 Z",
    "M8.9 5.2 C11.5 8 14 11.8 15.4 15.8",
    "M11.6 8.6 C10.5 8 9.4 7.7 8.3 7.6",
    "M12.6 10.6 C13.8 10.2 15 10.2 16.1 10.6",
    "M15.4 15.8 C16 17.4 16.2 18.8 16 20.2",
  ],
  winter: [
    "M12 3.4 L12 20.6",
    "M4.5 7.7 L19.5 16.3",
    "M19.5 7.7 L4.5 16.3",
    "M10.9 4.9 L12 6.1 L13.1 4.9",
    "M10.9 19.1 L12 17.9 L13.1 19.1",
    "M17.1 8.7 L15.9 10 L17.5 10.2",
    "M6.9 8.7 L8.1 10 L6.5 10.2",
    "M17.1 15.3 L15.9 14 L17.5 13.8",
    "M6.9 15.3 L8.1 14 L6.5 13.8",
  ],
};

/** 按分组标记（spring/summer/autumn/winter）返回涂鸦图标；其余（如年份页的 all）返回 null */
function SeasonIcon({ season }) {
  const paths = SEASONS[season];
  if (!paths) return null;
  return createElement(
    "svg",
    { class: "archive-label__icon", viewBox: "0 0 24 24", "aria-hidden": "true", focusable: "false" },
    paths.map((d, index) => createElement("path", { key: index, style: `--i:${index}`, pathLength: 1, d })),
  );
}

module.exports = { SeasonIcon };
