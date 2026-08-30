((window, document) => {
  function runWhenActivated(callback) {
    (
      window.__gnixPrerender?.runWhenActivated ||
      ((fn) => {
        fn();
      })
    )(callback);
  }

  function whenReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
      callback();
    }
  }

  const themeConfig = window.__GNIX_THEME_CONFIG__ || {};
  const THEME_DEFAULT_PREFERENCES = themeConfig.defaultPreferences || { mode: "system", light: "nord", dark: "mocha" };

  function getDefaultThemePreferences() {
    return { ...THEME_DEFAULT_PREFERENCES };
  }

  function getThemePreferences() {
    if (typeof window.getThemePreferences === "function") return window.getThemePreferences();
    return getDefaultThemePreferences();
  }

  function applyThemePreferences(preferences) {
    if (typeof window.applyThemePreferences === "function") {
      window.applyThemePreferences(preferences, true);
    }
  }

  const articleFontConfig = window.__GNIX_ARTICLE_FONT_CONFIG__ || {};
  const ARTICLE_FONT_STORAGE_KEY = articleFontConfig.storageKey || "gnix-article-font";
  const ARTICLE_FONT_DEFAULT_SETTINGS = articleFontConfig.defaultSettings || { size: "medium", type: "sans-serif", lineHeight: 1.7, weight: "regular", width: "medium" };
  const ARTICLE_SIZE_LIST = articleFontConfig.sizeOptions || ["small", "medium-small", "medium", "medium-large", "large"];
  const ARTICLE_WIDTH_LIST = articleFontConfig.widthOptions || ["narrow", "medium-narrow", "medium", "medium-wide", "wide"];
  const ARTICLE_SIZE_OPTIONS = new Set(ARTICLE_SIZE_LIST);
  const ARTICLE_FONT_OPTIONS = new Set(articleFontConfig.fontOptions || ["sans-serif", "serif", "mono", "handwriting"]);
  const ARTICLE_WEIGHT_OPTIONS = new Set(articleFontConfig.weightOptions || ["light", "regular", "medium"]);
  const ARTICLE_WIDTH_OPTIONS = new Set(ARTICLE_WIDTH_LIST);
  const ARTICLE_LINE_HEIGHT_MIN = articleFontConfig.lineHeight?.min ?? 1.45;
  const ARTICLE_LINE_HEIGHT_MAX = articleFontConfig.lineHeight?.max ?? 1.9;
  const ARTICLE_LINE_HEIGHT_STEP = 0.05;
  const ARTICLE_CUSTOM_FONT_OPTIONS = articleFontConfig.customFonts?.familyOptions || {
    serif: "--font-serif",
    "sans-serif": "--font-sans-serif",
    mono: "--font-mono",
    handwriting: "--font-handwriting",
  };
  const ARTICLE_CUSTOM_FONT_IMPORT_LIMIT = articleFontConfig.customFonts?.importLimit ?? 6;
  const ARTICLE_CUSTOM_FONT_LINK_SELECTOR = 'link[data-gnix-custom-font="true"]';
  const ARTICLE_FONT_UTILS = window.__GNIX_ARTICLE_FONT_UTILS__ || {};

  function getCssVariableValue(name, fallback = "") {
    const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  // 各字体族变量的样式表默认值整页恒定：读取时先摘掉自定义字体的行内
  // 覆盖再取 computed value，结果缓存，避免反复触发强制样式重算
  let defaultCustomFontFamiliesCache = null;

  function getDefaultCustomFontFamilies() {
    if (defaultCustomFontFamiliesCache) return defaultCustomFontFamiliesCache;

    const html = document.documentElement;
    const saved = {};
    Object.values(ARTICLE_CUSTOM_FONT_OPTIONS).forEach((cssVar) => {
      const inline = html.style.getPropertyValue(cssVar);
      if (inline) {
        saved[cssVar] = inline;
        html.style.removeProperty(cssVar);
      }
    });

    const defaults = {};
    Object.keys(ARTICLE_CUSTOM_FONT_OPTIONS).forEach((key) => {
      defaults[key] = getCssVariableValue(ARTICLE_CUSTOM_FONT_OPTIONS[key]);
    });

    Object.keys(saved).forEach((cssVar) => {
      html.style.setProperty(cssVar, saved[cssVar]);
    });

    defaultCustomFontFamiliesCache = defaults;
    return defaults;
  }

  function normalizeStoredCustomFonts(value = {}) {
    return ARTICLE_FONT_UTILS.normalizeCustomFonts ? ARTICLE_FONT_UTILS.normalizeCustomFonts(value, ARTICLE_CUSTOM_FONT_OPTIONS, ARTICLE_CUSTOM_FONT_IMPORT_LIMIT) : { imports: [], families: {} };
  }

  function normalizeCustomFontsForUI(value = {}) {
    const normalized = normalizeStoredCustomFonts(value);
    const defaultFamilies = getDefaultCustomFontFamilies();

    Object.keys(ARTICLE_CUSTOM_FONT_OPTIONS).forEach((key) => {
      if (!normalized.families[key]) {
        normalized.families[key] = defaultFamilies[key] || "";
      }
    });

    return normalized;
  }

  // customFonts 须已经过 normalizeStoredCustomFonts（normalizeArticleFontSettings 内完成）
  function applyCustomFonts(customFonts) {
    if (ARTICLE_FONT_UTILS.applyCustomFontImports) {
      ARTICLE_FONT_UTILS.applyCustomFontImports(customFonts.imports, ARTICLE_CUSTOM_FONT_LINK_SELECTOR);
    }
    if (ARTICLE_FONT_UTILS.applyCustomFontFamilies) {
      ARTICLE_FONT_UTILS.applyCustomFontFamilies(document.documentElement, customFonts.families, ARTICLE_CUSTOM_FONT_OPTIONS);
    }
  }

  function normalizeArticleLineHeight(value) {
    if (value === "compact") return 1.55;
    if (value === "normal") return 1.7;
    if (value === "relaxed") return 1.85;

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return ARTICLE_FONT_DEFAULT_SETTINGS.lineHeight;
    return Math.min(ARTICLE_LINE_HEIGHT_MAX, Math.max(ARTICLE_LINE_HEIGHT_MIN, parsed));
  }

  function normalizeArticleFontSettings(value = {}) {
    const candidate = value || {};
    return {
      size: ARTICLE_SIZE_OPTIONS.has(candidate.size) ? candidate.size : ARTICLE_FONT_DEFAULT_SETTINGS.size,
      type: ARTICLE_FONT_OPTIONS.has(candidate.type) ? candidate.type : ARTICLE_FONT_DEFAULT_SETTINGS.type,
      lineHeight: normalizeArticleLineHeight(candidate.lineHeight),
      weight: ARTICLE_WEIGHT_OPTIONS.has(candidate.weight) ? candidate.weight : ARTICLE_FONT_DEFAULT_SETTINGS.weight,
      width: ARTICLE_WIDTH_OPTIONS.has(candidate.width) ? candidate.width : ARTICLE_FONT_DEFAULT_SETTINGS.width,
      customFonts: normalizeStoredCustomFonts(candidate.customFonts),
    };
  }

  function getArticleFontSettings() {
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(ARTICLE_FONT_STORAGE_KEY));
    } catch {
      stored = null;
    }
    return normalizeArticleFontSettings(stored);
  }

  // settings 须为 normalizeArticleFontSettings 的返回值
  function saveArticleFontSettings(settings) {
    try {
      localStorage.setItem(ARTICLE_FONT_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Keep controls interactive even when storage is unavailable.
    }
  }

  // settings 须为 normalizeArticleFontSettings 的返回值
  function applyArticleFontSettings(settings) {
    const html = document.documentElement;

    applyCustomFonts(settings.customFonts);
    html.dataset.articleFontSize = settings.size;
    html.dataset.articleFontFamily = settings.type;
    html.dataset.articleFontWeight = settings.weight;
    html.dataset.articleWidth = settings.width;
    html.style.setProperty("--article-line-height", String(settings.lineHeight));
    window.dispatchEvent(new CustomEvent("gnix:article-font-settings-change", { detail: settings }));
  }

  function initThemePreferences(root) {
    const modeButtons = root.querySelectorAll("[data-theme-mode]");
    const modeSelects = root.querySelectorAll("[data-theme-mode-select]");
    const paletteSelects = root.querySelectorAll("[data-theme-palette-select]");
    const schemeSelects = root.querySelectorAll(".theme-scheme-select[data-theme-scheme-kind]");
    const themePreviewPanes = root.querySelectorAll("[data-theme-preview-scheme]");
    const themeList = Array.isArray(themeConfig.themes) ? themeConfig.themes : [];
    const darkSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");

    // 快捷面板的调色板始终编辑“当前生效”的 scheme：
    // light/dark 模式编辑对应方案，system 模式按系统偏好落到 light 或 dark
    function resolveSchemeKind(preferences) {
      if (preferences.mode === "light") return "light";
      if (preferences.mode === "dark") return "dark";
      return darkSchemeQuery.matches ? "dark" : "light";
    }

    function rebuildPaletteSelect(select, preferences) {
      const kind = resolveSchemeKind(preferences);

      // 选项列表只随 kind 变化，kind 未变时仅同步选中值
      if (select.dataset.themePaletteKind !== kind) {
        const colorScheme = kind === "light" ? "light" : "night";
        const themes = themeList.filter((theme) => theme.colorScheme === colorScheme);
        if (!themes.length) return;

        select.dataset.themePaletteKind = kind;
        select.textContent = "";
        themes.forEach((theme) => {
          const option = document.createElement("option");
          option.value = theme.value;
          option.textContent = theme.name;
          select.appendChild(option);
        });
      }

      select.value = preferences[kind];
    }

    function sync(preferences = getThemePreferences()) {
      modeButtons.forEach((button) => {
        const active = button.dataset.themeMode === preferences.mode;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });

      modeSelects.forEach((select) => {
        select.value = preferences.mode;
      });

      paletteSelects.forEach((select) => {
        rebuildPaletteSelect(select, preferences);
      });

      schemeSelects.forEach((select) => {
        const value = preferences[select.dataset.themeSchemeKind];
        if (value) select.value = value;
      });

      themePreviewPanes.forEach((pane) => {
        const value = preferences[pane.dataset.themePreviewScheme];
        if (value) pane.dataset.theme = value;
      });
    }

    // window.applyThemePreferences 会同步派发 gnix:theme-change，下方监听器
    // 统一负责所有 root 的 UI 同步，各 handler 只需应用偏好、不重复 sync
    modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const preferences = getThemePreferences();
        preferences.mode = button.dataset.themeMode;
        applyThemePreferences(preferences);
      });
    });

    modeSelects.forEach((select) => {
      select.addEventListener("change", () => {
        const preferences = getThemePreferences();
        preferences.mode = select.value;
        applyThemePreferences(preferences);
      });
    });

    paletteSelects.forEach((select) => {
      select.addEventListener("change", () => {
        const preferences = getThemePreferences();
        const kind = select.dataset.themePaletteKind || resolveSchemeKind(preferences);
        preferences[kind] = select.value;
        applyThemePreferences(preferences);
      });
    });

    schemeSelects.forEach((select) => {
      select.addEventListener("change", () => {
        const preferences = getThemePreferences();
        preferences[select.dataset.themeSchemeKind] = select.value;
        applyThemePreferences(preferences);
      });
    });

    window.addEventListener("gnix:theme-change", (event) => {
      sync(event.detail?.preferences || getThemePreferences());
    });

    sync();
  }

  function initArticleFontPreferences(root) {
    let settings = getArticleFontSettings();
    let suppressSyncEvent = false;
    const lineHeightSlider = root.querySelector(".font-line-height-slider");
    const lineHeightValue = root.querySelector(".font-line-height-value");
    const fontTypeSelects = root.querySelectorAll("[data-article-font-select]");
    const stepButtons = root.querySelectorAll("[data-article-step]");
    const customFontForm = root.querySelector(".font-custom-form");
    const customFontImportInput = root.querySelector(".font-custom-imports");
    const customFontResetButton = root.querySelector(".font-custom-reset");
    const allSettingsResetButtons = root.querySelectorAll("[data-preference-reset-all]");
    const customFontFamilyInputs = root.querySelectorAll(".font-custom-family-input");
    const sizeButtons = root.querySelectorAll(".font-size-btn");
    const widthButtons = root.querySelectorAll(".font-width-btn");
    const typeButtons = root.querySelectorAll(".font-type-btn");
    const weightButtons = root.querySelectorAll(".font-weight-btn");
    // 快捷弹窗没有自定义字体表单，跳过相关 UI 同步（其中的默认字体族
    // 读取需要 getComputedStyle，成本不低）
    const hasCustomFontUI = Boolean(customFontImportInput || customFontFamilyInputs.length);

    function updateButtonStates(buttons, isActive) {
      buttons.forEach((btn) => {
        const active = isActive(btn);
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", String(active));
      });
    }

    function updateLineHeightUI() {
      if (lineHeightSlider) lineHeightSlider.value = String(settings.lineHeight);
      if (lineHeightValue) lineHeightValue.textContent = settings.lineHeight.toFixed(2);
    }

    function isStepDisabled(control, dir) {
      if (control === "lineHeight") {
        return dir < 0 ? settings.lineHeight <= ARTICLE_LINE_HEIGHT_MIN + 1e-9 : settings.lineHeight >= ARTICLE_LINE_HEIGHT_MAX - 1e-9;
      }
      const list = control === "width" ? ARTICLE_WIDTH_LIST : ARTICLE_SIZE_LIST;
      const index = list.indexOf(control === "width" ? settings.width : settings.size);
      if (index === -1) return false;
      return dir < 0 ? index === 0 : index === list.length - 1;
    }

    function updateStepperStates() {
      stepButtons.forEach((btn) => {
        btn.disabled = isStepDisabled(btn.dataset.articleStep, Number(btn.dataset.stepDir) || 0);
      });
    }

    function updateActiveStates() {
      updateButtonStates(sizeButtons, (btn) => btn.dataset.size === settings.size);
      updateButtonStates(typeButtons, (btn) => btn.dataset.font === settings.type);
      updateButtonStates(weightButtons, (btn) => btn.dataset.weight === settings.weight);
      updateButtonStates(widthButtons, (btn) => btn.dataset.width === settings.width);
      fontTypeSelects.forEach((select) => {
        select.value = settings.type;
      });
      updateStepperStates();
      updateLineHeightUI();
    }

    function updateCustomFontUI() {
      if (!hasCustomFontUI) return;

      const customFonts = normalizeCustomFontsForUI(settings.customFonts);
      if (customFontImportInput) customFontImportInput.value = customFonts.imports.join("\n");

      customFontFamilyInputs.forEach((input) => {
        input.value = customFonts.families[input.dataset.fontFamily] || "";
      });
    }

    function readCustomFontsFromUI() {
      const families = {};
      customFontFamilyInputs.forEach((input) => {
        families[input.dataset.fontFamily] = input.value;
      });
      return normalizeStoredCustomFonts({
        imports: customFontImportInput?.value || "",
        families,
      });
    }

    function commitSettings(nextSettings) {
      settings = normalizeArticleFontSettings(nextSettings);
      saveArticleFontSettings(settings);
      suppressSyncEvent = true;
      applyArticleFontSettings(settings);
      suppressSyncEvent = false;
      updateActiveStates();
    }

    function stepArticleSetting(control, dir) {
      if (!dir) return;
      if (control === "lineHeight") {
        const next = Math.round((settings.lineHeight + dir * ARTICLE_LINE_HEIGHT_STEP) * 100) / 100;
        commitSettings({ ...settings, lineHeight: normalizeArticleLineHeight(next) });
        return;
      }

      const isWidth = control === "width";
      const list = isWidth ? ARTICLE_WIDTH_LIST : ARTICLE_SIZE_LIST;
      const current = isWidth ? settings.width : settings.size;
      const index = list.indexOf(current);
      const nextIndex = Math.min(list.length - 1, Math.max(0, (index === -1 ? Math.floor(list.length / 2) : index) + dir));
      if (list[nextIndex] === current) return;
      commitSettings({ ...settings, [isWidth ? "width" : "size"]: list[nextIndex] });
    }

    stepButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        stepArticleSetting(btn.dataset.articleStep, Number(btn.dataset.stepDir) || 0);
      });
    });

    sizeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!ARTICLE_SIZE_OPTIONS.has(btn.dataset.size)) return;
        commitSettings({ ...settings, size: btn.dataset.size });
      });
    });

    widthButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!ARTICLE_WIDTH_OPTIONS.has(btn.dataset.width)) return;
        commitSettings({ ...settings, width: btn.dataset.width });
      });
    });

    typeButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!ARTICLE_FONT_OPTIONS.has(btn.dataset.font)) return;
        commitSettings({ ...settings, type: btn.dataset.font });
      });
    });

    fontTypeSelects.forEach((select) => {
      select.addEventListener("change", () => {
        if (!ARTICLE_FONT_OPTIONS.has(select.value)) return;
        commitSettings({ ...settings, type: select.value });
      });
    });

    if (lineHeightSlider) {
      lineHeightSlider.min = String(ARTICLE_LINE_HEIGHT_MIN);
      lineHeightSlider.max = String(ARTICLE_LINE_HEIGHT_MAX);
      lineHeightSlider.step = String(ARTICLE_LINE_HEIGHT_STEP);
      lineHeightSlider.addEventListener("input", () => {
        commitSettings({ ...settings, lineHeight: normalizeArticleLineHeight(lineHeightSlider.value) });
      });
    }

    weightButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!ARTICLE_WEIGHT_OPTIONS.has(btn.dataset.weight)) return;
        commitSettings({ ...settings, weight: btn.dataset.weight });
      });
    });

    // 自定义字体无独立 Apply 按钮：输入完成（change，即失焦或按 Enter 提交）
    // 时直接应用；提交后回写规范化的值
    function commitCustomFonts() {
      commitSettings({ ...settings, customFonts: readCustomFontsFromUI() });
      updateCustomFontUI();
    }

    if (customFontForm) {
      customFontForm.addEventListener("submit", (event) => {
        event.preventDefault();
        commitCustomFonts();
      });

      [customFontImportInput, ...customFontFamilyInputs].forEach((input) => {
        input?.addEventListener("change", commitCustomFonts);
      });

      // 无 submit 按钮时浏览器不会对多字段表单做隐式提交，手动响应 Enter
      customFontFamilyInputs.forEach((input) => {
        input.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          commitCustomFonts();
        });
      });
    }

    if (customFontResetButton) {
      customFontResetButton.addEventListener("click", () => {
        commitSettings({ ...settings, customFonts: { imports: [], families: {} } });
        updateCustomFontUI();
      });
    }

    allSettingsResetButtons.forEach((button) => {
      button.addEventListener("click", () => {
        applyThemePreferences(getDefaultThemePreferences());
        commitSettings({ ...ARTICLE_FONT_DEFAULT_SETTINGS, customFonts: { imports: [], families: {} } });
        updateCustomFontUI();
      });
    });

    // 弹窗与设置页可能同时存在于一个文档中，跨根保持 UI 一致
    window.addEventListener("gnix:article-font-settings-change", (event) => {
      if (suppressSyncEvent || !event.detail) return;
      settings = normalizeArticleFontSettings(event.detail);
      updateActiveStates();
      updateCustomFontUI();
    });

    // 首帧样式已由 head 内联脚本应用；这里重放一次以覆盖预渲染场景
    // （prerender 之后、激活之前偏好在别的页面被改动）。抑制自身监听器，
    // 避免 init 期间重复刷新一遍 UI
    suppressSyncEvent = true;
    applyArticleFontSettings(settings);
    suppressSyncEvent = false;
    updateActiveStates();
    updateCustomFontUI();
  }

  function initNavigationControls(root) {
    // 弹窗里的链接和语言切换都会离开当前页，跳转前先收起弹窗：popover 的开合
    // 状态随 DOM 一起进 bfcache，否则返回上一页时还压着一层浮层。
    // 设置页的 root 不在 popover 内，closest 返回 null，closePopup 即空操作
    const popup = root.closest("[popover]");
    const closePopup = () => popup?.hidePopover?.();

    root.addEventListener("click", (event) => {
      if (event.target.closest("a[href]")) closePopup();
    });

    root.querySelectorAll("[data-language-select]").forEach((select) => {
      select.addEventListener("change", () => {
        const url = select.value;
        if (!url) return;
        // 先恢复当前语言选项，避免 bfcache 返回时残留目标语言
        select.value = "";
        closePopup();
        window.location.assign(url);
      });
    });

    root.querySelectorAll("[data-preference-back]").forEach((button) => {
      button.addEventListener("click", () => {
        if (window.history.length > 1) {
          window.history.back();
          return;
        }
        window.location.assign(button.dataset.homeUrl || "/");
      });
    });
  }

  function initPreferenceRoot(root) {
    if (!root || root.dataset.bound === "true") return;
    root.dataset.bound = "true";
    initThemePreferences(root);
    initArticleFontPreferences(root);
    initNavigationControls(root);
  }

  function initPreferencesPage() {
    document.querySelectorAll("[data-preferences-page]").forEach(initPreferenceRoot);
  }

  whenReady(() => runWhenActivated(initPreferencesPage));
})(window, document);
