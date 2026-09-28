/**
 * 命令面板（搜索 + 命令）。原 Insight 搜索框的升级：同一输入框检索文章 / 页面 / 标签，
 * 并内置外观、主题、字体、语言与导航命令；数据与交互见 source/js/command-palette.js。
 * 图标均取自 lucide 包：此处的在渲染期内联为 SVG，脚本里的由 include/hexo/bundle.js 在生成时打包。
 * 语言切换项随页面变化（依赖 front-matter 的 i18n 映射），故不走 cacheComponent
 * @module view/common/command_palette
 */
const { Component } = require("../../include/util/common");
const { getLanguageOptions } = require("../../include/util/i18n");
const { Icon } = require("../../include/util/lucide");

function translate(helper, key, fallback) {
  const value = helper.__(key);
  return value === key ? fallback : value;
}

// 内联到 <script> 的 JSON：转义 < 与行分隔符，避免提前闭合标签或语法错误
function stringifyForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// [value, i18n key, fallback, 额外检索词]
const TYPEFACE_OPTIONS = [
  ["sans-serif", "preferences.typeface_sans_serif", "Sans Serif", "sans 无衬线 黑体"],
  ["serif", "preferences.typeface_serif", "Serif", "衬线 宋体"],
  ["mono", "preferences.typeface_mono", "Monospace", "monospace code 等宽"],
  ["handwriting", "preferences.typeface_handwriting", "Handwriting", "hand cursive script 手写"],
];

// 导航命令按菜单名或路径挑图标，自上而下取首个命中；都不中时首页用 house，其余用箭头。
// 这里出现的图标须同时列在 source/js/command-palette.js 的 ICONS 中
const LINK_ICONS = [
  [/friend|link|友链/i, "link"],
  [/archive|归档/i, "archive"],
  [/tag|标签/i, "tags"],
  [/categor|分类/i, "folder"],
  [/about|关于/i, "user-round"],
  [/rss|atom|feed|订阅/i, "rss"],
  [/status|状态/i, "activity"],
  [/post|blog|article|文章|博客/i, "newspaper"],
];

function getLinkIcon(name, target) {
  const text = `${name} ${target}`;
  const match = LINK_ICONS.find(([pattern]) => pattern.test(text));
  if (match) return match[1];
  return /^\/?$/.test(target) ? "house" : "arrow-right";
}

// 按键提示：方向键与回车画成图标，其余是要按下 / 输入的字符本身
const KEY_HINTS = [
  [["arrow-up", "arrow-down"], "palette.key_navigate", "navigate"],
  [["corner-down-left"], "palette.key_select", "select"],
  ["esc", "palette.key_close", "close"],
  [">", "palette.filter_commands", "commands"],
  ["#", "palette.filter_tags", "tags"],
];

module.exports = class extends Component {
  render() {
    const { config, helper, page } = this.props;
    if (!config.search) return null;

    const langKey = helper.language_key(page);
    const title = translate(helper, "palette.title", "Search & commands");

    // 导航命令：navbar 菜单项 + 偏好设置页
    const links = Object.keys(config.navbar?.menu || {}).map((name) => ({
      id: name,
      icon: getLinkIcon(name, String(config.navbar.menu[name])),
      label: name,
      url: helper.localized_url_for(config.navbar.menu[name], langKey),
    }));
    links.push({
      id: "preferences",
      icon: "settings",
      label: translate(helper, "preferences.title", "Preferences"),
      url: helper.localized_url_for("/preferences/", langKey),
      keywords: "preferences settings options 设置 偏好",
    });

    // 无译文的文章 / 页面回退到目标语言首页，命令仍可用，提示中注明
    const languages = (getLanguageOptions(page, config, helper) || []).map((item) => ({
      key: item.key,
      label: item.label,
      locale: item.locale,
      current: item.current,
      available: item.available,
      url: item.url || helper.localized_url_for("/", item.key),
    }));

    // 主题列表不在此内联：head 的主题初始化脚本已把 __GNIX_THEME_CONFIG__.themes 写进每页
    const paletteConfig = {
      contentUrl: helper.is_i18n_enabled() ? helper.localized_url_for("/content.json") : helper.url_for("/content.json"),
      typefaces: TYPEFACE_OPTIONS.map(([value, key, fallback, keywords]) => ({ value, label: translate(helper, key, fallback), keywords })),
      languages,
      links,
    };

    const translation = {
      title,
      hint: translate(helper, "palette.hint", "Search posts, tags, or type > for commands"),
      filter: translate(helper, "palette.filter", "Filter…"),
      untitled: translate(helper, "palette.untitled", "(Untitled)"),
      posts: helper._p("common.post", Infinity),
      pages: helper._p("common.page", Infinity),
      tags: helper._p("common.tag", Infinity),
      commands: translate(helper, "palette.commands", "Commands"),
      recent: translate(helper, "palette.recent", "Recent"),
      noResults: translate(helper, "palette.no_results", "No results"),
      current: translate(helper, "palette.current", "Current"),
      back: translate(helper, "palette.back", "Back"),
      appearance: translate(helper, "palette.appearance", "Appearance"),
      switchToLight: translate(helper, "palette.switch_to_light", "Switch to light mode"),
      switchToDark: translate(helper, "palette.switch_to_dark", "Switch to dark mode"),
      followSystem: translate(helper, "palette.follow_system", "Follow system appearance"),
      theme: translate(helper, "preferences.theme_eyebrow", "Theme"),
      lightThemes: translate(helper, "preferences.light_theme", "Light Theme"),
      darkThemes: translate(helper, "preferences.dark_theme", "Dark Theme"),
      typeface: translate(helper, "preferences.typeface", "Typeface"),
      language: translate(helper, "preferences.language", "Language"),
      notTranslated: translate(helper, "preferences.language_unavailable", "Not translated"),
      navigate: translate(helper, "palette.navigate", "Go to"),
    };

    const js = `(function() {
      function init() {
        window.loadCommandPalette(${stringifyForScript(paletteConfig)}, ${stringifyForScript(translation)});
      }
      function runWhenActivated(callback) {
        (window.__gnixPrerender?.runWhenActivated || function(fn) { fn(); })(callback);
      }
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() { runWhenActivated(init); }, { once: true });
      } else {
        runWhenActivated(init);
      }
    })();`;

    return (
      <>
        <div class="command-palette" id="command-palette" popover="auto" role="dialog" aria-label={title}>
          <div class="command-palette-container" data-glass-lens="live">
            <div class="command-palette-input-container">
              <span class="command-palette-input-icon" aria-hidden="true">
                <Icon name="search" size={18} />
              </span>
              <input
                type="text"
                name="command-palette-input"
                class="command-palette-input"
                placeholder={translation.hint}
                autofocus
                autocomplete="off"
                spellcheck="false"
                role="combobox"
                aria-haspopup="listbox"
                aria-autocomplete="list"
                aria-controls="command-palette-results"
                aria-expanded="false"
                aria-label={title}
              />
            </div>
            <div class="command-palette-body" id="command-palette-results" role="listbox" aria-label={title}></div>
            <div class="command-palette-footer" aria-hidden="true">
              {KEY_HINTS.map(([key, labelKey, fallback]) => (
                <span>
                  <kbd class="command-palette-key">{Array.isArray(key) ? key.map((name) => <Icon name={name} size={12} strokeWidth={2} />) : key}</kbd>
                  {translate(helper, labelKey, fallback)}
                </span>
              ))}
            </div>
          </div>
        </div>
        <script type="module" src={helper.url_for("/js/command-palette.js")}></script>
        <script dangerouslySetInnerHTML={{ __html: js }}></script>
      </>
    );
  }
};
