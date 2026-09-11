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

runWhenActivated(initArchivePreview);
