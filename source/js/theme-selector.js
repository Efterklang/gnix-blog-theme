((window, document) => {
  const applyTheme = window.applyTheme;
  const getThemePreference = window.getThemePreference;

  if (!applyTheme || !getThemePreference) return;

  let currentIndex = 0;
  let previewTheme = null;
  let originalTheme = null;
  let themeOptions = [];
  let shouldApply = false;
  let previousFocus = null;
  let popoverEl = null;

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
    themeOptions = Array.from(el.querySelectorAll(".theme-option"));

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

  function commitSelection(index) {
    currentIndex = index;
    updateFocus();
    // Brief delay so the focused highlight is visible before the popover closes
    setTimeout(() => {
      shouldApply = true;
      popoverEl.hidePopover();
    }, 150);
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
      if (event.target === popoverEl) {
        popoverEl.hidePopover();
        return;
      }
      const option = event.target.closest(".theme-option");
      if (!option) return;
      const index = themeOptions.indexOf(option);
      if (index >= 0) commitSelection(index);
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

  (window.__gnixPrerender?.runWhenActivated || function(callback) { callback(); })(setup);
})(window, document);
