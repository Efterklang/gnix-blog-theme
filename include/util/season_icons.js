/**
 * 季节涂鸦图标（服务端）：归档分组标题里跟在手写标签后面的小图标。
 * 单线笔画风格与 Hershey 标签一致，线条坐标手调；描边、书写与摇曳动画
 * 统一在 source/css/archive.css 的 .archive-label__icon 下。
 * @module util/season_icons
 */
const { createElement } = require("inferno-create-element");

// viewBox 24×24：春=萌发的小草，夏=浪与冲浪板，秋=落叶，冬=雪人
const SEASONS = {
  spring: [
    "M4 20.6 Q12 18.6 20 20.6",
    "M10.8 19.3 C10.1 15.9 8.7 13.1 6.6 10.7",
    "M12 19.3 C12.4 14.6 12.3 10.4 12.1 7.3",
    "M13.2 19.3 C13.9 15.5 15.3 12.9 17.4 10.5",
  ],
  summer: [
    "M2.5 19.5 C3.6 14.2 7.2 9.8 12 8.8 C16.3 7.9 19.8 9.6 20.4 12.4 C20.8 14.6 19.4 16.2 17.6 16 C16.3 15.8 15.5 14.7 16 13.5 C16.4 12.6 17.4 12.2 18.2 12.6",
    "M7.2 18.9 C9.4 17.5 12.2 17.1 14.6 17.8 C12.4 18.9 9.7 19.3 7.2 18.9 Z",
  ],
  autumn: [
    "M9 4.5 C7.2 8.6 7.2 13 9.6 16 C11.4 18.2 14.4 18.6 16.6 16.8 C19 14.8 18.8 10.6 16 7.4 C14 5.2 11.2 4.2 9 4.5 Z",
    "M9.6 5.6 C12 8.4 14.4 12.2 15.8 16",
    "M15.8 16 C16.4 17.6 16.6 19 16.4 20.4",
  ],
  winter: [
    "M12 12.5 C9.3 12.5 7.1 14.7 7.1 17.4 C7.1 20.1 9.3 22.3 12 22.3 C14.7 22.3 16.9 20.1 16.9 17.4 C16.9 14.7 14.7 12.5 12 12.5 Z",
    "M12 5.7 C10.2 5.7 8.7 7.2 8.7 9 C8.7 10.8 10.2 12.3 12 12.3 C13.8 12.3 15.3 10.8 15.3 9 C15.3 7.2 13.8 5.7 12 5.7 Z",
    "M7.5 16 L3.7 14",
    "M16.5 16 L20.3 14",
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
