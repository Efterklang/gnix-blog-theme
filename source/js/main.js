function runWhenActivated(callback) {
  (window.__gnixPrerender?.runWhenActivated || function(fn) { fn(); })(callback);
}

function whenReady(callback) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", callback, { once: true });
  } else {
    callback();
  }
}

const PREFERENCE_POPUP_MODULE_URL = "/js/preferences-popup.js";

let preferencePopupModulePromise = null;

function isPreferencesUrl(value) {
  try {
    const url = new URL(value, window.location.href);
    return url.origin === window.location.origin && /(?:^|\/)preferences\.html$/.test(url.pathname);
  } catch {
    return false;
  }
}

function getPreferencesUrl() {
  return document.getElementById("preferences-link")?.href || new URL("/preferences.html", window.location.href).href;
}

function navigateToPreferences(preferencesUrl = getPreferencesUrl()) {
  window.location.href = preferencesUrl;
}

function loadPreferencePopupModule() {
  preferencePopupModulePromise ||= import(PREFERENCE_POPUP_MODULE_URL);
  return preferencePopupModulePromise;
}

function togglePreferencePopup(preferencesUrl = getPreferencesUrl()) {
  if (document.querySelector('[data-preferences-page][data-preference-surface="page"]')) return Promise.resolve();

  return loadPreferencePopupModule().then((module) => module.togglePreferencePopup(preferencesUrl));
}

function twikoo_handler() {
  runWhenActivated(() => {
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

function handlePreferenceTransitionLinkClick(event) {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const link = event.target.closest?.("[data-preference-trigger][href]");
  if (!link || link.target || link.download) return;

  try {
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || !isPreferencesUrl(url.href)) return;
    event.preventDefault();
    togglePreferencePopup(url.href).catch(() => navigateToPreferences(url.href));
  } catch {
    // Invalid hrefs do not participate in same-origin preferences navigation.
  }
}

function handleKeyDown(e) {
  const isModifier = e.metaKey || e.ctrlKey;
  if (!isModifier) return;

  const tag = e.target.tagName;
  if (["INPUT", "TEXTAREA"].includes(tag) || e.target.isContentEditable) return;

  const isSettingsShortcut = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && (e.code === "Comma" || e.key === "," || e.key === "Comma");
  if (isSettingsShortcut) {
    e.preventDefault();
    togglePreferencePopup().catch(() => navigateToPreferences());
    return;
  }

  switch (e.code) {
    case "KeyT":
      e.preventDefault();
      document.getElementById("toc-body")?.togglePopover();
      break;
    case "KeyK":
      e.preventDefault();
      document.querySelector("#searchbox")?.showPopover();
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
    const libUrl = "/js/host/mermaid/mermaid.min.js";

    containers.forEach((container, index) => {
      if (!container.id) {
        container.id = `mermaid-${Date.now()}-${index}`;
      }
      if (window.initMermaidDiagram) {
        window.initMermaidDiagram(container.id, libUrl, {});
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

function initArticleCommentPopover() {
  const commentPopover = document.getElementById("article-comment-popover");
  if (!commentPopover) {
    twikoo_handler();
    return;
  }

  // Preload twikoo JS during idle time so comments render faster on click
  const tko = document.getElementById("tko");
  if (tko?.dataset.jsUrl) {
    const preload = () => runWhenActivated(() => loadScriptOnce(tko.dataset.jsUrl, () => {}));
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
  const zoomOpts = { background: "hsla(from var(--mantle) / 0.9)" };
  const zoomImgs = [];
  document.querySelectorAll(".content img").forEach((img) => {
    if (img.dataset.zoomBound === "true") return;
    img.dataset.zoomBound = "true";
    zoomImgs.push(img);
  });
  if (zoomImgs.length) mediumZoom(zoomImgs, zoomOpts);
  initArticleCommentPopover();
}

function initPageWhenActivated() {
  runWhenActivated(initPage);
}

whenReady(initPageWhenActivated);
document.addEventListener("gnix:content-ready", initPageWhenActivated);

runWhenActivated(() => {
  document.addEventListener("click", handlePreferenceTransitionLinkClick, {
    capture: true,
    passive: false,
  });
  document.addEventListener("keydown", handleKeyDown, {
    capture: true, // 捕获阶段监听，优先于浏览器默认处理
    passive: false, // 允许调用 preventDefault
  });
});

function handleNavbarClick(event) {
  const container = event.currentTarget;
  const burger = container.querySelector(".navbar-burger");
  const menu = container.querySelector(".navbar-menu");
  const target = event.target;

  if (target.closest(".navbar-burger")) {
    const isActive = burger.classList.toggle("is-active");
    menu.classList.toggle("is-active", isActive);
    burger.setAttribute("aria-expanded", String(isActive));
  } else if (target.closest(".navbar-item")) {
    burger.classList.remove("is-active");
    menu.classList.remove("is-active");
    burger.setAttribute("aria-expanded", "false");
  }
}

function initNavbar() {
  const container = document.querySelector(".navbar-container");
  if (!container || container.dataset.bound === "true") return;
  container.dataset.bound = "true";
  container.addEventListener("click", handleNavbarClick);
}

whenReady(() => runWhenActivated(initNavbar));
