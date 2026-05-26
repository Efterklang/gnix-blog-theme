const HOVER_DELAY = 180;
const CLOSE_DELAY = 140;

const coarsePointerQuery = typeof window.matchMedia === "function" ? window.matchMedia("(hover: none)") : null;
let coarsePointer = coarsePointerQuery?.matches ?? false;
coarsePointerQuery?.addEventListener?.("change", (event) => {
  coarsePointer = event.matches;
  if (coarsePointer) close();
});

let popupEl = null;
let excerptEl = null;
let indexEl = null;
let sepEl = null;
let readEl = null;
let openTimer = null;
let closeTimer = null;
let activeItem = null;
let populatedItem = null;
let popupSize = null;
let scrollFrame = 0;

const accentCache = new WeakMap();
const indexCache = new WeakMap();
let indexCacheBuilt = false;

function ensurePopup() {
  if (popupEl) return popupEl;

  popupEl = document.createElement("div");
  popupEl.className = "archive-popup";
  popupEl.setAttribute("aria-hidden", "true");
  popupEl.innerHTML = `
    <p class="archive-popup__eyebrow">
      <span class="archive-popup__index"></span>
      <span class="archive-popup__sep" hidden> · </span>
      <span class="archive-popup__read" hidden></span>
    </p>
    <div class="archive-popup__excerpt"></div>
  `;
  document.body.appendChild(popupEl);

  excerptEl = popupEl.querySelector(".archive-popup__excerpt");
  indexEl = popupEl.querySelector(".archive-popup__index");
  sepEl = popupEl.querySelector(".archive-popup__sep");
  readEl = popupEl.querySelector(".archive-popup__read");

  popupEl.addEventListener("pointerenter", clearCloseTimer);
  popupEl.addEventListener("pointerleave", scheduleClose);

  return popupEl;
}

function clearOpenTimer() {
  if (openTimer) {
    clearTimeout(openTimer);
    openTimer = null;
  }
}

function clearCloseTimer() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

function clearTimers() {
  clearOpenTimer();
  clearCloseTimer();
}

function getItemIndex(item) {
  const cached = indexCache.get(item);
  if (cached !== undefined) return cached;
  if (!indexCacheBuilt) {
    const items = document.querySelectorAll(".archive-item");
    items.forEach((el, i) => {
      indexCache.set(el, String(i + 1).padStart(3, "0"));
    });
    indexCacheBuilt = true;
  }
  return indexCache.get(item) ?? null;
}

function getGroupAccent(group) {
  if (!group) return null;
  const cached = accentCache.get(group);
  if (cached !== undefined) return cached;
  const accent = getComputedStyle(group).getPropertyValue("--archive-accent").trim();
  accentCache.set(group, accent);
  return accent;
}

function populate(item) {
  ensurePopup();
  if (populatedItem === item) return;

  const readTime = item.dataset.readTime || "";
  const excerptTemplate = item.querySelector(".archive-item__excerpt");

  const accent = getGroupAccent(item.closest(".archive-group"));
  if (accent) popupEl.style.setProperty("--popup-accent", accent);

  const idx = getItemIndex(item);
  indexEl.textContent = idx ? `N° ${idx}` : "";
  if (readTime) {
    readEl.textContent = readTime.replace(/min$/i, "min read").toUpperCase();
    readEl.hidden = false;
    sepEl.hidden = !idx;
  } else {
    readEl.textContent = "";
    readEl.hidden = true;
    sepEl.hidden = true;
  }

  excerptEl.innerHTML = excerptTemplate ? excerptTemplate.innerHTML : "";
  populatedItem = item;
  popupSize = null;
}

function position(item) {
  const margin = 12;
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  const RIGHT_VIEWPORT_MIN = 1280;
  const RIGHT_POPUP_WIDTH = 208;

  const rect = item.getBoundingClientRect();
  const availableRight = viewportW - rect.right - margin;
  const canPlaceRight = viewportW >= RIGHT_VIEWPORT_MIN && availableRight >= RIGHT_POPUP_WIDTH + margin;

  // Only mutate dataset (and invalidate size cache) when the width-affecting
  // placement actually changes — "below" and "above" share dimensions.
  const wasRight = popupEl.dataset.placement === "right";
  if (wasRight !== canPlaceRight) {
    popupEl.dataset.placement = canPlaceRight ? "right" : "below";
    popupSize = null;
  }

  if (!popupSize) {
    const popupRect = popupEl.getBoundingClientRect();
    popupSize = { width: popupRect.width, height: popupRect.height };
  }

  if (canPlaceRight) {
    const left = rect.right + margin + window.scrollX;
    let top = rect.top + window.scrollY - 4;
    const minTop = window.scrollY + margin;
    const maxTop = window.scrollY + viewportH - popupSize.height - margin;
    if (top > maxTop) top = maxTop;
    if (top < minTop) top = minTop;
    popupEl.style.top = `${top}px`;
    popupEl.style.left = `${left}px`;
    return;
  }

  const spaceBelow = viewportH - rect.bottom;
  const spaceAbove = rect.top;
  const placeBelow = spaceBelow >= popupSize.height + margin || spaceBelow >= spaceAbove;

  const top = placeBelow
    ? rect.bottom + margin + window.scrollY
    : rect.top - popupSize.height - margin + window.scrollY;

  let left = rect.left + window.scrollX;
  const maxLeft = window.scrollX + viewportW - popupSize.width - margin;
  if (left > maxLeft) left = maxLeft;
  if (left < window.scrollX + margin) left = window.scrollX + margin;

  popupEl.style.top = `${top}px`;
  popupEl.style.left = `${left}px`;
  const finalPlacement = placeBelow ? "below" : "above";
  if (popupEl.dataset.placement !== finalPlacement) {
    popupEl.dataset.placement = finalPlacement;
  }
}

function open(item) {
  ensurePopup();
  if (activeItem === item && popupEl.classList.contains("is-open")) return;
  activeItem = item;
  populate(item);
  position(item);
  popupEl.classList.add("is-open");
  popupEl.setAttribute("aria-hidden", "false");
}

function close() {
  if (!popupEl) return;
  popupEl.classList.remove("is-open");
  popupEl.setAttribute("aria-hidden", "true");
  // Reset inline position — otherwise the absolutely-positioned popup keeps
  // its last top/left and extends document scrollHeight long after it's hidden.
  popupEl.style.top = "";
  popupEl.style.left = "";
  activeItem = null;
}

function destroyPopup() {
  if (!popupEl) return;
  popupEl.remove();
  popupEl = null;
  excerptEl = null;
  indexEl = null;
  sepEl = null;
  readEl = null;
  populatedItem = null;
  popupSize = null;
  activeItem = null;
}

function scheduleOpen(item) {
  clearTimers();
  openTimer = window.setTimeout(() => open(item), HOVER_DELAY);
}

function scheduleClose() {
  clearTimers();
  closeTimer = window.setTimeout(() => {
    if (!popupEl) return;
    if (popupEl.matches(":hover")) return;
    if (popupEl.contains(document.activeElement)) return;
    if (document.querySelector(".archive-item.has-preview:hover")) return;
    const focused = document.activeElement;
    if (focused?.closest?.(".archive-item.has-preview")) return;
    close();
  }, CLOSE_DELAY);
}

function handlePointerOver(event) {
  if (coarsePointer) return;
  const item = event.target.closest(".archive-item.has-preview");
  if (!item) return;
  const from = event.relatedTarget;
  if (from && item.contains(from)) return;
  scheduleOpen(item);
}

function handlePointerOut(event) {
  if (coarsePointer) return;
  const item = event.target.closest(".archive-item.has-preview");
  if (!item) return;
  const to = event.relatedTarget;
  if (to && item.contains(to)) return;
  clearOpenTimer();
  scheduleClose();
}

function handleFocusIn(event) {
  if (coarsePointer) return;
  const item = event.target.closest(".archive-item.has-preview");
  if (!item) return;
  clearTimers();
  open(item);
}

function handleFocusOut(event) {
  const item = event.target.closest(".archive-item.has-preview");
  if (!item && !event.target.closest?.(".archive-popup")) return;
  scheduleClose();
}

function handleScroll() {
  if (!activeItem || !popupEl?.classList.contains("is-open")) return;
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    if (activeItem && popupEl?.classList.contains("is-open")) {
      position(activeItem);
    }
  });
}

function handleResize() {
  popupSize = null;
  handleScroll();
}

let boundArchivePage = null;
let globalListenersBound = false;

function unbindArchivePage() {
  if (!boundArchivePage) return;
  boundArchivePage.removeEventListener("pointerover", handlePointerOver);
  boundArchivePage.removeEventListener("pointerout", handlePointerOut);
  boundArchivePage = null;
}

function resetPerPageState() {
  populatedItem = null;
  popupSize = null;
  indexCacheBuilt = false;
  clearTimers();
  close();
}

function initArchivePopup() {
  const archivePage = document.querySelector(".archive-page");

  // Left the archive page (or navigated to a page without one): tear down.
  if (!archivePage) {
    unbindArchivePage();
    resetPerPageState();
    destroyPopup();
    return;
  }

  if (coarsePointer) return;

  // Same element we already bound to (re-init on same page): nothing to do.
  if (boundArchivePage === archivePage) return;

  // New archive-page element (Swup swap): rebind to it and drop stale state.
  unbindArchivePage();
  resetPerPageState();

  boundArchivePage = archivePage;
  archivePage.addEventListener("pointerover", handlePointerOver);
  archivePage.addEventListener("pointerout", handlePointerOut);

  if (globalListenersBound) return;
  globalListenersBound = true;
  document.addEventListener("focusin", handleFocusIn);
  document.addEventListener("focusout", handleFocusOut);
  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", handleResize, { passive: true });
}

window.__gnixInitArchivePopup = initArchivePopup;
// Self-init for the case where this script is dynamically injected by
// Swup HeadPlugin: page:view (which calls __gnixInitArchivePopup from
// main.js) fires before the script finishes loading, so without this
// the popup never binds on a post→archive navigation.
initArchivePopup();
