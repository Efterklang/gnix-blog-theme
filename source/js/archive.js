import { runWhenActivated } from "./main.js";

function initArchivePreview() {
  const page = document.querySelector(".archive-page");
  if (!page || !CSS.supports("anchor-name: --archive-anchor") || !CSS.supports("anchor-scope: --archive-anchor")) return;

  const media = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 721px)");
  const picker = page.querySelector(".archive-topic-picker");
  const openDelay = Number.parseFloat(getComputedStyle(page).getPropertyValue("--archive-popup-open-delay")) || 140;
  let activeItem = null;
  let pendingItem = null;
  let dismissedItem = null;
  let pointer = null;
  let input = "pointer";
  let openTimer = 0;
  let closeTimer = 0;
  let scrollTimer = 0;
  let lastClosedAt = -Infinity;

  page.dataset.previewState = "idle";

  function getItem(target) {
    const surface = target?.closest?.(".archive-title");
    const item = surface?.closest(".archive-item");
    return item && page.contains(item) && item.querySelector(".archive-popup") ? item : null;
  }

  function getFocusedItem() {
    const focus = document.activeElement;
    if (!focus?.matches(":focus-visible")) return null;
    const item = getItem(focus);
    const rect = focus.getBoundingClientRect();
    return item && rect.bottom > 0 && rect.top < window.innerHeight ? item : null;
  }

  function cancelOpen() {
    clearTimeout(openTimer);
    openTimer = 0;
    pendingItem = null;
  }

  function close(state = "idle") {
    cancelOpen();
    clearTimeout(closeTimer);
    closeTimer = 0;
    if (activeItem) {
      delete activeItem.dataset.previewActive;
      activeItem = null;
      lastClosedAt = performance.now();
    }
    page.dataset.previewState = state;
    delete page.dataset.previewSwitching;
  }

  function available() {
    return media.matches && !document.hidden && page.dataset.previewState !== "scrolling" && !picker?.matches(":popover-open");
  }

  function open(item, source) {
    cancelOpen();
    if (!available()) return;
    const switching = activeItem !== null || performance.now() - lastClosedAt < 250;
    if (activeItem) delete activeItem.dataset.previewActive;
    page.toggleAttribute("data-preview-switching", switching);
    page.dataset.previewInput = source;
    page.dataset.previewState = "open";
    item.dataset.previewActive = "";
    activeItem = item;
  }

  function request(item, source, settled = false) {
    input = source;
    if (item !== dismissedItem) dismissedItem = null;
    if (!available() || (item && item === dismissedItem)) return;

    if (!item) {
      cancelOpen();
      if (!activeItem || closeTimer) return;
      // Bridge small gaps between neighboring titles without restarting intent.
      if (source === "keyboard") close();
      else closeTimer = setTimeout(close, 80);
      return;
    }

    clearTimeout(closeTimer);
    closeTimer = 0;
    if (item === activeItem) {
      page.dataset.previewInput = source;
      return;
    }
    if (item === pendingItem && source === "pointer" && !settled) return;
    cancelOpen();
    if (source === "keyboard" || settled || activeItem || performance.now() - lastClosedAt < 250) {
      open(item, source);
    } else {
      pendingItem = item;
      openTimer = setTimeout(() => open(item, source), openDelay);
    }
  }

  function trackPointer(event) {
    if (event.pointerType === "touch") return;
    pointer = { x: event.clientX, y: event.clientY };
    request(getItem(event.target), "pointer");
  }

  function reset() {
    clearTimeout(scrollTimer);
    scrollTimer = 0;
    close();
    lastClosedAt = -Infinity;
    dismissedItem = null;
    pointer = null;
  }

  document.addEventListener("pointermove", trackPointer, { passive: true });
  document.addEventListener("pointerdown", trackPointer, { passive: true });
  document.addEventListener(
    "pointerout",
    (event) => {
      if (event.relatedTarget) return;
      pointer = null;
      request(null, "pointer");
    },
    { passive: true },
  );

  page.addEventListener("focusin", () => {
    if (document.activeElement?.matches(":focus-visible")) request(getFocusedItem(), "keyboard");
  });
  page.addEventListener("focusout", () => {
    queueMicrotask(() => {
      if (input === "keyboard") request(getFocusedItem(), "keyboard");
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || (!activeItem && !pendingItem)) return;
    dismissedItem = activeItem || pendingItem;
    close();
  });

  // Listen to document scrolling, not capture-phase scrolls inside an excerpt.
  // A quiet period also covers inertial scrolling in browsers without scrollend.
  window.addEventListener(
    "scroll",
    () => {
      if (page.dataset.previewState !== "scrolling") {
        close("scrolling");
        lastClosedAt = -Infinity;
      }
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        scrollTimer = 0;
        page.dataset.previewState = "idle";
        // The page moved beneath a stationary pointer: never reopen the old row.
        const item = input === "keyboard" ? getFocusedItem() : pointer ? getItem(document.elementFromPoint(pointer.x, pointer.y)) : null;
        request(item, input, true);
      }, 160);
    },
    { passive: true },
  );

  picker?.addEventListener("beforetoggle", (event) => {
    if (event.newState === "open") reset();
  });
  media.addEventListener("change", reset);
  window.addEventListener("pagehide", reset);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) reset();
  });
}

// 季节标签书写动画：触屏没有悬浮，点按重播一次完整书写（桌面端点击同样生效）。
// 与预览浮层无关，不放进 initArchivePreview（那里在锚点定位不可用时整体退出）。
function initArchiveLabelReplay() {
  const page = document.querySelector(".archive-page");
  if (!page) return;

  page.addEventListener("click", (event) => {
    const header = event.target.closest?.(".archive-group__header");
    const strokes = header?.querySelectorAll(".archive-label__stroke");
    if (!strokes?.length) return;
    header.classList.remove("is-writing");
    void header.offsetWidth; // 强制重排，让动画从头重放
    header.classList.add("is-writing");
  });

  page.addEventListener("animationend", (event) => {
    if (event.animationName !== "archive-label-write") return;
    const header = event.target.closest?.(".archive-group__header");
    if (!header) return;
    // 标签与图标的书写都结束才摘掉标记（两者先后不定：长标签比图标画得久）；
    // 中途摘掉会让后续悬浮不再触发、未画完的笔画跳成完整态
    const writing = header.getAnimations({ subtree: true }).some((animation) => animation.animationName === "archive-label-write" && animation.playState === "running");
    if (!writing) header.classList.remove("is-writing");
  });
}

// 吸附检测：标签贴到视口顶端（sticky top）时加 is-stuck，驱动渐进模糊层；
// 窄视口下由 html.has-stuck-label 让导航链接为标签让位。标签自身 rect.top 在吸附时
// 恒等于 sticky top、未吸附时等于自然位置，无需哨兵元素即可判定
function initArchiveLabelStuck() {
  const page = document.querySelector(".archive-page");
  if (!page) return;
  const headers = [...page.querySelectorAll(".archive-group__header")];
  if (!headers.length) return;

  let scheduled = false;
  const update = () => {
    scheduled = false;
    const stickyTop = Number.parseFloat(getComputedStyle(headers[0]).top) || 0;
    let anyStuck = false;
    for (const header of headers) {
      // 吸附中且仍可见：被本节末尾顶出视口的标签不再算吸附（模糊层随之关闭）
      const rect = header.getBoundingClientRect();
      const stuck = rect.top <= stickyTop + 0.5 && rect.bottom > stickyTop;
      header.classList.toggle("is-stuck", stuck);
      anyStuck ||= stuck;
    }
    document.documentElement.classList.toggle("has-stuck-label", anyStuck);
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  };

  update();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
}

runWhenActivated(() => {
  initArchivePreview();
  initArchiveLabelReplay();
  initArchiveLabelStuck();
});
