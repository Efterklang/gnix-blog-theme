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

  function normalizeCustomFonts(value, familyOptions, importLimit) {
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
    };
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
        html.style.setProperty(familyOptions[key], families[key]);
      } else {
        html.style.removeProperty(familyOptions[key]);
      }
    });
  }

  window.__GNIX_ARTICLE_FONT_UTILS__ = {
    normalizeCustomFontImport: normalizeCustomFontImport,
    normalizeCustomFontFamily: normalizeCustomFontFamily,
    normalizeCustomFonts: normalizeCustomFonts,
    applyCustomFontImports: applyCustomFontImports,
    applyCustomFontFamilies: applyCustomFontFamilies,
  };
})();
