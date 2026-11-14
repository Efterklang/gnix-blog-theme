const { Component } = require("../../include/util/common");
const { Icon } = require("../../include/util/lucide");
const { getLanguageOptions } = require("../../include/util/i18n");
const { THEME_MODE_OPTIONS, FONT_TYPE_OPTIONS } = require("../../include/util/preference_options");

function translate(helper, key, fallback) {
  const value = helper.__(key);
  return value === key ? fallback : value;
}

// 快捷弹窗只留最常动的设置（主题模式、字体、字号、语言）与一条去设置页的链接；栏宽、配色在设置页。
// 每行一条分段条（.segmented，样式在 default.css，与设置页共用）；preferences.js 按 data-* 钩子找控件，缺哪个都不报错
module.exports = class extends Component {
  render() {
    const { config, helper, page } = this.props;
    const title = translate(helper, "preferences.title", "Preferences");
    const langKey = helper.language_key(page);
    const settingsUrl = helper.localized_url_for("/preferences/", langKey);
    const languageOptions = getLanguageOptions(page, config, helper);
    const unavailableLabel = translate(helper, "preferences.language_unavailable", "Not translated");
    const stepLabels = {
      "-1": translate(helper, "preferences.decrease_font_size", "Decrease font size"),
      1: translate(helper, "preferences.increase_font_size", "Increase font size"),
    };

    const rows = [
      [
        "Theme",
        THEME_MODE_OPTIONS.map(({ value, key, fallback, icon }) => {
          const label = translate(helper, key, fallback);
          return (
            <button type="button" class="segmented__cell" data-theme-mode={value} aria-pressed="false" title={label} aria-label={label}>
              <Icon name={icon} size={16} />
            </button>
          );
        }),
      ],
      [
        "Type",
        FONT_TYPE_OPTIONS.map(({ value, key, fallback }) => {
          const label = translate(helper, key, fallback);
          return (
            <button type="button" class="segmented__cell font-type-btn" data-font={value} aria-pressed="false" title={label} aria-label={label}>
              <span class="font-type-preview">Aa</span>
            </button>
          );
        }),
      ],
      [
        "Size",
        [
          ["-1", "minus"],
          ["1", "plus"],
        ].map(([dir, icon]) => (
          <button type="button" class="segmented__cell" data-article-step="size" data-step-dir={dir} title={stepLabels[dir]} aria-label={stepLabels[dir]}>
            <Icon name={icon} size={16} />
          </button>
        )),
      ],
    ];
    if (languageOptions) {
      rows.push([
        "Lang",
        languageOptions.map((item) => (
          <button
            type="button"
            class={`segmented__cell segmented__cell--text${item.current ? " is-active" : ""}`}
            data-language-option={item.current || !item.url ? "" : item.url}
            aria-pressed={String(Boolean(item.current))}
            disabled={!item.current && !item.available}
            title={item.available ? item.label : `${item.label} · ${unavailableLabel}`}
            aria-label={item.label}
            lang={item.locale}
          >
            {String(item.key || item.locale || "")
              .split("-")[0]
              .toUpperCase()}
          </button>
        )),
      ]);
    }

    return (
      <div id="preference-popup" class="preference-popup popup-card" popover="auto" role="dialog" aria-label={title}>
        <div class="preference-quick" data-preferences-page data-preference-surface="quick">
          {rows.map(([label, controls]) => (
            <div class="preference-quick__row">
              <span class="preference-quick__label">{label}</span>
              <div class="segmented">{controls}</div>
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
