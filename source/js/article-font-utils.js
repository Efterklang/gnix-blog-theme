(() => {
  function normalizeCustomFontImport(value) {
    if (typeof value !== "string") return null;

    var href = value.trim();
    if (!href || /[\s<>"']/.test(href) || /^javascript:/i.test(href)) return null;
    if (!/^(https?:)?\/\//i.test(href) && href.charAt(0) !== "/") return null;

    return href;
  }

  function normalizeCustomFontFamily(value) {
    if (typeof value !== "string") return null;

    var family = value.trim();
    if (!family || /[{};<>]/.test(family)) return null;

    return family;
  }

  function normalizeCustomFonts(value, familyOptions, importLimit, presetOptions = []) {
    var customFonts = value && typeof value === "object" ? value : {};
    var sourceFamilies = customFonts.families && typeof customFonts.families === "object" ? customFonts.families : {};
    var importSource = customFonts.imports;
    var importValues = Array.isArray(importSource) ? importSource : typeof importSource === "string" ? importSource.split(/\r?\n/) : [];
    var imports = [];
    var families = {};
    var limit = Number(importLimit);

    if (!Number.isFinite(limit) || limit < 1) limit = 6;

    importValues.forEach((item) => {
      var href = normalizeCustomFontImport(item);
      if (href && imports.indexOf(href) === -1 && imports.length < limit) {
        imports.push(href);
      }
    });

    Object.keys(familyOptions || {}).forEach((key) => {
      var family = normalizeCustomFontFamily(sourceFamilies[key]);
      if (family) families[key] = family;
    });

    return {
      imports: imports,
      families: families,
      presets: presetOptions.filter((preset) => Array.isArray(customFonts.presets) && customFonts.presets.includes(preset.id)).map((preset) => preset.id),
    };
  }

  function resolveCustomFontFamilies(customFonts) {
    // Downloaded presets make fonts available; only explicit family names apply them.
    return { ...customFonts.families };
  }

  let presetLoader;
  function applyFontPresets(ids = [], presets = []) {
    if (!ids.length && !presetLoader) return;
    presetLoader ||= import("/js/font-presets.js");
    presetLoader.then((module) => module.applyPresetFonts(ids, presets)).catch(() => {
      presetLoader = null;
      ids.forEach((id) => window.dispatchEvent(new CustomEvent("gnix:font-preset-state", { detail: { id, state: "error" } })));
    });
  }

  function applyCustomFontImports(imports, selector) {
    var signature = Array.isArray(imports) ? imports.join("\n") : "";
    var sel = selector || 'link[data-gnix-custom-font="true"]';
    var currentLinks = [];

    if (typeof document !== "undefined") {
      currentLinks = Array.prototype.slice.call(document.querySelectorAll(sel));
    }

    var currentHrefs = currentLinks.map((link) => link.getAttribute("href") || link.href);

    if (signature === applyCustomFontImports._signature && currentHrefs.length === (imports ? imports.length : 0) && (!imports || imports.every((href) => currentHrefs.indexOf(href) !== -1))) {
      return;
    }

    currentLinks.forEach((link) => {
      link.remove();
    });
    applyCustomFontImports._signature = signature;

    if (typeof document === "undefined" || !document.head || !Array.isArray(imports)) return;

    imports.forEach((href, index) => {
      var link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.setAttribute("data-gnix-custom-font", "true");
      link.setAttribute("data-gnix-custom-font-index", String(index));
      document.head.appendChild(link);
    });
  }

  function applyCustomFontFamilies(html, families, familyOptions) {
    Object.keys(familyOptions || {}).forEach((key) => {
      if (families?.[key]) {
        // Keep icon coverage when a reader supplies a family without Nerd glyphs.
        // The saved/editable family stays as entered; only the applied stack changes.
        html.style.setProperty(familyOptions[key], `${families[key]}, var(--font-symbols, "Symbols Nerd Font Mono")`);
      } else {
        html.style.removeProperty(familyOptions[key]);
      }
    });
  }

  window.__GNIX_ARTICLE_FONT_UTILS__ = {
    normalizeCustomFontImport: normalizeCustomFontImport,
    normalizeCustomFontFamily: normalizeCustomFontFamily,
    normalizeCustomFonts: normalizeCustomFonts,
    resolveCustomFontFamilies,
    applyFontPresets,
    applyCustomFontImports: applyCustomFontImports,
    applyCustomFontFamilies: applyCustomFontFamilies,
  };
})();
