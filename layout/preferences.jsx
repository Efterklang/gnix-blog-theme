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
    case "book-open":
      return (
        <svg {...common}>
          <title>book-open</title>
          <path d="M12 7v14" />
          <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...common}>
          <title>chevron-down</title>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "circle-help":
      return (
        <svg {...common}>
          <title>circle-help</title>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
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
    case "palette":
      return (
        <svg {...common}>
          <title>palette</title>
          <path d="M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4A1.75 1.75 0 0 1 12 22z" />
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
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
    case "search":
      return (
        <svg {...common}>
          <title>search</title>
          <path d="m21 21-4.34-4.34" />
          <circle cx="11" cy="11" r="8" />
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
    case "type":
      return (
        <svg {...common}>
          <title>type</title>
          <path d="M12 4v16" />
          <path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2" />
          <path d="M9 20h6" />
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
  ["small", "Small"],
  ["medium-small", "Medium Small"],
  ["medium", "Medium"],
  ["medium-large", "Medium Large"],
  ["large", "Large"],
];

const FONT_TYPE_OPTIONS = [
  ["serif", "Serif"],
  ["sans-serif", "Sans Serif"],
  ["mono", "Monospace"],
  ["handwriting", "Handwriting"],
];

const FONT_WEIGHT_OPTIONS = [
  ["light", "Light"],
  ["regular", "Regular"],
  ["medium", "Medium"],
];

const THEME_PALETTE_SWATCHES = ["base", "mantle", "crust", "text", "mauve", "blue", "green", "yellow", "red", "pink"];

function renderThemePreviewCard(helper, kind, themes) {
  const isLight = kind === "light";
  const title = translate(helper, isLight ? "preferences.theme_mode_light" : "preferences.theme_mode_dark", isLight ? "Light" : "Dark");
  const defaultThemeValue = DEFAULT_PREFERENCES[kind];
  const selectId = `preference-${kind}-theme-select`;

  return (
    <article class="theme-preview-card" data-theme-preview-card={kind}>
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
                <span class={`theme-palette-swatch theme-palette-swatch--${token}`} style={`--swatch-color: var(--${token})`} title={token}></span>
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
    const { helper, page } = this.props;
    const lightThemes = THEME_OPTIONS.filter((theme) => theme.colorScheme === "light");
    const darkThemes = THEME_OPTIONS.filter((theme) => theme.colorScheme === "night");
    const langKey = typeof helper.language_key === "function" ? helper.language_key(page) : null;
    const fallbackUrl = typeof helper.localized_url_for === "function" ? helper.localized_url_for("/", langKey) : "/";

    return (
      <main class="preference-page" data-preferences-page data-preference-surface="page">
        <div class="preference-shell">
          <div class="preference-topbar">
            <a class="preference-back-link" href={fallbackUrl} data-preference-back-link>
              {icon("arrow-left")}
              <span>{translate(helper, "preferences.back_to_app", "Back")}</span>
            </a>
          </div>

          <div class="preference-content">
            <section id="preference-section-appearance" class="preference-panel" aria-labelledby="preference-theme-title">
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

            <section id="preference-section-typography" class="preference-panel" aria-labelledby="preference-font-title">
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
                  {FONT_SIZE_OPTIONS.map(([value, label]) => (
                    <button type="button" class="preference-choice-button preference-choice-button--size font-size-btn" data-size={value} aria-label={label}>
                      <span class="font-size-preview">A</span>
                    </button>
                  ))}
                </div>
              </div>

              <div class="preference-row preference-row--line-height">
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
                  {FONT_TYPE_OPTIONS.map(([value, label]) => (
                    <button type="button" class="preference-choice-button preference-choice-button--type font-type-btn" data-font={value}>
                      <span class="font-type-preview">Aa</span>
                      <span class="font-type-name">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div class="preference-row">
                <div class="preference-row__label">
                  <span>{translate(helper, "preferences.weight", "Weight")}</span>
                </div>
                <div class="preference-choice-group preference-choice-group--segmented preference-choice-group--font-weight font-weight-selector">
                  {FONT_WEIGHT_OPTIONS.map(([value, label]) => (
                    <button type="button" class="preference-choice-button preference-choice-button--segmented font-weight-btn" data-weight={value} aria-label={label}>
                      <span class="font-option-name">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div class="preference-row preference-row--stacked font-custom-group">
                <button type="button" class="font-custom-toggle" aria-expanded="false" aria-controls="font-custom-panel" aria-label="Custom Fonts">
                  <span class="preference-row__label">
                    <span>{translate(helper, "preferences.custom_fonts", "Custom Fonts")}</span>
                    <small>{translate(helper, "preferences.custom_fonts_description", "Load web font CSS and map families")}</small>
                  </span>
                  <span class="font-custom-toggle-icon" aria-hidden="true">
                    {icon("chevron-down")}
                  </span>
                </button>
                <div id="font-custom-panel" class="font-custom-panel" data-expanded="false" aria-hidden="true" hidden>
                  <div class="font-custom-panel-inner">
                    <form class="font-custom-form">
                      <label class="font-custom-field font-custom-import-field">
                        <span class="font-custom-label-row">
                          <span>{translate(helper, "preferences.web_font_css", "Web Font CSS URL")}</span>
                          <button type="button" class="font-custom-help-btn" popovertarget="font-custom-help-popover" aria-label="Font CSS help">
                            {icon("circle-help")}
                          </button>
                        </span>
                        <textarea class="font-custom-imports" name="font-custom-imports" rows="3" placeholder="https://fonts.googleapis.com/css2?family=..." aria-label="Web Font CSS URL"></textarea>
                      </label>
                      <div class="font-custom-family-grid">
                        <label class="font-custom-field">
                          <span>Serif</span>
                          <input class="font-custom-family-input" name="font-custom-family-serif" type="text" data-font-family="serif" placeholder={'"Noto Serif SC", serif'} autocomplete="off" />
                        </label>
                        <label class="font-custom-field">
                          <span>Sans Serif</span>
                          <input
                            class="font-custom-family-input"
                            name="font-custom-family-sans-serif"
                            type="text"
                            data-font-family="sans-serif"
                            placeholder={'"Inter", sans-serif'}
                            autocomplete="off"
                          />
                        </label>
                        <label class="font-custom-field">
                          <span>Monospace</span>
                          <input class="font-custom-family-input" name="font-custom-family-mono" type="text" data-font-family="mono" placeholder={'"Fira Code", monospace'} autocomplete="off" />
                        </label>
                        <label class="font-custom-field">
                          <span>Handwriting</span>
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
              </div>
              <div id="font-custom-help-popover" popover="manual" class="font-custom-help-popover" role="tooltip">
                {translate(helper, "preferences.font_css_help", "Paste one web font CSS URL per line. Each URL can load one or more font families.")}
              </div>

              <aside class="preference-row preference-row--preview" aria-label={translate(helper, "preferences.preview", "Preview")}>
                <div class="preference-row__label">
                  <span>{translate(helper, "preferences.preview", "Preview")}</span>
                </div>
                <div class="font-preview-copy">
                  <p class="font-preview-title">{translate(helper, "preferences.preview_title", "When You Are Old")}</p>
                  <p class="font-preview-excerpt">
                    {translate(helper, "preferences.preview_copy", "When you are old and grey and full of sleep, and nodding by the fire, take down this book,")}
                  </p>
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
