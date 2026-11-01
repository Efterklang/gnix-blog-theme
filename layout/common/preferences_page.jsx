const { Component } = require("../../include/util/common");
const { Icon } = require("../../include/util/lucide");
const { CUSTOM_FONT_PRESETS } = require("../../include/util/article_font");
const { DEFAULT_PREFERENCES, THEME_OPTIONS } = require("../../include/util/theme");
const { THEME_MODE_OPTIONS, FONT_SIZE_OPTIONS, FONT_TYPE_OPTIONS, FONT_WEIGHT_OPTIONS, ARTICLE_WIDTH_OPTIONS, ARTICLE_SPACING_OPTIONS } = require("../../include/util/preference_options");

const LOREM_IPSUM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

// 自定义字体族输入框的占位示例
const CUSTOM_FAMILY_PLACEHOLDERS = {
  "sans-serif": '"Inter", sans-serif',
  serif: '"Noto Serif SC", serif',
  mono: '"Fira Code", monospace',
  handwriting: '"LXGW WenKai", cursive',
};

function translate(helper, key, fallback) {
  const value = helper.__(key);
  return value === key ? fallback : value;
}

// 节头：坐标式编号（01、02…）+ 节名 + 一行说明
function renderPanelHeader(index, titleId, title, description) {
  return (
    <header class="preference-panel__header">
      <span class="preference-panel__index" aria-hidden="true">
        {String(index).padStart(2, "0")}
      </span>
      <div>
        <h2 id={titleId}>{title}</h2>
        <p>{description}</p>
      </div>
    </header>
  );
}

// 一行：左边标签（与可选的一句说明），右边控件
function renderRow(label, control, { note, labelFor, modifier } = {}) {
  return (
    <div class={`preference-row${modifier ? ` preference-row--${modifier}` : ""}`}>
      <div class="preference-row__label">
        {labelFor ? <label for={labelFor}>{label}</label> : <span>{label}</span>}
        {note && <small>{note}</small>}
      </div>
      {control}
    </div>
  );
}

// 一条分段条：每个选项一格，文字（或传入的渲染函数的结果）就是格子内容；hookClass 是 preferences.js 找控件用的类名
function renderSegmented(helper, legend, options, { hookClass, dataKey, renderCell }) {
  return (
    <fieldset class="segmented">
      <legend class="preference-sr-only">{legend}</legend>
      {options.map((option) => {
        const label = translate(helper, option.key, option.fallback);
        const data = { [`data-${dataKey}`]: option.value };
        return (
          <button type="button" class={`segmented__cell${hookClass ? ` ${hookClass}` : ""}`} {...data} aria-pressed="false" aria-label={label}>
            {renderCell ? renderCell(option, label) : label}
          </button>
        );
      })}
    </fieldset>
  );
}

// 亮 / 暗两套配色各一行：一个下拉
function renderThemeSchemeRow(helper, kind, themes, idPrefix) {
  const isLight = kind === "light";
  const title = translate(helper, isLight ? "preferences.light_theme" : "preferences.dark_theme", isLight ? "Light Theme" : "Dark Theme");
  const note = translate(
    helper,
    isLight ? "preferences.light_scheme_description" : "preferences.dark_scheme_description",
    isLight ? "Used when Light mode is active" : "Used when Dark mode is active",
  );
  const selectLabel = translate(helper, isLight ? "preferences.light_scheme" : "preferences.dark_scheme", isLight ? "Light Scheme" : "Dark Scheme");
  const selectId = `${idPrefix}-${kind}-theme-select`;

  return renderRow(
    title,
    <span class="theme-scheme-select-shell">
      <select id={selectId} class="theme-scheme-select" data-theme-scheme-kind={kind} aria-label={selectLabel}>
        {themes.map((theme) => (
          <option value={theme.value} selected={theme.value === DEFAULT_PREFERENCES[kind]}>
            {theme.name}
          </option>
        ))}
      </select>
      <Icon name="chevron-down" size={14} class="theme-scheme-select-chevron" />
    </span>,
    { note, labelFor: selectId },
  );
}

// 设置页：一张清单。刊头（标题、说明、Reset / Back）之下两节——01 Theme、02 Typography——每节若干行，
// 行左标签右控件；控件与顶栏的偏好弹窗同一款分段条（default.css）。preferences.js 按 data-* 与类名钩子找控件
module.exports = class extends Component {
  render() {
    const { helper } = this.props;
    const lightThemes = THEME_OPTIONS.filter((theme) => theme.colorScheme === "light");
    const darkThemes = THEME_OPTIONS.filter((theme) => theme.colorScheme === "night");
    const backLabel = translate(helper, "preferences.back_to_app", "Back");
    const resetLabel = translate(helper, "preferences.reset", "Reset");
    const homeUrl = helper.localized_url_for("/");
    const idPrefix = "preference-page";
    const themeTitleId = `${idPrefix}-theme-title`;
    const fontTitleId = `${idPrefix}-font-title`;
    const widthSliderId = `${idPrefix}-article-width-slider`;
    const t = (key, fallback) => translate(helper, key, fallback);
    const widthLabels = Object.fromEntries(ARTICLE_WIDTH_OPTIONS.map(({ value, key, fallback }) => [value, t(key, fallback)]));
    const widthTitle = t("preferences.content_width", "Article Width");

    return (
      <div class="preference-page" data-preferences-page data-preference-surface="page">
        <div class="preference-shell">
          <header class="preference-page-header">
            <div class="preference-page-heading">
              <h1 id={`${idPrefix}-title`}>{t("preferences.title", "Preferences")}</h1>
              <p>{t("preferences.autosave_note", "Changes are saved automatically in this browser.")}</p>
            </div>
            <div class="preference-header-actions">
              <button type="button" class="preference-reset-action" aria-label={resetLabel} title={resetLabel} data-preference-reset-all>
                <Icon name="rotate-ccw" size={14} />
                <span>{resetLabel}</span>
              </button>
              <button type="button" class="preference-back-link" aria-label={backLabel} title={backLabel} data-preference-back data-home-url={homeUrl}>
                <Icon name="arrow-left" size={14} />
                <span>{backLabel}</span>
              </button>
            </div>
          </header>

          <section id="preferences-appearance" class="preference-panel" aria-labelledby={themeTitleId}>
            {renderPanelHeader(1, themeTitleId, t("preferences.theme_eyebrow", "Theme"), t("preferences.theme_description", "Use light, dark, or match your system"))}
            {renderRow(t("preferences.theme_mode", "Mode"), renderSegmented(helper, t("preferences.theme_mode", "Mode"), THEME_MODE_OPTIONS, { dataKey: "theme-mode" }))}
            {renderThemeSchemeRow(helper, "light", lightThemes, idPrefix)}
            {renderThemeSchemeRow(helper, "dark", darkThemes, idPrefix)}
          </section>

          <section id="preferences-typography" class="preference-panel" aria-labelledby={fontTitleId}>
            {renderPanelHeader(2, fontTitleId, t("preferences.font_title", "Typography"), t("preferences.typography_description", "Tune article reading density, typeface, and custom web fonts"))}

            {renderRow(
              t("preferences.font_size", "Size"),
              renderSegmented(helper, t("preferences.font_size", "Size"), FONT_SIZE_OPTIONS, {
                hookClass: "font-size-btn",
                dataKey: "size",
                renderCell: () => <span class="font-size-preview">A</span>,
              }),
            )}

            {renderRow(t("preferences.weight", "Weight"), renderSegmented(helper, t("preferences.weight", "Weight"), FONT_WEIGHT_OPTIONS, { hookClass: "font-weight-btn", dataKey: "weight" }))}

            {/* 栏宽只在宽屏有意义：手机上正文本就撑满屏宽，这一行由 preferences.css 在窄屏隐藏 */}
            {renderRow(
              widthTitle,
              <div class="font-range-stack">
                <div class="font-range-control">
                  <span class="font-range-label">{widthLabels[ARTICLE_WIDTH_OPTIONS[0].value]}</span>
                  <span class="preference-slider">
                    <input
                      id={widthSliderId}
                      class="font-width-slider preference-range-slider"
                      type="range"
                      min="0"
                      max={String(ARTICLE_WIDTH_OPTIONS.length - 1)}
                      step="1"
                      value="0"
                      aria-label={widthTitle}
                      data-width-labels={JSON.stringify(widthLabels)}
                    />
                    <span class="preference-slider__thumb" aria-hidden="true"></span>
                  </span>
                  <span class="font-range-label">{widthLabels[ARTICLE_WIDTH_OPTIONS.at(-1).value]}</span>
                </div>
                <output class="font-width-value font-range-value" for={widthSliderId}>
                  42em
                </output>
              </div>,
              { note: t("preferences.content_width_description", "Only affects the article column"), modifier: "width" },
            )}

            {renderRow(
              t("preferences.spacing", "Spacing"),
              renderSegmented(helper, t("preferences.spacing", "Spacing"), ARTICLE_SPACING_OPTIONS, { hookClass: "font-spacing-btn", dataKey: "spacing" }),
              { note: t("preferences.spacing_description", "Vertical space between paragraphs, headings and media") },
            )}

            {/* 字体族：四张卡片（大「Aa」+ 名字），不是分段条 */}
            {renderRow(
              t("preferences.typeface", "Typeface"),
              <fieldset class="preference-type-grid">
                <legend class="preference-sr-only">{t("preferences.typeface", "Typeface")}</legend>
                {FONT_TYPE_OPTIONS.map(({ value, key, fallback }) => (
                  <button type="button" class="preference-type-card font-type-btn" data-font={value} aria-pressed="false">
                    <span class="font-type-preview">Aa</span>
                    <span class="font-type-name">{t(key, fallback)}</span>
                  </button>
                ))}
              </fieldset>,
              { modifier: "stacked" },
            )}

            <div class="preference-row preference-row--stacked">
              <form class="font-custom-form">
                <details class="font-custom-details font-preset-details">
                  <summary>{t("preferences.font_presets", "Recommended Fonts")}</summary>
                  <div class="font-custom-details__body">
                    <fieldset class="font-preset-group">
                      <legend class="preference-sr-only">{t("preferences.font_presets", "Recommended Fonts")}</legend>
                      <small>{t("preferences.font_presets_description", "Check to download fonts, then enter their names below to use them.")}</small>
                      <div class="font-preset-list">
                        {CUSTOM_FONT_PRESETS.map((preset) => {
                          const { key, fallback } = FONT_TYPE_OPTIONS.find((option) => option.value === preset.type);
                          return (
                            <label class="font-preset-option">
                              <input type="checkbox" data-font-preset={preset.id} aria-labelledby={`font-preset-name-${preset.id}`} aria-describedby={`font-preset-status-${preset.id}`} />
                              <span class="font-preset-copy">
                                <strong id={`font-preset-name-${preset.id}`}>{preset.name}</strong>
                                <span>{t(key, fallback)}</span>
                              </span>
                              <small class="font-preset-status" id={`font-preset-status-${preset.id}`} data-font-preset-state={preset.id} data-state="idle" aria-live="polite">
                                {t("preferences.font_preset_idle", "Check to download")}
                              </small>
                            </label>
                          );
                        })}
                      </div>
                      <p class="font-preset-note">{t("preferences.font_presets_storage", "Font files are cached in this browser for reuse.")}</p>
                      <span
                        hidden
                        data-font-preset-messages
                        data-idle={t("preferences.font_preset_idle", "Check to download")}
                        data-loading={t("preferences.font_preset_loading", "Downloading…")}
                        data-ready={t("preferences.font_preset_ready", "Downloaded")}
                        data-uncached={t("preferences.font_preset_uncached", "Loaded")}
                        data-copied={t("preferences.font_preset_copied", "Downloaded · copied “%s”")}
                        data-error={t("preferences.font_preset_error", "Download failed. Uncheck and try again.")}
                      ></span>
                    </fieldset>
                  </div>
                </details>
                <details class="font-custom-details" open>
                  <summary>{t("preferences.custom_fonts", "Custom Fonts")}</summary>
                  <div class="font-custom-details__body">
                    <p>{t("preferences.custom_fonts_description", "Load web font CSS and map families")}</p>
                    <label class="font-custom-field">
                      <span>{t("preferences.web_font_css", "Web Font CSS URL")}</span>
                      <small>{t("preferences.font_css_help", "Paste one web font CSS URL per line. Each URL can load one or more font families.")}</small>
                      <textarea class="font-custom-imports" name="font-custom-imports" rows="3" placeholder="https://fonts.googleapis.com/css2?family=..." aria-label={t("preferences.web_font_css", "Web Font CSS URL")}></textarea>
                    </label>
                    <div class="font-custom-family-grid">
                      {FONT_TYPE_OPTIONS.map(({ value, key, fallback }) => (
                        <label class="font-custom-field">
                          <span>{t(key, fallback)}</span>
                          <input class="font-custom-family-input" name={`font-custom-family-${value}`} type="text" data-font-family={value} placeholder={CUSTOM_FAMILY_PLACEHOLDERS[value]} autocomplete="off" />
                        </label>
                      ))}
                    </div>
                  </div>
                </details>
                <button type="button" class="font-custom-reset">
                  {t("preferences.reset_fonts", "Reset Fonts")}
                </button>
              </form>
            </div>

            <div class="preference-row preference-row--preview">
              <div class="font-preview">
                <span class="preference-preview-label">{t("preferences.live_preview", "Live Preview")}</span>
                <div class="font-preview-copy">
                  <p class="font-preview-title">Lorem Ipsum</p>
                  <p class="font-preview-excerpt">{LOREM_IPSUM}</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }
};
