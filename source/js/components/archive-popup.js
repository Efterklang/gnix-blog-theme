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
let scrollFrame = 0;

function ensurePopup() {
  if (popupEl) return popupEl;

  popupEl = document.createElement("div");
  popupEl.className = "archive-popup";
  popupEl.setAttribute("role", "dialog");
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

function readArchiveIndex(item) {
  const items = document.querySelectorAll(".archive-item");
  let total = 0;
  let found = -1;
  for (const el of items) {
    total += 1;
    if (el === item) found = total;
  }
  return found > 0 ? String(found).padStart(3, "0") : null;
}

function populate(item) {
  ensurePopup();
  const readTime = item.dataset.readTime || "";
  const excerptTemplate = item.querySelector(".archive-item__excerpt");

  const group = item.closest(".archive-group");
  if (group) {
    const accent = getComputedStyle(group).getPropertyValue("--archive-accent").trim();
    if (accent) popupEl.style.setProperty("--popup-accent", accent);
  }

  const idx = readArchiveIndex(item);
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

  if (canPlaceRight) {
    popupEl.dataset.placement = "right";
    const popupRect = popupEl.getBoundingClientRect();
    const left = rect.right + margin + window.scrollX;
    let top = rect.top + window.scrollY - 4;
    const minTop = window.scrollY + margin;
    const maxTop = window.scrollY + viewportH - popupRect.height - margin;
    if (top > maxTop) top = maxTop;
    if (top < minTop) top = minTop;
    popupEl.style.top = `${top}px`;
    popupEl.style.left = `${left}px`;
    return;
  }

  popupEl.dataset.placement = "below";
  const popupRect = popupEl.getBoundingClientRect();

  const spaceBelow = viewportH - rect.bottom;
  const spaceAbove = rect.top;
  const placeBelow = spaceBelow >= popupRect.height + margin || spaceBelow >= spaceAbove;

  const top = placeBelow
    ? rect.bottom + margin + window.scrollY
    : rect.top - popupRect.height - margin + window.scrollY;

  let left = rect.left + window.scrollX;
  const maxLeft = window.scrollX + viewportW - popupRect.width - margin;
  if (left > maxLeft) left = maxLeft;
  if (left < window.scrollX + margin) left = window.scrollX + margin;

  popupEl.style.top = `${top}px`;
  popupEl.style.left = `${left}px`;
  popupEl.dataset.placement = placeBelow ? "below" : "above";
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

function handleDocumentClick(event) {
  if (!popupEl?.classList.contains("is-open")) return;
  if (event.target.closest(".archive-popup")) return;
  if (event.target.closest(".archive-item.has-preview")) return;
  close();
}

function handleKeyDown(event) {
  if (event.key === "Escape" && popupEl?.classList.contains("is-open")) {
    close();
  }
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

let bound = false;

function initArchivePopup() {
  const archivePage = document.querySelector(".archive-page");
  if (!archivePage) {
    close();
    return;
  }

  if (bound) return;
  bound = true;

  document.addEventListener("pointerover", handlePointerOver);
  document.addEventListener("pointerout", handlePointerOut);
  document.addEventListener("focusin", handleFocusIn);
  document.addEventListener("focusout", handleFocusOut);
  document.addEventListener("click", handleDocumentClick);
  document.addEventListener("keydown", handleKeyDown);
  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", handleScroll);
}

window.__gnixInitArchivePopup = initArchivePopup;
