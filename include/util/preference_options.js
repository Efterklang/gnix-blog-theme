// 偏好控件的选项清单，偏好弹窗（preferences_popup.jsx）与设置页（preferences_page.jsx）共用。
// 取值与客户端 preferences.js 同源（article_font.js），文案键按 preferences.<组>_<取值> 的约定生成，
// 回退文案由取值标题化而来（Medium Small、Sans Serif…），只在语言包缺键时露出
const { FONT_OPTIONS, SIZE_OPTIONS, WEIGHT_OPTIONS, WIDTH_OPTIONS } = require("./article_font");

const THEME_MODE_VALUES = ["system", "light", "dark"];
// 弹窗里模式用图标表示：设备 / 太阳 / 月亮
const THEME_MODE_ICONS = { system: "monitor", light: "sun", dark: "moon" };

function titleCase(value) {
  return value
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function defineOptions(group, values, extend = () => ({})) {
  return Object.freeze(
    values.map((value) =>
      Object.freeze({
        value,
        key: `preferences.${group}_${value.replace(/-/g, "_")}`,
        fallback: titleCase(value),
        ...extend(value),
      }),
    ),
  );
}

module.exports = {
  THEME_MODE_OPTIONS: defineOptions("theme_mode", THEME_MODE_VALUES, (value) => ({ icon: THEME_MODE_ICONS[value] })),
  FONT_SIZE_OPTIONS: defineOptions("font_size", SIZE_OPTIONS),
  FONT_TYPE_OPTIONS: defineOptions("typeface", FONT_OPTIONS),
  FONT_WEIGHT_OPTIONS: defineOptions("weight", WEIGHT_OPTIONS),
  ARTICLE_WIDTH_OPTIONS: defineOptions("width", WIDTH_OPTIONS),
};
