// 文章页（post/page 布局）专属交互：脚注 tooltip、图片缩放、代码块工具栏、
// mermaid、TOC、评论弹层与满高首屏。由 scripts.jsx 仅在文章页注入，
// 共享基础设施（激活门控、懒加载资源）从 main.js 导入
import { handleLazyAssetError, loadScriptOnce, loadStyleOnce, prewarmLazyAssetsOnIdle, runWhenActivated } from "./main.js";

function getLocalizedUiText(key) {
  const isZh = (document.documentElement.lang || "").toLowerCase().startsWith("zh");
  const messages = {
    copied: isZh ? "已复制" : "Copied",
    copyCode: isZh ? "复制代码" : "Copy code",
  };
  return messages[key] || key;
}

// #region footnote tooltip

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

// #endregion

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

function handleArticleKeyDown(e) {
  if (e.key === "Escape") {
    closeFootnoteTooltip();
    closeImageZoom();
  }

  // 满高首屏上按空格等效点击 ↓ 箭头：正文开头尚在视口下半部时平滑跳至正文；
  // 已进入阅读区、焦点在控件上或有弹层打开时交还浏览器默认行为
  if (e.code === "Space" && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
    const content = document.querySelector(".article-hero-full") ? document.getElementById("article-content") : null;
    if (
      content &&
      content.getBoundingClientRect().top > window.innerHeight * 0.5 &&
      !["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A", "SUMMARY", "VIDEO", "AUDIO"].includes(e.target.tagName) &&
      !e.target.isContentEditable &&
      !document.querySelector(":popover-open")
    ) {
      e.preventDefault();
      content.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
  }

  if (!(e.metaKey || e.ctrlKey) || e.code !== "KeyT") return;

  const tag = e.target.tagName;
  if (["INPUT", "TEXTAREA"].includes(tag) || e.target.isContentEditable) return;

  e.preventDefault();
  document.getElementById("toc-body")?.togglePopover();
}

// #endregion

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

function initHeroTocReveal() {
  const hero = document.querySelector(".article-hero-full");
  const tocContainer = document.getElementById("toc");
  if (!hero || !tocContainer || tocContainer.dataset.heroBound === "true") return;

  tocContainer.dataset.heroBound = "true";
  // 首屏期间 TOC 按钮的初始隐藏由 CSS（:root.gnix-revealed:has(.article-hero-full)）承担，
  // 这里只负责滚过首屏后点亮/回到首屏时再隐藏；rootMargin 收缩视口顶部 20%，
  // 跳到正文后残留在导航栏下的首屏尾部不视为可见
  new IntersectionObserver(
    ([entry]) => {
      tocContainer.classList.toggle("toc-visible", !entry.isIntersecting);
    },
    { rootMargin: "-20% 0px 0px 0px" },
  ).observe(hero);
}

function initPage() {
  handleMermaid();
  addHighlightTool();
  document.querySelectorAll(".content img").forEach(markImageZoomable);
  initTocPopover();
  initHeroTocReveal();
  initArticleCommentPopover();
}

// #region boot
// article.js 与 main.js 同为 <script type="module">，具备 defer 语义：执行到这里时 DOM
// 必已解析完毕，无需 DOMContentLoaded 门控；prerender 页面经 runWhenActivated 推迟到激活后初始化
runWhenActivated(initPage);
document.addEventListener("gnix:decrypted-content-ready", () => runWhenActivated(initPage));

runWhenActivated(() => {
  document.addEventListener("keydown", handleArticleKeyDown, {
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
