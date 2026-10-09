const { Component } = require("../../include/util/common");
const { Icon } = require("../../include/util/lucide");
const { CUSTOM_FONT_PRESETS } = require("../../include/util/article_font");
const { DEFAULT_PREFERENCES, THEME_OPTIONS } = require("../../include/util/theme");
const { DEFAULT_SETTINGS: GLASS_DEFAULTS, RANGES: GLASS_RANGES } = require("../../include/util/glass");

const LOREM_IPSUM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

function translate(helper, key, fallback) {
  const value = helper.__(key);
  return value === key ? fallback : value;
}

const THEME_MODE_OPTIONS = [
  ["system", "System"],
  ["light", "Light"],
  ["dark", "Dark"],
];

const FONT_SIZE_OPTIONS = [
  ["small", "preferences.font_size_small", "Small"],
  ["medium-small", "preferences.font_size_medium_small", "Medium Small"],
  ["medium", "preferences.font_size_medium", "Medium"],
  ["medium-large", "preferences.font_size_medium_large", "Medium Large"],
  ["large", "preferences.font_size_large", "Large"],
];

const ARTICLE_WIDTH_OPTIONS = [
  ["narrow", "preferences.width_narrow", "Narrow"],
  ["medium-narrow", "preferences.width_medium_narrow", "Medium Narrow"],
  ["medium", "preferences.width_medium", "Medium"],
  ["medium-wide", "preferences.width_medium_wide", "Medium Wide"],
  ["wide", "preferences.width_wide", "Wide"],
];

const FONT_TYPE_OPTIONS = [
  ["sans-serif", "preferences.typeface_sans_serif", "Sans Serif"],
  ["serif", "preferences.typeface_serif", "Serif"],
  ["mono", "preferences.typeface_mono", "Monospace"],
  ["handwriting", "preferences.typeface_handwriting", "Handwriting"],
];

const FONT_WEIGHT_OPTIONS = [
  ["light", "preferences.weight_light", "Light"],
  ["regular", "preferences.weight_regular", "Regular"],
  ["medium", "preferences.weight_medium", "Medium"],
];

const ARTICLE_SPACING_OPTIONS = [
  ["compact", "preferences.spacing_compact", "Compact"],
  ["normal", "preferences.spacing_normal", "Normal"],
  ["relaxed", "preferences.spacing_relaxed", "Relaxed"],
];

// [设置键, 标题 key, 标题回退, 说明 key, 说明回退]；数值显示格式由 preferences.js 统一处理
const GLASS_RANGE_OPTIONS = [
  ["blur", "preferences.glass_blur", "Blur", "preferences.glass_blur_description", "Frost what shows through the glass"],
  ["refraction", "preferences.glass_refraction", "Refraction", "preferences.glass_refraction_description", "Edge lensing strength; Chromium browsers only (Chrome, Edge, Android)"],
  ["tint", "preferences.glass_tint", "Surface Opacity", "preferences.glass_tint_description", "How much of the theme color tints the glass"],
];

function renderGlassSwitch(key, label) {
  return (
    <button type="button" class="preference-switch" role="switch" aria-checked={String(GLASS_DEFAULTS[key])} aria-label={label} data-glass-toggle={key}>
      <span class="preference-switch__thumb glass" data-glass-lens aria-hidden="true"></span>
    </button>
  );
}

function renderGlassRange(helper, [key, labelKey, labelFallback, descriptionKey, descriptionFallback], idPrefix) {
  const range = GLASS_RANGES[key];
  const id = `${idPrefix}-glass-${key}-slider`;
  const label = translate(helper, labelKey, labelFallback);

  return (
    <div class="preference-row" data-glass-param>
      <div class="preference-row__label">
        <label for={id}>{label}</label>
        <small>{translate(helper, descriptionKey, descriptionFallback)}</small>
      </div>
      <div class="glass-range-control">
        <span class="preference-slider">
          <input
            id={id}
            class="preference-range-slider"
            type="range"
            min={String(range.min)}
            max={String(range.max)}
            step={String(range.step)}
            value={String(GLASS_DEFAULTS[key])}
            aria-label={label}
            data-glass-range={key}
          />
          <span class="preference-slider__thumb glass" data-glass-lens aria-hidden="true"></span>
        </span>
        <output class="glass-range-value" for={id} data-glass-range-value={key}></output>
      </div>
    </div>
  );
}

function renderThemeSchemeControl(helper, kind, themes, idPrefix) {
  const isLight = kind === "light";
  const title = translate(helper, isLight ? "preferences.light_theme" : "preferences.dark_theme", isLight ? "Light Theme" : "Dark Theme");
  const selectLabel = translate(helper, isLight ? "preferences.light_scheme" : "preferences.dark_scheme", isLight ? "Light Scheme" : "Dark Scheme");
  const defaultThemeValue = DEFAULT_PREFERENCES[kind];
  const selectId = `${idPrefix}-${kind}-theme-select`;

  return (
    <div class="theme-scheme-control">
      <label class="theme-scheme-title" for={selectId}>
        {title}
      </label>
      <span class="theme-scheme-select-shell">
        <select id={selectId} class="theme-scheme-select" data-theme-scheme-kind={kind} aria-label={selectLabel}>
          {themes.map((theme) => (
            <option value={theme.value} selected={theme.value === defaultThemeValue}>
              {theme.name}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" class="theme-scheme-select-chevron" />
      </span>
    </div>
  );
}

function renderThemeModePreview(value) {
  const panes =
    value === "system"
      ? [
          ["light", DEFAULT_PREFERENCES.light],
          ["dark", DEFAULT_PREFERENCES.dark],
        ]
      : [[value, DEFAULT_PREFERENCES[value]]];

  return (
    <span class={`theme-mode-preview theme-mode-preview--${value}`} aria-hidden="true">
      {panes.map(([scheme, theme]) => (
        <span class={`theme-mode-preview__pane theme-mode-preview__pane--${scheme}`} data-theme-preview-scheme={scheme} data-theme={theme}>
          <span class="theme-mode-preview__surface"></span>
        </span>
      ))}
    </span>
  );
}

module.exports = class extends Component {
  render() {
    const { helper } = this.props;
    const lightThemes = THEME_OPTIONS.filter((theme) => theme.colorScheme === "light");
    const darkThemes = THEME_OPTIONS.filter((theme) => theme.colorScheme === "night");
    const backLabel = translate(helper, "preferences.back_to_app", "Back");
    const resetLabel = translate(helper, "preferences.reset", "Reset");
    const homeUrl = helper.localized_url_for("/");
    const idPrefix = "preference-page";
    const pageTitleId = `${idPrefix}-title`;
    const themeTitleId = `${idPrefix}-theme-title`;
    const fontTitleId = `${idPrefix}-font-title`;
    const widthSliderId = `${idPrefix}-article-width-slider`;
    const glassTitleId = `${idPrefix}-glass-title`;
    const glassEnabledLabel = translate(helper, "preferences.glass_enabled", "Liquid Glass");
    const glassPressLabel = translate(helper, "preferences.glass_press", "Press Feedback");

    return (
      <div class="preference-page" data-preferences-page data-preference-surface="page">
        <div class="preference-shell">
          <header class="preference-page-header">
            <div class="preference-page-heading">
              <h1 id={pageTitleId}>{translate(helper, "preferences.title", "Preferences")}</h1>
              <p>{translate(helper, "preferences.autosave_note", "Changes are saved automatically in this browser.")}</p>
            </div>
            <div class="preference-header-actions">
              <button type="button" class="preference-reset-action" aria-label={resetLabel} title={resetLabel} data-preference-reset-all>
                <Icon name="rotate-ccw" size={18} />
                <span>{resetLabel}</span>
              </button>
              <button type="button" class="preference-back-link" aria-label={backLabel} title={backLabel} data-preference-back data-home-url={homeUrl}>
                <Icon name="arrow-left" size={18} />
                <span>{backLabel}</span>
              </button>
            </div>
          </header>

          <section id="preferences-appearance" class="preference-panel" aria-labelledby={themeTitleId}>
            <header class="preference-panel__header">
              <div>
                <h2 id={themeTitleId}>{translate(helper, "preferences.theme_eyebrow", "Theme")}</h2>
                <p>{translate(helper, "preferences.theme_description", "Use light, dark, or match your system")}</p>
              </div>
            </header>

            <div class="preference-theme-controls">
              <fieldset class="preference-choice-group preference-choice-group--mode">
                <legend class="preference-sr-only">{translate(helper, "preferences.theme_mode", "Mode")}</legend>
                {THEME_MODE_OPTIONS.map(([value, fallback]) => (
                  <button type="button" class="preference-choice-button preference-choice-button--theme-mode" data-theme-mode={value} aria-pressed="false">
                    {renderThemeModePreview(value)}
                    <span class="theme-mode-label">{translate(helper, `preferences.theme_mode_${value}`, fallback)}</span>
                  </button>
                ))}
              </fieldset>

              <div class="preference-theme-schemes">
                {renderThemeSchemeControl(helper, "light", lightThemes, idPrefix)}
                {renderThemeSchemeControl(helper, "dark", darkThemes, idPrefix)}
              </div>
            </div>
            <div class="preference-row preference-row--switch">
              <div class="preference-row__label">
                <span id={`${idPrefix}-paper-texture-label`}>{translate(helper, "preferences.paper_texture", "Paper Texture")}</span>
                <small id={`${idPrefix}-paper-texture-description`}>{translate(helper, "preferences.paper_texture_description", "Add a subtle paper texture to the page background")}</small>
              </div>
              <button
                type="button"
                class="preference-switch"
                role="switch"
                aria-checked="false"
                aria-labelledby={`${idPrefix}-paper-texture-label`}
                aria-describedby={`${idPrefix}-paper-texture-description`}
                data-page-texture-toggle
              >
                <span class="preference-switch__thumb glass" data-glass-lens aria-hidden="true"></span>
              </button>
            </div>
          </section>

          <section id="preferences-typography" class="preference-panel" aria-labelledby={fontTitleId}>
            <header class="preference-panel__header">
              <div>
                <h2 id={fontTitleId}>{translate(helper, "preferences.font_title", "Typography")}</h2>
                <p>{translate(helper, "preferences.typography_description", "Tune article reading density, typeface, and custom web fonts")}</p>
              </div>
            </header>

            <div class="preference-row">
              <div class="preference-row__label">
                <span>{translate(helper, "preferences.font_size", "Size")}</span>
              </div>
              <fieldset class="preference-choice-group preference-choice-group--segmented preference-choice-group--font-size font-size-selector">
                <legend class="preference-sr-only">{translate(helper, "preferences.font_size", "Size")}</legend>
                {FONT_SIZE_OPTIONS.map(([value, key, fallback]) => (
                  <button type="button" class="preference-choice-button preference-choice-button--size font-size-btn" data-size={value} aria-label={translate(helper, key, fallback)}>
                    <span class="font-size-preview">A</span>
                  </button>
                ))}
              </fieldset>
            </div>

            <div class="preference-row">
              <div class="preference-row__label">
                <span>{translate(helper, "preferences.weight", "Weight")}</span>
              </div>
              <fieldset class="preference-choice-group preference-choice-group--segmented preference-choice-group--font-weight font-weight-selector">
                <legend class="preference-sr-only">{translate(helper, "preferences.weight", "Weight")}</legend>
                {FONT_WEIGHT_OPTIONS.map(([value, key, fallback]) => (
                  <button type="button" class="preference-choice-button preference-choice-button--segmented font-weight-btn" data-weight={value} aria-label={translate(helper, key, fallback)}>
                    <span class="font-option-name">{translate(helper, key, fallback)}</span>
                  </button>
                ))}
              </fieldset>
            </div>

            <div class="preference-row">
              <div class="preference-row__label">
                <span>{translate(helper, "preferences.content_width", "Article Width")}</span>
                <small>{translate(helper, "preferences.content_width_description", "Only affects the article column")}</small>
              </div>
              <div class="font-range-stack">
                <div class="font-range-control">
                  <span class="font-range-label">{translate(helper, "preferences.width_narrow", "Narrow")}</span>
                  <span class="preference-slider">
                    <input
                      id={widthSliderId}
                      class="font-width-slider preference-range-slider"
                      type="range"
                      min="0"
                      max={String(ARTICLE_WIDTH_OPTIONS.length - 1)}
                      step="1"
                      value="0"
                      aria-label={translate(helper, "preferences.content_width", "Article Width")}
                      data-width-labels={JSON.stringify(Object.fromEntries(ARTICLE_WIDTH_OPTIONS.map(([value, key, fallback]) => [value, translate(helper, key, fallback)])))}
                    />
                    <span class="preference-slider__thumb glass" data-glass-lens aria-hidden="true"></span>
                  </span>
                  <span class="font-range-label">{translate(helper, "preferences.width_wide", "Wide")}</span>
                </div>
                <output class="font-width-value font-range-value" for={widthSliderId}>
                  42em
                </output>
              </div>
            </div>

            <div class="preference-row">
              <div class="preference-row__label">
                <span>{translate(helper, "preferences.spacing", "Spacing")}</span>
                <small>{translate(helper, "preferences.spacing_description", "Vertical space between paragraphs, headings and media")}</small>
              </div>
              <fieldset class="preference-choice-group preference-choice-group--segmented preference-choice-group--font-spacing font-spacing-selector">
                <legend class="preference-sr-only">{translate(helper, "preferences.spacing", "Spacing")}</legend>
                {ARTICLE_SPACING_OPTIONS.map(([value, key, fallback]) => (
                  <button type="button" class="preference-choice-button preference-choice-button--segmented font-spacing-btn" data-spacing={value} aria-label={translate(helper, key, fallback)}>
                    <span class="font-option-name">{translate(helper, key, fallback)}</span>
                  </button>
                ))}
              </fieldset>
            </div>

            <div class="preference-row preference-row--stacked">
              <div class="preference-row__label">
                <span>{translate(helper, "preferences.typeface", "Typeface")}</span>
              </div>
              <fieldset class="preference-choice-group preference-choice-group--font-type font-type-selector">
                <legend class="preference-sr-only">{translate(helper, "preferences.typeface", "Typeface")}</legend>
                {FONT_TYPE_OPTIONS.map(([value, key, fallback]) => (
                  <button type="button" class="preference-choice-button preference-choice-button--type font-type-btn" data-font={value}>
                    <span class="font-type-preview">Aa</span>
                    <span class="font-type-name">{translate(helper, key, fallback)}</span>
                  </button>
                ))}
              </fieldset>
            </div>

            <div class="preference-row preference-row--stacked">
              <div class="font-custom-panel">
                <form class="font-custom-form">
                  <details class="font-custom-details font-preset-details">
                    <summary>{translate(helper, "preferences.font_presets", "Recommended Fonts")}</summary>
                    <div class="font-custom-details__body">
                      <fieldset class="font-preset-group">
                        <legend class="preference-sr-only">{translate(helper, "preferences.font_presets", "Recommended Fonts")}</legend>
                        <small>{translate(helper, "preferences.font_presets_description", "Check to download fonts, then enter their names below to use them.")}</small>
                        <div class="font-preset-list">
                          {CUSTOM_FONT_PRESETS.map((preset) => {
                            const [, labelKey, fallback] = FONT_TYPE_OPTIONS.find(([type]) => type === preset.type);
                            return (
                              <label class="font-preset-option">
                                <input type="checkbox" data-font-preset={preset.id} aria-labelledby={`font-preset-name-${preset.id}`} aria-describedby={`font-preset-status-${preset.id}`} />
                                <span class="font-preset-copy">
                                  <strong id={`font-preset-name-${preset.id}`}>{preset.name}</strong>
                                  <span>{translate(helper, labelKey, fallback)}</span>
                                </span>
                                <small class="font-preset-status" id={`font-preset-status-${preset.id}`} data-font-preset-state={preset.id} data-state="idle" aria-live="polite">
                                  {translate(helper, "preferences.font_preset_idle", "Check to download")}
                                </small>
                              </label>
                            );
                          })}
                        </div>
                        <p class="font-preset-note">{translate(helper, "preferences.font_presets_storage", "Font files are cached in this browser for reuse.")}</p>
                        <span
                          hidden
                          data-font-preset-messages
                          data-idle={translate(helper, "preferences.font_preset_idle", "Check to download")}
                          data-loading={translate(helper, "preferences.font_preset_loading", "Downloading…")}
                          data-ready={translate(helper, "preferences.font_preset_ready", "Downloaded")}
                          data-uncached={translate(helper, "preferences.font_preset_uncached", "Loaded")}
                          data-error={translate(helper, "preferences.font_preset_error", "Download failed. Uncheck and try again.")}
                        ></span>
                      </fieldset>
                    </div>
                  </details>
                  <details class="font-custom-details" open>
                    <summary>{translate(helper, "preferences.custom_fonts", "Custom Fonts")}</summary>
                    <div class="font-custom-details__body">
                      <p>{translate(helper, "preferences.custom_fonts_description", "Load web font CSS and map families")}</p>
                      <label class="font-custom-field">
                        <span>{translate(helper, "preferences.web_font_css", "Web Font CSS URL")}</span>
                        <small>{translate(helper, "preferences.font_css_help", "Paste one web font CSS URL per line. Each URL can load one or more font families.")}</small>
                        <textarea
                          class="font-custom-imports"
                          name="font-custom-imports"
                          rows="3"
                          placeholder="https://fonts.googleapis.com/css2?family=..."
                          aria-label={translate(helper, "preferences.web_font_css", "Web Font CSS URL")}
                        ></textarea>
                      </label>
                      <div class="font-custom-family-grid">
                        <label class="font-custom-field">
                          <span>{translate(helper, "preferences.typeface_serif", "Serif")}</span>
                          <input class="font-custom-family-input" name="font-custom-family-serif" type="text" data-font-family="serif" placeholder={'"Noto Serif SC", serif'} autocomplete="off" />
                        </label>
                        <label class="font-custom-field">
                          <span>{translate(helper, "preferences.typeface_sans_serif", "Sans Serif")}</span>
                          <input class="font-custom-family-input" name="font-custom-family-sans-serif" type="text" data-font-family="sans-serif" placeholder={'"Inter", sans-serif'} autocomplete="off" />
                        </label>
                        <label class="font-custom-field">
                          <span>{translate(helper, "preferences.typeface_mono", "Monospace")}</span>
                          <input class="font-custom-family-input" name="font-custom-family-mono" type="text" data-font-family="mono" placeholder={'"Fira Code", monospace'} autocomplete="off" />
                        </label>
                        <label class="font-custom-field">
                          <span>{translate(helper, "preferences.typeface_handwriting", "Handwriting")}</span>
                          <input
                            class="font-custom-family-input"
                            name="font-custom-family-handwriting"
                            type="text"
                            data-font-family="handwriting"
                            placeholder={'"LXGW WenKai", cursive'}
                            autocomplete="off"
                          />
                        </label>
                      </div>
                    </div>
                  </details>
                  <button type="button" class="font-custom-reset">
                    {translate(helper, "preferences.reset_fonts", "Reset Fonts")}
                  </button>
                </form>
              </div>
            </div>

            <div class="preference-row preference-row--preview">
              <div class="font-preview">
                <span class="preference-preview-label">{translate(helper, "preferences.live_preview", "Live Preview")}</span>
                <div class="font-preview-copy">
                  <p class="font-preview-title">Lorem Ipsum</p>
                  <p class="font-preview-excerpt">{LOREM_IPSUM}</p>
                </div>
              </div>
            </div>
          </section>

          <section id="preferences-glass" class="preference-panel" aria-labelledby={glassTitleId} data-glass-preferences>
            <header class="preference-panel__header">
              <h2 id={glassTitleId}>{translate(helper, "preferences.glass_title", "Liquid Glass")}</h2>
              <button type="button" class="font-custom-reset" data-glass-reset>
                {translate(helper, "preferences.glass_reset", "Reset Glass")}
              </button>
            </header>

            <div class="preference-row preference-row--preview">
              <div class="glass-preview" aria-hidden="true">
                <p class="glass-preview__backdrop">{LOREM_IPSUM}</p>
                <span class="glass-preview__pill glass glass-button" data-glass-lens>
                  {translate(helper, "preferences.glass_preview", "Glass")}
                </span>
              </div>
            </div>

            <div class="preference-row preference-row--switch">
              <div class="preference-row__label">
                <span>{glassEnabledLabel}</span>
                <small>{translate(helper, "preferences.glass_enabled_description", "Translucent buttons and panels; turn off for solid surfaces")}</small>
              </div>
              {renderGlassSwitch("enabled", glassEnabledLabel)}
            </div>

            <div class="preference-row preference-row--switch" data-glass-param>
              <div class="preference-row__label">
                <span>{glassPressLabel}</span>
                <small>{translate(helper, "preferences.glass_press_description", "Springy swell and highlight that follows your finger")}</small>
              </div>
              {renderGlassSwitch("press", glassPressLabel)}
            </div>

            {GLASS_RANGE_OPTIONS.map((option) => renderGlassRange(helper, option, idPrefix))}
          </section>
        </div>
      </div>
    );
  }
};
