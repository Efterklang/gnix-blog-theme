const HOVER_DELAY = 200;
const COARSE_POINTER = typeof window.matchMedia === "function" && window.matchMedia("(hover: none)").matches;

let popupEl = null;
let coverEl = null;
let excerptEl = null;
let tagsEl = null;
let openTimer = null;
let closeTimer = null;
let activeItem = null;

function ensurePopup() {
  if (popupEl) return popupEl;

  popupEl = document.createElement("div");
  popupEl.className = "archive-popup";
  popupEl.setAttribute("role", "dialog");
  popupEl.setAttribute("aria-hidden", "true");
  popupEl.innerHTML = `
    <div class="archive-popup__cover" hidden>
      <img alt="" decoding="async" loading="lazy" referrerpolicy="no-referrer" />
    </div>
    <p class="archive-popup__eyebrow"><span class="archive-popup__index"></span><span class="archive-popup__sep" hidden> · </span><span class="archive-popup__read" hidden></span></p>
    <div class="archive-popup__excerpt"></div>
    <p class="archive-popup__tags" hidden></p>
  `;
  document.body.appendChild(popupEl);

  coverEl = popupEl.querySelector(".archive-popup__cover");
  excerptEl = popupEl.querySelector(".archive-popup__excerpt");
  tagsEl = popupEl.querySelector(".archive-popup__tags");

  popupEl.addEventListener("pointerenter", clearCloseTimer);
  popupEl.addEventListener("pointerleave", scheduleClose);

  return popupEl;
}

function clearTimers() {
  if (openTimer) {
    clearTimeout(openTimer);
    openTimer = null;
  }
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

function clearCloseTimer() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
}

function parseTags(raw) {
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.filter((t) => t && t.name) : [];
}

function readArchiveIndex(item) {
  const items = document.querySelectorAll(".archive-item.has-preview, .archive-item");
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
  const title = item.querySelector(".archive-title")?.textContent || "";
  const cover = item.dataset.cover || "";
  const tags = parseTags(item.dataset.tags);
  const readTime = item.dataset.readTime || "";
  const excerptTemplate = item.querySelector(".archive-item__excerpt");

  const group = item.closest(".archive-group");
  if (group) {
    const accent = getComputedStyle(group).getPropertyValue("--archive-accent").trim();
    if (accent) popupEl.style.setProperty("--popup-accent", accent);
  }

  const indexEl = popupEl.querySelector(".archive-popup__index");
  const sepEl = popupEl.querySelector(".archive-popup__sep");
  const readEl = popupEl.querySelector(".archive-popup__read");
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

  const img = coverEl.querySelector("img");
  if (cover) {
    if (img.dataset.src !== cover) {
      img.dataset.src = cover;
      img.src = cover;
      img.alt = title;
    }
    coverEl.hidden = false;
  } else {
    img.removeAttribute("src");
    img.removeAttribute("alt");
    delete img.dataset.src;
    coverEl.hidden = true;
  }

  excerptEl.innerHTML = excerptTemplate ? excerptTemplate.innerHTML : "";

  if (tags.length) {
    tagsEl.innerHTML = tags
      .map((tag) => {
        const name = escapeHtml(tag.name);
        const node = tag.url ? `<a href="${escapeHtml(tag.url)}">${name}</a>` : `<span>${name}</span>`;
        return `<span class="archive-popup__tag">${node}</span>`;
      })
      .join("");
    tagsEl.hidden = false;
  } else {
    tagsEl.innerHTML = "";
    tagsEl.hidden = true;
  }
}

function position(item) {
  const rect = item.getBoundingClientRect();
  const popupRect = popupEl.getBoundingClientRect();
  const margin = 8;
  const viewportH = window.innerHeight;

  const spaceBelow = viewportH - rect.bottom;
  const spaceAbove = rect.top;
  const placeBelow = spaceBelow >= popupRect.height + margin || spaceBelow >= spaceAbove;

  const top = placeBelow
    ? rect.bottom + margin + window.scrollY
    : rect.top - popupRect.height - margin + window.scrollY;

  let left = rect.left + window.scrollX;
  const viewportW = window.innerWidth;
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
  popupEl.classList.add("is-open");
  popupEl.setAttribute("aria-hidden", "false");
  position(item);
  item.querySelector(".archive-item__info")?.setAttribute("aria-expanded", "true");
}

function close() {
  if (!popupEl) return;
  popupEl.classList.remove("is-open");
  popupEl.setAttribute("aria-hidden", "true");
  if (activeItem) {
    activeItem.querySelector(".archive-item__info")?.setAttribute("aria-expanded", "false");
  }
  activeItem = null;
}

function scheduleOpen(item) {
  clearTimers();
  openTimer = window.setTimeout(() => open(item), HOVER_DELAY);
}

function scheduleClose() {
  clearTimers();
  closeTimer = window.setTimeout(() => {
    if (popupEl?.matches(":hover")) return;
    const items = document.querySelectorAll(".archive-item.has-preview");
    for (const item of items) {
      if (item.matches(":hover")) return;
    }
    close();
  }, 120);
}

function handlePointerEnter(event) {
  if (COARSE_POINTER) return;
  const item = event.target.closest(".archive-item.has-preview");
  if (!item) return;
  scheduleOpen(item);
}

function handlePointerLeave(event) {
  if (COARSE_POINTER) return;
  const item = event.target.closest(".archive-item.has-preview");
  if (!item) return;
  if (openTimer) {
    clearTimeout(openTimer);
    openTimer = null;
  }
  scheduleClose();
}

function handleInfoClick(event) {
  const btn = event.target.closest(".archive-item__info");
  if (!btn) return;
  event.preventDefault();
  event.stopPropagation();
  const item = btn.closest(".archive-item.has-preview");
  if (!item) return;
  if (activeItem === item && popupEl?.classList.contains("is-open")) {
    close();
  } else {
    open(item);
  }
}

function handleDocumentClick(event) {
  if (!popupEl?.classList.contains("is-open")) return;
  if (event.target.closest(".archive-popup")) return;
  if (event.target.closest(".archive-item.has-preview")) return;
  close();
}

function handleScroll() {
  if (activeItem && popupEl?.classList.contains("is-open")) {
    position(activeItem);
  }
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

  document.addEventListener("pointerover", handlePointerEnter);
  document.addEventListener("pointerout", handlePointerLeave);
  document.addEventListener("click", handleInfoClick, true);
  document.addEventListener("click", handleDocumentClick);
  window.addEventListener("scroll", handleScroll, { passive: true });
  window.addEventListener("resize", handleScroll);
}

window.__gnixInitArchivePopup = initArchivePopup;
