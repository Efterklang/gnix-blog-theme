const PREFERENCE_POPUP_ID = "preference-popup";
const { loadScriptOnce, loadStyleOnce, resolveGnixAssetUrl } = window.__gnixLazyAssets || {};

if (!loadScriptOnce || !loadStyleOnce || !resolveGnixAssetUrl) {
  throw new Error("Gnix lazy asset loader was not initialized");
}

const PREFERENCE_CSS_URL = resolveGnixAssetUrl("/css/preferences.css");
const PREFERENCE_SCRIPT_URL = resolveGnixAssetUrl("/js/preferences.js");

let preferencePopupPromise = null;
let preferencePopupReturnFocus = null;

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

  if (!popup.querySelector("[data-preferences-page]")) throw new Error("Preferences popup markup was not found");

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
