const PREFERENCE_POPUP_ID = "preference-popup";
const { loadScriptOnce, resolveGnixAssetUrl } = window.__gnixLazyAssets || {};

if (!loadScriptOnce || !resolveGnixAssetUrl) {
  throw new Error("Gnix lazy asset loader was not initialized");
}

// 弹窗样式常驻 default.css，这里只需按需加载行为脚本
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

// 无遮罩弹窗：页面保持可滚动可见，方便对照正文预览排版调整；
// 点击弹窗外或按 Esc 时关闭（监听器仅在弹窗打开期间挂载）
function handleDocumentPointerDown(event) {
  const popup = document.getElementById(PREFERENCE_POPUP_ID);
  if (!popup || !isPreferencePopupOpen(popup)) return;
  const target = event.target;
  if (popup.contains(target)) return;
  if (target.closest?.("[data-preference-trigger]")) return;
  closePreferencePopup();
}

function handleDocumentKeydown(event) {
  if (event.key !== "Escape") return;
  event.preventDefault();
  closePreferencePopup();
}

function addDismissListeners() {
  document.addEventListener("pointerdown", handleDocumentPointerDown, true);
  document.addEventListener("keydown", handleDocumentKeydown, true);
}

function removeDismissListeners() {
  document.removeEventListener("pointerdown", handleDocumentPointerDown, true);
  document.removeEventListener("keydown", handleDocumentKeydown, true);
}

function closePreferencePopup() {
  const popup = document.getElementById(PREFERENCE_POPUP_ID);
  removeDismissListeners();
  if (!popup || !isPreferencePopupOpen(popup)) return;

  if (typeof popup.hidePopover === "function") {
    popup.hidePopover();
  } else {
    popup.hidden = true;
    popup.dataset.open = "false";
  }

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

  addDismissListeners();
  popup.focus({ preventScroll: true });
}

function handlePreferencePopupClick(event) {
  if (!event.target.closest?.("[data-preference-popup-close]")) return;
  event.preventDefault();
  closePreferencePopup();
}

function handlePreferencePopupToggle(event) {
  if (event.newState !== "closed") return;

  // 浏览器可能绕过 closePreferencePopup 强制关闭 popover（如进入全屏时
  // 规范要求 hide all popovers），同步 hidden 避免弹窗以基础样式残留可见
  event.target.hidden = true;
  removeDismissListeners();
  restorePopupFocus();
}

function bindPreferencePopup(popup) {
  if (popup.dataset.preferencePopupBound === "true") return;

  if (!popup.querySelector("[data-preferences-page]")) throw new Error("Preferences popup markup was not found");

  popup.addEventListener("click", handlePreferencePopupClick);
  popup.addEventListener("toggle", handlePreferencePopupToggle);
  popup.dataset.preferencePopupBound = "true";
}

async function ensurePreferencePopup() {
  if (preferencePopupPromise) return preferencePopupPromise;

  const existing = document.getElementById(PREFERENCE_POPUP_ID);
  if (!existing) throw new Error("Preferences popup container was not found");

  preferencePopupPromise = (async () => {
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
