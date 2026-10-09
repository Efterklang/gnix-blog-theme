const { Component } = require("../../include/util/common");
const { Icon } = require("../../include/util/lucide");
const { DEFAULT_PREFERENCES, THEME_OPTIONS } = require("../../include/util/theme");
const { DEFAULT_SETTINGS: ARTICLE_FONT_DEFAULTS } = require("../../include/util/article_font");
const { DEFAULT_SETTINGS: GLASS_DEFAULTS } = require("../../include/util/glass");
const { getLanguageOptions } = require("../../include/util/i18n");

function translate(helper, key, fallback) {
  const value = helper.__(key);
  return value === key ? fallback : value;
}

const THEME_MODE_OPTIONS = [
  ["system", "System"],
  ["light", "Light"],
  ["dark", "Dark"],
];

const FONT_TYPE_OPTIONS = [
  ["sans-serif", "preferences.typeface_sans_serif", "Sans Serif"],
  ["serif", "preferences.typeface_serif", "Serif"],
  ["mono", "preferences.typeface_mono", "Monospace"],
  ["handwriting", "preferences.typeface_handwriting", "Handwriting"],
];

function renderStepper(label, control, decreaseIcon, increaseIcon, decreaseLabel, increaseLabel) {
  return (
    <div class="preference-quick__stepper" role="group" aria-label={label}>
      <span class="preference-quick__step-label">{label}</span>
      <div class="preference-quick__step-controls">
        <button type="button" class="preference-quick__step-btn" data-article-step={control} data-step-dir="-1" title={decreaseLabel} aria-label={decreaseLabel}>
          <Icon name={decreaseIcon} size={18} />
        </button>
        <button type="button" class="preference-quick__step-btn" data-article-step={control} data-step-dir="1" title={increaseLabel} aria-label={increaseLabel}>
          <Icon name={increaseIcon} size={18} />
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
    const paletteLabel = translate(helper, "preferences.color_palette", "Color Palette");
    const typefaceLabel = translate(helper, "preferences.typeface", "Typeface");
    const languageLabel = translate(helper, "preferences.language", "Language");
    const unavailableLabel = translate(helper, "preferences.language_unavailable", "Not translated");
    const glassLabel = translate(helper, "preferences.glass_enabled", "Liquid Glass");
    const settingsLabel = translate(helper, "preferences.open_settings", "Settings");
    const lightThemes = THEME_OPTIONS.filter((theme) => theme.colorScheme === "light");
    const darkThemes = THEME_OPTIONS.filter((theme) => theme.colorScheme === "night");

    return (
      <div id="preference-popup" class="preference-popup" popover="auto" role="dialog" aria-labelledby="preference-quick-title">
        <div class="preference-quick glass glass-scroll" data-glass-lens data-preferences-page data-preference-surface="quick">
          <header class="preference-quick__header">
            <span id="preference-quick-title" class="preference-quick__title">{title}</span>
            <div class="preference-quick__actions">
              <button
                type="button"
                class="preference-quick__action preference-quick__toggle"
                role="switch"
                aria-checked={String(GLASS_DEFAULTS.enabled)}
                title={glassLabel}
                aria-label={glassLabel}
                data-glass-toggle="enabled"
              >
                <Icon name="copy" size={20} />
              </button>
              <a class="preference-quick__action" href={settingsUrl} title={settingsLabel} aria-label={settingsLabel}>
                <Icon name="settings" size={18} />
              </a>
            </div>
          </header>

          <div class="preference-quick__steppers">
            {renderStepper(
              translate(helper, "preferences.font_size", "Size"),
              "size",
              "minus",
              "plus",
              translate(helper, "preferences.decrease_font_size", "Decrease font size"),
              translate(helper, "preferences.increase_font_size", "Increase font size"),
            )}
            {renderStepper(
              translate(helper, "preferences.content_width", "Article Width"),
              "width",
              "fold-horizontal",
              "move-horizontal",
              translate(helper, "preferences.decrease_width", "Decrease article width"),
              translate(helper, "preferences.increase_width", "Increase article width"),
            )}
            {renderStepper(
              translate(helper, "preferences.spacing", "Spacing"),
              "spacing",
              "fold-vertical",
              "unfold-vertical",
              translate(helper, "preferences.decrease_spacing", "Tighten spacing"),
              translate(helper, "preferences.increase_spacing", "Loosen spacing"),
            )}
          </div>

          <div class="preference-quick__selects">
            <label class="preference-quick__field">
              <span class="preference-quick__field-label">{modeLabel}</span>
              <select id="preference-quick-mode-select" class="preference-quick__select" data-theme-mode-select aria-label={modeLabel}>
                {THEME_MODE_OPTIONS.map(([value, fallback]) => (
                  <option value={value} selected={value === "system"}>
                    {translate(helper, `preferences.theme_mode_${value}`, fallback)}
                  </option>
                ))}
              </select>
              <Icon name="chevron-down" size={14} class="preference-quick__chevron" />
            </label>

            <label class="preference-quick__field">
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

            <label class="preference-quick__field">
              <span class="preference-quick__field-label">{typefaceLabel}</span>
              <select id="preference-quick-font-select" class="preference-quick__select" data-article-font-select aria-label={typefaceLabel}>
                {FONT_TYPE_OPTIONS.map(([value, key, fallback]) => (
                  <option value={value} selected={value === ARTICLE_FONT_DEFAULTS.type}>{translate(helper, key, fallback)}</option>
                ))}
              </select>
              <Icon name="chevron-down" size={14} class="preference-quick__chevron" />
            </label>

            {languageOptions ? (
              <label class="preference-quick__field">
                <span class="preference-quick__field-label">{languageLabel}</span>
                <select id="preference-quick-language-select" class="preference-quick__select" data-language-select aria-label={languageLabel}>
                  {languageOptions.map((item) => (
                    <option value={item.current || !item.url ? "" : item.url} selected={item.current} disabled={!item.current && !item.available} lang={item.locale}>
                      {item.available ? item.label : `${item.label} · ${unavailableLabel}`}
                    </option>
                  ))}
                </select>
                <Icon name="chevron-down" size={14} class="preference-quick__chevron" />
              </label>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
};
