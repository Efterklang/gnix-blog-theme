/* 命令面板（原 Insight 搜索框）：一个输入框同时检索文章 / 页面 / 标签与内置命令。
   `>` 前缀只搜命令，`#` 前缀只搜标签；空查询列出顶层命令与最近文章。
   主题 / 字体这类选项多的命令折成子列表：选中后进入该组，输入框前出现范围标签，
   空输入时 Backspace、Esc 或点击标签返回上一层。
   由 layout/common/command_palette.jsx 的内联脚本调用 window.loadCommandPalette；
   外部可通过 window.gnixCommandPalette.open(query) 打开并预填查询。
   图标 import 自 lucide 包，生成时由 include/hexo/bundle.js 内联进本脚本，故以 type="module" 加载 */
import {
  Activity,
  Archive,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  createElement as createLucideElement,
  File,
  FileText,
  Folder,
  House,
  Languages,
  Link,
  Moon,
  Newspaper,
  Palette,
  Rss,
  Settings,
  Sun,
  SunMoon,
  Tags,
  Type,
  UserRound,
} from "lucide";

((window, document) => {
  const MAX_POSTS = 30;
  const MAX_PAGES = 10;
  const RECENT_POSTS = 5;

  // #region 纯函数：查询解析 / 打分 / 高亮（与 DOM 无关，测试经 loadCommandPalette.utils 取用）

  const ESCAPE_MAP = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  const ESCAPE_RE = /[&<>"']/g;

  function escapeHTML(value) {
    return String(value ?? "").replace(ESCAPE_RE, (match) => ESCAPE_MAP[match]);
  }

  /** `>foo` 只搜命令，`#foo` 只搜标签，其余全量；关键词按空白切分并小写 */
  function parseQuery(raw) {
    const value = String(raw ?? "");
    let scope = "all";
    let rest = value;
    if (value.startsWith(">")) {
      scope = "commands";
      rest = value.slice(1);
    } else if (value.startsWith("#")) {
      scope = "tags";
      rest = value.slice(1);
    }
    const keywords = rest
      .split(/\s+/)
      .filter(Boolean)
      .map((keyword) => keyword.toLowerCase());
    return { scope, keywords };
  }

  /**
   * 通用打分：每个关键词都须命中至少一个字段（AND），得分为各字段命中次数 × 权重，
   * 同分保持原顺序（文章即按日期倒序）。
   * fields: [{ key, weight, lower }]，lower 指向预计算的小写字段，省去每次渲染的 toLowerCase
   */
  function rankList(list, fields, keywords, limit) {
    if (!keywords.length) return [];
    const results = [];
    for (const item of list) {
      let score = 0;
      let matchedAll = true;
      for (const keyword of keywords) {
        let hits = 0;
        for (const field of fields) {
          const raw = item[field.key];
          if (!raw) continue;
          const lower = (field.lower && item[field.lower]) || String(raw).toLowerCase();
          let index = lower.indexOf(keyword);
          while (index !== -1) {
            hits += field.weight;
            index = lower.indexOf(keyword, index + keyword.length);
          }
        }
        if (!hits) {
          matchedAll = false;
          break;
        }
        score += hits;
      }
      if (matchedAll) results.push({ item, score });
    }
    results.sort((a, b) => b.score - a.score);
    return (limit ? results.slice(0, limit) : results).map((result) => result.item);
  }

  function mergeRanges(ranges) {
    const merged = [];
    for (const range of ranges) {
      const last = merged[merged.length - 1];
      if (!last || range[0] > last[1]) merged.push([range[0], range[1]]);
      else if (range[1] > last[1]) last[1] = range[1];
    }
    return merged;
  }

  /**
   * 把各关键词在 text 中的首次命中包成 <mark>，返回已转义的 HTML。
   * maxlen 限制输出长度：命中落在开头 maxlen 之外时从命中前约 1/4 窗口处截取，两端补省略号。
   * lowerText 可传入预计算的小写全文
   */
  function findAndHighlight(text, keywords, maxlen, lowerText) {
    const source = String(text ?? "");
    if (!source) return "";
    const lower = lowerText || source.toLowerCase();
    const ranges = [];
    for (const keyword of keywords || []) {
      if (!keyword) continue;
      const index = lower.indexOf(keyword);
      if (index !== -1) ranges.push([index, index + keyword.length]);
    }
    if (!ranges.length) {
      return maxlen && source.length > maxlen ? `${escapeHTML(source.slice(0, maxlen))}…` : escapeHTML(source);
    }
    ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const merged = mergeRanges(ranges);

    let start = 0;
    if (maxlen && merged[0][1] > maxlen) start = Math.max(0, merged[0][0] - Math.floor(maxlen / 4));
    const end = maxlen ? Math.min(source.length, start + maxlen) : source.length;

    const parts = [];
    if (start > 0) parts.push("…");
    let cursor = start;
    for (const [from, to] of merged) {
      if (from >= end) break;
      if (to <= start) continue;
      const hitStart = Math.max(from, start);
      const hitEnd = Math.min(to, end);
      parts.push(escapeHTML(source.slice(cursor, hitStart)));
      parts.push(`<mark class="command-palette-mark">${escapeHTML(source.slice(hitStart, hitEnd))}</mark>`);
      cursor = hitEnd;
    }
    parts.push(escapeHTML(source.slice(cursor, end)));
    if (end < source.length) parts.push("…");
    return parts.join("");
  }

  // #endregion

  // #region 实体解码
  // content.json 的文本经服务端 escapeHTML / stripHTML，残留的几乎只有 &amp; &lt; 这类基本实体和
  // 数字实体：正则一次替换即可，比把上 MB 的文本灌进 textarea 走 HTML 解析快得多；
  // 只有出现其它命名实体（&hellip; 等）的字符串才整体退回 DOM 解码，两条路径都只解一次

  const BASIC_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  const BASIC_ENTITY_RE = /&(?:#x([0-9a-f]+)|#(\d+)|(amp|lt|gt|quot|apos|nbsp));/gi;
  const UNKNOWN_ENTITY_RE = /&(?!#|amp;|lt;|gt;|quot;|apos;|nbsp;)[a-z][a-z0-9]*;/i;
  let decoder = null;

  function decodeHTML(value) {
    if (!value || value.indexOf("&") === -1) return value;
    if (UNKNOWN_ENTITY_RE.test(value)) {
      decoder ??= document.createElement("textarea");
      decoder.innerHTML = value;
      return decoder.value;
    }
    return value.replace(BASIC_ENTITY_RE, (match, hex, dec, name) => {
      if (name) return BASIC_ENTITIES[name.toLowerCase()];
      const code = hex ? parseInt(hex, 16) : Number(dec);
      return code <= 0x10ffff ? String.fromCodePoint(code) : match;
    });
  }

  // #endregion

  // #region 图标
  // 命令按 lucide.dev 上的名称引用图标（导航命令的图标名由 command_palette.jsx 按菜单挑选，须在此表中）；
  // 同一图标会出现在很多行里，建一次后 cloneNode

  const ICONS = {
    activity: Activity,
    archive: Archive,
    "arrow-left": ArrowLeft,
    "arrow-right": ArrowRight,
    check: Check,
    "chevron-right": ChevronRight,
    file: File,
    "file-text": FileText,
    folder: Folder,
    house: House,
    languages: Languages,
    link: Link,
    moon: Moon,
    newspaper: Newspaper,
    palette: Palette,
    rss: Rss,
    settings: Settings,
    sun: Sun,
    "sun-moon": SunMoon,
    tags: Tags,
    type: Type,
    "user-round": UserRound,
  };
  const iconTemplates = new Map();

  // 尺寸直接写在 svg 属性上，样式表无需按上下文覆盖 svg 选择器
  function createIcon(name, size = 16) {
    const key = `${name}:${size}`;
    let template = iconTemplates.get(key);
    if (!template) {
      if (!ICONS[name]) return null;
      template = createLucideElement(ICONS[name], { width: size, height: size, "stroke-width": 1.75, "aria-hidden": "true", focusable: "false" });
      iconTemplates.set(key, template);
    }
    return template.cloneNode(true);
  }

  // #endregion

  const COMMAND_FIELDS = [
    { key: "label", weight: 3 },
    { key: "keywords", weight: 1 },
  ];
  const DOCUMENT_FIELDS = [
    { key: "title", lower: "_lowerTitle", weight: 3 },
    { key: "text", lower: "_lowerText", weight: 1 },
  ];
  const TAG_FIELDS = [
    { key: "name", lower: "_lowerName", weight: 1 },
    { key: "slug", lower: "_lowerSlug", weight: 1 },
  ];

  function resolve(value) {
    return typeof value === "function" ? value() : value;
  }

  function loadCommandPalette(config, translation) {
    const main = document.getElementById("command-palette");
    if (!main) return;
    const inputContainer = main.querySelector(".command-palette-input-container");
    const input = main.querySelector(".command-palette-input");
    const container = main.querySelector(".command-palette-body");
    if (!inputContainer || !input || !container) return;

    const html = document.documentElement;
    // 主题列表已由 head 的主题初始化脚本内联，不再随每页 HTML 重复一份
    const themes = (window.__GNIX_THEME_CONFIG__?.themes || []).filter((theme) => theme.colorScheme);
    let dataset = null;
    let isLoading = false;
    let activeGroup = null;
    let scopeChip = null;
    let pendingQuery = "";
    // 当前渲染出的选项及选中下标，方向键 / 回车直接查表，不再每次 querySelectorAll
    let items = [];
    let activeIndex = -1;
    let renderRequest = 0;
    let lastPointerPosition = null;

    // #region 状态读取
    // 主题 / 字体要读 localStorage 并 JSON.parse，一次渲染里十几个命令都会问同一个问题：
    // 渲染期间缓存在快照里，渲染结束即丢弃；命令执行时不经快照，读到的都是最新值

    let snapshot = null;

    function readThemeState() {
      const preferences = typeof window.getThemePreferences === "function" ? window.getThemePreferences() : {};
      const resolved = typeof window.getResolvedTheme === "function" ? window.getResolvedTheme() : html.dataset.theme || "";
      const schemeMap = window.__GNIX_THEME_CONFIG__?.themeSchemeMap || {};
      const isDark = schemeMap[resolved] ? schemeMap[resolved] === "night" : html.classList.contains("night");
      return { preferences, resolved, isDark };
    }

    function getThemeState() {
      if (!snapshot) return readThemeState();
      snapshot.theme ??= readThemeState();
      return snapshot.theme;
    }

    function readTypeface() {
      return window.gnixPreferences?.getArticleFontSettings?.().type || html.dataset.articleFontFamily || "";
    }

    function getTypeface() {
      if (!snapshot) return readTypeface();
      snapshot.typeface ??= readTypeface();
      return snapshot.typeface;
    }

    function getThemeName(value) {
      return themes.find((theme) => theme.value === value)?.name || value;
    }

    function getTypefaceLabel(value) {
      return config.typefaces.find((typeface) => typeface.value === value)?.label || value;
    }

    // #endregion

    // #region 内置命令
    // 字段：label / hint / icon 可为函数（渲染时求值）；group 归入子列表，opener 打开子列表；
    // url 表示导航型命令（渲染为 <a>），run 为执行动作；current 标记当前生效项

    const groups = {
      theme: {
        label: translation.theme,
        current: () => getThemeName(getThemeState().resolved),
        sections: [
          { key: "light", label: translation.lightThemes },
          { key: "night", label: translation.darkThemes },
        ],
      },
      typeface: {
        label: translation.typeface,
        current: () => getTypefaceLabel(getTypeface()),
        sections: [{ key: null, label: translation.typeface }],
      },
    };

    const commands = [
      {
        id: "appearance-toggle",
        icon: () => (getThemeState().isDark ? "sun" : "moon"),
        label: () => (getThemeState().isDark ? translation.switchToLight : translation.switchToDark),
        hint: translation.appearance,
        keywords: "toggle dark light night mode theme appearance 切换 深色 浅色 夜间 模式 外观",
        run() {
          const { preferences, isDark } = getThemeState();
          window.applyThemePreferences?.({ ...preferences, mode: isDark ? "light" : "dark" }, true);
        },
      },
      {
        id: "appearance-system",
        icon: "sun-moon",
        label: translation.followSystem,
        hint: translation.appearance,
        keywords: "system auto appearance mode theme 跟随 系统 自动 外观 模式",
        current: () => getThemeState().preferences.mode === "system",
        run() {
          window.applyThemePreferences?.({ ...getThemeState().preferences, mode: "system" }, true);
        },
      },
      {
        id: "group-theme",
        opener: "theme",
        icon: "palette",
        label: () => `${translation.theme}: ${groups.theme.current()}`,
        keywords: "theme color scheme palette switch 主题 配色 切换",
      },
      ...themes.map((theme) => ({
        id: `theme-${theme.value}`,
        group: "theme",
        section: theme.colorScheme,
        swatch: theme.value,
        label: theme.name,
        hint: translation.theme,
        keywords: `theme color scheme palette 主题 配色 ${theme.colorScheme === "light" ? "light 浅色" : "dark night 深色 夜间"}`,
        current: () => getThemeState().resolved === theme.value,
        run() {
          window.applyTheme?.(theme.value, true);
        },
      })),
      {
        id: "group-typeface",
        opener: "typeface",
        icon: "type",
        label: () => `${translation.typeface}: ${groups.typeface.current()}`,
        keywords: "font typeface family switch 字体 字型 切换",
      },
      ...config.typefaces.map((typeface) => ({
        id: `typeface-${typeface.value}`,
        group: "typeface",
        section: null,
        glyph: typeface.value,
        label: typeface.label,
        hint: translation.typeface,
        keywords: `font typeface family 字体 ${typeface.value} ${typeface.keywords || ""}`,
        current: () => getTypeface() === typeface.value,
        run() {
          window.gnixPreferences?.setArticleFontSettings?.({ type: typeface.value });
        },
      })),
      ...(config.languages || [])
        .filter((language) => !language.current)
        .map((language) => ({
          id: `language-${language.key}`,
          icon: "languages",
          label: language.label,
          hint: language.available ? translation.language : `${translation.language} · ${translation.notTranslated}`,
          keywords: `language lang switch translate 语言 切换 翻译 ${language.key} ${language.locale}`,
          url: language.url,
        })),
      ...(config.links || []).map((link) => ({
        id: `link-${link.id}`,
        icon: link.icon || "arrow-right",
        label: link.label,
        hint: translation.navigate,
        keywords: `go to navigate open page 前往 打开 页面 ${link.keywords || ""}`,
        url: link.url,
      })),
    ];
    const commandsById = new Map(commands.map((command) => [command.id, command]));
    const topLevelCommands = commands.filter((command) => !command.group);
    const groupMembers = new Map(Object.keys(groups).map((name) => [name, commands.filter((command) => command.group === name)]));

    function searchCommands(list, keywords) {
      const indexed = list.map((command) => ({
        command,
        label: String(resolve(command.label) || ""),
        keywords: `${command.keywords || ""} ${resolve(command.hint) || ""}`,
      }));
      return rankList(indexed, COMMAND_FIELDS, keywords).map((entry) => entry.command);
    }

    // #endregion

    // #region 渲染

    function createElement(tag, className, text) {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (text) element.textContent = text;
      return element;
    }

    function createSection(title, modifier) {
      const section = createElement("section", `command-palette-section command-palette-section--${modifier}`);
      section.setAttribute("role", "group");
      if (title) {
        section.setAttribute("aria-label", title);
        section.appendChild(createElement("header", "", title));
      }
      return section;
    }

    // 选项的 ARIA 属性在创建时一次写好，避免插入后再遍历一遍 DOM 改属性
    function createItem(tag, modifier) {
      const item = createElement(tag, `command-palette-item command-palette-item--${modifier}`);
      item.id = `command-palette-option-${items.length}`;
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", "false");
      item.tabIndex = -1;
      items.push(item);
      return item;
    }

    function renderIcon(command) {
      const icon = createElement("span", "command-palette-item-icon");
      icon.setAttribute("aria-hidden", "true");
      if (command.swatch) {
        // data-theme 让色板变量在该元素上按目标主题求值
        const swatch = createElement("span", "command-palette-swatch");
        swatch.dataset.theme = command.swatch;
        icon.appendChild(swatch);
      } else if (command.glyph) {
        const glyph = createElement("span", "command-palette-glyph", "Aa");
        glyph.dataset.typeface = command.glyph;
        icon.appendChild(glyph);
      } else {
        const svg = createIcon(resolve(command.icon));
        if (svg) icon.appendChild(svg);
      }
      return icon;
    }

    function renderCommand(command, keywords, showHint) {
      const isLink = Boolean(command.url);
      const item = createItem(isLink ? "a" : "button", "command");
      if (isLink) item.href = command.url;
      else item.type = "button";
      item.dataset.commandId = command.id;
      item.appendChild(renderIcon(command));

      const content = createElement("span", "command-palette-item-content");
      const title = createElement("span", "command-palette-item-title");
      title.innerHTML = findAndHighlight(resolve(command.label), keywords);
      content.appendChild(title);
      item.appendChild(content);

      const hint = showHint ? resolve(command.hint) : "";
      if (hint) item.appendChild(createElement("span", "command-palette-item-hint", hint));
      if (command.current?.()) {
        const check = createElement("span", "command-palette-item-check");
        check.setAttribute("role", "img");
        check.setAttribute("aria-label", translation.current);
        check.appendChild(createIcon("check", 14));
        item.appendChild(check);
      }
      if (command.opener) {
        const chevron = createElement("span", "command-palette-item-chevron");
        chevron.setAttribute("aria-hidden", "true");
        chevron.appendChild(createIcon("chevron-right", 14));
        item.appendChild(chevron);
      }
      return item;
    }

    function renderDocument(doc, keywords, icon) {
      const item = createItem("a", "document");
      item.href = doc.link;
      item.appendChild(renderIcon({ icon }));
      const content = createElement("span", "command-palette-item-content");
      const title = createElement("span", "command-palette-item-title");
      title.innerHTML = findAndHighlight(doc.title || translation.untitled, keywords, 0, doc._lowerTitle);
      content.appendChild(title);
      if (doc.text) {
        const preview = createElement("span", "command-palette-item-preview");
        preview.innerHTML = findAndHighlight(doc.text, keywords, 100, doc._lowerText);
        content.appendChild(preview);
      }
      item.appendChild(content);
      return item;
    }

    function renderTag(tag, keywords) {
      const item = createItem("a", "tag");
      item.href = tag.link;
      const title = createElement("span", "command-palette-item-title");
      title.innerHTML = findAndHighlight(tag.name, keywords, 0, tag._lowerName);
      item.appendChild(title);
      return item;
    }

    function appendSection(fragment, title, modifier, list, renderItem) {
      if (!list.length) return;
      const section = createSection(title, modifier);
      for (const entry of list) section.appendChild(renderItem(entry));
      fragment.appendChild(section);
    }

    function renderGroupView(fragment, name, keywords) {
      const group = groups[name];
      const members = groupMembers.get(name);
      const matched = keywords.length ? searchCommands(members, keywords) : members;
      for (const section of group.sections) {
        const list = section.key ? matched.filter((command) => command.section === section.key) : matched;
        appendSection(fragment, section.label, "commands", list, (command) => renderCommand(command, keywords, false));
      }
    }

    function renderDefaultView(fragment, scope) {
      appendSection(fragment, translation.commands, "commands", topLevelCommands, (command) => renderCommand(command, [], true));
      if (scope === "all" && dataset?.posts.length) {
        appendSection(fragment, translation.recent, "posts", dataset.posts.slice(0, RECENT_POSTS), (post) => renderDocument(post, [], "file-text"));
      }
    }

    function renderSearchView(fragment, scope, keywords) {
      if (scope !== "tags") {
        appendSection(fragment, translation.commands, "commands", searchCommands(commands, keywords), (command) => renderCommand(command, keywords, true));
      }
      if (scope === "commands" || !dataset) return;
      if (scope === "all") {
        appendSection(fragment, translation.posts, "posts", rankList(dataset.posts, DOCUMENT_FIELDS, keywords, MAX_POSTS), (post) => renderDocument(post, keywords, "file-text"));
        appendSection(fragment, translation.pages, "pages", rankList(dataset.pages, DOCUMENT_FIELDS, keywords, MAX_PAGES), (page) => renderDocument(page, keywords, "file"));
      }
      appendSection(fragment, translation.tags, "tags", rankList(dataset.tags, TAG_FIELDS, keywords), (tag) => renderTag(tag, keywords));
    }

    function render() {
      if (renderRequest) {
        window.cancelAnimationFrame(renderRequest);
        renderRequest = 0;
      }
      snapshot = {};
      items = [];
      activeIndex = -1;

      const { scope, keywords } = parseQuery(input.value);
      const fragment = document.createDocumentFragment();
      if (activeGroup) {
        renderGroupView(fragment, activeGroup, keywords);
      } else if (keywords.length) {
        renderSearchView(fragment, scope, keywords);
      } else if (scope === "tags") {
        if (dataset) appendSection(fragment, translation.tags, "tags", dataset.tags, (tag) => renderTag(tag, []));
      } else {
        renderDefaultView(fragment, scope);
      }

      // 数据尚未到达时不急着报「无结果」，fetch 完成后会再渲染一次
      const settled = activeGroup || scope === "commands" || dataset;
      if (!fragment.childElementCount && settled) {
        fragment.appendChild(createElement("div", "command-palette-empty", translation.noResults));
      }
      container.replaceChildren(fragment);
      snapshot = null;

      input.setAttribute("aria-expanded", items.length ? "true" : "false");
      // 首项默认选中，回车即执行
      if (items.length) setActive(0);
      else input.removeAttribute("aria-activedescendant");
    }

    // 连续按键 / 输入法组合期间一帧内可能触发多次 input，合并到下一帧渲染一次
    function scheduleRender() {
      if (renderRequest) return;
      renderRequest = window.requestAnimationFrame(() => {
        renderRequest = 0;
        render();
      });
    }

    // 键盘操作依赖最新的选项列表，先把待渲染冲刷掉
    function flushRender() {
      if (renderRequest) render();
    }

    function setActive(index) {
      if (index === activeIndex || !items[index]) return;
      const previous = items[activeIndex];
      if (previous) {
        previous.classList.remove("active");
        previous.setAttribute("aria-selected", "false");
      }
      activeIndex = index;
      const item = items[index];
      item.classList.add("active");
      item.setAttribute("aria-selected", "true");
      input.setAttribute("aria-activedescendant", item.id);
    }

    function moveActive(delta) {
      if (!items.length) return;
      setActive((activeIndex + delta + items.length) % items.length);
      items[activeIndex].scrollIntoView?.({ block: "nearest" });
    }

    // #endregion

    // #region 子列表

    function renderScope() {
      scopeChip?.remove();
      scopeChip = null;
      if (!activeGroup) {
        input.placeholder = translation.hint;
        return;
      }
      scopeChip = createElement("button", "command-palette-scope");
      scopeChip.type = "button";
      scopeChip.title = translation.back;
      scopeChip.appendChild(createIcon("arrow-left", 12));
      scopeChip.appendChild(createElement("span", "", groups[activeGroup].label));
      scopeChip.addEventListener("click", leaveGroup);
      inputContainer.insertBefore(scopeChip, input);
      input.placeholder = translation.filter;
    }

    function enterGroup(name) {
      activeGroup = name;
      input.value = "";
      renderScope();
      render();
      input.focus();
    }

    function leaveGroup() {
      activeGroup = null;
      input.value = "";
      renderScope();
      render();
      input.focus();
    }

    // #endregion

    function execute(item) {
      const command = item.dataset.commandId ? commandsById.get(item.dataset.commandId) : null;
      if (command?.opener) {
        enterGroup(command.opener);
        return;
      }
      // 文章 / 标签 / 导航命令是 <a>：先收起弹层再交给浏览器默认跳转，
      // 否则 popover 的开合状态随 DOM 进 bfcache，返回上一页时仍压着一层浮层
      main.hidePopover();
      command?.run?.();
    }

    // #region 数据加载与事件

    function prepareDocument(doc) {
      doc.title = decodeHTML(doc.title);
      doc.text = decodeHTML(doc.text);
      doc._lowerTitle = doc.title ? doc.title.toLowerCase() : "";
      doc._lowerText = doc.text ? doc.text.toLowerCase() : "";
    }

    function fetchData() {
      if (dataset || isLoading) return;
      isLoading = true;
      fetch(config.contentUrl)
        .then((response) => response.json())
        .then((json) => {
          const data = { posts: json.posts || [], pages: json.pages || [], tags: json.tags || [] };
          data.posts.forEach(prepareDocument);
          data.pages.forEach(prepareDocument);
          for (const tag of data.tags) {
            tag.name = decodeHTML(tag.name);
            tag.slug = decodeHTML(tag.slug);
            tag._lowerName = tag.name ? tag.name.toLowerCase() : "";
            tag._lowerSlug = tag.slug ? tag.slug.toLowerCase() : "";
          }
          dataset = data;
          isLoading = false;
          if (main.matches(":popover-open")) render();
        })
        .catch((error) => {
          console.error("[gnix] Command palette: failed to load content.json", error);
          isLoading = false;
        });
    }

    // 索引有上 MB：悬停 / 聚焦到导航条的搜索按钮就开始拉取，点开时数据多半已就绪
    document.querySelectorAll('[popovertarget="command-palette"]').forEach((trigger) => {
      trigger.addEventListener("pointerenter", fetchData, { passive: true });
      trigger.addEventListener("focus", fetchData);
    });

    input.addEventListener("input", scheduleRender);

    // 鼠标与键盘共用选中态；只响应实际位移，列表重绘或键盘滚动不抢回选中项。
    container.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      if (lastPointerPosition?.x === event.clientX && lastPointerPosition?.y === event.clientY) return;
      lastPointerPosition = { x: event.clientX, y: event.clientY };
      const item = event.target.closest(".command-palette-item");
      const index = items.indexOf(item);
      if (index !== -1) setActive(index);
    });

    container.addEventListener("pointerleave", () => {
      lastPointerPosition = null;
    });

    input.addEventListener("keydown", (event) => {
      // 中文等输入法组合期间的回车 / 方向键属于输入法，不能当作面板操作
      if (event.isComposing) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        flushRender();
        moveActive(event.key === "ArrowDown" ? 1 : -1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        flushRender();
        items[activeIndex]?.click();
      } else if (event.key === "Backspace" && activeGroup && !input.value) {
        event.preventDefault();
        leaveGroup();
      } else if (event.key === "Escape" && activeGroup) {
        // 子列表中 Esc 先返回上一层；阻止默认以免同时触发 popover 的轻触关闭
        event.preventDefault();
        leaveGroup();
      }
    });

    main.addEventListener("click", (event) => {
      if (event.target === main) {
        main.hidePopover();
        return;
      }
      const item = event.target.closest(".command-palette-item");
      if (item) execute(item);
    });

    main.addEventListener("toggle", (event) => {
      lastPointerPosition = null;
      if (event.newState === "open") {
        fetchData();
        activeGroup = null;
        input.value = pendingQuery;
        pendingQuery = "";
        renderScope();
        render();
        input.focus();
        return;
      }
      if (renderRequest) {
        window.cancelAnimationFrame(renderRequest);
        renderRequest = 0;
      }
      activeGroup = null;
      input.value = "";
      renderScope();
      container.replaceChildren();
      items = [];
      activeIndex = -1;
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
    });

    function open(query = "") {
      if (main.matches(":popover-open")) {
        activeGroup = null;
        input.value = query;
        renderScope();
        render();
        input.focus();
        return;
      }
      pendingQuery = query;
      main.showPopover();
    }

    window.gnixCommandPalette = { open, close: () => main.hidePopover() };

    if (["#command-palette", "#insight-search"].includes(location.hash.trim())) main.showPopover();

    // #endregion
  }

  loadCommandPalette.utils = { escapeHTML, parseQuery, rankList, findAndHighlight, decodeHTML };
  window.loadCommandPalette = loadCommandPalette;
})(window, document);
