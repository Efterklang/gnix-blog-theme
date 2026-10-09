const { Component } = require("../../include/util/common");
const { DEFAULT_PREFERENCES, THEME_OPTIONS } = require("../../include/util/theme");
const { DEFAULT_SETTINGS: ARTICLE_FONT_DEFAULTS } = require("../../include/util/article_font");
const { DEFAULT_SETTINGS: GLASS_DEFAULTS } = require("../../include/util/glass");
const { getLanguageOptions } = require("../../include/util/i18n");

function translate(helper, key, fallback) {
  const value = helper.__(key);
  return value === key ? fallback : value;
}

function icon(name, size = 18) {
  const common = {
    "aria-hidden": "true",
    fill: "none",
    focusable: "false",
    height: String(size),
    stroke: "currentColor",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "stroke-width": "1.75",
    viewBox: "0 0 24 24",
    width: String(size),
    xmlns: "http://www.w3.org/2000/svg",
  };

  switch (name) {
    case "minus":
      return (
        <svg {...common}>
          <title>minus</title>
          <path d="M5 12h14" />
        </svg>
      );
    case "plus":
      return (
        <svg {...common}>
          <title>plus</title>
          <path d="M5 12h14" />
          <path d="M12 5v14" />
        </svg>
      );
    case "fold-horizontal":
      return (
        <svg {...common}>
          <title>fold-horizontal</title>
          <path d="M18 16 14 12 18 8" />
          <path d="M1 12h9" />
          <path d="M14 12h9" />
          <path d="M6 16 10 12 6 8" />
        </svg>
      );
    case "move-horizontal":
      return (
        <svg {...common}>
          <title>move-horizontal</title>
          <path d="m18 8 4 4-4 4" />
          <path d="M2 12h20" />
          <path d="m6 8-4 4 4 4" />
        </svg>
      );
    case "fold-vertical":
      return (
        <svg {...common}>
          <title>fold-vertical</title>
          <path d="M12 22v-6" />
          <path d="M12 8V2" />
          <path d="M4 12H2" />
          <path d="M10 12H8" />
          <path d="M16 12h-2" />
          <path d="M22 12h-2" />
          <path d="m15 19-3-3-3 3" />
          <path d="m15 5-3 3-3-3" />
        </svg>
      );
    case "unfold-vertical":
      return (
        <svg {...common}>
          <title>unfold-vertical</title>
          <path d="M12 22v-6" />
          <path d="M12 8V2" />
          <path d="M4 12H2" />
          <path d="M10 12H8" />
          <path d="M16 12h-2" />
          <path d="M22 12h-2" />
          <path d="m15 19-3 3-3-3" />
          <path d="m15 5-3-3-3 3" />
        </svg>
      );
    case "glass":
      return (
        <svg {...common}>
          <title>glass</title>
          <path d="M8 7V6a3 3 0 0 1 3-3h7a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-1" />
          <rect x="3" y="7" width="14" height="14" rx="3" fill="currentColor" fill-opacity="0.08" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <title>settings</title>
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    default:
      return null;
  }
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
          {icon(decreaseIcon)}
        </button>
        <button type="button" class="preference-quick__step-btn" data-article-step={control} data-step-dir="1" title={increaseLabel} aria-label={increaseLabel}>
          {icon(increaseIcon)}
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
                {icon("glass", 20)}
              </button>
              <a class="preference-quick__action" href={settingsUrl} title={settingsLabel} aria-label={settingsLabel}>
                {icon("settings")}
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
            </label>

            <label class="preference-quick__field">
              <span class="preference-quick__field-label">{typefaceLabel}</span>
              <select id="preference-quick-font-select" class="preference-quick__select" data-article-font-select aria-label={typefaceLabel}>
                {FONT_TYPE_OPTIONS.map(([value, key, fallback]) => (
                  <option value={value} selected={value === ARTICLE_FONT_DEFAULTS.type}>{translate(helper, key, fallback)}</option>
                ))}
              </select>
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
              </label>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
};
