// One shared preview; delegated events also cover decrypted article content.
export function initWikiLinkPreview() {
  if (!("showPopover" in HTMLElement.prototype)) return;

  const preview = document.createElement("div");
  preview.id = "gnix-wiki-preview";
  preview.className = "wiki-link-preview";
  preview.setAttribute("popover", "manual");
  preview.setAttribute("role", "tooltip");
  document.body.appendChild(preview);

  let active = null;
  let previousDescription = null;
  let timer;
  let request;
  const title = document.createElement("p");
  title.className = "wiki-link-preview__title";
  const excerpt = document.createElement("p");
  excerpt.className = "wiki-link-preview__excerpt";
  preview.append(title, excerpt);

  function loadPreviews() {
    request ??= fetch(new URL("../wiki-link-previews.json", import.meta.url), { credentials: "same-origin" })
      .then((response) => {
        if (!response.ok) throw new Error(`Wiki preview: ${response.status}`);
        return response.json();
      })
      .catch(() => null); // A failed preview must never interfere with navigation.
    return request;
  }
  const hover = window.matchMedia("(hover: hover) and (pointer: fine)");
  const findLink = (target) => target?.closest?.("a.wiki-link[data-wiki-title]");

  function close() {
    clearTimeout(timer);
    if (!active) return;
    active.setAttribute("title", active.dataset.wikiTitle);
    if (previousDescription === null) active.removeAttribute("aria-describedby");
    else active.setAttribute("aria-describedby", previousDescription);
    if (preview.matches(":popover-open")) preview.hidePopover();
    active = null;
  }

  function open(link) {
    clearTimeout(timer);
    if (active === link) return;
    close();
    if (!link.isConnected) return;
    active = link;
    previousDescription = link.getAttribute("aria-describedby");
    link.removeAttribute("title");
    title.textContent = link.dataset.wikiTitle;
    excerpt.textContent = "";
    excerpt.hidden = true;
    link.setAttribute("aria-describedby", [previousDescription, preview.id].filter(Boolean).join(" "));
    preview.showPopover();
    position();
    loadPreviews().then((entries) => {
      if (active !== link || !entries || !Object.hasOwn(entries, link.dataset.wikiKey)) return;
      const entry = entries[link.dataset.wikiKey];
      title.textContent = entry.title;
      excerpt.textContent = entry.excerpt;
      excerpt.hidden = !entry.excerpt;
      position();
    });
  }

  function position() {
    const rect = active.getBoundingClientRect();
    const box = preview.getBoundingClientRect();
    const margin = 12;
    const gap = 8;
    const left = Math.max(margin, Math.min(rect.left, window.innerWidth - box.width - margin));
    const top = rect.top >= box.height + gap + margin ? rect.top - box.height - gap : rect.bottom + gap;
    preview.style.left = `${left}px`;
    preview.style.top = `${Math.max(margin, Math.min(top, window.innerHeight - box.height - margin))}px`;
  }

  function leave(event) {
    if (!findLink(event.target) && !preview.contains(event.target)) return;
    if (active?.contains(event.relatedTarget) || preview.contains(event.relatedTarget)) return;
    clearTimeout(timer);
    if (active === document.activeElement) return;
    timer = setTimeout(close, 140);
  }

  document.addEventListener("pointerover", (event) => {
    if (!hover.matches || event.pointerType === "touch") return;
    if (preview.contains(event.target)) {
      clearTimeout(timer);
      return;
    }
    const link = findLink(event.target);
    if (!link || link.contains(event.relatedTarget)) return;
    clearTimeout(timer);
    timer = setTimeout(() => open(link), 140);
  });
  document.addEventListener("pointerout", leave);
  document.addEventListener("focusin", (event) => {
    const link = findLink(event.target);
    if (link?.matches(":focus-visible")) open(link);
  });
  document.addEventListener("focusout", (event) => {
    if (findLink(event.target)) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  document.addEventListener("click", close);
  document.addEventListener("scroll", (event) => {
    if (!preview.contains(event.target)) close();
  }, { capture: true, passive: true });
  window.addEventListener("resize", close, { passive: true });
  window.addEventListener("pagehide", close);
}
