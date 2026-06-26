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

function getLocalizedUiText(key) {
  const isZh = (document.documentElement.lang || "").toLowerCase().startsWith("zh");
  const messages = {
    copied: isZh ? "已复制" : "Copied",
    copyCode: isZh ? "复制代码" : "Copy code",
    toggleWrap: isZh ? "切换自动换行" : "Toggle word wrap",
  };
  return messages[key] || key;
}

function resolveGnixAssetUrl(path) {
  if (!path || /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(path) || /^(?:data|mailto|tel):/i.test(path)) {
    return path;
  }

  const root = window.__gnixAssetRoot || "/";
  return `${root.replace(/\/?$/, "/")}${String(path).replace(/^\/+/, "")}`;
}

const lazyAssetPromises = new Map();

function resolveAssetHref(path) {
  return new URL(resolveGnixAssetUrl(path), window.location.href).href;
}

function getLazyAssetKey(kind, path) {
  return `${kind}:${resolveAssetHref(path)}`;
}

function findAssetElement(selector, path) {
  const href = resolveAssetHref(path);
  return Array.from(document.querySelectorAll(selector)).find((element) => element.href === href || element.src === href) || null;
}

function setFetchPriority(element, fetchPriority) {
  if (!fetchPriority) return;
  element.setAttribute("fetchpriority", fetchPriority);
  if ("fetchPriority" in element) element.fetchPriority = fetchPriority;
}

function waitForLazyAsset(element, key) {
  if (element.dataset.loadState === "loaded") return Promise.resolve(element);
  if (lazyAssetPromises.has(key)) return lazyAssetPromises.get(key);

  const promise = new Promise((resolve, reject) => {
    element.addEventListener(
      "load",
      () => {
        element.dataset.loadState = "loaded";
        lazyAssetPromises.delete(key);
        resolve(element);
      },
      { once: true },
    );
    element.addEventListener(
      "error",
      () => {
        element.dataset.loadState = "error";
        lazyAssetPromises.delete(key);
        reject(new Error(`Unable to load ${element.href || element.src}`));
      },
      { once: true },
    );
  });

  lazyAssetPromises.set(key, promise);
  return promise;
}

function loadStyleOnce(path, options = {}) {
  const key = getLazyAssetKey("style", path);
  if (lazyAssetPromises.has(key)) return lazyAssetPromises.get(key);

  const existing = findAssetElement('link[rel~="stylesheet"]', path);
  if (existing) return Promise.resolve(existing);

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = resolveAssetHref(path);
  setFetchPriority(link, options.fetchPriority);
  if (options.media) link.media = options.media;

  const promise = waitForLazyAsset(link, key);
  document.head.appendChild(link);
  return promise;
}

function loadScriptOnce(path, options = {}) {
  const key = getLazyAssetKey("script", path);
  if (lazyAssetPromises.has(key)) return lazyAssetPromises.get(key);

  const existing = findAssetElement("script[src]", path);
  if (existing) {
    return existing.dataset.loadState === "loading" ? waitForLazyAsset(existing, key) : Promise.resolve(existing);
  }

  const script = document.createElement("script");
  script.src = resolveAssetHref(path);
  script.async = options.async ?? true;
  script.defer = options.defer ?? true;
  script.dataset.loadState = "loading";
  setFetchPriority(script, options.fetchPriority);

  const promise = waitForLazyAsset(script, key);
  document.head.appendChild(script);
  return promise;
}

function inferLazyAssetType(path) {
  const url = String(path).split(/[?#]/)[0];
  if (url.endsWith(".css")) return "style";
  if (url.endsWith(".js") || url.endsWith(".mjs")) return "script";
  return "fetch";
}

function normalizeLazyAsset(asset) {
  if (!asset) return null;
  if (typeof asset === "string") return { as: inferLazyAssetType(asset), url: asset };

  const url = asset.url || asset.href || asset.src;
  if (!url) return null;
  return {
    ...asset,
    as: asset.as || inferLazyAssetType(url),
    url,
  };
}

function prewarmLazyAssetOnce(asset, options = {}) {
  const normalized = normalizeLazyAsset(asset);
  if (!normalized) return null;

  const { as, rel = options.rel || "prefetch", url } = normalized;
  if (as === "style" && findAssetElement('link[rel~="stylesheet"]', url)) return null;
  if (as === "script" && findAssetElement("script[src]", url)) return null;

  const href = resolveAssetHref(url);
  const existing = Array.from(document.querySelectorAll(`link[rel~="${rel}"][href]`)).find((link) => link.href === href);
  if (existing) return existing;

  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  if (as && rel !== "modulepreload") link.as = as;
  if (normalized.type && normalized.type !== as) link.type = normalized.type;
  if (normalized.crossOrigin) link.crossOrigin = normalized.crossOrigin;
  setFetchPriority(link, normalized.fetchPriority || options.fetchPriority || "low");
  document.head.appendChild(link);
  return link;
}

function prewarmLazyAssets(assets, options = {}) {
  return (Array.isArray(assets) ? assets : [assets]).map((asset) => prewarmLazyAssetOnce(asset, options)).filter(Boolean);
}

function runOnIdle(callback, { fallbackDelay = 250, timeout = 3000 } = {}) {
  if (typeof window.requestIdleCallback === "function") {
    const idleId = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback?.(idleId);
  }

  const timeoutId = window.setTimeout(callback, fallbackDelay);
  return () => window.clearTimeout(timeoutId);
}

function prewarmLazyAssetsOnIdle(assets, options = {}) {
  const { fallbackDelay, timeout, ...prewarmOptions } = options;
  return runOnIdle(() => prewarmLazyAssets(assets, prewarmOptions), { fallbackDelay, timeout });
}

window.__gnixLazyAssets = {
  ...(window.__gnixLazyAssets || {}),
  loadScriptOnce,
  loadStyleOnce,
  prewarmLazyAssets,
  prewarmLazyAssetsOnIdle,
  resolveGnixAssetUrl,
};

function getHashTarget(hash) {
  if (!hash || hash === "#") return null;
  let id = hash.slice(1);
  try {
    id = decodeURIComponent(id);
  } catch {}
  if (!id) return null;
  const byId = document.getElementById(id);
  if (byId) return byId;

  const escaped = window.CSS?.escape ? CSS.escape(id) : id.replace(/["\\]/g, "\\$&");
  try {
    return document.querySelector(`[name="${escaped}"]`);
  } catch {
    return null;
  }
}

function animateAnchorTarget(target) {
  if (!target) return;
  target.classList.remove("gnix-anchor-target");
  requestAnimationFrame(() => {
    target.classList.add("gnix-anchor-target");
  });
}

function animateCurrentHashTarget() {
  if (!location.hash) return;
  requestAnimationFrame(() => animateAnchorTarget(getHashTarget(location.hash)));
}

function handleAnchorJumpClick(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  const link = event.target.closest?.("a[href*='#']");
  if (!link || link.target || link.hasAttribute("download")) return;

  const url = new URL(link.href, location.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname || url.search !== location.search) return;

  const target = getHashTarget(url.hash);
  if (!target) return;

  event.preventDefault();
  target.scrollIntoView({
    block: "start",
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });
  history.pushState(null, "", url.hash);
  animateAnchorTarget(target);
}

const PREFERENCE_POPUP_MODULE_URL = resolveGnixAssetUrl("/js/preferences-popup.js");
const GLOBAL_IDLE_PREWARM_ASSETS = [
  { as: "script", url: PREFERENCE_POPUP_MODULE_URL },
  { as: "style", url: "/css/preferences.css" },
  { as: "script", url: "/js/preferences.js" },
];

let preferencePopupModulePromise = null;
let globalIdlePrewarmScheduled = false;

function loadPreferencePopupModule() {
  preferencePopupModulePromise ||= import(PREFERENCE_POPUP_MODULE_URL);
  return preferencePopupModulePromise;
}

function togglePreferencePopup() {
  return loadPreferencePopupModule().then((module) => module.togglePreferencePopup());
}

function handlePreferencePopupError(error) {
  console.warn("[gnix] Unable to open preferences popup", error);
}

function handleLazyAssetError(error) {
  console.warn("[gnix] Unable to load lazy asset", error);
}

function initGlobalIdlePrewarm() {
  if (globalIdlePrewarmScheduled) return;
  globalIdlePrewarmScheduled = true;
  prewarmLazyAssetsOnIdle(GLOBAL_IDLE_PREWARM_ASSETS, { fetchPriority: "low", timeout: 4000 });
}

function twikoo_handler() {
  runWhenActivated(() => {
    const el = document.getElementById("tko");
    if (!el) return;
    if (el.dataset.initialized === "true" || el.dataset.initializing === "true") return;

    const { envId, region, lang, jsUrl, cssUrl } = el.dataset;

    if (cssUrl) loadStyleOnce(cssUrl).catch(handleLazyAssetError);

    const config = { envId, region, lang, el: "#tko" };

    if (typeof window.twikoo?.init === "function") {
      window.twikoo.init(config);
      el.dataset.initialized = "true";
      return;
    }

    if (!jsUrl) return;
    el.dataset.initializing = "true";
    loadScriptOnce(jsUrl)
      .then(() => {
        if (el.dataset.initialized === "true") {
          delete el.dataset.initializing;
          return;
        }
        window.twikoo.init(config);
        el.dataset.initialized = "true";
        delete el.dataset.initializing;
      })
      .catch((error) => {
        delete el.dataset.initializing;
        handleLazyAssetError(error);
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
    const wrapToggle = figure.querySelector(".toggle-wrap");
    const copyButton = figure.querySelector(".copy-button");

    if (wrapToggle) {
      const label = getLocalizedUiText("toggleWrap");
      wrapToggle.setAttribute("title", label);
      wrapToggle.setAttribute("aria-label", label);
    }

    if (copyButton) {
      copyButton.setAttribute("role", "button");
      copyButton.setAttribute("tabindex", "0");
      copyButton.setAttribute("aria-label", getLocalizedUiText("copyCode"));
    }

    // Copy button handler
    if (toolbar) {
      toolbar.addEventListener("click", (e) => {
        const target = e.target;
        if (target.closest(".copy-button")) {
          const btn = target.closest(".copy-button");
          const notice = btn.previousElementSibling;
          const code = figure.querySelector(SELECTORS.code);

          navigator.clipboard
            .writeText(code.innerText)
            .then(() => {
              notice.textContent = getLocalizedUiText("copied");
              notice.classList.add("show");
              setTimeout(() => notice.classList.remove("show"), 800);
            })
            .catch(() => {});
        }
      });

      toolbar.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" && e.key !== " ") return;
        const target = e.target;
        if (!target.closest(".copy-button")) return;
        e.preventDefault();
        target.closest(".copy-button").dispatchEvent(new MouseEvent("click", { bubbles: true }));
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

function handlePreferenceTriggerClick(event) {
  if (event.defaultPrevented) return;

  const trigger = event.target.closest?.("[data-preference-trigger]");
  if (!trigger || trigger.disabled) return;

  event.preventDefault();
  togglePreferencePopup().catch(handlePreferencePopupError);
}

function handleKeyDown(e) {
  const isModifier = e.metaKey || e.ctrlKey;
  if (!isModifier) return;

  const tag = e.target.tagName;
  if (["INPUT", "TEXTAREA"].includes(tag) || e.target.isContentEditable) return;

  const isSettingsShortcut = !e.altKey && !e.shiftKey && (e.code === "Comma" || e.key === "," || e.key === "Comma");
  if (isSettingsShortcut) {
    e.preventDefault();
    togglePreferencePopup().catch(handlePreferencePopupError);
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

function handleMermaid() {
  const containers = document.querySelectorAll(".mermaid-container");
  if (containers.length === 0) return;

  const cssUrl = resolveGnixAssetUrl("/css/optional/mermaid.css");
  const adapterUrl = resolveGnixAssetUrl("/js/mdit/mermaid.js");

  loadStyleOnce(cssUrl).catch(handleLazyAssetError);

  const runInit = () => {
    const libUrl = resolveGnixAssetUrl("/js/host/mermaid/mermaid.min.js");

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
    loadScriptOnce(adapterUrl).then(runInit).catch(handleLazyAssetError);
  }
}

// #endregion

function initArticleCommentPopover() {
  const commentPopover = document.getElementById("article-comment-popover");
  if (!commentPopover) {
    twikoo_handler();
    return;
  }

  const tko = document.getElementById("tko");
  if (tko && tko.dataset.lazyPrewarmBound !== "true") {
    const commentAssets = [tko.dataset.cssUrl ? { as: "style", url: tko.dataset.cssUrl } : null, tko.dataset.jsUrl ? { as: "script", url: tko.dataset.jsUrl } : null].filter(Boolean);

    if (commentAssets.length) {
      tko.dataset.lazyPrewarmBound = "true";
      prewarmLazyAssetsOnIdle(commentAssets, { fetchPriority: "low", timeout: 3000 });
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

function initTocPopover() {
  const tocBody = document.getElementById("toc-body");
  if (!tocBody || tocBody.dataset.bound === "true") return;

  tocBody.dataset.bound = "true";
  tocBody.addEventListener("click", (event) => {
    if (event.target === tocBody || event.target.closest(".toc-link")) {
      tocBody.hidePopover();
    }
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
  initTocPopover();
  initArticleCommentPopover();
}

function initPageWhenActivated() {
  runWhenActivated(initPage);
}

whenReady(initPageWhenActivated);
document.addEventListener("gnix:decrypted-content-ready", initPageWhenActivated);

runWhenActivated(() => {
  initGlobalIdlePrewarm();
  document.addEventListener("click", handlePreferenceTriggerClick, {
    capture: true,
    passive: false,
  });
  document.addEventListener("keydown", handleKeyDown, {
    capture: true, // 捕获阶段监听，优先于浏览器默认处理
    passive: false, // 允许调用 preventDefault
  });
});

function setNavbarMenuOpen(container, open) {
  const burger = container.querySelector(".navbar-burger");
  const menu = container.querySelector(".navbar-menu");
  if (!burger || !menu) return;

  burger.classList.toggle("is-active", open);
  menu.classList.toggle("is-active", open);
  burger.setAttribute("aria-expanded", String(open));
  document.documentElement.classList.toggle("navbar-menu-open", open);
}

function handleNavbarClick(event) {
  const container = event.currentTarget;
  const target = event.target;

  if (target.closest(".navbar-burger")) {
    const burger = container.querySelector(".navbar-burger");
    const isActive = burger?.classList.contains("is-active");
    setNavbarMenuOpen(container, !isActive);
  } else if (target.closest(".navbar-item")) {
    setNavbarMenuOpen(container, false);
  }
}

function handleNavbarKeyDown(event) {
  if (event.key !== "Escape") return;
  const container = document.querySelector(".navbar-container");
  if (!container) return;
  setNavbarMenuOpen(container, false);
}

function initNavbar() {
  const container = document.querySelector(".navbar-container");
  if (!container || container.dataset.bound === "true") return;
  container.dataset.bound = "true";
  container.addEventListener("click", handleNavbarClick);
  document.addEventListener("keydown", handleNavbarKeyDown);
}

whenReady(() => runWhenActivated(initNavbar));

whenReady(() => {
  document.addEventListener("click", handleAnchorJumpClick);
  window.addEventListener("hashchange", animateCurrentHashTarget);
  window.addEventListener("popstate", animateCurrentHashTarget);
  animateCurrentHashTarget();
});
