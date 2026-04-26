function tableWrapFix() {
  document.querySelectorAll(".content table").forEach((table) => {
    if (table.hasAttribute("data-nowrap") || table.parentElement.classList.contains("table-wrapper")) {
      return;
    }
    // if width exceeds container, wrap it
    const wrapper = document.createElement("div");
    Object.assign(wrapper.style, {
      width: "100%",
      overflowX: "auto",
    });
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}

function twikoo_handler() {
  const el = document.getElementById("tko");
  if (!el) return;

  const { envId, region, lang, jsUrl, cssUrl } = el.dataset;

  if (cssUrl) loadCSSOnce(cssUrl);

  const config = { envId, region, lang, el: "#tko" };

  if (typeof window.twikoo?.init === "function") {
    window.twikoo.init(config);
    return;
  }

  loadScriptOnce(jsUrl, () => window.twikoo.init(config));
}
// #region mdit@tab-plugin
/**
 * 初始化页面上所有的 Tab 组件
 */

function initializeTabs() {
  document.querySelectorAll(".tabs-tabs-wrapper").forEach((container) => {
    const buttons = container.querySelectorAll(".tabs-tab-button");
    buttons.forEach((button) => {
      button.removeEventListener("click", handleTabClick);
      button.addEventListener("click", handleTabClick);
    });
  });
}

function handleTabClick() {
  const tabContainer = this.closest(".tabs-tabs-wrapper");
  const targetIndex = this.getAttribute("data-tab");
  const syncId = this.getAttribute("data-id");
  activateTab(tabContainer, targetIndex);
  if (syncId) {
    syncRelatedTabs(syncId);
  }
}

/**
 * 激活指定容器中的特定 Tab
 * @param {HTMLElement} container - Tab 容器元素
 * @param {string} targetIndex - 要激活的 Tab 的 data-tab 值
 */
function activateTab(container, targetIndex) {
  // 先重置该容器内所有 Tab 的状态
  resetTabsState(container);

  const buttonToActivate = container.querySelector(`.tabs-tab-button[data-tab="${targetIndex}"]`);
  const contentToActivate = container.querySelector(`.tabs-tab-content[data-index="${targetIndex}"]`);

  if (buttonToActivate) {
    buttonToActivate.classList.add("active");
    buttonToActivate.setAttribute("data-active", "");
  }
  if (contentToActivate) {
    contentToActivate.classList.add("active");
    contentToActivate.setAttribute("data-active", "");
  }
}

/**
 * 重置指定容器内所有 Tab 按钮和内容面板的状态
 * @param {HTMLElement} container - Tab 容器元素
 */
function resetTabsState(container) {
  const buttons = container.querySelectorAll(".tabs-tab-button");
  const contents = container.querySelectorAll(".tabs-tab-content");

  buttons.forEach((btn) => {
    btn.classList.remove("active");
    btn.removeAttribute("data-active");
  });
  contents.forEach((content) => {
    content.classList.remove("active");
    content.removeAttribute("data-active");
  });
}

/**
 * 同步所有具有相同 data-id 的关联 Tab
 * @param {string} syncId - 用于同步的 data-id
 */
function syncRelatedTabs(syncId) {
  const relatedButtons = document.querySelectorAll(`.tabs-tab-button[data-id="${syncId}"]`);

  relatedButtons.forEach((button) => {
    const container = button.closest(".tabs-tabs-wrapper");
    const targetIndex = button.getAttribute("data-tab");
    activateTab(container, targetIndex);
  });
}

// #endregion

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

function initArticleSettings() {
  const fontSettingsPopover = document.getElementById("article-font-settings");
  if (!fontSettingsPopover) return;

  const STORAGE_KEY = "gnix-article-font";
  const DEFAULT_SETTINGS = { size: "medium", type: "serif" };
  const SIZE_OPTIONS = new Set(["small", "medium-small", "medium", "medium-large", "large"]);
  const FONT_OPTIONS = new Set(["serif", "sans-serif", "mono", "handwriting"]);

  function normalizeSettings(value = {}) {
    const candidate = value || {};
    return {
      size: SIZE_OPTIONS.has(candidate.size) ? candidate.size : DEFAULT_SETTINGS.size,
      type: FONT_OPTIONS.has(candidate.type) ? candidate.type : DEFAULT_SETTINGS.type,
    };
  }

  let settings = { ...DEFAULT_SETTINGS };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) settings = normalizeSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }

  function applySettings() {
    document.documentElement.dataset.articleFontSize = settings.size;
    document.documentElement.dataset.articleFontFamily = settings.type;
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Keep the current page responsive even when storage is unavailable.
    }
  }

  function updateActiveStates() {
    fontSettingsPopover.querySelectorAll(".font-size-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.size === settings.size);
    });
    fontSettingsPopover.querySelectorAll(".font-type-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.font === settings.type);
    });
  }

  fontSettingsPopover.querySelectorAll(".font-size-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!SIZE_OPTIONS.has(btn.dataset.size)) return;
      settings.size = btn.dataset.size;
      saveSettings();
      updateActiveStates();
      applySettings();
    });
  });

  fontSettingsPopover.querySelectorAll(".font-type-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!FONT_OPTIONS.has(btn.dataset.font)) return;
      settings.type = btn.dataset.font;
      saveSettings();
      updateActiveStates();
      applySettings();
    });
  });

  updateActiveStates();
  applySettings();
}

function initPage() {
  tableWrapFix();
  initializeTabs();
  handleMermaid();
  addHighlightTool();
  initArticleSettings();
  const zoomOpts = { background: "hsla(from var(--mantle) / 0.9)" };
  const zoomImgs = new Set();
  document.querySelectorAll(".content img").forEach((img) => zoomImgs.add(img));
  mediumZoom([...zoomImgs], zoomOpts);
  twikoo_handler();
}

document.addEventListener("DOMContentLoaded", initPage, { once: true });

// Re-initialize on page changes when using swup
if (typeof swup !== "undefined") {
  swup.hooks.on("page:view", initPage);
}

document.addEventListener("keydown", handleKeyDown, {
  capture: true, // 捕获阶段监听，优先于浏览器默认处理
  passive: false, // 允许调用 preventDefault
});

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
