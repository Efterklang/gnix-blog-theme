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
      return window.applyThemePreferences(preferences, true);
    }
    return preferences;
  }

  const articleFontConfig = window.__GNIX_ARTICLE_FONT_CONFIG__ || {};
  const ARTICLE_FONT_STORAGE_KEY = articleFontConfig.storageKey || "gnix-article-font";
  const ARTICLE_FONT_DEFAULT_SETTINGS = articleFontConfig.defaultSettings || { size: "medium", type: "serif", lineHeight: 1.7, weight: "regular", width: "medium" };
  const ARTICLE_SIZE_LIST = articleFontConfig.sizeOptions || ["small", "medium-small", "medium", "medium-large", "large"];
  const ARTICLE_WIDTH_LIST = articleFontConfig.widthOptions || ["narrow", "medium-narrow", "medium", "medium-wide", "wide"];
  const ARTICLE_SIZE_OPTIONS = new Set(ARTICLE_SIZE_LIST);
  const ARTICLE_FONT_OPTIONS = new Set(articleFontConfig.fontOptions || ["serif", "sans-serif", "mono", "handwriting"]);
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
    if (typeof document === "undefined") return fallback;

    const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  function getDefaultCustomFontFamilies() {
    if (typeof document === "undefined") return {};

    const html = document.documentElement;
    const saved = {};
    Object.values(ARTICLE_CUSTOM_FONT_OPTIONS).forEach((cssVar) => {
      const inline = html.style.getPropertyValue(cssVar);
      if (inline) {
        saved[cssVar] = inline;
        html.style.removeProperty(cssVar);
      }
    });

    const defaults = {
      serif: getCssVariableValue(ARTICLE_CUSTOM_FONT_OPTIONS.serif),
      "sans-serif": getCssVariableValue(ARTICLE_CUSTOM_FONT_OPTIONS["sans-serif"]),
      mono: getCssVariableValue(ARTICLE_CUSTOM_FONT_OPTIONS.mono),
      handwriting: getCssVariableValue(ARTICLE_CUSTOM_FONT_OPTIONS.handwriting),
    };

    Object.keys(saved).forEach((cssVar) => {
      html.style.setProperty(cssVar, saved[cssVar]);
    });

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

  function applyCustomFonts(customFonts = {}) {
    const normalized = normalizeStoredCustomFonts(customFonts);
    if (ARTICLE_FONT_UTILS.applyCustomFontImports) {
      ARTICLE_FONT_UTILS.applyCustomFontImports(normalized.imports, ARTICLE_CUSTOM_FONT_LINK_SELECTOR);
    }
    if (ARTICLE_FONT_UTILS.applyCustomFontFamilies) {
      ARTICLE_FONT_UTILS.applyCustomFontFamilies(document.documentElement, normalized.families, ARTICLE_CUSTOM_FONT_OPTIONS);
    }
    return normalized;
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
    let settings = { ...ARTICLE_FONT_DEFAULT_SETTINGS };
    try {
      const stored = localStorage.getItem(ARTICLE_FONT_STORAGE_KEY);
      if (stored) settings = normalizeArticleFontSettings({ ...ARTICLE_FONT_DEFAULT_SETTINGS, ...JSON.parse(stored) });
    } catch {
      settings = { ...ARTICLE_FONT_DEFAULT_SETTINGS };
    }
    return normalizeArticleFontSettings(settings);
  }

  function saveArticleFontSettings(settings) {
    try {
      localStorage.setItem(ARTICLE_FONT_STORAGE_KEY, JSON.stringify(normalizeArticleFontSettings(settings)));
    } catch {
      // Keep controls interactive even when storage is unavailable.
    }
  }

  function applyArticleFontSettings(settings = getArticleFontSettings()) {
    const normalized = normalizeArticleFontSettings(settings);
    const html = document.documentElement;

    applyCustomFonts(normalized.customFonts);
    html.dataset.articleFontSize = normalized.size;
    html.dataset.articleFontFamily = normalized.type;
    html.dataset.articleLineHeight = String(normalized.lineHeight);
    html.dataset.articleFontWeight = normalized.weight;
    html.dataset.articleWidth = normalized.width;
    html.style.setProperty("--article-line-height", String(normalized.lineHeight));
    window.dispatchEvent(new CustomEvent("gnix:article-font-settings-change", { detail: normalized }));
    return normalized;
  }

  function initThemePreferences(root) {
    const modeButtons = root.querySelectorAll("[data-theme-mode]");
    const modeSelects = root.querySelectorAll("[data-theme-mode-select]");
    const paletteSelects = root.querySelectorAll("[data-theme-palette-select]");
    const schemeSelects = root.querySelectorAll(".theme-scheme-select[data-theme-scheme-kind]");
    const themePreviewPanes = root.querySelectorAll("[data-theme-preview-scheme]");
    const themeList = Array.isArray(themeConfig.themes) ? themeConfig.themes : [];

    // 快捷面板的调色板始终编辑“当前生效”的 scheme：
    // light/dark 模式编辑对应方案，system 模式按系统偏好落到 light 或 dark
    function resolveSchemeKind(preferences) {
      if (preferences.mode === "light") return "light";
      if (preferences.mode === "dark") return "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    function rebuildPaletteSelect(select, preferences) {
      const kind = resolveSchemeKind(preferences);
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

    modeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const preferences = getThemePreferences();
        preferences.mode = button.dataset.themeMode;
        sync(applyThemePreferences(preferences));
      });
    });

    modeSelects.forEach((select) => {
      select.addEventListener("change", () => {
        const preferences = getThemePreferences();
        preferences.mode = select.value;
        sync(applyThemePreferences(preferences));
      });
    });

    paletteSelects.forEach((select) => {
      select.addEventListener("change", () => {
        const preferences = getThemePreferences();
        const kind = select.dataset.themePaletteKind || resolveSchemeKind(preferences);
        preferences[kind] = select.value;
        sync(applyThemePreferences(preferences));
      });
    });

    schemeSelects.forEach((select) => {
      select.addEventListener("change", () => {
        const preferences = getThemePreferences();
        preferences[select.dataset.themeSchemeKind] = select.value;
        sync(applyThemePreferences(preferences));
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
    const customFontToggleButton = root.querySelector(".font-custom-toggle");
    const customFontPanel = root.querySelector(".font-custom-panel");

    function updateButtonStates(selector, isActive) {
      root.querySelectorAll(selector).forEach((btn) => {
        const active = isActive(btn);
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-pressed", String(active));
      });
    }

    function syncCustomFontPanelState(expanded) {
      if (!customFontToggleButton || !customFontPanel) return;
      customFontToggleButton.setAttribute("aria-expanded", String(expanded));
      customFontPanel.hidden = !expanded;
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
      updateButtonStates(".font-size-btn", (btn) => btn.dataset.size === settings.size);
      updateButtonStates(".font-type-btn", (btn) => btn.dataset.font === settings.type);
      updateButtonStates(".font-weight-btn", (btn) => btn.dataset.weight === settings.weight);
      updateButtonStates(".font-width-btn", (btn) => btn.dataset.width === settings.width);
      fontTypeSelects.forEach((select) => {
        select.value = settings.type;
      });
      updateStepperStates();
      updateLineHeightUI();
    }

    function updateCustomFontUI() {
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

    syncCustomFontPanelState(false);

    if (customFontToggleButton && customFontPanel) {
      customFontToggleButton.addEventListener("click", () => {
        const expanded = customFontToggleButton.getAttribute("aria-expanded") === "true";
        syncCustomFontPanelState(!expanded);
      });
    }

    stepButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        stepArticleSetting(btn.dataset.articleStep, Number(btn.dataset.stepDir) || 0);
      });
    });

    root.querySelectorAll(".font-size-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!ARTICLE_SIZE_OPTIONS.has(btn.dataset.size)) return;
        commitSettings({ ...settings, size: btn.dataset.size });
      });
    });

    root.querySelectorAll(".font-width-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!ARTICLE_WIDTH_OPTIONS.has(btn.dataset.width)) return;
        commitSettings({ ...settings, width: btn.dataset.width });
      });
    });

    root.querySelectorAll(".font-type-btn").forEach((btn) => {
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
      lineHeightSlider.step = "0.05";
      lineHeightSlider.addEventListener("input", () => {
        commitSettings({ ...settings, lineHeight: normalizeArticleLineHeight(lineHeightSlider.value) });
      });
    }

    root.querySelectorAll(".font-weight-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (!ARTICLE_WEIGHT_OPTIONS.has(btn.dataset.weight)) return;
        commitSettings({ ...settings, weight: btn.dataset.weight });
      });
    });

    if (customFontForm) {
      customFontForm.addEventListener("submit", (event) => {
        event.preventDefault();
        commitSettings({ ...settings, customFonts: readCustomFontsFromUI() });
        updateCustomFontUI();
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
        applyThemePreferences(getDefaultThemePreferences(), true);
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

    applyArticleFontSettings(settings);
    updateActiveStates();
    updateCustomFontUI();
  }

  function initNavigationControls(root) {
    root.querySelectorAll("[data-language-select]").forEach((select) => {
      select.addEventListener("change", () => {
        const url = select.value;
        if (!url) return;
        // 先恢复当前语言选项，避免 bfcache 返回时残留目标语言
        select.value = "";
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

  window.__gnixInitPreferencesPage = () => runWhenActivated(initPreferencesPage);

  whenReady(window.__gnixInitPreferencesPage);
})(window, document);
