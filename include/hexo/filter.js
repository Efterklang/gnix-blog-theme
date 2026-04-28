const fs = require("node:fs");
const path = require("node:path");
const yaml = require("js-yaml");

module.exports = (hexo) => {
  const RESERVED_KEYS = {
    post: Object.keys(require("hexo/dist/models/post")(hexo).paths),
    page: Object.keys(require("hexo/dist/models/page")(hexo).paths),
  };

  function loadLayoutConfig(layout) {
    let config = {};
    const configInSiteDir = path.join(hexo.base_dir, `_config.${layout}.yml`);
    const configInThemeDir = path.join(hexo.theme_dir, `_config.${layout}.yml`);
    [configInSiteDir, configInThemeDir].forEach((configPath) => {
      if (fs.existsSync(configPath)) {
        config = Object.assign(config, yaml.load(fs.readFileSync(configPath)));
      }
    });
    return config;
  }

  const ALTERNATIVE_CONFIG = {
    post: loadLayoutConfig("post"),
    page: loadLayoutConfig("page"),
  };

  function stripConfig(source, reservedKeys) {
    const result = {};
    Object.keys(source)
      .filter((key) => !key.startsWith("_") && !reservedKeys.includes(key) && typeof source[key] !== "function")
      .forEach((key) => {
        result[key] = source[key];
      });
    return result;
  }

  hexo.extend.filter.register("template_locals", (locals) => {
    // inject helper functions
    locals.helper = {};
    const helpers = hexo.extend.helper.list();
    for (const name in helpers) {
      locals.helper[name] = helpers[name].bind(locals);
    }
    if (typeof locals.__ === "function") {
      locals.helper.__ = locals.__;
    }
    if (typeof locals._p === "function") {
      locals.helper._p = locals._p;
    }

    const page = locals.page;
    if (page) {
      locals.config = Object.assign({}, locals.config, locals.theme);
      if (page.layout in ALTERNATIVE_CONFIG) {
        // load alternative config if exists
        locals.config = Object.assign(locals.config, ALTERNATIVE_CONFIG[page.layout]);
      }
      // merge page configs
      if (page.__post === true) {
        Object.assign(locals.config, stripConfig(page, RESERVED_KEYS.post));
      } else if (page.__page === true) {
        Object.assign(locals.config, stripConfig(page, RESERVED_KEYS.page));
      }
    }

    return locals;
  });

  hexo.extend.filter.register("after_render:html", (data) => {
    if (!data.includes("data-page-head") || !data.includes("</head>")) {
      return data;
    }

    const seenHeadTags = new Set();
    const headTags = [];
    const html = data.replace(/<link\b(?=[^>]*\sdata-page-head(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?)[^>]*>/gi, (tag) => {
      const cleanTag = tag.replace(/\sdata-page-head(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/i, "");
      if (!seenHeadTags.has(cleanTag)) {
        seenHeadTags.add(cleanTag);
        headTags.push(cleanTag);
      }
      return "";
    });

    if (!headTags.length) {
      return data;
    }

    return html.replace("</head>", `${headTags.join("")}</head>`);
  });
};
