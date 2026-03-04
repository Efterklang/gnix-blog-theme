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
  let modal = null;
  let themeOptions = [];

  function getThemePreference() {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored && stored in THEME_MAP ? stored : "system";
  }

  function applyTheme(theme, persist = false) {
    const resolved =
      theme === "system" ? (colorSchemeMediaQuery.matches ? "mocha" : "nord") : theme;
    const html = document.documentElement;
    html.setAttribute("data-theme", resolved);
    html.classList.remove("night", "light");
    html.classList.add(THEME_MAP[resolved]);
    if (persist) localStorage.setItem(STORAGE_KEY, theme);
  }

  function updateFocus() {
    themeOptions.forEach((option, index) => {
      option.classList.toggle("is-focused", index === currentIndex);
      if (index !== currentIndex) return;

      option.scrollIntoView({ block: "nearest", behavior: "smooth" });
      const theme = option.getAttribute("data-theme-option");
      if (theme !== previewTheme) {
        previewTheme = theme;
        applyTheme(theme);
      }
    });
  }

  function openModal() {
    const el = document.getElementById("theme-selector-modal");
    if (!el || modal) return;

    modal = el;
    originalTheme = getThemePreference();
    themeOptions = modal.querySelectorAll(".theme-option");

    themeOptions.forEach((option, index) => {
      const theme = option.getAttribute("data-theme-option");
      if (theme === originalTheme) currentIndex = index;
      option.classList.toggle("is-active", theme === originalTheme);
    });

    updateFocus();
    modal.classList.add("is-active");
  }

  function closeModal(apply = false) {
    if (!modal) return;

    if (apply && previewTheme) {
      applyTheme(previewTheme, true);
    } else if (previewTheme && previewTheme !== originalTheme) {
      applyTheme(originalTheme);
    }

    modal.classList.remove("is-active");
    themeOptions.forEach((option) => option.classList.remove("is-active", "is-focused"));

    previewTheme = null;
    originalTheme = null;
    modal = null;
    themeOptions = [];
  }

  colorSchemeMediaQuery.addEventListener("change", () => {
    if (getThemePreference() === "system") applyTheme("system", true);
  });

  document.addEventListener(
    "keydown",
    (event) => {
      if (!modal) return;
      const maxIndex = themeOptions.length - 1;

      switch (event.key) {
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
          closeModal(true);
          break;

        case "Escape":
        case "Esc":
          event.preventDefault();
          closeModal(false);
          break;
      }
    },
    { capture: true, passive: false }
  );

  window.handleThemeModalClick = (event) => {
    if (event.target.classList.contains("theme-selector-modal")) {
      event.preventDefault();
      closeModal(false);
    }
  };

  window.selectThemeOption = (event, index) => {
    if (!modal) return;
    event.preventDefault();
    event.stopPropagation();
    currentIndex = index;
    updateFocus();
    setTimeout(() => closeModal(true), 150);
  };

  window.openThemeModal = openModal;
  window.getThemePreference = getThemePreference;
  window.applyTheme = applyTheme;
})(window, document, window.localStorage);
