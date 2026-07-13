const { Component } = require("../../include/util/common");
const { DEFAULT_PREFERENCES, THEME_OPTIONS } = require("../../include/util/theme");
const { DEFAULT_SETTINGS: ARTICLE_FONT_DEFAULTS } = require("../../include/util/article_font");
const { getLanguage, getLanguageKeys, getPageLanguageKey, isExternalUrl, isI18nEnabled } = require("../../include/util/i18n");

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
    case "rows-tight":
      return (
        <svg {...common}>
          <title>rows-tight</title>
          <path d="M4 6h16" />
          <path d="M4 10h16" />
          <path d="M4 14h16" />
          <path d="M4 18h16" />
        </svg>
      );
    case "rows-loose":
      return (
        <svg {...common}>
          <title>rows-loose</title>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
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
          <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
          <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
          <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
          <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
          <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
        </svg>
      );
    case "type":
      return (
        <svg {...common}>
          <title>type</title>
          <path d="M4 7V4h16v3" />
          <path d="M9 20h6" />
          <path d="M12 4v16" />
        </svg>
      );
    case "languages":
      return (
        <svg {...common}>
          <title>languages</title>
          <path d="m5 8 6 6" />
          <path d="m4 14 6-6 2-3" />
          <path d="M2 5h12" />
          <path d="M7 2h1" />
          <path d="m22 22-5-10-5 10" />
          <path d="M14 18h6" />
        </svg>
      );
    case "maximize":
      return (
        <svg {...common}>
          <title>maximize</title>
          <path d="M8 3H5a2 2 0 0 0-2 2v3" />
          <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
          <path d="M3 16v3a2 2 0 0 0 2 2h3" />
          <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      );
    case "minimize":
      return (
        <svg {...common}>
          <title>minimize</title>
          <path d="M8 3v3a2 2 0 0 1-2 2H3" />
          <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
          <path d="M3 16h3a2 2 0 0 1 2 2v3" />
          <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
        </svg>
      );
    case "settings-2":
      return (
        <svg {...common}>
          <title>settings-2</title>
          <path d="M14 17H5" />
          <path d="M19 7h-9" />
          <circle cx="17" cy="17" r="3" />
          <circle cx="7" cy="7" r="3" />
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
  ["serif", "preferences.typeface_serif", "Serif"],
  ["sans-serif", "preferences.typeface_sans_serif", "Sans Serif"],
  ["mono", "preferences.typeface_mono", "Monospace"],
  ["handwriting", "preferences.typeface_handwriting", "Handwriting"],
];

// 与 navbar 原语言切换同源的规则：优先 front-matter i18n 映射；
// 文章/页面缺少翻译时置灰，其余页面回退到对应语言的首页路径
function getLanguageOptions(page, config, helper) {
  if (!isI18nEnabled(config)) return null;

  const languageKeys = getLanguageKeys(config);
  if (languageKeys.length < 2) return null;

  const currentKey = getPageLanguageKey(page, config);
  const isDocumentPage = ["page", "post"].includes(page?.layout);

  return languageKeys.map((key) => {
    const language = getLanguage(config, key);
    const item = {
      key,
      locale: language.locale,
      label: language.label,
      current: key === currentKey,
      url: null,
      available: true,
    };
    if (item.current) return item;

    const pageI18n = page?.i18n && typeof page.i18n === "object" ? page.i18n : null;
    const alternate = pageI18n ? pageI18n[key] || pageI18n[language.locale] : null;
    if (alternate) {
      item.url = isExternalUrl(alternate) ? alternate : helper.url_for(alternate);
    } else if (isDocumentPage) {
      item.available = false;
    } else {
      item.url = helper.localized_url_for(page?.path || "/", key);
    }
    return item;
  });
}

function renderStepper(control, decreaseIcon, increaseIcon, decreaseLabel, increaseLabel) {
  return (
    <div class="preference-quick__stepper">
      <button type="button" class="preference-quick__step-btn" data-article-step={control} data-step-dir="-1" title={decreaseLabel} aria-label={decreaseLabel}>
        {icon(decreaseIcon)}
      </button>
      <button type="button" class="preference-quick__step-btn" data-article-step={control} data-step-dir="1" title={increaseLabel} aria-label={increaseLabel}>
        {icon(increaseIcon)}
      </button>
    </div>
  );
}

module.exports = class extends Component {
  render() {
    const { config, helper, page } = this.props;
    const title = translate(helper, "preferences.title", "Preferences");
    const langKey = helper.language_key(page);
    const settingsUrl = helper.localized_url_for("/preferences/", langKey);
    const fontSettingsUrl = `${settingsUrl}#preferences-typography`;
    const languageOptions = getLanguageOptions(page, config, helper);

    const modeLabel = translate(helper, "preferences.theme_mode", "Mode");
    const paletteLabel = translate(helper, "preferences.color_palette", "Color Palette");
    const typefaceLabel = translate(helper, "preferences.typeface", "Typeface");
    const fontSettingsLabel = translate(helper, "article.font_settings", "Font Settings");
    const languageLabel = translate(helper, "preferences.language", "Language");
    const unavailableLabel = translate(helper, "preferences.language_unavailable", "Not translated");
    const lightThemes = THEME_OPTIONS.filter((theme) => theme.colorScheme === "light");
    const darkThemes = THEME_OPTIONS.filter((theme) => theme.colorScheme === "night");

    return (
      <div id="preference-popup" class="preference-popup" popover="manual" role="dialog" aria-label={title} tabindex="-1" hidden>
        <div class="preference-quick" data-preferences-page data-preference-surface="quick">
          <div class="preference-quick__steppers">
            {renderStepper(
              "size",
              "minus",
              "plus",
              translate(helper, "preferences.decrease_font_size", "Decrease font size"),
              translate(helper, "preferences.increase_font_size", "Increase font size"),
            )}
            {renderStepper(
              "width",
              "fold-horizontal",
              "move-horizontal",
              translate(helper, "preferences.decrease_width", "Decrease article width"),
              translate(helper, "preferences.increase_width", "Increase article width"),
            )}
            {renderStepper(
              "lineHeight",
              "rows-tight",
              "rows-loose",
              translate(helper, "preferences.decrease_line_height", "Decrease line height"),
              translate(helper, "preferences.increase_line_height", "Increase line height"),
            )}
          </div>

          <div class="preference-quick__selects">
            <div class="preference-quick__select-row">
              <span class="preference-quick__select-icon preference-quick__select-icon--sun" aria-hidden="true">
                {icon("sun")}
              </span>
              <span class="preference-quick__select-icon preference-quick__select-icon--moon" aria-hidden="true">
                {icon("moon")}
              </span>
              <select class="preference-quick__select" data-theme-mode-select aria-label={modeLabel}>
                {THEME_MODE_OPTIONS.map(([value, fallback]) => (
                  <option value={value} selected={value === "system"}>
                    {translate(helper, `preferences.theme_mode_${value}`, fallback)}
                  </option>
                ))}
              </select>
            </div>

            <div class="preference-quick__select-row">
              <span class="preference-quick__select-icon" aria-hidden="true">
                {icon("palette")}
              </span>
              {/* 选项由 preferences.js 按当前生效的配色方案（light/dark）重建 */}
              <select class="preference-quick__select" data-theme-palette-select aria-label={paletteLabel}>
                <optgroup label={translate(helper, "preferences.light_theme", "Light Theme")}>
                  {lightThemes.map((theme) => (
                    <option value={theme.value} selected={theme.value === DEFAULT_PREFERENCES.light}>
                      {theme.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={translate(helper, "preferences.dark_theme", "Dark Theme")}>
                  {darkThemes.map((theme) => (
                    <option value={theme.value}>{theme.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div class="preference-quick__select-row">
              <span class="preference-quick__select-icon" aria-hidden="true">
                {icon("type")}
              </span>
              <select class="preference-quick__select" data-article-font-select aria-label={typefaceLabel}>
                {FONT_TYPE_OPTIONS.map(([value, key, fallback]) => (
                  <option value={value} selected={value === ARTICLE_FONT_DEFAULTS.type}>
                    {translate(helper, key, fallback)}
                  </option>
                ))}
              </select>
              <a class="preference-quick__row-action" href={fontSettingsUrl} title={fontSettingsLabel} aria-label={fontSettingsLabel}>
                {icon("settings-2", 16)}
              </a>
            </div>

            {languageOptions ? (
              <div class="preference-quick__select-row">
                <span class="preference-quick__select-icon" aria-hidden="true">
                  {icon("languages")}
                </span>
                <select class="preference-quick__select" data-language-select aria-label={languageLabel}>
                  {languageOptions.map((item) => (
                    <option value={item.current || !item.url ? "" : item.url} selected={item.current} disabled={!item.current && !item.available} lang={item.locale}>
                      {item.available ? item.label : `${item.label} · ${unavailableLabel}`}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>

          <div class="preference-quick__actions">
            {/* 默认隐藏，preferences.js 检测到浏览器支持元素全屏后显示；
                进入/退出两组图标文案由 aria-pressed 驱动切换 */}
            <button type="button" class="preference-quick__settings preference-quick__fullscreen" data-fullscreen-toggle aria-pressed="false" hidden>
              <span class="preference-quick__fullscreen-state preference-quick__fullscreen-state--enter">
                {icon("maximize")}
                <span>{translate(helper, "preferences.fullscreen", "Fullscreen")}</span>
              </span>
              <span class="preference-quick__fullscreen-state preference-quick__fullscreen-state--exit">
                {icon("minimize")}
                <span>{translate(helper, "preferences.exit_fullscreen", "Exit Fullscreen")}</span>
              </span>
            </button>
            <a class="preference-quick__settings" href={settingsUrl}>
              {icon("settings")}
              <span>{translate(helper, "preferences.open_settings", "Settings")}</span>
            </a>
          </div>
        </div>
      </div>
    );
  }
};
