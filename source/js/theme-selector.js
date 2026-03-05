((window, document, localStorage) => {
  const STORAGE_KEY = "themePreference";
  const colorSchemeMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

  const THEME_MAP = {
    mocha: "night",
    rose_pine: "night",
    nord: "light",
    nord_night: "night",
    tokyo_night: "night",
    latte: "light",
  };

  let currentIndex = 0;
  let previewTheme = null;
  let originalTheme = null;
  let themeOptions = [];
  let shouldApply = false;
  let previousFocus = null;
  let popoverEl = null;

  function getThemePreference() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && stored in THEME_MAP ? stored : "system";
  }

  function applyTheme(theme, persist = false) {
    const resolved = theme === "system" ? (colorSchemeMediaQuery.matches ? "mocha" : "nord") : theme;
    const html = document.documentElement;
    html.setAttribute("data-theme", resolved);
    html.classList.remove("night", "light");
    html.classList.add(THEME_MAP[resolved]);
    if (persist) localStorage.setItem(STORAGE_KEY, theme);
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
    if (getThemePreference() === "system") applyTheme("system", true);
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
