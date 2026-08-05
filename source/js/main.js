function runWhenActivated(callback) {
  (
    window.__gnixPrerender?.runWhenActivated ||
    ((fn) => {
      fn();
    })
  )(callback);
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

function handleLazyAssetError(error) {
  console.warn("[gnix] Unable to load lazy asset", error);
}

// #region Keyboard Shortcuts

// 全站快捷键；文章页专属快捷键（Esc 关脚注/缩放、空格跳过首屏、Cmd/Ctrl+T 目录）在 article.js
function handleKeyDown(e) {
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

  if (e.code === "KeyK") {
    e.preventDefault();
    document.querySelector("#searchbox")?.showPopover();
  }
}

// #endregion

// #region boot
// main.js 以 <script type="module"> 加载，具备 defer 语义：执行到这里时 DOM 必已解析完毕，
// 无需 DOMContentLoaded 门控；prerender 页面经 runWhenActivated 推迟到激活后初始化
runWhenActivated(() => {
  document.addEventListener("keydown", handleKeyDown, {
    capture: true, // 捕获阶段监听，优先于浏览器默认处理
    passive: false, // 允许调用 preventDefault
  });
});
// #endregion

// 文章页专属交互（脚注 tooltip/图片缩放/代码块工具栏/mermaid/TOC/评论/满高首屏）
// 在 article.js，由 scripts.jsx 仅在 post/page 布局注入，共享基础设施从这里导入
export { handleLazyAssetError, loadScriptOnce, loadStyleOnce, prewarmLazyAssetsOnIdle, runWhenActivated };
