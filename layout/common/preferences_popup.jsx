const { Component } = require("../../include/util/common");
const { Icon } = require("../../include/util/lucide");
const { getLanguageOptions } = require("../../include/util/i18n");

function translate(helper, key, fallback) {
  const value = helper.__(key);
  return value === key ? fallback : value;
}

// [值, 名称回退, 图标]；模式用设备 / 太阳 / 月亮区分，一次点击即切换
const THEME_MODE_OPTIONS = [
  ["system", "System", "monitor"],
  ["light", "Light", "sun"],
  ["dark", "Dark", "moon"],
];

const FONT_TYPE_OPTIONS = [
  ["sans-serif", "preferences.typeface_sans_serif", "Sans Serif"],
  ["serif", "preferences.typeface_serif", "Serif"],
  ["mono", "preferences.typeface_mono", "Monospace"],
  ["handwriting", "preferences.typeface_handwriting", "Handwriting"],
];

// 快捷弹窗只留最常动的设置（主题模式、字体、字号、语言）与一条去设置页的链接；
// 栏宽、间距、配色在设置页。preferences.js 按 data-* 钩子找控件，缺哪个都不报错
module.exports = class extends Component {
  render() {
    const { config, helper, page } = this.props;
    const title = translate(helper, "preferences.title", "Preferences");
    const langKey = helper.language_key(page);
    const settingsUrl = helper.localized_url_for("/preferences/", langKey);
    const languageOptions = getLanguageOptions(page, config, helper);
    const unavailableLabel = translate(helper, "preferences.language_unavailable", "Not translated");

    const rows = [
      [
        "Theme",
        THEME_MODE_OPTIONS.map(([value, fallback, icon]) => {
          const label = translate(helper, `preferences.theme_mode_${value}`, fallback);
          return (
            <button type="button" class="preference-quick__option" data-theme-mode={value} aria-pressed="false" title={label} aria-label={label}>
              <Icon name={icon} size={16} />
            </button>
          );
        }),
      ],
      [
        "Type",
        FONT_TYPE_OPTIONS.map(([value, key, fallback]) => {
          const label = translate(helper, key, fallback);
          return (
            <button type="button" class="preference-quick__option font-type-btn" data-font={value} aria-pressed="false" title={label} aria-label={label}>
              <span class="preference-quick__font-preview">Aa</span>
            </button>
          );
        }),
      ],
      [
        "Size",
        [
          <button type="button" class="preference-quick__option" data-article-step="size" data-step-dir="-1" title={translate(helper, "preferences.decrease_font_size", "Decrease font size")} aria-label={translate(helper, "preferences.decrease_font_size", "Decrease font size")}>
            <Icon name="minus" size={16} />
          </button>,
          <button type="button" class="preference-quick__option" data-article-step="size" data-step-dir="1" title={translate(helper, "preferences.increase_font_size", "Increase font size")} aria-label={translate(helper, "preferences.increase_font_size", "Increase font size")}>
            <Icon name="plus" size={16} />
          </button>,
        ],
      ],
    ];
    if (languageOptions) {
      rows.push([
        "Lang",
        languageOptions.map((item) => (
          <button
            type="button"
            class={`preference-quick__option preference-quick__option--text${item.current ? " is-active" : ""}`}
            data-language-option={item.current || !item.url ? "" : item.url}
            aria-pressed={String(Boolean(item.current))}
            disabled={!item.current && !item.available}
            title={item.available ? item.label : `${item.label} · ${unavailableLabel}`}
            aria-label={item.label}
            lang={item.locale}
          >
            {String(item.key || item.locale || "").split("-")[0].toUpperCase()}
          </button>
        )),
      ]);
    }

    return (
      <div id="preference-popup" class="preference-popup" popover="auto" role="dialog" aria-label={title}>
        <div class="preference-quick surface" data-preferences-page data-preference-surface="quick">
          {rows.map(([label, controls]) => (
            <div class="preference-quick__row">
              <span class="preference-quick__label">{label}</span>
              <div class="preference-quick__group">{controls}</div>
            </div>
          ))}
          <a class="preference-quick__link" href={settingsUrl}>
            All settings
            <Icon name="arrow-up-right" size={12} />
          </a>
        </div>
      </div>
    );
  }
};
