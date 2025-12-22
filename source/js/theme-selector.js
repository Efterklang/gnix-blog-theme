((window, document, localStorage) => {
  const STORAGE_KEY = "themePreference";
  const THEME_SELECTOR_ID = "theme-selector";
  const DEFAULT_THEME = "system";
  const colorSchemeMediaQuery = window.matchMedia(
    "(prefers-color-scheme: dark)",
  );

  const THEME_MAP = {
    mocha: "night",
    macchiato: "night",
    nord: "light",
    nord_night: "night",
    tokyo_night: "night",
    latte: "light",
  };

  let currentIndex = 0;
  let previewTheme = null;
  let originalTheme = null;
  let isModalOpen = false;

  function getThemePreference() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && stored in THEME_MAP ? stored : DEFAULT_THEME;
  }

  function applyTheme(theme, persist = false) {
    const html = document.documentElement;
    const resolvedTheme =
      theme === "system"
        ? colorSchemeMediaQuery.matches
          ? "mocha"
          : "nord"
        : theme;
    html.setAttribute("data-theme", resolvedTheme);
    html.classList.remove("night", "light");
    html.classList.add(THEME_MAP[resolvedTheme]);

    if (persist) {
      localStorage.setItem(STORAGE_KEY, theme);
    }
  }

  function openModal() {
    const modal = document.getElementById("theme-selector-modal");
    if (!modal || isModalOpen) return;

    isModalOpen = true;
    originalTheme = getThemePreference();

    // Find current theme index
    const themeOptions = modal.querySelectorAll(".theme-option");
    themeOptions.forEach((option, index) => {
      const theme = option.getAttribute("data-theme-option");
      if (theme === originalTheme) {
        currentIndex = index;
      }
      // Update active state
      if (theme === originalTheme) {
        option.classList.add("is-active");
      } else {
        option.classList.remove("is-active");
      }
    });

    // Set initial focus
    updateFocus(themeOptions);

    modal.classList.add("is-active");
    document.body.style.overflow = "hidden";
  }

  function closeModal(apply = false) {
    const modal = document.getElementById("theme-selector-modal");
    if (!modal || !isModalOpen) return;

    isModalOpen = false;

    if (apply && previewTheme) {
      // Apply the selected theme
      applyTheme(previewTheme, true);
    } else if (previewTheme && previewTheme !== originalTheme) {
      // Restore original theme if cancelled
      applyTheme(originalTheme);
    }

    modal.classList.remove("is-active");
    document.body.style.overflow = "";
    previewTheme = null;
    originalTheme = null;

    // Clear all focus states
    const themeOptions = modal.querySelectorAll(".theme-option");
    for (const t of themeOptions) {
      t.classList.remove("is-active");
      t.classList.remove("is-focused");
    }
  }

  function updateFocus(themeOptions) {
    themeOptions.forEach((option, index) => {
      if (index === currentIndex) {
        option.classList.add("is-focused");
        option.scrollIntoView({ block: "nearest", behavior: "smooth" });

        // Preview theme on focus
        const theme = option.getAttribute("data-theme-option");
        if (theme !== previewTheme) {
          previewTheme = theme;
          applyTheme(theme);
        }
      } else {
        option.classList.remove("is-focused");
      }
    });
  }

  function handleKeyboard(event) {
    if (!isModalOpen) return;

    const modal = document.getElementById("theme-selector-modal");
    const themeOptions = modal.querySelectorAll(".theme-option");
    const maxIndex = themeOptions.length - 1;

    switch (event.key) {
      case "ArrowDown":
      case "Down":
        event.preventDefault();
        currentIndex = currentIndex < maxIndex ? currentIndex + 1 : 0;
        updateFocus(themeOptions);
        break;

      case "ArrowUp":
      case "Up":
        event.preventDefault();
        currentIndex = currentIndex > 0 ? currentIndex - 1 : maxIndex;
        updateFocus(themeOptions);
        break;

      case "Enter":
        event.preventDefault();
        closeModal(true);
        break;

      case "Escape":
      case "Esc":
        event.preventDefault();
        closeModal(false);
        break;
    }
  }

  // 初始化主题
  applyTheme(getThemePreference());

  // 监听系统主题改变
  colorSchemeMediaQuery.addEventListener("change", () => {
    if (getThemePreference() === "system") {
      applyTheme("system");
    }
  });

  // 监听主题选择框变化 (legacy support)
  document.addEventListener("change", (event) => {
    if (event.target.id === THEME_SELECTOR_ID) {
      applyTheme(event.target.value, true);
    }
  });

  // 监听点击事件
  document.addEventListener("click", (event) => {
    // Open modal when theme selector is clicked
    if (event.target.closest(".theme-selector-trigger")) {
      event.preventDefault();
      openModal();
      return;
    }

    // Close modal when backdrop is clicked
    if (event.target.classList.contains("theme-selector-backdrop")) {
      event.preventDefault();
      closeModal(false);
      return;
    }

    // Handle theme option click in modal
    const themeOption = event.target.closest(".theme-option");
    if (themeOption && isModalOpen) {
      event.preventDefault();
      const modal = document.getElementById("theme-selector-modal");
      const themeOptions = modal.querySelectorAll(".theme-option");
      currentIndex = parseInt(themeOption.getAttribute("data-index"), 10);
      updateFocus(themeOptions);
      // Small delay before closing to show selection
      setTimeout(() => closeModal(true), 150);
      return;
    }
  });

  // 监听键盘事件
  document.addEventListener("keydown", handleKeyboard);

  // Export for navbar to get current theme
  window.getThemePreference = getThemePreference;
})(window, document, window.localStorage);
