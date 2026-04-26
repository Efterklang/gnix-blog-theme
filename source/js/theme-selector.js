((window, document, localStorage) => {
  const themeConfig = window.__GNIX_THEME_CONFIG__;

  if (!themeConfig) return;

  const STORAGE_KEY = themeConfig.storageKey;
  const DEFAULT_THEME = themeConfig.defaultTheme;
  const SYSTEM_THEME = themeConfig.systemTheme;
  const THEME_MAP = themeConfig.themeClassMap || {};
  const THEME_CLASSES = [...new Set(Object.values(THEME_MAP))];
  const colorSchemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  let currentIndex = 0;
  let previewTheme = null;
  let originalTheme = null;
  let themeOptions = [];
  let shouldApply = false;
  let previousFocus = null;
  let popoverEl = null;

  function isValidTheme(theme) {
    return theme === DEFAULT_THEME || Object.hasOwn(THEME_MAP, theme);
  }

  function resolveTheme(theme) {
    return theme === DEFAULT_THEME ? (colorSchemeMediaQuery.matches ? SYSTEM_THEME.dark : SYSTEM_THEME.light) : theme;
  }

  function getThemePreference() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isValidTheme(stored) ? stored : DEFAULT_THEME;
  }

  function applyTheme(theme, persist = false) {
    const preference = isValidTheme(theme) ? theme : DEFAULT_THEME;
    const resolved = resolveTheme(preference);
    const themeClass = THEME_MAP[resolved];
    const html = document.documentElement;
    html.setAttribute("data-theme", resolved);
    html.classList.remove(...THEME_CLASSES);
    if (themeClass) html.classList.add(themeClass);
    if (persist) localStorage.setItem(STORAGE_KEY, preference);
  }

  function updateFocus() {
    themeOptions.forEach((option, index) => {
      const focused = index === currentIndex;
      option.classList.toggle("is-focused", focused);
      option.setAttribute("aria-selected", focused ? "true" : "false");
      if (!focused) return;

      option.scrollIntoView({ block: "nearest", behavior: "smooth" });
      const theme = option.getAttribute("data-theme-option");
      if (theme !== previewTheme) {
        previewTheme = theme;
        applyTheme(theme);
      }
    });
  }

  function onOpen(el) {
    previousFocus = document.activeElement;
    originalTheme = getThemePreference();
    previewTheme = null;
    shouldApply = false;
    currentIndex = 0;
    themeOptions = el.querySelectorAll(".theme-option");

    themeOptions.forEach((option, index) => {
      const theme = option.getAttribute("data-theme-option");
      if (theme === originalTheme) currentIndex = index;
      option.classList.toggle("is-active", theme === originalTheme);
      option.setAttribute("aria-selected", theme === originalTheme ? "true" : "false");
    });

    updateFocus();
    el.focus();
  }

  function onClose() {
    if (shouldApply && previewTheme) {
      applyTheme(previewTheme, true);
    } else if (previewTheme && previewTheme !== originalTheme) {
      applyTheme(originalTheme);
    }

    themeOptions.forEach((option) => {
      option.classList.remove("is-active", "is-focused");
      option.setAttribute("aria-selected", "false");
    });

    previewTheme = null;
    originalTheme = null;
    themeOptions = [];
    shouldApply = false;
    previousFocus?.focus();
    previousFocus = null;
  }

  function setup() {
    popoverEl = document.getElementById("theme-selector-popover");
    if (!popoverEl) return;

    popoverEl.addEventListener("toggle", (event) => {
      if (event.newState === "open") {
        onOpen(popoverEl);
      } else {
        onClose();
      }
    });

    popoverEl.addEventListener("click", (event) => {
      if (event.target === popoverEl) popoverEl.hidePopover();
    });

    popoverEl.addEventListener(
      "keydown",
      (event) => {
        const maxIndex = themeOptions.length - 1;

        switch (event.key) {
          case "Tab":
            event.preventDefault();
            currentIndex = event.shiftKey ? (currentIndex > 0 ? currentIndex - 1 : maxIndex) : currentIndex < maxIndex ? currentIndex + 1 : 0;
            updateFocus();
            break;

          case "j":
          case "ArrowDown":
          case "Down":
            event.preventDefault();
            currentIndex = currentIndex < maxIndex ? currentIndex + 1 : 0;
            updateFocus();
            break;

          case "k":
          case "ArrowUp":
          case "Up":
            event.preventDefault();
            currentIndex = currentIndex > 0 ? currentIndex - 1 : maxIndex;
            updateFocus();
            break;

          case "Enter":
            event.preventDefault();
            shouldApply = true;
            popoverEl.hidePopover();
            break;
        }
      },
      { passive: false },
    );
  }

  colorSchemeMediaQuery.addEventListener("change", () => {
    if (getThemePreference() === DEFAULT_THEME) applyTheme(DEFAULT_THEME, true);
  });

  window.selectThemeOption = (index) => {
    currentIndex = index;
    updateFocus();
    // Brief delay so the focused highlight is visible before the popover closes
    setTimeout(() => {
      shouldApply = true;
      popoverEl.hidePopover();
    }, 150);
  };

  window.getThemePreference = getThemePreference;
  window.applyTheme = applyTheme;

  setup();
})(window, document, window.localStorage);
