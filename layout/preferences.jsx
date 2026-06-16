const { Component } = require("../include/util/common");
const { LINE_HEIGHT } = require("../include/util/article_font");
const { DEFAULT_PREFERENCES, THEME_OPTIONS } = require("../include/util/theme");

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
    case "chevron-down":
      return (
        <svg {...common}>
          <title>chevron-down</title>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "monitor":
      return (
        <svg {...common}>
          <title>monitor</title>
          <rect width="20" height="14" x="2" y="3" rx="2" />
          <path d="M8 21h8" />
          <path d="M12 17v4" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <title>moon</title>
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
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
    case "sun":
      return (
        <svg {...common}>
          <title>sun</title>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      );
    default:
      return null;
  }
}

const THEME_MODE_OPTIONS = [
  ["light", "Light", "sun"],
  ["dark", "Dark", "moon"],
  ["system", "System", "monitor"],
];

const FONT_SIZE_OPTIONS = [
  ["small", "preferences.font_size_small", "Small"],
  ["medium-small", "preferences.font_size_medium_small", "Medium Small"],
  ["medium", "preferences.font_size_medium", "Medium"],
  ["medium-large", "preferences.font_size_medium_large", "Medium Large"],
  ["large", "preferences.font_size_large", "Large"],
];

const FONT_TYPE_OPTIONS = [
  ["serif", "preferences.typeface_serif", "Serif"],
  ["sans-serif", "preferences.typeface_sans_serif", "Sans Serif"],
  ["mono", "preferences.typeface_mono", "Monospace"],
  ["handwriting", "preferences.typeface_handwriting", "Handwriting"],
];

const FONT_WEIGHT_OPTIONS = [
  ["light", "preferences.weight_light", "Light"],
  ["regular", "preferences.weight_regular", "Regular"],
  ["medium", "preferences.weight_medium", "Medium"],
];

const THEME_PALETTE_SWATCHES = ["base", "mantle", "crust", "text", "mauve", "blue", "green", "yellow", "red", "pink"];

function renderThemePreviewCard(helper, kind, themes) {
  const isLight = kind === "light";
  const title = translate(helper, isLight ? "preferences.theme_mode_light" : "preferences.theme_mode_dark", isLight ? "Light" : "Dark");
  const defaultThemeValue = DEFAULT_PREFERENCES[kind];
  const selectId = `preference-${kind}-theme-select`;

  return (
    <article class="theme-preview-card">
      <label class="theme-scheme-select-row" for={selectId}>
        <span>{translate(helper, isLight ? "preferences.light_scheme" : "preferences.dark_scheme", isLight ? "Light Scheme" : "Dark Scheme")}</span>
        <select id={selectId} class="theme-scheme-select" data-theme-scheme-kind={kind} aria-label={title}>
          {themes.map((theme) => (
            <option value={theme.value} selected={theme.value === defaultThemeValue}>
              {theme.name}
            </option>
          ))}
        </select>
      </label>
      <div class="theme-preview-stage" data-theme-preview-stage={kind} aria-live="polite">
        {themes.map((theme) => (
          <div class="theme-palette-preview" data-theme-preview-option={theme.value} data-theme={theme.value} hidden={theme.value !== defaultThemeValue}>
            <div class="theme-palette-strip">
              {THEME_PALETTE_SWATCHES.map((token) => (
                <span class="theme-palette-swatch" style={`--swatch-color: var(--${token})`} title={token}></span>
              ))}
            </div>
            <div class="theme-palette-caption">
              <strong>{theme.name}</strong>
              <span>{theme.value.replace(/_/g, "-")}</span>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

module.exports = class extends Component {
  render() {
    const { helper, page, surface = "page", closeLabel } = this.props;
    const lightThemes = THEME_OPTIONS.filter((theme) => theme.colorScheme === "light");
    const darkThemes = THEME_OPTIONS.filter((theme) => theme.colorScheme === "night");
    const langKey = typeof helper.language_key === "function" ? helper.language_key(page) : null;
    const fallbackUrl = typeof helper.localized_url_for === "function" ? helper.localized_url_for("/", langKey) : "/";
    const isPopup = surface === "popup";
    const resolvedCloseLabel = closeLabel || translate(helper, "article.close", "Close");

    return (
      <main class="preference-page" data-preferences-page data-preference-surface={surface}>
        <div class="preference-shell">
          <div class="preference-topbar">
            {isPopup ? (
              <button type="button" class="preference-back-link" aria-label={resolvedCloseLabel} data-preference-popup-close>
                {icon("arrow-left")}
                <span>{resolvedCloseLabel}</span>
              </button>
            ) : (
              <a class="preference-back-link" href={fallbackUrl} data-preference-back-link>
                {icon("arrow-left")}
                <span>{translate(helper, "preferences.back_to_app", "Back")}</span>
              </a>
            )}
          </div>

          <div class="preference-content">
            <section id="preference-section-appearance" aria-labelledby="preference-theme-title">
              <div class="preference-panel__header">
                <h2 id="preference-theme-title">{translate(helper, "preferences.appearance", "Appearance")}</h2>
                <fieldset class="preference-choice-group preference-choice-group--segmented preference-choice-group--mode">
                  <legend class="preference-sr-only">{translate(helper, "preferences.theme_mode", "Mode")}</legend>
                  {THEME_MODE_OPTIONS.map(([value, fallback, iconName]) => (
                    <button type="button" class="preference-choice-button preference-choice-button--segmented" data-theme-mode={value} aria-pressed="false">
                      {icon(iconName)}
                      <span>{translate(helper, `preferences.theme_mode_${value}`, fallback)}</span>
                    </button>
                  ))}
                </fieldset>
              </div>

              <div class="preference-row preference-row--stacked">
                <div class="theme-preview-grid">
                  {renderThemePreviewCard(helper, "light", lightThemes)}
                  {renderThemePreviewCard(helper, "dark", darkThemes)}
                </div>
              </div>
            </section>

            <section id="preference-section-typography" aria-labelledby="preference-font-title">
              <div class="preference-panel__header">
                <h2 id="preference-font-title">{translate(helper, "preferences.font_title", "Typography")}</h2>
                <button type="button" class="preference-secondary-action font-settings-reset">
                  {icon("rotate-ccw")}
                  <span>{translate(helper, "preferences.reset", "Reset")}</span>
                </button>
              </div>

              <div class="preference-row">
                <div class="preference-row__label">
                  <span>{translate(helper, "preferences.font_size", "Size")}</span>
                </div>
                <div class="preference-choice-group preference-choice-group--font-size font-size-selector">
                  {FONT_SIZE_OPTIONS.map(([value, key, fallback]) => (
                    <button type="button" class="preference-choice-button preference-choice-button--size font-size-btn" data-size={value} aria-label={translate(helper, key, fallback)}>
                      <span class="font-size-preview">A</span>
                    </button>
                  ))}
                </div>
              </div>

              <div class="preference-row">
                <div class="preference-row__label">
                  <span>{translate(helper, "preferences.line_height", "Line Height")}</span>
                  <small>{translate(helper, "preferences.normal", "Normal")}</small>
                </div>
                <div class="font-line-height-stack">
                  <div class="font-line-height-control">
                    <span class="font-line-height-label">{translate(helper, "preferences.compact", "Compact")}</span>
                    <input
                      id="article-line-height-slider"
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
                  <output class="font-line-height-value" for="article-line-height-slider">
                    1.70
                  </output>
                </div>
              </div>

              <div class="preference-row preference-row--stacked">
                <div class="preference-row__label">
                  <span>{translate(helper, "preferences.typeface", "Typeface")}</span>
                </div>
                <div class="preference-choice-group preference-choice-group--font-type font-type-selector">
                  {FONT_TYPE_OPTIONS.map(([value, key, fallback]) => (
                    <button type="button" class="preference-choice-button preference-choice-button--type font-type-btn" data-font={value}>
                      <span class="font-type-preview">Aa</span>
                      <span class="font-type-name">{translate(helper, key, fallback)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div class="preference-row">
                <div class="preference-row__label">
                  <span>{translate(helper, "preferences.weight", "Weight")}</span>
                </div>
                <div class="preference-choice-group preference-choice-group--segmented preference-choice-group--font-weight font-weight-selector">
                  {FONT_WEIGHT_OPTIONS.map(([value, key, fallback]) => (
                    <button type="button" class="preference-choice-button preference-choice-button--segmented font-weight-btn" data-weight={value} aria-label={translate(helper, key, fallback)}>
                      <span class="font-option-name">{translate(helper, key, fallback)}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div class="preference-row preference-row--stacked">
                <button type="button" class="font-custom-toggle" aria-expanded="false" aria-controls="font-custom-panel" aria-label={translate(helper, "preferences.custom_fonts", "Custom Fonts")}>
                  <span class="preference-row__label">
                    <span>{translate(helper, "preferences.custom_fonts", "Custom Fonts")}</span>
                    <small>{translate(helper, "preferences.custom_fonts_description", "Load web font CSS and map families")}</small>
                  </span>
                  <span class="font-custom-toggle-icon" aria-hidden="true">
                    {icon("chevron-down")}
                  </span>
                </button>
                <div id="font-custom-panel" class="font-custom-panel" hidden>
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
                    <div class="font-custom-actions">
                      <button type="submit" class="font-custom-apply">
                        {translate(helper, "preferences.apply", "Apply")}
                      </button>
                      <button type="button" class="font-custom-reset">
                        {translate(helper, "preferences.reset_fonts", "Reset Fonts")}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              <aside class="preference-row preference-row--preview" aria-label={translate(helper, "preferences.preview", "Preview")}>
                <div class="preference-row__label">
                  <span>{translate(helper, "preferences.preview", "Preview")}</span>
                </div>
                <div class="font-preview-copy">
                  <p class="font-preview-title">{translate(helper, "preferences.preview_title", "When You Are Old")}</p>
                  <p class="font-preview-excerpt">{translate(helper, "preferences.preview_copy", "When you are old and grey and full of sleep, and nodding by the fire, take down this book,")}</p>
                  <p class="font-preview-excerpt">
                    {translate(helper, "preferences.preview_copy_secondary", "And slowly read, and dream of the soft look your eyes had once, and of their shadows deep.")}
                  </p>
                </div>
              </aside>
            </section>
          </div>
        </div>
      </main>
    );
  }
};
