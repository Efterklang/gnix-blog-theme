const { Component } = require("../../include/util/common");
const { LINE_HEIGHT } = require("../../include/util/article_font");
const { DEFAULT_PREFERENCES, THEME_OPTIONS } = require("../../include/util/theme");

function translate(helper, key, fallback) {
  const value = helper.__(key);
  return value === key ? fallback : value;
}

function icon(name) {
  const common = {
    "aria-hidden": "true",
    fill: "none",
    focusable: "false",
    height: "18",
    stroke: "currentColor",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "stroke-width": "2",
    viewBox: "0 0 24 24",
    width: "18",
    xmlns: "http://www.w3.org/2000/svg",
  };

  switch (name) {
    case "arrow-left":
      return (
        <svg {...common}>
          <title>arrow-left</title>
          <path d="m12 19-7-7 7-7" />
          <path d="M19 12H5" />
        </svg>
      );
    case "rotate-ccw":
      return (
        <svg {...common}>
          <title>rotate-ccw</title>
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
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
    const homeUrl = helper.localized_url_for("/");
    const idPrefix = "preference-page";
    const pageTitleId = `${idPrefix}-title`;
    const themeTitleId = `${idPrefix}-theme-title`;
    const fontTitleId = `${idPrefix}-font-title`;
    const lineHeightSliderId = `${idPrefix}-article-line-height-slider`;

    return (
      <div class="preference-page" data-preferences-page data-preference-surface="page">
        <div class="preference-shell">
          <header class="preference-page-header">
            <h1 id={pageTitleId}>{translate(helper, "preferences.title", "Preferences")}</h1>
            <div class="preference-header-actions">
              <button type="button" class="preference-reset-action" data-preference-reset-all>
                {icon("rotate-ccw")}
                <span>{translate(helper, "preferences.reset", "Reset")}</span>
              </button>
              <button type="button" class="preference-back-link" aria-label={backLabel} data-preference-back data-home-url={homeUrl}>
                {icon("arrow-left")}
                <span>{backLabel}</span>
              </button>
            </div>
          </header>

          <section id="preferences-appearance" class="preference-panel" aria-labelledby={themeTitleId}>
            <header class="preference-panel__header">
              <h2 id={themeTitleId}>{translate(helper, "preferences.theme_eyebrow", "Theme")}</h2>
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
          </section>

          <section id="preferences-typography" class="preference-panel" aria-labelledby={fontTitleId}>
            <header class="preference-panel__header">
              <h2 id={fontTitleId}>{translate(helper, "preferences.font_title", "Typography")}</h2>
            </header>

            <div class="preference-row">
              <div class="preference-row__label">
                <span>{translate(helper, "preferences.font_size", "Size")}</span>
              </div>
              <fieldset class="preference-choice-group preference-choice-group--font-size font-size-selector">
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
              <fieldset class="preference-choice-group preference-choice-group--article-width font-width-selector">
                <legend class="preference-sr-only">{translate(helper, "preferences.content_width", "Article Width")}</legend>
                {ARTICLE_WIDTH_OPTIONS.map(([value, key, fallback]) => (
                  <button type="button" class="preference-choice-button preference-choice-button--width font-width-btn" data-width={value} aria-label={translate(helper, key, fallback)}>
                    <span class="font-width-preview" aria-hidden="true"></span>
                  </button>
                ))}
              </fieldset>
            </div>

            <div class="preference-row">
              <div class="preference-row__label">
                <span>{translate(helper, "preferences.line_height", "Line Height")}</span>
              </div>
              <div class="font-line-height-stack">
                <div class="font-line-height-control">
                  <span class="font-line-height-label">{translate(helper, "preferences.compact", "Compact")}</span>
                  <input
                    id={lineHeightSliderId}
                    class="font-line-height-slider"
                    type="range"
                    min={String(LINE_HEIGHT.min)}
                    max={String(LINE_HEIGHT.max)}
                    step="0.05"
                    value="1.7"
                    aria-label={translate(helper, "preferences.line_height", "Line Height")}
                  />
                  <span class="font-line-height-label">{translate(helper, "preferences.relaxed", "Relaxed")}</span>
                </div>
                <output class="font-line-height-value" for={lineHeightSliderId}>
                  1.70
                </output>
              </div>
            </div>

            <div class="preference-row preference-row--control-only">
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
              <div class="preference-row__label">
                <span>{translate(helper, "preferences.custom_fonts", "Custom Fonts")}</span>
                <small>{translate(helper, "preferences.custom_fonts_description", "Load web font CSS and map families")}</small>
              </div>
              <div class="font-custom-panel">
                <form class="font-custom-form">
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
                  <button type="button" class="font-custom-reset">
                    {translate(helper, "preferences.reset_fonts", "Reset Fonts")}
                  </button>
                </form>
              </div>
            </div>

            <div class="preference-row preference-row--preview">
              <div class="font-preview-copy">
                <p class="font-preview-title">
                  <span class="font-preview-marker">[{translate(helper, "preferences.preview", "Preview")}]</span> {translate(helper, "preferences.preview_title", "When You Are Old")}
                </p>
                <p class="font-preview-excerpt">{translate(helper, "preferences.preview_copy", "When you are old and grey and full of sleep, and nodding by the fire, take down this book,")}</p>
                <p class="font-preview-excerpt">
                  {translate(helper, "preferences.preview_copy_secondary", "And slowly read, and dream of the soft look your eyes had once, and of their shadows deep.")}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }
};
