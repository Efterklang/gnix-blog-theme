/* 命令面板（原 Insight 搜索框）：一个输入框同时检索文章 / 页面 / 标签与内置命令。
   `>` 前缀只搜命令，`#` 前缀只搜标签；空查询列出顶层命令与最近文章。
   主题 / 字体这类选项多的命令折成子列表：选中后进入该组，输入框前出现范围标签，
   空输入时 Backspace、Esc 或点击标签返回上一层。
   由 layout/common/command_palette.jsx 的内联脚本调用 window.loadCommandPalette；
   外部可通过 window.gnixCommandPalette.open(query) 打开并预填查询 */
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

  // lucide 图标的路径片段，外层 svg 由 iconSvg 统一包装
  const ICONS = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
    palette:
      '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
    type: '<path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/>',
    languages: '<path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>',
    settings: '<path d="M14 17H5"/><path d="M19 7h-9"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
    "arrow-right": '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    "arrow-left": '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    "chevron-right": '<path d="m9 18 6-6-6-6"/>',
  };

  // 尺寸直接写在 svg 属性上，样式表无需按上下文覆盖 svg 选择器
  function iconSvg(name, size = 16) {
    const body = ICONS[name];
    if (!body) return "";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;
  }

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
    let dataset = null;
    let isLoading = false;
    let activeGroup = null;
    let scopeChip = null;
    let pendingQuery = "";

    // content.json 中的字段可能已被 HTML 实体编码（如 / → &#x2F;），需先解码再用于匹配和渲染
    const decoder = document.createElement("textarea");
    function decodeHTML(value) {
      if (!value) return value;
      decoder.innerHTML = value;
      return decoder.value;
    }

    // #region 状态读取：每次渲染实时读取，命令执行后再次打开即反映最新状态

    function getThemeState() {
      const preferences = typeof window.getThemePreferences === "function" ? window.getThemePreferences() : {};
      const resolved = typeof window.getResolvedTheme === "function" ? window.getResolvedTheme() : html.dataset.theme || "";
      const schemeMap = window.__GNIX_THEME_CONFIG__?.themeSchemeMap || {};
      const isDark = schemeMap[resolved] ? schemeMap[resolved] === "night" : html.classList.contains("night");
      return { preferences, resolved, isDark };
    }

    function getThemeName(value) {
      return config.themes.find((theme) => theme.value === value)?.name || value;
    }

    function getTypeface() {
      return window.gnixPreferences?.getArticleFontSettings?.().type || html.dataset.articleFontFamily || "";
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
        icon: "monitor",
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
      ...config.themes.map((theme) => ({
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
        icon.innerHTML = iconSvg(resolve(command.icon));
      }
      return icon;
    }

    function renderCommand(command, keywords, showHint) {
      const isLink = Boolean(command.url);
      const item = document.createElement(isLink ? "a" : "button");
      if (isLink) item.href = command.url;
      else item.type = "button";
      item.className = "command-palette-item command-palette-item--command";
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
        check.innerHTML = iconSvg("check", 14);
        item.appendChild(check);
      }
      if (command.opener) {
        const chevron = createElement("span", "command-palette-item-chevron");
        chevron.setAttribute("aria-hidden", "true");
        chevron.innerHTML = iconSvg("chevron-right", 14);
        item.appendChild(chevron);
      }
      return item;
    }

    function renderDocument(doc, keywords) {
      const item = document.createElement("a");
      item.href = doc.link;
      item.className = "command-palette-item command-palette-item--document";
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
      const item = document.createElement("a");
      item.href = tag.link;
      item.className = "command-palette-item command-palette-item--tag";
      const title = createElement("span", "command-palette-item-title");
      title.innerHTML = findAndHighlight(tag.name, keywords, 0, tag._lowerName);
      item.appendChild(title);
      return item;
    }

    function appendSection(fragment, title, modifier, items, renderItem) {
      if (!items.length) return;
      const section = createSection(title, modifier);
      for (const item of items) section.appendChild(renderItem(item));
      fragment.appendChild(section);
    }

    function renderGroupView(fragment, name, keywords) {
      const group = groups[name];
      const members = commands.filter((command) => command.group === name);
      const matched = keywords.length ? searchCommands(members, keywords) : members;
      for (const section of group.sections) {
        const items = section.key ? matched.filter((command) => command.section === section.key) : matched;
        appendSection(fragment, section.label, "commands", items, (command) => renderCommand(command, keywords, false));
      }
    }

    function renderDefaultView(fragment, scope) {
      const topLevel = commands.filter((command) => !command.group);
      appendSection(fragment, translation.commands, "commands", topLevel, (command) => renderCommand(command, [], true));
      if (scope === "all" && dataset?.posts.length) {
        appendSection(fragment, translation.recent, "posts", dataset.posts.slice(0, RECENT_POSTS), (post) => renderDocument(post, []));
      }
    }

    function renderSearchView(fragment, scope, keywords) {
      if (scope !== "tags") {
        appendSection(fragment, translation.commands, "commands", searchCommands(commands, keywords), (command) => renderCommand(command, keywords, true));
      }
      if (scope === "commands" || !dataset) return;
      if (scope === "all") {
        appendSection(fragment, translation.posts, "posts", rankList(dataset.posts, DOCUMENT_FIELDS, keywords, MAX_POSTS), (post) => renderDocument(post, keywords));
        appendSection(fragment, translation.pages, "pages", rankList(dataset.pages, DOCUMENT_FIELDS, keywords, MAX_PAGES), (page) => renderDocument(page, keywords));
      }
      appendSection(fragment, translation.tags, "tags", rankList(dataset.tags, TAG_FIELDS, keywords), (tag) => renderTag(tag, keywords));
    }

    function render() {
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

      const items = container.querySelectorAll(".command-palette-item");
      items.forEach((item, index) => {
        item.id = `command-palette-option-${index}`;
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", "false");
        item.tabIndex = -1;
      });
      input.setAttribute("aria-expanded", items.length ? "true" : "false");
      input.removeAttribute("aria-activedescendant");
      // 首项默认选中，回车即执行
      if (items.length) setActive(items[0]);
    }

    function setActive(item) {
      const previous = container.querySelector(".command-palette-item.active");
      if (previous && previous !== item) {
        previous.classList.remove("active");
        previous.setAttribute("aria-selected", "false");
      }
      item.classList.add("active");
      item.setAttribute("aria-selected", "true");
      input.setAttribute("aria-activedescendant", item.id);
    }

    function moveActive(delta) {
      const items = Array.from(container.querySelectorAll(".command-palette-item"));
      if (!items.length) return;
      const index = items.findIndex((item) => item.classList.contains("active"));
      const next = items[(index + delta + items.length) % items.length];
      setActive(next);
      next.scrollIntoView?.({ block: "nearest" });
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
      scopeChip.innerHTML = `${iconSvg("arrow-left", 12)}<span>${escapeHTML(groups[activeGroup].label)}</span>`;
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
      const command = item.dataset.commandId ? commands.find((entry) => entry.id === item.dataset.commandId) : null;
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

    input.addEventListener("input", render);

    input.addEventListener("keydown", (event) => {
      // 中文等输入法组合期间的回车 / 方向键属于输入法，不能当作面板操作
      if (event.isComposing) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        moveActive(event.key === "ArrowDown" ? 1 : -1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        container.querySelector(".command-palette-item.active")?.click();
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
      activeGroup = null;
      input.value = "";
      renderScope();
      container.replaceChildren();
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

  loadCommandPalette.utils = { escapeHTML, parseQuery, rankList, findAndHighlight };
  window.loadCommandPalette = loadCommandPalette;
})(window, document);
