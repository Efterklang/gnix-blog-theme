function showSiteToast(message) {
  if (!message) return;

  let toast = document.getElementById("site-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "site-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.className = "site-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("is-visible");

  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 1800);
}

window.showSiteToast = showSiteToast;

function twikoo_handler() {
  const el = document.getElementById("tko");
  if (!el) return;
  if (el.dataset.initialized === "true" || el.dataset.initializing === "true") return;

  const { envId, region, lang, jsUrl, cssUrl } = el.dataset;

  if (cssUrl) loadCSSOnce(cssUrl);

  const config = { envId, region, lang, el: "#tko" };

  if (typeof window.twikoo?.init === "function") {
    window.twikoo.init(config);
    el.dataset.initialized = "true";
    return;
  }

  el.dataset.initializing = "true";
  loadScriptOnce(jsUrl, () => {
    if (el.dataset.initialized === "true") {
      delete el.dataset.initializing;
      return;
    }
    window.twikoo.init(config);
    el.dataset.initialized = "true";
    delete el.dataset.initializing;
  });
}
// #region markdown-exit shiki
const SELECTORS = {
  figure: "figure.shiki",
  pre: "pre.shiki",
  code: "pre.shiki code",
  expandBtn: ".code-expand-btn",
};

const CLS = {
  copy: "copy-true",
  wrap: "wrap-active",
  expanded: "expanded",
  expandDone: "expand-done",
};

function addHighlightTool() {
  const figures = document.querySelectorAll(SELECTORS.figure);
  if (!figures.length) return;

  figures.forEach((figure) => {
    if (figure.hasAttribute("data-initialized")) return;
    figure.setAttribute("data-initialized", "true");

    const pre = figure.querySelector(SELECTORS.pre);
    const toolbar = figure.querySelector(".shiki-tools");
    const expandBtn = figure.querySelector(SELECTORS.expandBtn);

    // Copy button handler
    if (toolbar) {
      toolbar.addEventListener("click", (e) => {
        const target = e.target;
        if (target.closest(".copy-button")) {
          const btn = target.closest(".copy-button");
          const notice = btn.previousElementSibling;
          const code = figure.querySelector(SELECTORS.code);

          navigator.clipboard.writeText(code.innerText);
          notice.textContent = "Copied";
          notice.classList.add("show");
          setTimeout(() => notice.classList.remove("show"), 800);
        } else if (target.closest(".toggle-wrap")) {
          // Toggle wrap
          const code = figure.querySelector(SELECTORS.code);
          const enabled = code.style.whiteSpace !== "pre-wrap";
          code.style.whiteSpace = enabled ? "pre-wrap" : "pre";
          code.style.wordBreak = enabled ? "break-all" : "normal";
          target.closest(".toggle-wrap").classList.toggle(CLS.wrap, enabled);
        }
      });
    }

    // Expand button handler
    if (expandBtn) {
      expandBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const showLines = parseInt(figure.dataset.maxLines || "10", 10);
        const isExpanded = figure.classList.contains(CLS.expanded);

        if (isExpanded) {
          const computed = getComputedStyle(pre);
          const lineHeight = parseFloat(computed.lineHeight) || 20;
          const padding = (parseFloat(computed.paddingTop) || 0) + (parseFloat(computed.paddingBottom) || 0);
          figure.classList.remove(CLS.expanded);
          pre.style.maxHeight = `${showLines * lineHeight + padding}px`;
          expandBtn.classList.remove(CLS.expandDone);
        } else {
          figure.classList.add(CLS.expanded);
          pre.style.maxHeight = `${pre.scrollHeight}px`;
          expandBtn.classList.add(CLS.expandDone);

          setTimeout(() => {
            pre.style.maxHeight = "none";
          }, 300);
        }
      });
    }

    // Initialize collapsed state
    if (figure.dataset.collapsible === "true" && pre) {
      requestAnimationFrame(() => {
        const lineHeight = parseFloat(getComputedStyle(pre).lineHeight) || 20;
        const showLines = parseInt(figure.dataset.maxLines || "10", 10);
        pre.style.maxHeight = `${showLines * lineHeight}px`;
        pre.style.overflow = "hidden";
      });
    }
  });
}
// #endregion

// #region Keyboard Shortcuts

function handleKeyDown(e) {
  const isModifier = e.metaKey || e.ctrlKey;
  if (!isModifier) return;

  const tag = e.target.tagName;
  if (["INPUT", "TEXTAREA"].includes(tag) || e.target.isContentEditable) return;

  switch (e.code) {
    case "KeyT":
      e.preventDefault();
      document.getElementById("toc-body")?.togglePopover();
      break;
    case "KeyK":
      e.preventDefault();
      document.querySelector("#searchbox")?.showPopover();
      break;
    case "KeyP":
      if (!e.shiftKey) {
        e.preventDefault();
        document.querySelector("#theme-selector-popover")?.showPopover();
      }
      break;
  }
}

function loadCSSOnce(url) {
  if (!document.querySelector(`link[href="${url}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    document.head.appendChild(link);
  }
}

/**
 * 加载脚本一次，如果已存在则监听 load 事件
 */
function loadScriptOnce(url, onLoad) {
  const existingScript = document.querySelector(`script[src="${url}"]`);
  if (existingScript) {
    existingScript.addEventListener("load", onLoad);
  } else {
    const script = document.createElement("script");
    script.src = url;
    script.onload = onLoad;
    document.head.appendChild(script);
  }
}

function handleMermaid() {
  const containers = document.querySelectorAll(".mermaid-container");
  if (containers.length === 0) return;

  const cssUrl = "/css/optional/mermaid.css";
  const adapterUrl = "/js/mdit/mermaid.js";

  loadCSSOnce(cssUrl);

  const runInit = () => {
    const isNight = document.documentElement.classList.contains("night");
    const theme = isNight ? "dark" : "default";
    const libUrl = "/js/host/mermaid/mermaid.min.js";

    containers.forEach((container, index) => {
      if (!container.id) {
        container.id = `mermaid-${Date.now()}-${index}`;
      }
      if (window.initMermaidDiagram) {
        window.initMermaidDiagram(container.id, libUrl, theme, {});
      }
    });
  };

  if (window.initMermaidDiagram) {
    runInit();
  } else {
    loadScriptOnce(adapterUrl, runInit);
  }
}

// #endregion

const articleFontConfig = window.__GNIX_ARTICLE_FONT_CONFIG__ || {};
const ARTICLE_FONT_STORAGE_KEY = articleFontConfig.storageKey || "gnix-article-font";
const ARTICLE_FONT_DEFAULT_SETTINGS = articleFontConfig.defaultSettings || { size: "medium", type: "serif", lineHeight: 1.7, weight: "regular" };
const ARTICLE_SIZE_OPTIONS = new Set(articleFontConfig.sizeOptions || ["small", "medium-small", "medium", "medium-large", "large"]);
const ARTICLE_FONT_OPTIONS = new Set(articleFontConfig.fontOptions || ["serif", "sans-serif", "mono", "handwriting"]);
const ARTICLE_WEIGHT_OPTIONS = new Set(articleFontConfig.weightOptions || ["light", "regular", "medium"]);
const ARTICLE_LINE_HEIGHT_MIN = articleFontConfig.lineHeight?.min ?? 1.45;
const ARTICLE_LINE_HEIGHT_MAX = articleFontConfig.lineHeight?.max ?? 1.9;
const ARTICLE_CUSTOM_FONT_OPTIONS = articleFontConfig.customFonts?.familyOptions || {
  serif: "--font-serif",
  "sans-serif": "--font-sans-serif",
  mono: "--font-mono",
  handwriting: "--font-handwriting",
};
const ARTICLE_CUSTOM_FONT_IMPORT_LIMIT = articleFontConfig.customFonts?.importLimit ?? 6;
const ARTICLE_CUSTOM_FONT_LINK_SELECTOR = 'link[data-gnix-custom-font="true"]';

function getCssVariableValue(name, fallback = "") {
  if (typeof document === "undefined") return fallback;

  const value = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

// Reads `--font-*` from default.css. Custom fonts are applied as inline
// styles on <html>, which would override the stylesheet value; we strip
// those overrides while reading and restore them after.
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

const ARTICLE_FONT_UTILS = window.__GNIX_ARTICLE_FONT_UTILS__ || {};

function normalizeCustomFonts(value = {}) {
  const normalized = ARTICLE_FONT_UTILS.normalizeCustomFonts
    ? ARTICLE_FONT_UTILS.normalizeCustomFonts(value, ARTICLE_CUSTOM_FONT_OPTIONS, ARTICLE_CUSTOM_FONT_IMPORT_LIMIT)
    : { imports: [], families: {} };
  const defaultFamilies = getDefaultCustomFontFamilies();

  Object.keys(ARTICLE_CUSTOM_FONT_OPTIONS).forEach((key) => {
    if (!normalized.families[key]) {
      normalized.families[key] = defaultFamilies[key] || "";
    }
  });

  return normalized;
}

function applyCustomFonts(customFonts = {}) {
  const normalized = normalizeCustomFonts(customFonts);
  if (ARTICLE_FONT_UTILS.applyCustomFontImports) {
    ARTICLE_FONT_UTILS.applyCustomFontImports(normalized.imports, ARTICLE_CUSTOM_FONT_LINK_SELECTOR);
  }
  if (ARTICLE_FONT_UTILS.applyCustomFontFamilies) {
    ARTICLE_FONT_UTILS.applyCustomFontFamilies(document.documentElement, normalized.families, ARTICLE_CUSTOM_FONT_OPTIONS);
  }
  return normalized;
}

function initHoverPopover(trigger, popover) {
  if (!trigger || !popover || typeof popover.showPopover !== "function" || typeof popover.hidePopover !== "function") {
    return;
  }

  let hideTimer = null;

  function clearHideTimer() {
    if (hideTimer) {
      clearTimeout(hideTimer);
      hideTimer = null;
    }
  }

  function openPopover() {
    clearHideTimer();
    if (!popover.matches(":popover-open")) {
      popover.showPopover();
    }
    const rect = trigger.getBoundingClientRect();
    const popoverWidth = popover.offsetWidth || 0;
    const left = Math.min(Math.max(16, rect.left), Math.max(16, window.innerWidth - popoverWidth - 16));
    popover.style.left = `${left}px`;
    popover.style.top = `${rect.bottom + 8}px`;
  }

  function scheduleClose() {
    clearHideTimer();
    hideTimer = window.setTimeout(() => {
      const hasPointer = trigger.matches(":hover") || popover.matches(":hover");
      const hasFocus = trigger.matches(":focus-visible") || popover.contains(document.activeElement);
      if (!hasPointer && !hasFocus && popover.matches(":popover-open")) {
        popover.hidePopover();
      }
    }, 80);
  }

  trigger.addEventListener("pointerenter", openPopover);
  trigger.addEventListener("focus", openPopover);
  trigger.addEventListener("pointerleave", scheduleClose);
  trigger.addEventListener("blur", scheduleClose);
  trigger.addEventListener("click", openPopover);

  popover.addEventListener("pointerenter", openPopover);
  popover.addEventListener("pointerleave", scheduleClose);
  popover.addEventListener("focusin", openPopover);
  popover.addEventListener("focusout", scheduleClose);
  popover.addEventListener("toggle", (event) => {
    if (event.newState === "closed") clearHideTimer();
  });
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
    customFonts: normalizeCustomFonts(candidate.customFonts),
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
  return settings;
}

function applyArticleFontSettings(settings = getArticleFontSettings()) {
  const normalized = normalizeArticleFontSettings(settings);
  const html = document.documentElement;

  applyCustomFonts(normalized.customFonts);
  html.dataset.articleFontSize = normalized.size;
  html.dataset.articleFontFamily = normalized.type;
  html.dataset.articleLineHeight = String(normalized.lineHeight);
  html.dataset.articleFontWeight = normalized.weight;
  html.style.setProperty("--article-line-height", String(normalized.lineHeight));
}

function saveArticleFontSettings(settings) {
  try {
    localStorage.setItem(ARTICLE_FONT_STORAGE_KEY, JSON.stringify(normalizeArticleFontSettings(settings)));
  } catch {
    // Keep the current page responsive even when storage is unavailable.
  }
}

function initArticleSettings() {
  const settings = getArticleFontSettings();
  applyArticleFontSettings(settings);

  const fontSettingsPopover = document.getElementById("article-font-settings");
  if (!fontSettingsPopover) return;

  function updateButtonStates(selector, isActive) {
    fontSettingsPopover.querySelectorAll(selector).forEach((btn) => {
      const active = isActive(btn);
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    });
  }

  const lineHeightSlider = fontSettingsPopover.querySelector(".font-line-height-slider");
  const lineHeightValue = fontSettingsPopover.querySelector(".font-line-height-value");
  const customFontForm = fontSettingsPopover.querySelector(".font-custom-form");
  const customFontImportInput = fontSettingsPopover.querySelector(".font-custom-imports");
  const customFontResetButton = fontSettingsPopover.querySelector(".font-custom-reset");
  const customFontFamilyInputs = fontSettingsPopover.querySelectorAll(".font-custom-family-input");
  const customFontHelpButton = fontSettingsPopover.querySelector(".font-custom-help-btn");
  const customFontHelpPopover = document.getElementById("font-custom-help-popover");
  const customFontToggleButton = fontSettingsPopover.querySelector(".font-custom-toggle");
  const customFontPanel = fontSettingsPopover.querySelector(".font-custom-panel");

  initHoverPopover(customFontHelpButton, customFontHelpPopover);

  if (customFontToggleButton && customFontPanel) {
    const syncCustomFontPanelState = (expanded) => {
      customFontToggleButton.setAttribute("aria-expanded", String(expanded));
      customFontPanel.dataset.expanded = String(expanded);
      customFontPanel.setAttribute("aria-hidden", String(!expanded));
    };

    syncCustomFontPanelState(false);
    customFontToggleButton.addEventListener("click", () => {
      const expanded = customFontToggleButton.getAttribute("aria-expanded") === "true";
      syncCustomFontPanelState(!expanded);
    });
  }

  function updateLineHeightUI() {
    if (lineHeightSlider) {
      lineHeightSlider.value = String(settings.lineHeight);
    }
    if (lineHeightValue) {
      lineHeightValue.textContent = settings.lineHeight.toFixed(2);
    }
  }

  function updateActiveStates() {
    updateButtonStates(".font-size-btn", (btn) => btn.dataset.size === settings.size);
    updateButtonStates(".font-type-btn", (btn) => btn.dataset.font === settings.type);
    updateButtonStates(".font-weight-btn", (btn) => btn.dataset.weight === settings.weight);
    updateLineHeightUI();
  }

  function updateCustomFontUI() {
    const customFonts = normalizeCustomFonts(settings.customFonts);
    if (customFontImportInput) {
      customFontImportInput.value = customFonts.imports.join("\n");
    }

    customFontFamilyInputs.forEach((input) => {
      input.value = customFonts.families[input.dataset.fontFamily] || "";
    });
  }

  function readCustomFontsFromUI() {
    const families = {};

    customFontFamilyInputs.forEach((input) => {
      families[input.dataset.fontFamily] = input.value;
    });

    return normalizeCustomFonts({
      imports: customFontImportInput?.value || "",
      families,
    });
  }

  fontSettingsPopover.querySelectorAll(".font-size-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!ARTICLE_SIZE_OPTIONS.has(btn.dataset.size)) return;
      settings.size = btn.dataset.size;
      saveArticleFontSettings(settings);
      updateActiveStates();
      applyArticleFontSettings(settings);
    });
  });

  fontSettingsPopover.querySelectorAll(".font-type-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!ARTICLE_FONT_OPTIONS.has(btn.dataset.font)) return;
      settings.type = btn.dataset.font;
      saveArticleFontSettings(settings);
      updateActiveStates();
      applyArticleFontSettings(settings);
    });
  });

  if (lineHeightSlider) {
    lineHeightSlider.min = String(ARTICLE_LINE_HEIGHT_MIN);
    lineHeightSlider.max = String(ARTICLE_LINE_HEIGHT_MAX);
    lineHeightSlider.step = "0.05";
    lineHeightSlider.addEventListener("input", () => {
      settings.lineHeight = normalizeArticleLineHeight(lineHeightSlider.value);
      saveArticleFontSettings(settings);
      updateActiveStates();
      applyArticleFontSettings(settings);
    });
  }

  fontSettingsPopover.querySelectorAll(".font-weight-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!ARTICLE_WEIGHT_OPTIONS.has(btn.dataset.weight)) return;
      settings.weight = btn.dataset.weight;
      saveArticleFontSettings(settings);
      updateActiveStates();
      applyArticleFontSettings(settings);
    });
  });

  if (customFontForm) {
    customFontForm.addEventListener("submit", (event) => {
      event.preventDefault();
      settings.customFonts = readCustomFontsFromUI();
      saveArticleFontSettings(settings);
      applyArticleFontSettings(settings);
      updateCustomFontUI();
    });
  }

  if (customFontResetButton) {
    customFontResetButton.addEventListener("click", () => {
      settings.customFonts = normalizeCustomFonts();
      saveArticleFontSettings(settings);
      applyArticleFontSettings(settings);

      const defaults = getDefaultCustomFontFamilies();
      if (customFontImportInput) {
        customFontImportInput.value = "";
      }
      customFontFamilyInputs.forEach((input) => {
        const key = input.dataset.fontFamily;
        input.value = defaults[key] || "";
      });
    });
  }

  updateActiveStates();
  updateCustomFontUI();
}

function initArticleCommentPopover() {
  const commentPopover = document.getElementById("article-comment-popover");
  if (!commentPopover) {
    twikoo_handler();
    return;
  }

  // Preload twikoo JS during idle time so comments render faster on click
  const tko = document.getElementById("tko");
  if (tko?.dataset.jsUrl) {
    const preload = () => loadScriptOnce(tko.dataset.jsUrl, () => {});
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(preload, { timeout: 3000 });
    } else {
      setTimeout(preload, 200);
    }
  }

  const initializeComments = () => twikoo_handler();
  if (commentPopover.matches(":popover-open")) {
    initializeComments();
  }

  if (commentPopover.dataset.bound === "true") return;
  commentPopover.dataset.bound = "true";
  commentPopover.addEventListener("toggle", (event) => {
    if (event.newState === "open") initializeComments();
  });
}

function initPage() {
  handleMermaid();
  addHighlightTool();
  initArticleSettings();
  const zoomOpts = { background: "hsla(from var(--mantle) / 0.9)" };
  const zoomImgs = new Set();
  document.querySelectorAll(".content img").forEach((img) => zoomImgs.add(img));
  mediumZoom([...zoomImgs], zoomOpts);
  initArticleCommentPopover();
}

document.addEventListener("DOMContentLoaded", initPage, { once: true });

function bindSwupPageHook(swupInstance) {
  if (!swupInstance || swupInstance.gnixMainPageHookBound) return;
  swupInstance.gnixMainPageHookBound = true;
  swupInstance.hooks.on("page:view", initPage);
}

bindSwupPageHook(window.swup);
document.addEventListener("gnix:swup-ready", (event) => bindSwupPageHook(event.detail?.swup), { once: true });

document.addEventListener("keydown", handleKeyDown, {
  capture: true, // 捕获阶段监听，优先于浏览器默认处理
  passive: false, // 允许调用 preventDefault
});

document.addEventListener(
  "click",
  (e) => {
    const el = e.target.closest("#language-switch");
    if (el && el.dataset.mode === "missing") {
      e.preventDefault();
      e.stopPropagation();
      window.showSiteToast?.(el.dataset.toastMessage);
    }
  },
  { capture: true },
);

function toggleNav(event) {
  const container = event.currentTarget;
  const burger = container.querySelector(".navbar-burger");
  const menu = container.querySelector(".navbar-menu");
  const target = event.target;

  if (target.closest(".navbar-burger")) {
    burger.classList.toggle("is-active");
    menu.classList.toggle("is-active");
  } else if (target.closest(".navbar-item")) {
    burger.classList.remove("is-active");
    menu.classList.remove("is-active");
  }
}

window.toggleNav = toggleNav;
