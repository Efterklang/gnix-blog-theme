const PREFERENCE_POPUP_ID = "preference-popup";
const PREFERENCE_CSS_URL = "/css/preferences.css";
const PREFERENCE_SCRIPT_URL = "/js/preferences.js";

let preferencePopupPromise = null;
let preferencePopupReturnFocus = null;

function getPreferenceCloseLabel() {
  return (document.documentElement.lang || "").toLowerCase().startsWith("zh") ? "关闭" : "Close";
}

function findAssetElement(selector, url) {
  const href = new URL(url, window.location.href).href;
  return Array.from(document.querySelectorAll(selector)).find((element) => element.href === href || element.src === href) || null;
}

function loadStyleOnce(url) {
  const existing = findAssetElement('link[rel~="stylesheet"], link[rel="preload"][as="style"]', url);
  if (existing) return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.addEventListener("load", () => resolve(link), { once: true });
    link.addEventListener("error", reject, { once: true });
    document.head.appendChild(link);
  });
}

function loadScriptOnce(url) {
  const existing = findAssetElement("script[src]", url);
  if (existing && existing.dataset.loadState !== "loading") return Promise.resolve(existing);

  return new Promise((resolve, reject) => {
    const script = existing || document.createElement("script");
    script.addEventListener(
      "load",
      () => {
        script.dataset.loadState = "loaded";
        resolve(script);
      },
      { once: true },
    );
    script.addEventListener("error", reject, { once: true });

    if (!existing) {
      script.defer = true;
      script.src = url;
      script.dataset.loadState = "loading";
      document.head.appendChild(script);
    }
  });
}

function isPreferencePopupOpen(popup = document.getElementById(PREFERENCE_POPUP_ID)) {
  if (!popup) return false;
  return popup.matches?.(":popover-open") || popup.dataset.open === "true";
}

function restorePopupFocus() {
  const returnFocus = preferencePopupReturnFocus;
  preferencePopupReturnFocus = null;
  if (returnFocus && typeof returnFocus.focus === "function" && document.contains(returnFocus)) {
    returnFocus.focus({ preventScroll: true });
  }
}

function closePreferencePopup() {
  const popup = document.getElementById(PREFERENCE_POPUP_ID);
  if (!popup || !isPreferencePopupOpen(popup)) return;

  if (typeof popup.hidePopover === "function") {
    popup.hidePopover();
  } else {
    popup.hidden = true;
    popup.dataset.open = "false";
  }

  document.documentElement.classList.remove("has-preference-popup");
  restorePopupFocus();
}

function showPreferencePopupElement(popup) {
  if (isPreferencePopupOpen(popup)) return;

  preferencePopupReturnFocus = document.activeElement;
  popup.hidden = false;
  if (typeof popup.showPopover === "function") {
    popup.showPopover();
  } else {
    popup.dataset.open = "true";
  }

  document.documentElement.classList.add("has-preference-popup");
  popup.querySelector(".preference-popup__panel")?.focus({ preventScroll: true });
}

function preparePreferencePopupPage(page) {
  page.dataset.preferenceSurface = "popup";

  const closeLabel = getPreferenceCloseLabel();
  const backLink = page.querySelector("[data-preference-back-link]");
  if (!backLink) return page;

  backLink.removeAttribute("data-preference-back-link");
  backLink.setAttribute("data-preference-popup-close", "");
  backLink.setAttribute("href", "#");
  backLink.setAttribute("role", "button");
  backLink.setAttribute("aria-label", closeLabel);
  const label = backLink.querySelector("span");
  if (label) label.textContent = closeLabel;
  return page;
}

function handlePreferencePopupClick(event) {
  if (!event.target.closest?.("[data-preference-popup-close]")) return;
  event.preventDefault();
  closePreferencePopup();
}

function handlePreferencePopupKeydown(event) {
  if (event.key !== "Escape") return;
  event.preventDefault();
  closePreferencePopup();
}

function handlePreferencePopupToggle(event) {
  if (event.newState !== "closed") return;

  document.documentElement.classList.remove("has-preference-popup");
  restorePopupFocus();
}

function bindPreferencePopup(popup) {
  if (popup.dataset.preferencePopupBound === "true") return;

  const page = popup.querySelector("[data-preferences-page]");
  if (!page) throw new Error("Preferences popup markup was not found");
  preparePreferencePopupPage(page);

  popup.addEventListener("click", handlePreferencePopupClick);
  popup.addEventListener("keydown", handlePreferencePopupKeydown);
  popup.addEventListener("toggle", handlePreferencePopupToggle);
  popup.dataset.preferencePopupBound = "true";
}

async function ensurePreferencePopup() {
  if (preferencePopupPromise) return preferencePopupPromise;

  const existing = document.getElementById(PREFERENCE_POPUP_ID);
  if (!existing) throw new Error("Preferences popup container was not found");

  preferencePopupPromise = (async () => {
    await loadStyleOnce(PREFERENCE_CSS_URL);

    bindPreferencePopup(existing);

    await loadScriptOnce(PREFERENCE_SCRIPT_URL);
    window.__gnixInitPreferencesPage?.();

    return existing;
  })();

  try {
    return await preferencePopupPromise;
  } catch (error) {
    preferencePopupPromise = null;
    throw error;
  }
}

export async function togglePreferencePopup() {
  const existing = document.getElementById(PREFERENCE_POPUP_ID);
  if (isPreferencePopupOpen(existing)) {
    closePreferencePopup();
    return;
  }

  const popup = await ensurePreferencePopup();
  showPreferencePopupElement(popup);
}
