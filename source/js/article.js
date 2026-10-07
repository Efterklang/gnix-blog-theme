// 文章页（post/page 布局）专属交互：脚注 tooltip、图片缩放、代码块工具栏、
// mermaid、TOC、评论弹层与满高首屏。由 scripts.jsx 仅在文章页注入，
// 共享基础设施（激活门控、懒加载资源）从 main.js 导入
import { handleLazyAssetError, loadScriptOnce, loadStyleOnce, prewarmLazyAssetsOnIdle, runWhenActivated } from "./main.js";
import { initScrollReveal } from "./scroll-reveal.js";
import { initWikiLinkPreview } from "./wiki-link.js";

let cleanupArticleReveal = () => {};

function initArticleReveal() {
  cleanupArticleReveal();
  const content = document.getElementById("article-content");
  if (!content) return;
  // Decryption replaces body blocks while retaining this root. Settle the old
  // controller first so previously read content never hides or replays.
  // <video-player> stays out of the fade: while an ancestor's opacity is below 1
  // it becomes a Backdrop Root and the player's glass buttons lose their blur.
  cleanupArticleReveal = initScrollReveal(content, content.querySelectorAll(":scope > :not(script, style, template, link, video-player, [hidden])"));
}

function getLocalizedUiText(key) {
  const isZh = (document.documentElement.lang || "").toLowerCase().startsWith("zh");
  const messages = {
    copied: isZh ? "已复制" : "Copied",
    copyCode: isZh ? "复制代码" : "Copy code",
    imagePreview: isZh ? "图片预览" : "Image preview",
    previousImage: isZh ? "上一张图片" : "Previous image",
    nextImage: isZh ? "下一张图片" : "Next image",
    closeImage: isZh ? "关闭图片预览" : "Close image preview",
  };
  return messages[key] || key;
}

// #region footnote tooltip

const FOOTNOTE_HOVER_TOOLTIP_MEDIA = "(hover: hover) and (pointer: fine)";
let openFootnoteRef = null;
let footnoteCloseTimer;
let footnotePositionFrame;
let footnoteResizeObserver;
let footnoteTooltipId = 0;

function closeFootnoteTooltip(restoreFocus = false) {
  clearTimeout(footnoteCloseTimer);
  cancelAnimationFrame(footnotePositionFrame);
  footnotePositionFrame = null;
  footnoteResizeObserver?.disconnect();
  if (!openFootnoteRef) return;

  const ref = openFootnoteRef;
  const tooltip = ref.querySelector(":scope > .footnote-tooltip");
  const link = ref.querySelector(":scope > a");
  const hadFocus = tooltip?.contains(document.activeElement);
  if (restoreFocus && hadFocus) link?.focus({ preventScroll: true });
  openFootnoteRef = null;
  link?.setAttribute("aria-expanded", "false");
  if (tooltip?.matches(":popover-open")) tooltip.hidePopover();
}

function positionFootnoteTooltip() {
  if (!openFootnoteRef) return;
  const ref = openFootnoteRef;
  const tooltip = ref.querySelector(":scope > .footnote-tooltip");
  if (!ref.isConnected || !tooltip?.matches(":popover-open")) {
    closeFootnoteTooltip();
    return;
  }

  const scrollTop = tooltip.scrollTop;
  for (const property of ["left", "top", "max-width", "max-height"]) tooltip.style.removeProperty(property);
  // Touch previews remain a bottom sheet, now outside ancestor clipping/transforms.
  if (!window.matchMedia(FOOTNOTE_HOVER_TOOLTIP_MEDIA).matches) return;

  const rect = ref.querySelector(":scope > a").getBoundingClientRect();
  const viewport = window.visualViewport;
  const margin = 12;
  const gap = 8;
  const minLeft = (viewport?.offsetLeft || 0) + margin;
  const minTop = (viewport?.offsetTop || 0) + margin;
  const maxRight = minLeft + (viewport?.width || document.documentElement.clientWidth) - margin * 2;
  const maxBottom = minTop + (viewport?.height || window.innerHeight) - margin * 2;
  if (rect.bottom < minTop || rect.top > maxBottom || rect.right < minLeft || rect.left > maxRight) {
    closeFootnoteTooltip();
    return;
  }

  tooltip.style.maxWidth = `min(24rem, ${maxRight - minLeft}px)`;
  const above = Math.max(0, rect.top - minTop - gap);
  const below = Math.max(0, maxBottom - rect.bottom - gap);
  const placeAbove = tooltip.offsetHeight <= above || above >= below;
  tooltip.style.maxHeight = `${placeAbove ? above : below}px`;
  // Measure layout dimensions, never an animated transform or the previous offset.
  const left = Math.max(minLeft, Math.min(rect.left + rect.width / 2 - tooltip.offsetWidth / 2, maxRight - tooltip.offsetWidth));
  const top = placeAbove ? rect.top - gap - tooltip.offsetHeight : rect.bottom + gap;
  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${Math.max(minTop, Math.min(top, maxBottom - tooltip.offsetHeight))}px`;
  tooltip.scrollTop = scrollTop;
}

function scheduleFootnotePosition(event) {
  // Scrolling a long footnote must not remeasure/reset its own scroll container.
  if (event?.type === "scroll" && event.target?.closest?.(".footnote-tooltip")) return;
  if (!openFootnoteRef || footnotePositionFrame != null) return;
  footnotePositionFrame = requestAnimationFrame(() => {
    footnotePositionFrame = null;
    positionFootnoteTooltip();
  });
}

function showFootnoteTooltip(ref) {
  clearTimeout(footnoteCloseTimer);
  if (openFootnoteRef === ref) return;
  const tooltip = ref.querySelector(":scope > .footnote-tooltip");
  const link = ref.querySelector(":scope > a");
  // Older browsers retain the ordinary footnote link.
  if (!link || !tooltip?.showPopover) return;
  closeFootnoteTooltip();
  tooltip.setAttribute("popover", "manual");
  if (!tooltip.id) {
    tooltip.id = `footnote-preview-${++footnoteTooltipId}`;
    tooltip.addEventListener("toggle", () => {
      if (openFootnoteRef === ref && !tooltip.matches(":popover-open")) closeFootnoteTooltip();
    });
  }
  link.setAttribute("aria-controls", tooltip.id);
  link.setAttribute("aria-expanded", "true");
  tooltip.showPopover();
  openFootnoteRef = ref;
  positionFootnoteTooltip();
  if (openFootnoteRef && window.ResizeObserver) {
    footnoteResizeObserver ||= new ResizeObserver(scheduleFootnotePosition);
    footnoteResizeObserver.observe(tooltip);
    const content = ref.closest(".content");
    if (content) footnoteResizeObserver.observe(content);
  }
}

function handleFootnoteTooltipEnter(event) {
  const ref = event.target.closest?.("sup.footnote-ref");
  if (!ref) return;
  if (event.type === "focusin") {
    // A touch-generated focus must not open the sheet before click toggles it.
    if (!event.target.matches(":focus-visible")) return;
  } else if (!window.matchMedia(FOOTNOTE_HOVER_TOOLTIP_MEDIA).matches) return;
  if (ref.contains(event.relatedTarget)) {
    clearTimeout(footnoteCloseTimer);
    return;
  }
  showFootnoteTooltip(ref);
}

function handleFootnoteTooltipLeave(event) {
  if (!openFootnoteRef?.contains(event.target) || openFootnoteRef.contains(event.relatedTarget)) return;
  clearTimeout(footnoteCloseTimer);
  // Allow crossing the small gap, including when a long preview is scrollable.
  footnoteCloseTimer = setTimeout(() => {
    if (!openFootnoteRef || openFootnoteRef.contains(document.activeElement)) return;
    if (window.matchMedia(FOOTNOTE_HOVER_TOOLTIP_MEDIA).matches && openFootnoteRef.matches(":hover")) return;
    closeFootnoteTooltip();
  }, 120);
}

function handleFootnoteTooltipClick(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (event.target.closest?.(".footnote-tooltip")) return;

  const ref = event.target.closest?.("sup.footnote-ref");
  if (!ref) {
    closeFootnoteTooltip();
    return;
  }
  if (window.matchMedia(FOOTNOTE_HOVER_TOOLTIP_MEDIA).matches) return;

  const link = event.target.closest?.("a");
  const tooltip = ref.querySelector(":scope > .footnote-tooltip");
  if (!link || !tooltip?.showPopover) return;

  event.preventDefault();
  if (openFootnoteRef === ref) closeFootnoteTooltip();
  else showFootnoteTooltip(ref);
}

// #endregion

// #region image zoom
// 原生 dialog 提供顶层渲染、背景 inert 与焦点约束；图片保留 FLIP 放大，
// 底部操作区独立占位，竖图也不会遮住按钮。切图不做位移动画。
const IMAGE_ZOOM_DURATION_MS = 300;
let activeImageZoom = null;

function markImageZoomable(img) {
  if (img.dataset.zoomable === "false" || img.closest("a, button")) return;
  img.dataset.zoomable = "true";
  img.tabIndex = 0;
  img.setAttribute("role", "button");
  img.setAttribute("aria-haspopup", "dialog");
  img.setAttribute("aria-label", `${getLocalizedUiText("imagePreview")}${img.alt ? `: ${img.alt}` : ""}`);
}

function imageZoomButton(label, path, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "image-zoom-button";
  button.title = label;
  button.setAttribute("aria-label", label);
  button.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
  button.addEventListener("click", action);
  return button;
}

function layoutImageZoom() {
  const zoom = activeImageZoom;
  if (!zoom || zoom.closing) return;
  const rect = zoom.img.getBoundingClientRect();
  const width = zoom.img.naturalWidth || zoom.clone.naturalWidth || rect.width;
  const height = zoom.img.naturalHeight || zoom.clone.naturalHeight || rect.height;
  if (!width || !height) return;
  // 不超过原始尺寸；stage 已扣除 toolbar、间距及安全区域。
  const scale = Math.min(1, zoom.stage.clientWidth / width, zoom.stage.clientHeight / height);
  zoom.clone.style.width = `${width * scale}px`;
  zoom.clone.style.height = `${height * scale}px`;
}

function imageZoomTransform(from, to) {
  return `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}, ${from.height / to.height})`;
}

function showZoomImage(zoom, index) {
  if (zoom.img) zoom.img.style.visibility = zoom.visibility;
  zoom.animation?.cancel();
  zoom.img = zoom.images[index];
  zoom.index = index;
  zoom.visibility = zoom.img.style.visibility;
  zoom.img.style.visibility = "hidden";

  // 使用干净的节点，避免复制原图的 tabindex、缩略图占位背景和行内事件。
  const clone = new Image();
  clone.className = "image-zoom-image";
  clone.alt = zoom.img.alt;
  clone.decoding = "async";
  clone.src = zoom.img.currentSrc || zoom.img.src;
  clone.addEventListener("load", () => {
    if (activeImageZoom === zoom && zoom.clone === clone) layoutImageZoom();
  });
  zoom.clone = clone;
  zoom.stage.replaceChildren(clone);
  layoutImageZoom();
  zoom.counter.textContent = `${index + 1} / ${zoom.images.length}`;
  // 保留端点按钮的焦点，键盘用户到达首尾后仍可反向切换。
  zoom.previous.setAttribute("aria-disabled", String(index === 0));
  zoom.next.setAttribute("aria-disabled", String(index === zoom.images.length - 1));
}

function stepImageZoom(direction) {
  const zoom = activeImageZoom;
  if (!zoom || zoom.closing) return;
  const index = zoom.index + direction;
  if (index < 0 || index >= zoom.images.length) return;
  showZoomImage(zoom, index);
}

function openImageZoom(img) {
  if (activeImageZoom) return;
  const rect = img.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const scope = img.closest(".content") || document;
  const images = Array.from(scope.querySelectorAll('img[data-zoomable="true"]')).filter((image) => {
    if (image.closest("a, button, [hidden], [inert]") || getComputedStyle(image).visibility === "hidden") return false;
    const bounds = image.getBoundingClientRect();
    return bounds.width > 0 && bounds.height > 0;
  });
  if (!images.includes(img)) return;

  const dialog = document.createElement("dialog");
  dialog.className = "image-zoom";
  dialog.setAttribute("aria-label", getLocalizedUiText("imagePreview"));
  const stage = document.createElement("div");
  stage.className = "image-zoom-stage";
  const toolbar = document.createElement("div");
  toolbar.className = "image-zoom-toolbar glass";
  toolbar.setAttribute("role", "group");
  toolbar.setAttribute("aria-label", getLocalizedUiText("imagePreview"));
  const previous = imageZoomButton(getLocalizedUiText("previousImage"), "m15 18-6-6 6-6", () => stepImageZoom(-1));
  const next = imageZoomButton(getLocalizedUiText("nextImage"), "m9 18 6-6-6-6", () => stepImageZoom(1));
  const close = imageZoomButton(getLocalizedUiText("closeImage"), "m6 6 12 12M6 18 18 6", closeImageZoom);
  close.classList.add("image-zoom-close");
  close.autofocus = true;
  const counter = document.createElement("span");
  counter.className = "image-zoom-counter";
  counter.setAttribute("role", "status");
  counter.setAttribute("aria-atomic", "true");
  toolbar.append(previous, counter, next, close);
  dialog.append(stage, toolbar);
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeImageZoom();
  });
  dialog.addEventListener("click", (event) => {
    if (!toolbar.contains(event.target)) closeImageZoom();
  });
  document.body.append(dialog);
  const zoom = { dialog, stage, previous, next, counter, images, trigger: img, closing: false };
  activeImageZoom = zoom;
  dialog.showModal();
  showZoomImage(zoom, images.indexOf(img));

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const target = zoom.clone.getBoundingClientRect();
    if (target.width && target.height) {
      zoom.animation = zoom.clone.animate([{ transform: imageZoomTransform(rect, target) }, { transform: "none" }], {
        duration: IMAGE_ZOOM_DURATION_MS,
        easing: "cubic-bezier(0.2, 0, 0.2, 1)",
      });
    }
  }
  window.addEventListener("scroll", closeImageZoom, { passive: true });
  window.addEventListener("resize", layoutImageZoom, { passive: true });
}

function closeImageZoom() {
  const zoom = activeImageZoom;
  if (!zoom || zoom.closing) return;
  zoom.closing = true;
  window.removeEventListener("scroll", closeImageZoom);
  window.removeEventListener("resize", layoutImageZoom);

  const current = zoom.clone.getBoundingClientRect();
  zoom.animation?.cancel();
  const base = zoom.clone.getBoundingClientRect();
  const target = zoom.img.getBoundingClientRect();
  const canReturn = target.width > 0 && target.height > 0 && target.top >= 0 && target.bottom <= window.innerHeight && target.left >= 0 && target.right <= document.documentElement.clientWidth;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  zoom.dialog.classList.add("is-closing");

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    zoom.img.style.visibility = zoom.visibility;
    zoom.dialog.close();
    zoom.dialog.remove();
    if (activeImageZoom === zoom) activeImageZoom = null;
    if (zoom.trigger.isConnected) zoom.trigger.focus({ preventScroll: true });
  };
  if (reducedMotion || !base.width || !base.height) {
    cleanup();
    return;
  }
  // 切到正文视口之外的图片后关闭，只淡出，避免图片飞向屏幕外。
  zoom.animation = zoom.clone.animate(
    [
      { transform: imageZoomTransform(current, base), opacity: 1 },
      { transform: canReturn ? imageZoomTransform(target, base) : imageZoomTransform(current, base), opacity: canReturn ? 1 : 0 },
    ],
    { duration: IMAGE_ZOOM_DURATION_MS, easing: "cubic-bezier(0.2, 0, 0.2, 1)", fill: "forwards" },
  );
  zoom.animation.finished.then(cleanup, cleanup);
  // 后台页的动画可能暂停，仍需回收 dialog 与原图占位。
  window.setTimeout(cleanup, IMAGE_ZOOM_DURATION_MS + 100);
}

function handleImageZoomClick(event) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

  if (activeImageZoom) return;

  const img = event.target.closest?.('img[data-zoomable="true"]');
  if (!img || img.closest("a, button")) return;
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

    function collapsedHeight(computed) {
      const showLines = parseInt(figure.dataset.maxLines, 10);
      const lineHeight = parseFloat(computed.lineHeight) || 20;
      const padding = (parseFloat(computed.paddingTop) || 0) + (parseFloat(computed.paddingBottom) || 0);
      return `${showLines * lineHeight + padding}px`;
    }

    // Expand button handler
    if (expandBtn) {
      let expandTimer = null;

      expandBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const isExpanded = figure.classList.contains(CLS.expanded);
        const computed = getComputedStyle(pre);

        clearTimeout(expandTimer);

        if (isExpanded) {
          if (computed.maxHeight === "none") {
            pre.style.maxHeight = computed.height;
            pre.getBoundingClientRect();
          }
          figure.classList.remove(CLS.expanded);
          pre.style.maxHeight = collapsedHeight(computed);
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
        pre.style.maxHeight = collapsedHeight(computed);
        pre.style.overflow = "hidden";
      });
    }
  });
}
// #endregion

// #region Keyboard Shortcuts

function handleArticleKeyDown(e) {
  if (activeImageZoom) {
    if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeImageZoom();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        stepImageZoom(e.key === "ArrowLeft" ? -1 : 1);
      }
    }
    return;
  }

  const image = e.target.closest?.('img[data-zoomable="true"]');
  if (image && !image.closest("a, button") && (e.key === "Enter" || e.key === " ") && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
    e.preventDefault();
    openImageZoom(image);
    return;
  }

  if (e.key === "Escape") {
    closeFootnoteTooltip(true);
  }

  // 满高首屏上按空格：正文开头尚在视口下半部时直接对齐视口顶部；
  // 已进入阅读区、焦点在控件上或有弹层打开时交还浏览器默认行为
  if (e.code === "Space" && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
    const content = document.querySelector(".article-hero-full") ? document.getElementById("article-content") : null;
    if (
      content &&
      content.getBoundingClientRect().top > window.innerHeight * 0.5 &&
      !["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A", "SUMMARY", "VIDEO", "AUDIO", "VIDEO-PLAYER"].includes(e.target.tagName) &&
      !e.target.isContentEditable &&
      !document.querySelector(":popover-open")
    ) {
      e.preventDefault();
      window.scrollTo({
        top: window.scrollY + content.getBoundingClientRect().top,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
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

// 图多数已在构建期由 agentic-mermaid 内联为 SVG，这里统一挂平移缩放 / 复制外壳；
// 仅 data-mermaid-renderer="mermaid-js" 的回退图会由 mermaid.js 在浏览器渲染（判断在 mermaid.js 内）。
// 含图页面的样式表已由 head.jsx 直出，loadStyleOnce 命中既有 link 即返回
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
  const root = document.documentElement;
  const tocContainer = document.getElementById("toc");
  if (!hero || root.dataset.heroBound === "true") return;

  root.dataset.heroBound = "true";
  // 首屏期间 TOC 按钮与 logo 之外导航控件的初始隐藏由 CSS（:root.gnix-revealed:has(.article-hero-full)）
  // 承担，这里只负责滚过首屏后点亮（<html>.gnix-past-hero，TOC 另有 .toc-visible）、回到首屏时再隐藏；
  // rootMargin 收缩视口顶部 20%，跳到正文后残留在导航栏下的首屏尾部不视为可见
  new IntersectionObserver(
    ([entry]) => {
      root.classList.toggle("gnix-past-hero", !entry.isIntersecting);
      tocContainer?.classList.toggle("toc-visible", !entry.isIntersecting);
    },
    { rootMargin: "-20% 0px 0px 0px" },
  ).observe(hero);
}

function initPage() {
  initArticleReveal();
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
runWhenActivated(initWikiLinkPreview);
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
document.addEventListener("mouseover", handleFootnoteTooltipEnter, { passive: true });
document.addEventListener("focusin", handleFootnoteTooltipEnter, { passive: true });
document.addEventListener("mouseout", handleFootnoteTooltipLeave, { passive: true });
document.addEventListener("focusout", handleFootnoteTooltipLeave, { passive: true });
document.addEventListener("scroll", scheduleFootnotePosition, { capture: true, passive: true });
window.addEventListener("resize", scheduleFootnotePosition, { passive: true });
window.visualViewport?.addEventListener("resize", scheduleFootnotePosition, { passive: true });
window.visualViewport?.addEventListener("scroll", scheduleFootnotePosition, { passive: true });
window.matchMedia(FOOTNOTE_HOVER_TOOLTIP_MEDIA).addEventListener("change", () => closeFootnoteTooltip());
// 图片缩放走事件委托：不依赖逐图绑定时机，Swup 导航/解密内容/延迟渲染的
// 自定义元素只需打上 data-zoomable 标记即可
document.addEventListener("click", handleImageZoomClick);
// #endregion
