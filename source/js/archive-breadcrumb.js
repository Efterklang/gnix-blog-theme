(() => {
  function parseArchiveLocation(pathname, archiveDir) {
    const segments = String(pathname || "")
      .replace(/\/+$/, "")
      .split("/")
      .filter(Boolean);

    const index = segments.lastIndexOf(archiveDir);
    if (index === -1) return { year: null, month: null };

    const yearRaw = segments[index + 1] || null;
    const monthRaw = segments[index + 2] || null;

    const year = yearRaw && /^\d{4}$/.test(yearRaw) ? Number(yearRaw) : null;
    const month = monthRaw && /^\d{1,2}$/.test(monthRaw) ? Number(monthRaw) : null;

    if (month && (month < 1 || month > 12)) return { year, month: null };
    return { year, month };
  }

  function getMenuForTrigger(trigger) {
    const menu = trigger?.nextElementSibling;
    if (!menu?.classList.contains("archive-breadcrumb__menu")) return null;
    return menu;
  }

  function getOptions(menu) {
    return Array.from(menu.querySelectorAll(".archive-breadcrumb__option"));
  }

  function setSelected(menu, isSelectedFn) {
    const options = getOptions(menu);
    for (const option of options) {
      option.setAttribute("aria-selected", isSelectedFn(option) ? "true" : "false");
    }
  }

  function syncFromLocation(root) {
    const archiveDir = root.dataset.archiveDir || "archives";
    const { year, month } = parseArchiveLocation(window.location.pathname, archiveDir);

    const yearLabel = root.querySelector('[data-label="year"]');
    const monthLabel = root.querySelector('[data-label="month"]');
    if (yearLabel) yearLabel.textContent = year ? String(year) : "*";
    if (monthLabel) monthLabel.textContent = month ? String(month).padStart(2, "0") : "*";

    const yearTrigger = root.querySelector('.archive-breadcrumb__picker[data-picker="year"] .archive-breadcrumb__trigger');
    const yearMenu = yearTrigger ? getMenuForTrigger(yearTrigger) : null;
    if (yearMenu) {
      setSelected(yearMenu, (opt) => {
        const text = opt.textContent?.trim();
        if (!year) return text === "*";
        return text === String(year);
      });
    }

    const monthTrigger = root.querySelector('.archive-breadcrumb__picker[data-picker="month"] .archive-breadcrumb__trigger');
    const monthMenu = monthTrigger ? getMenuForTrigger(monthTrigger) : null;
    if (monthTrigger) monthTrigger.disabled = !year;
    if (monthMenu) {
      setSelected(monthMenu, (opt) => {
        const text = opt.textContent?.trim();
        if (!year) return text === "*";
        if (!month) return text === "*";
        return text === String(month).padStart(2, "0");
      });
    }

    closeAll(root);
  }

  function closeAll(root) {
    const triggers = root.querySelectorAll(".archive-breadcrumb__trigger");
    for (const trigger of triggers) {
      trigger.setAttribute("aria-expanded", "false");
    }
  }

  function openMenu(trigger) {
    if (trigger.disabled) return;
    trigger.setAttribute("aria-expanded", "true");
  }

  function toggleMenu(trigger, root) {
    if (trigger.disabled) return;
    const expanded = trigger.getAttribute("aria-expanded") === "true";
    closeAll(root);
    if (!expanded) {
      openMenu(trigger);
    }
  }

  function navigateToOption(option) {
    const href = option?.dataset?.href;
    if (!href) return;
    window.location.assign(href);
  }

  function init(root) {
    root.addEventListener("click", (e) => {
      const target = e.target.closest?.(".archive-breadcrumb__option, .archive-breadcrumb__trigger");
      if (!target) {
        closeAll(root);
        return;
      }

      if (target.classList.contains("archive-breadcrumb__option")) {
        e.preventDefault();
        navigateToOption(target);
        return;
      }

      if (target.classList.contains("archive-breadcrumb__trigger")) {
        e.preventDefault();
        toggleMenu(target, root);
      }
    });

    syncFromLocation(root);
  }

  function initAll() {
    const roots = document.querySelectorAll("[data-archive-breadcrumb]");
    for (const root of roots) {
      if (root._gnixArchiveBreadcrumbInited) continue;
      root._gnixArchiveBreadcrumbInited = true;
      init(root);
    }
  }

  initAll();
})();
