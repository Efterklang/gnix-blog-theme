function runWhenActivated(callback) {
  (
    window.__gnixPrerender?.runWhenActivated ||
    ((fn) => {
      fn();
    })
  )(callback);
}

function getLocalizedUiText(key) {
  const isZh = (document.documentElement.lang || "").toLowerCase().startsWith("zh");
  const messages = {
    copied: isZh ? "已复制" : "Copied",
    copyCode: isZh ? "复制代码" : "Copy code",
  };
  return messages[key] || key;
}

const lazyAssetPromises = new Map();

function resolveAssetHref(path) {
  return new URL(path, window.location.href).href;
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

const FOOTNOTE_HOVER_TOOLTIP_MEDIA = "(hover: hover) and (pointer: fine)";
let openFootnoteRef = null;

function closeFootnoteTooltip() {
  if (!openFootnoteRef) return;

  openFootnoteRef.classList.remove("is-footnote-tooltip-open");
  openFootnoteRef.querySelector(":scope > a")?.setAttribute("aria-expanded", "false");
  openFootnoteRef = null;
}

function toggleFootnoteTooltip(ref) {
  if (openFootnoteRef === ref) {
    closeFootnoteTooltip();
    return;
  }

  closeFootnoteTooltip();
  openFootnoteRef = ref;
  ref.classList.add("is-footnote-tooltip-open");
  ref.querySelector(":scope > a")?.setAttribute("aria-expanded", "true");
}

// hover tooltip 是纯 CSS 居中定位，而 .content 有 overflow: auto，
// ref 靠近两端时 tooltip 会被裁剪；hover 时测量并写入水平偏移量
function clampFootnoteTooltip(event) {
  if (!window.matchMedia(FOOTNOTE_HOVER_TOOLTIP_MEDIA).matches) return;
  if (event.target.closest?.(".footnote-tooltip")) return;

  const ref = event.target.closest?.("sup.footnote-ref");
  const tooltip = ref?.querySelector(":scope > .footnote-tooltip");
  if (!tooltip) return;

  const clip = ref.closest(".content");
  if (!clip) return;

  tooltip.style.setProperty("--footnote-tooltip-shift", "0px");
  const rect = tooltip.getBoundingClientRect();
  const clipRect = clip.getBoundingClientRect();
  const margin = 4;
  const minLeft = Math.max(clipRect.left, 0) + margin;
  const maxRight = Math.min(clipRect.right, window.innerWidth) - margin;

  let shift = 0;
  if (rect.left < minLeft) shift = minLeft - rect.left;
  else if (rect.right > maxRight) shift = maxRight - rect.right;
  tooltip.style.setProperty("--footnote-tooltip-shift", `${shift}px`);
}

function handleFootnoteTooltipClick(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (window.matchMedia(FOOTNOTE_HOVER_TOOLTIP_MEDIA).matches) return;
  if (event.target.closest?.(".footnote-tooltip")) return;

  const ref = event.target.closest?.("sup.footnote-ref");
  if (!ref) {
    closeFootnoteTooltip();
    return;
  }

  const link = event.target.closest?.("a");
  const tooltip = ref.querySelector(":scope > .footnote-tooltip");
  if (!link || !tooltip) return;

  event.preventDefault();
  toggleFootnoteTooltip(ref);
}

function handleLazyAssetError(error) {
  console.warn("[gnix] Unable to load lazy asset", error);
}

// #region image zoom
// 简易 medium-zoom：点击图片 FLIP 放大到视口中心。原图仅隐藏占位，
// 动画作用于 fixed 定位的克隆节点——.content 有 overflow:auto，直接
// transform 原图会被裁剪；克隆挂在 body 下也不受祖先 stacking context 影响。
// 类名沿用 medium-zoom 以复用 article.css 中的 backdrop-filter 等覆盖样式
const IMAGE_ZOOM_BACKGROUND = "hsla(from var(--mantle) / 0.9)";
const IMAGE_ZOOM_MARGIN = 24;
const IMAGE_ZOOM_DURATION_MS = 300;
let activeImageZoom = null;

function markImageZoomable(img) {
  if (img.dataset.zoomable === "true") return;
  img.dataset.zoomable = "true";
  img.style.cursor = "zoom-in";
}

function openImageZoom(img) {
  if (activeImageZoom) return;
  const rect = img.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const overlay = document.createElement("div");
  overlay.className = "medium-zoom-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "150",
    background: IMAGE_ZOOM_BACKGROUND,
    opacity: "0",
    transition: `opacity ${IMAGE_ZOOM_DURATION_MS}ms ease`,
    cursor: "zoom-out",
  });

  const clone = img.cloneNode();
  clone.removeAttribute("id");
  clone.classList.add("medium-zoom-image--opened");
  clone.loading = "eager";
  Object.assign(clone.style, {
    position: "fixed",
    top: `${rect.top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    maxWidth: "none",
    maxHeight: "none",
    margin: "0",
    zIndex: "151",
    cursor: "zoom-out",
    transform: "none",
    transition: `transform ${IMAGE_ZOOM_DURATION_MS}ms cubic-bezier(0.2, 0, 0.2, 1)`,
    willChange: "transform",
  });

  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  // 放大上限不超过图片原始尺寸，避免小图被拉糊
  const maxWidth = Math.min(viewportWidth - IMAGE_ZOOM_MARGIN * 2, Math.max(img.naturalWidth || Infinity, rect.width));
  const maxHeight = viewportHeight - IMAGE_ZOOM_MARGIN * 2;
  const scale = Math.min(maxWidth / rect.width, maxHeight / rect.height);
  const translateX = viewportWidth / 2 - (rect.left + rect.width / 2);
  const translateY = viewportHeight / 2 - (rect.top + rect.height / 2);

  document.body.append(overlay, clone);
  img.style.visibility = "hidden";
  activeImageZoom = { img, clone, overlay, closing: false };

  requestAnimationFrame(() => {
    overlay.style.opacity = "1";
    clone.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scale})`;
  });

  window.addEventListener("scroll", closeImageZoom, { passive: true });
}

function closeImageZoom() {
  const zoom = activeImageZoom;
  if (!zoom || zoom.closing) return;
  zoom.closing = true;
  window.removeEventListener("scroll", closeImageZoom);

  zoom.overlay.style.opacity = "0";
  zoom.clone.style.transform = "none";

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    zoom.clone.remove();
    zoom.overlay.remove();
    zoom.img.style.visibility = "";
    if (activeImageZoom === zoom) activeImageZoom = null;
  };
  zoom.clone.addEventListener("transitionend", cleanup, { once: true });
  // 页面不可见时 transitionend 不触发，兜底回收
  setTimeout(cleanup, IMAGE_ZOOM_DURATION_MS + 100);
}

function handleImageZoomClick(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  if (activeImageZoom) {
    closeImageZoom();
    return;
  }

  const img = event.target.closest?.('img[data-zoomable="true"]');
  if (!img || img.closest("a")) return;
  openImageZoom(img);
}
// #endregion

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
    const copyButton = figure.querySelector(".copy-button");

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
      let expandTimer = null;

      expandBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const showLines = parseInt(figure.dataset.maxLines, 10);
        const isExpanded = figure.classList.contains(CLS.expanded);
        const computed = getComputedStyle(pre);
        const lineHeight = parseFloat(computed.lineHeight) || 20;
        const padding = (parseFloat(computed.paddingTop) || 0) + (parseFloat(computed.paddingBottom) || 0);

        clearTimeout(expandTimer);

        if (isExpanded) {
          figure.classList.remove(CLS.expanded);
          pre.style.maxHeight = `${showLines * lineHeight + padding}px`;
          expandBtn.classList.remove(CLS.expandDone);
        } else {
          figure.classList.add(CLS.expanded);
          pre.style.maxHeight = `${pre.scrollHeight}px`;
          expandBtn.classList.add(CLS.expandDone);

          expandTimer = setTimeout(() => {
            pre.style.maxHeight = "none";
          }, 300);
        }
      });
    }

    // Initialize collapsed state
    if (figure.dataset.collapsible === "true" && pre) {
      requestAnimationFrame(() => {
        const computed = getComputedStyle(pre);
        const lineHeight = parseFloat(computed.lineHeight) || 20;
        const padding = (parseFloat(computed.paddingTop) || 0) + (parseFloat(computed.paddingBottom) || 0);
        const showLines = parseInt(figure.dataset.maxLines, 10);
        pre.style.maxHeight = `${showLines * lineHeight + padding}px`;
        pre.style.overflow = "hidden";
      });
    }
  });
}
// #endregion

// #region Keyboard Shortcuts

function handleKeyDown(e) {
  if (e.key === "Escape") {
    closeFootnoteTooltip();
    closeImageZoom();
  }

  const isModifier = e.metaKey || e.ctrlKey;
  if (!isModifier) return;

  const tag = e.target.tagName;
  if (["INPUT", "TEXTAREA"].includes(tag) || e.target.isContentEditable) return;

  const isSettingsShortcut = !e.altKey && !e.shiftKey && (e.code === "Comma" || e.key === "," || e.key === "Comma");
  if (isSettingsShortcut) {
    e.preventDefault();
    document.getElementById("preference-popup")?.togglePopover();
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

  loadStyleOnce("/css/optional/mermaid.css").catch(handleLazyAssetError);

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
    loadScriptOnce("/js/mdit/mermaid.js").then(runInit).catch(handleLazyAssetError);
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
  document.querySelectorAll(".content img").forEach(markImageZoomable);
  initTocPopover();
  initArticleCommentPopover();
}

// #region boot
// main.js 以 <script type="module"> 加载，具备 defer 语义：执行到这里时 DOM 必已解析完毕，
// 无需 DOMContentLoaded 门控；prerender 页面经 runWhenActivated 推迟到激活后初始化
runWhenActivated(initPage);
document.addEventListener("gnix:decrypted-content-ready", () => runWhenActivated(initPage));

runWhenActivated(() => {
  document.addEventListener("keydown", handleKeyDown, {
    capture: true, // 捕获阶段监听，优先于浏览器默认处理
    passive: false, // 允许调用 preventDefault
  });
});

// 以下监听不经激活门控：prerender 阶段用户无法交互，提前绑定无副作用
document.addEventListener("click", handleFootnoteTooltipClick, {
  capture: true,
  passive: false,
});
document.addEventListener("mouseover", clampFootnoteTooltip, { passive: true });
document.addEventListener("focusin", clampFootnoteTooltip, { passive: true });
// 图片缩放走事件委托：不依赖逐图绑定时机，Swup 导航/解密内容/延迟渲染的
// 自定义元素只需打上 data-zoomable 标记即可
document.addEventListener("click", handleImageZoomClick);
// #endregion
