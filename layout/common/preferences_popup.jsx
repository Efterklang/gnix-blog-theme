const { Component } = require("../../include/util/common");
const { Icon } = require("../../include/util/lucide");
const { DEFAULT_PREFERENCES, THEME_OPTIONS } = require("../../include/util/theme");
const { DEFAULT_SETTINGS: GLASS_DEFAULTS } = require("../../include/util/glass");
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

// 三个调节器统一用减号 / 加号，不再各配一套语义图标；栏宽只作用于正文栏，
// 手机端正文已是满栏，标记出来交给 CSS 在小屏隐藏
function renderStepper(label, control, decreaseLabel, increaseLabel) {
  return (
    <div
      class="preference-quick__tile preference-quick__tile--wide preference-quick__stepper glass"
      role="group"
      aria-label={label}
      data-glass-lens
      data-quick-hide-mobile={control === "width" ? "" : null}
    >
      <span class="preference-quick__step-label">{label}</span>
      <div class="preference-quick__step-controls">
        <button type="button" class="preference-quick__step-btn" data-article-step={control} data-step-dir="-1" title={decreaseLabel} aria-label={decreaseLabel}>
          <Icon name="minus" size={18} />
        </button>
        <button type="button" class="preference-quick__step-btn" data-article-step={control} data-step-dir="1" title={increaseLabel} aria-label={increaseLabel}>
          <Icon name="plus" size={18} />
        </button>
      </div>
    </div>
  );
}

module.exports = class extends Component {
  render() {
    const { config, helper, page } = this.props;
    const title = translate(helper, "preferences.title", "Preferences");
    const langKey = helper.language_key(page);
    const settingsUrl = helper.localized_url_for("/preferences/", langKey);
    const languageOptions = getLanguageOptions(page, config, helper);

    const modeLabel = translate(helper, "preferences.theme_mode", "Mode");
    // 快捷面板一行里放不下「配色方案」加取值，用短标签
    const paletteLabel = translate(helper, "preferences.palette_short", "Palette");
    const typefaceLabel = translate(helper, "preferences.typeface", "Typeface");
    const languageLabel = translate(helper, "preferences.language", "Language");
    const unavailableLabel = translate(helper, "preferences.language_unavailable", "Not translated");
    const glassLabel = translate(helper, "preferences.glass_enabled", "Liquid Glass");
    const settingsLabel = translate(helper, "preferences.open_settings", "Settings");
    const lightThemes = THEME_OPTIONS.filter((theme) => theme.colorScheme === "light");
    const darkThemes = THEME_OPTIONS.filter((theme) => theme.colorScheme === "night");

    return (
      <div id="preference-popup" class="preference-popup" popover="auto" role="dialog" aria-labelledby="preference-quick-title">
        <div class="preference-quick" data-preferences-page data-preference-surface="quick">
          <span id="preference-quick-title" class="preference-quick__title">{title}</span>

          <div class="preference-quick__grid">
            {/* 主题：三个模式只留图标，一格一点 */}
            <div class="preference-quick__tile preference-quick__tile--wide preference-quick__modes glass" role="group" aria-label={modeLabel} data-glass-lens>
              {THEME_MODE_OPTIONS.map(([value, fallback, icon]) => {
                const label = translate(helper, `preferences.theme_mode_${value}`, fallback);
                return (
                  <button type="button" class="preference-quick__option" data-theme-mode={value} aria-pressed="false" title={label} aria-label={label}>
                    <Icon name={icon} size={18} />
                  </button>
                );
              })}
            </div>

            {/* 字体：两行两列，四格只留「Aa」 */}
            <div class="preference-quick__tile preference-quick__tile--square preference-quick__fonts glass" role="group" aria-label={typefaceLabel} data-glass-lens>
              {FONT_TYPE_OPTIONS.map(([value, key, fallback]) => {
                const label = translate(helper, key, fallback);
                return (
                  <button type="button" class="preference-quick__option font-type-btn" data-font={value} aria-pressed="false" title={label} aria-label={label}>
                    <span class="preference-quick__font-preview">Aa</span>
                  </button>
                );
              })}
            </div>

            {renderStepper(
              translate(helper, "preferences.font_size", "Size"),
              "size",
              translate(helper, "preferences.decrease_font_size", "Decrease font size"),
              translate(helper, "preferences.increase_font_size", "Increase font size"),
            )}
            {renderStepper(
              translate(helper, "preferences.content_width", "Article Width"),
              "width",
              translate(helper, "preferences.decrease_width", "Decrease article width"),
              translate(helper, "preferences.increase_width", "Increase article width"),
            )}
            {renderStepper(
              translate(helper, "preferences.spacing", "Spacing"),
              "spacing",
              translate(helper, "preferences.decrease_spacing", "Tighten spacing"),
              translate(helper, "preferences.increase_spacing", "Loosen spacing"),
            )}

            {/* 语言：只有中英两版，两格一点即切；格子窄，标签缩到 zh / en */}
            {languageOptions ? (
              <div class="preference-quick__tile preference-quick__tile--wide preference-quick__tile--language preference-quick__modes glass" role="group" aria-label={languageLabel} data-glass-lens>
                {languageOptions.map((item) => {
                  const short = String(item.key || item.locale || "").split("-")[0].toLowerCase();
                  return (
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
                      {short}
                    </button>
                  );
                })}
              </div>
            ) : null}

            <button
              type="button"
              class="preference-quick__circle preference-quick__toggle glass glass-button"
              role="switch"
              aria-checked={String(GLASS_DEFAULTS.enabled)}
              title={glassLabel}
              aria-label={glassLabel}
              data-glass-toggle="enabled"
              data-glass-lens
            >
              <Icon name="droplets" size={18} />
            </button>
            <a class="preference-quick__circle glass glass-button" href={settingsUrl} title={settingsLabel} aria-label={settingsLabel} data-glass-lens>
              <Icon name="settings" size={18} />
            </a>

            {/* 配色通栏收尾 */}
            <label class="preference-quick__tile preference-quick__tile--full preference-quick__field glass" data-glass-lens>
              <span class="preference-quick__field-label">{paletteLabel}</span>
              {/* preferences.js 按当前明暗模式重建配色选项。 */}
              <select id="preference-quick-palette-select" class="preference-quick__select" data-theme-palette-select aria-label={paletteLabel}>
                <optgroup label={translate(helper, "preferences.light_theme", "Light Theme")}>
                  {lightThemes.map((theme) => (
                    <option value={theme.value} selected={theme.value === DEFAULT_PREFERENCES.light}>{theme.name}</option>
                  ))}
                </optgroup>
                <optgroup label={translate(helper, "preferences.dark_theme", "Dark Theme")}>
                  {darkThemes.map((theme) => (
                    <option value={theme.value}>{theme.name}</option>
                  ))}
                </optgroup>
              </select>
              <Icon name="chevron-down" size={14} class="preference-quick__chevron" />
            </label>
          </div>
        </div>
      </div>
    );
  }
};
