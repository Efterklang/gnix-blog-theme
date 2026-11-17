// 文章页（post/page 布局）专属交互：脚注 tooltip、图片缩放、代码块工具栏、
// mermaid、TOC、评论弹层与满高首屏。由 scripts.jsx 仅在文章页注入，
// 共享基础设施（激活门控、懒加载资源）从 main.js 导入
import { handleLazyAssetError, loadScriptOnce, loadStyleOnce, runWhenActivated } from "./main.js";
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
  // it becomes a Backdrop Root and the player's translucent controls lose their blur.
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
  toolbar.className = "image-zoom-toolbar surface";
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

// Keep initialization on the stable host: Vue replaces its mount element.
let twikooInitPromise = null;

function setCommentLoadState(state) {
  const status = document.querySelector("[data-comment-load-status]");
  if (!status) return;
  status.dataset.state = state;
  status.hidden = state === "ready";
  const message = status.querySelector("[data-comment-load-message]");
  if (message) message.textContent = state === "error" ? status.dataset.errorLabel : status.dataset.loadingLabel;
  const retry = status.querySelector("[data-comment-load-retry]");
  if (retry) retry.hidden = state !== "error";
}

function twikoo_handler({ fetchPriority } = {}) {
  const el = document.getElementById("tko");
  if (!el || el.dataset.initialized === "true") return Promise.resolve();
  if (twikooInitPromise) return twikooInitPromise;

  const { envId, region, lang, jsUrl, cssUrl } = el.dataset;
  const decode = (value) => {
    try {
      return JSON.parse(value);
    } catch (_) {
      return value;
    }
  };
  el.dataset.initializing = "true";
  el.setAttribute("aria-busy", "true");
  setCommentLoadState("loading");

  twikooInitPromise = (async () => {
    if (!envId) throw new Error("Missing Twikoo environment");
    const assets = [];
    if (cssUrl) assets.push(loadStyleOnce(cssUrl, { fetchPriority }));
    if (typeof window.twikoo?.init !== "function") {
      if (!jsUrl) throw new Error("Missing Twikoo script");
      assets.push(loadScriptOnce(jsUrl, { fetchPriority }));
    }
    await Promise.all(assets);
    if (typeof window.twikoo?.init !== "function") throw new Error("Twikoo did not initialize");

    // Mounting starts Twikoo's own requests for config and the first comment page,
    // including when the popover is still closed. Reopening keeps that instance.
    await window.twikoo.init({ envId, region: decode(region), lang: decode(lang), el: "#twikoo-mount" });
    el.dataset.initialized = "true";
    const status = document.querySelector("[data-comment-load-status]");
    if (status?.contains(document.activeElement)) document.querySelector("[data-comment-close]")?.focus({ preventScroll: true });
    setCommentLoadState("ready");
  })()
    .catch((error) => {
      twikooInitPromise = null;
      setCommentLoadState("error");
      throw error;
    })
    .finally(() => {
      delete el.dataset.initializing;
      el.setAttribute("aria-busy", "false");
    });

  return twikooInitPromise;
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
      let copyNoticeTimer = null;
      toolbar.addEventListener("click", (e) => {
        const target = e.target;
        if (target.closest(".copy-button")) {
          const btn = target.closest(".copy-button");
          const notice = btn.previousElementSibling;
          const code = figure.querySelector(SELECTORS.code);

          navigator.clipboard
            .writeText(code.textContent)
            .then(() => {
              clearTimeout(copyNoticeTimer);
              notice.textContent = getLocalizedUiText("copied");
              notice.classList.add("show");
              copyNoticeTimer = setTimeout(() => notice.classList.remove("show"), 800);
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
  if (document.querySelector("#article-comment-popover:popover-open")) return;
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

  if (!(e.metaKey || e.ctrlKey) || e.code !== "KeyT") return;

  const tag = e.target.tagName;
  if (["INPUT", "TEXTAREA"].includes(tag) || e.target.isContentEditable) return;

  e.preventDefault();
  toggleArticlePanel();
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
    containers.forEach((container) => window.initPeleDiagram(container));
  };

  if (window.initPeleDiagram) {
    runInit();
  } else {
    loadScriptOnce("/js/mdit/pele.js").then(runInit).catch(handleLazyAssetError);
  }
}

function freezeCommentBackground(popover) {
  const frozen = [];
  let branch = popover;
  while (branch.parentElement) {
    for (const sibling of branch.parentElement.children) {
      if (sibling !== branch && !sibling.inert) {
        sibling.inert = true;
        frozen.push(sibling);
      }
    }
    branch = branch.parentElement;
    if (branch === document.body) break;
  }
  return () =>
    frozen.forEach((element) => {
      element.inert = false;
    });
}

function initArticleCommentPopover() {
  const commentPopover = document.getElementById("article-comment-popover");
  const initializeComments = (options) => twikoo_handler(options).catch(handleLazyAssetError);
  if (!commentPopover) {
    initializeComments();
    return;
  }
  if (commentPopover.dataset.bound === "true") return;
  commentPopover.dataset.bound = "true";

  const triggers = [...document.querySelectorAll('[popovertarget="article-comment-popover"]')].filter((trigger) => trigger.getAttribute("popovertargetaction") !== "hide");
  let returnFocus = null;
  let restoreBackground = () => {};

  for (const trigger of triggers) {
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-controls", "article-comment-popover");
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("pointerenter", () => initializeComments(), { once: true, passive: true });
    trigger.addEventListener("focus", () => initializeComments(), { once: true });
  }
  commentPopover.querySelector("[data-comment-load-retry]")?.addEventListener("click", () => initializeComments());

  commentPopover.addEventListener("beforetoggle", (event) => {
    if (event.newState !== "open") return;
    returnFocus = document.activeElement;
    initializeComments();
  });
  const synchronize = (open) => {
    triggers.forEach((trigger) => trigger.setAttribute("aria-expanded", String(open)));
    if (open) {
      restoreBackground = freezeCommentBackground(commentPopover);
      commentPopover.querySelector("[data-comment-close]")?.focus({ preventScroll: true });
    } else {
      restoreBackground();
      restoreBackground = () => {};
      if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
    }
  };
  commentPopover.addEventListener("toggle", (event) => synchronize(event.newState === "open"));
  commentPopover.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      commentPopover.hidePopover();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...commentPopover.querySelectorAll("a[href], button, input, textarea, select, [tabindex]")].filter(
      (element) => element.tabIndex >= 0 && !element.matches(":disabled") && element.getClientRects().length && !element.closest("[inert]"),
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  if (commentPopover.matches(":popover-open")) {
    returnFocus = triggers[0] || document.activeElement;
    synchronize(true);
    initializeComments();
  }
}

// #region Article panel (navbar context · Contents)
// 目录 #article-panel：<1280 是顶栏语境钮（.navbar-context）弹出的卡片，开合交给原生 popover；
// ≥1280 由 CSS 常驻在左栏，语境钮与 Ctrl+T 改为收起 / 展开它（记在 localStorage）。语境钮显示读到的小节（见 initTocSpy）
const tocDocked = () => window.matchMedia("(min-width: 1280px)").matches;

// 把当前小节滚进列表的可见范围（只滚目录自己）
function revealCurrentTocLink(panel) {
  const link = panel.querySelector(".toc-link.is-current");
  const scroller = link?.closest(".article-panel__page");
  if (!link || !scroller) return;
  const bounds = scroller.getBoundingClientRect();
  const rect = link.getBoundingClientRect();
  if (rect.top < bounds.top || rect.bottom > bounds.bottom) {
    scroller.scrollTop += rect.top - bounds.top - (bounds.height - rect.height) / 2;
  }
}

const TOC_COLLAPSED_KEY = "gnix:toc-collapsed";

function setDockedCollapsed(panel, collapsed) {
  panel.toggleAttribute("data-collapsed", collapsed);
  document.querySelector(".navbar-context")?.setAttribute("aria-expanded", String(!collapsed));
  try {
    if (collapsed) localStorage.setItem(TOC_COLLAPSED_KEY, "1");
    else localStorage.removeItem(TOC_COLLAPSED_KEY);
  } catch (_) {}
  if (!collapsed) requestAnimationFrame(() => revealCurrentTocLink(panel));
}

function toggleDockedToc(panel) {
  setDockedCollapsed(panel, !panel.hasAttribute("data-collapsed"));
}

function toggleArticlePanel() {
  const panel = document.getElementById("article-panel");
  if (!panel) return;
  if (tocDocked()) {
    toggleDockedToc(panel);
    return;
  }
  if (panel.matches(":popover-open")) panel.hidePopover();
  else panel.showPopover();
}

function initArticlePanel() {
  const panel = document.getElementById("article-panel");
  if (!panel || panel.dataset.bound === "true") return;
  panel.dataset.bound = "true";
  const trigger = document.querySelector(".navbar-context");

  // 常驻时取消语境钮的 popovertarget 默认行为，改为收起 / 展开（被取消的 click 不触发激活行为）
  trigger?.addEventListener("click", (event) => {
    if (!tocDocked()) return;
    event.preventDefault();
    toggleDockedToc(panel);
  });

  let collapsed = false;
  try {
    collapsed = localStorage.getItem(TOC_COLLAPSED_KEY) === "1";
  } catch (_) {}
  panel.toggleAttribute("data-collapsed", collapsed);
  if (tocDocked()) trigger?.setAttribute("aria-expanded", String(!collapsed));

  panel.addEventListener("toggle", (event) => {
    const open = event.newState === "open";
    trigger?.setAttribute("aria-expanded", String(open));
    if (open) requestAnimationFrame(() => revealCurrentTocLink(panel));
  });

  // 点目录项：跳转照常，弹出的卡片收起
  panel.addEventListener("click", (event) => {
    if (event.target.closest(".toc-link") && panel.matches(":popover-open")) panel.hidePopover();
  });

  // 视口变宽进入常驻态时，收起还开着的卡片
  window.matchMedia("(min-width: 1280px)").addEventListener("change", (event) => {
    if (event.matches && panel.matches(":popover-open")) panel.hidePopover();
  });
}

// 文末「Go to top」
function initScrollTop() {
  for (const button of document.querySelectorAll('[data-action="scroll-top"]:not([data-bound])')) {
    button.dataset.bound = "";
    button.addEventListener("click", () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
  }
}
// #endregion

// 当前小节：以视口上四分之一处为准线，最后一个越过准线的标题所在的小节为当前；
// 侧栏与弹层里对应的链接都加 .is-current，侧栏另把当前项滚进可见范围（只滚侧栏自己）
let tocSpyObserver = null;

function initTocSpy() {
  tocSpyObserver?.disconnect();
  tocSpyObserver = null;
  const container = document.getElementById("toc");
  const content = document.getElementById("article-content");
  if (!container || !content) return;

  const links = new Map();
  for (const link of container.querySelectorAll('.toc-link[href^="#"]')) {
    const raw = link.getAttribute("href").slice(1);
    let id = raw;
    try {
      id = decodeURIComponent(raw);
    } catch (_error) {
      // 保留原样
    }
    if (!links.has(id)) links.set(id, []);
    links.get(id).push(link);
  }
  const headings = Array.from(content.querySelectorAll(":is(h1, h2, h3, h4, h5, h6)[id]")).filter((heading) => links.has(heading.id));
  if (!headings.length) return;

  // 语境钮显示当前顶层小节的名称；百分比由正文滚动范围独立计算。
  const topList = container.querySelector(":scope > .toc");
  const topItems = topList ? [...topList.children].filter((node) => node.matches(".toc-item")) : [];
  const contextLabel = document.querySelector(".navbar-context__label");
  const setContext = (link) => {
    if (!contextLabel) return;
    const topItem = link?.closest(".toc-item") && topItems.find((item) => item.contains(link));
    if (!topItem) {
      contextLabel.textContent = contextLabel.dataset.default || "Contents";
      return;
    }
    contextLabel.textContent = topItem.querySelector(":scope > .toc-link")?.textContent.trim() || "";
  };

  let currentId = null;
  const setCurrent = (id) => {
    if (id === currentId) return;
    for (const link of links.get(currentId) || []) {
      link.classList.remove("is-current");
      link.removeAttribute("aria-current");
    }
    currentId = id;
    const active = links.get(id) || [];
    for (const link of active) {
      link.classList.add("is-current");
      link.setAttribute("aria-current", "location");
    }
    setContext(active[0]);
    // 常驻目录跟着把当前小节滚进可见范围
    const panel = document.getElementById("article-panel");
    if (panel && tocDocked() && !panel.hasAttribute("data-collapsed")) revealCurrentTocLink(panel);
  };

  const update = () => {
    const line = window.innerHeight * 0.25;
    let current = null;
    for (const heading of headings) {
      if (heading.getBoundingClientRect().top > line) break;
      current = heading;
    }
    setCurrent(current ? current.id : null);
  };

  // 标题进出视口上四分之一这条带子时重算；带内没有标题的长段落不需要更新
  tocSpyObserver = new IntersectionObserver(update, { rootMargin: "0px 0px -75% 0px" });
  for (const heading of headings) tocSpyObserver.observe(heading);
  update();
}
// #endregion

let cleanupReadingProgress = () => {};

function initReadingProgress() {
  cleanupReadingProgress();
  cleanupReadingProgress = () => {};
  const content = document.getElementById("article-content");
  const progress = document.querySelector(".navbar-context__progress");
  const navbar = document.querySelector(".navbar");
  if (!content || !progress || !navbar) return;

  const locked = Boolean(content.querySelector("#encrypted-article"));
  const controller = new AbortController();
  let frame = 0;

  const update = () => {
    frame = 0;
    let percent = 0;
    if (!locked) {
      const rect = content.getBoundingClientRect();
      const styles = getComputedStyle(content);
      const top = rect.top + (parseFloat(styles.paddingTop) || 0);
      const bottom = rect.bottom - (parseFloat(styles.paddingBottom) || 0);
      const readingLine = navbar.getBoundingClientRect().bottom;
      const visibleHeight = Math.max(1, window.innerHeight - readingLine);
      const height = Math.max(0, bottom - top);
      const range = height - visibleHeight;
      // Long articles start at 0% below the navbar and reach 100% when the
      // final paragraph enters the viewport. Short articles finish once visible.
      const ratio = range > 0 ? (readingLine - top) / range : height > 0 ? (window.innerHeight - top) / height : 0;
      percent = Math.round(Math.min(1, Math.max(0, ratio)) * 100);
    }
    const label = `${percent}%`;
    if (progress.textContent !== label) progress.textContent = label;
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  const options = { passive: true, signal: controller.signal };
  window.addEventListener("scroll", schedule, options);
  window.addEventListener("resize", schedule, options);
  window.addEventListener("pageshow", schedule, options);
  window.addEventListener("gnix:article-font-settings-change", schedule, options);
  content.addEventListener("load", schedule, { capture: true, signal: controller.signal });

  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
  for (const element of [content, content.closest("article"), navbar]) {
    if (element) observer?.observe(element);
  }
  cleanupReadingProgress = () => {
    controller.abort();
    observer?.disconnect();
    if (frame) cancelAnimationFrame(frame);
  };
  update();
}

function initPage() {
  initArticleReveal();
  handleMermaid();
  addHighlightTool();
  document.querySelectorAll(".content img").forEach(markImageZoomable);
  initArticlePanel();
  initScrollTop();
  initTocSpy();
  initReadingProgress();
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
