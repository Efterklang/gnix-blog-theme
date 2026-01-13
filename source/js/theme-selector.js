((window, document, localStorage) => {
  const STORAGE_KEY = "themePreference";
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
      case "j":
      case "ArrowDown":
      case "Down":
        event.preventDefault();
        currentIndex = currentIndex < maxIndex ? currentIndex + 1 : 0;
        updateFocus(themeOptions);
        break;

      case "k":
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

  // 监听系统主题改变
  colorSchemeMediaQuery.addEventListener("change", (event) => {
    applyTheme(event.target.value, true);
  });

  // 处理 modal 点击事件（关闭背景）
  window.handleThemeModalClick = (event) => {
    if (event.target.classList.contains("theme-selector-modal")) {
      event.preventDefault();
      closeModal(false);
    }
  };

  // 处理主题选项点击
  window.selectThemeOption = (event, index) => {
    if (!isModalOpen) return;
    event.preventDefault();
    event.stopPropagation();

    const modal = document.getElementById("theme-selector-modal");
    const themeOptions = modal.querySelectorAll(".theme-option");
    currentIndex = index;
    updateFocus(themeOptions);
    // Small delay before closing to show selection
    setTimeout(() => closeModal(true), 150);
  };

  // 暴露打开 modal 的函数
  window.openThemeModal = () => {
    openModal();
  };

  // 监听键盘事件
  document.addEventListener("keydown", handleKeyboard, {
    capture: true,
    passive: false,
  });

  // Export for navbar to get current theme
  window.getThemePreference = getThemePreference;
})(window, document, window.localStorage);
