const path = require("node:path");
const { createMarkdownExit } = require("markdown-exit");
const mermaidDiagram = require("./mermaid");
const ratex = require("markdown-exit-ratex");
const code = require("./shiki");
const obsidianCallouts = require("./obsidian-callouts");
const anchor = require("markdown-it-anchor");
const footnote = require("markdown-it-footnote");
const mark = require("markdown-it-mark");
const taskLists = require("markdown-it-task-lists");

function resolveDefault(module) {
  return module && typeof module === "object" && "default" in module ? module.default : module;
}

function wrapMarkdownItTable(md, options = {}) {
  const { figureClass = "table-wrapper", tableClass = "" } = options;

  const defaultTableOpen = md.renderer.rules.table_open || ((tokens, idx, opts, _env, self) => self.renderToken(tokens, idx, opts));

  const defaultTableClose = md.renderer.rules.table_close || ((tokens, idx, opts, _env, self) => self.renderToken(tokens, idx, opts));

  md.renderer.rules.table_open = (tokens, idx, opts, env, self) => {
    if (tableClass) {
      tokens[idx].attrJoin("class", tableClass);
    }

    return `<figure class="${figureClass}">\n${defaultTableOpen(tokens, idx, opts, env, self)}`;
  };

  md.renderer.rules.table_close = (tokens, idx, opts, env, self) => {
    return `${defaultTableClose(tokens, idx, opts, env, self)}\n</figure>`;
  };

  return md;
}

class MarkdownRenderer {
  constructor(hexo) {
    this.hexo = hexo;
    this.config = {
      render_options: {
        breaks: true,
        html: true,
        langPrefix: "language-",
        linkify: true,
        quotes: "“”‘’",
        typographer: true,
        xhtmlOut: false,
      },

      ...(hexo.config.markdown_exit || {}),
    };

    this.md = createMarkdownExit(this.config.render_options);
    this.initPlugins();
  }

  initPlugins() {
    console.time("MarkdownExit: Load Default Plugins");
    if (this.config.defaultPlugins !== false) {
      this.md
        .use(resolveDefault(footnote))
        .use(resolveDefault(mark))
        .use(resolveDefault(taskLists))
        .use(resolveDefault(code), this.config.code_options)
        .use(mermaidDiagram)
        .use(resolveDefault(ratex), this.config.ratex_options)
        .use(obsidianCallouts, this.config.callout_options)
        .use(wrapMarkdownItTable)
        .use(resolveDefault(anchor), {
          permalink: resolveDefault(anchor).permalink.headerLink(),
        });
    }
    console.timeEnd("MarkdownExit: Load Default Plugins");

    console.time("MarkdownExit: Load User Plugins");
    this.loadUserPlugins();
    console.timeEnd("MarkdownExit: Load User Plugins");
  }

  resolvePluginFunction(plugin) {
    if (plugin && typeof plugin.default === "function") return plugin.default;
    if (typeof plugin === "function") return plugin;

    if (plugin && typeof plugin === "object") {
      for (const key in plugin) {
        if (typeof plugin[key] === "function") return plugin[key];
      }
    }

    return plugin;
  }

  loadUserPlugins() {
    const plugins = this.config.plugins || [];
    for (const pluginConfig of plugins) {
      const isString = typeof pluginConfig === "string";
      const pluginName = isString ? pluginConfig : pluginConfig.name;
      const pluginOptions = isString ? {} : pluginConfig.options || {};

      try {
        const pluginPath = path.join(this.hexo.base_dir, "node_modules", pluginName);
        const plugin = require(pluginPath);
        const pluginFn = this.resolvePluginFunction(plugin);

        this.md.use(pluginFn, pluginOptions);
        if (process.env.DEBUG) {
          console.log(`Successfully loaded plugin: ${pluginName}`);
        }
      } catch (error) {
        console.warn(`Failed to load plugin: ${pluginName}`);
        if (process.env.DEBUG) {
          console.warn(`   Error: ${error}`);
        }
      }
    }
  }

  async render(data) {
    if (!data.text) return "";
    return this.md.renderAsync(data.text);
  }
}

const markdownRendererInstances = new WeakMap();

function getMarkdownRenderer(hexo) {
  if (!markdownRendererInstances.has(hexo)) {
    markdownRendererInstances.set(hexo, new MarkdownRenderer(hexo));
  }
  return markdownRendererInstances.get(hexo);
}

const { transformSync } = require("esbuild");
const { createElement } = require("inferno-create-element");
const { renderToStaticMarkup } = require("inferno-server");
const fs = require("node:fs");
const Module = require("node:module");

Module._extensions[".jsx"] = (module, filename) => {
  const content = fs.readFileSync(filename, "utf8");
  const { code } = transformSync(content, {
    loader: "jsx",
    format: "cjs",
    jsxFactory: "__createElement",
    jsxFragment: "__Fragment",
    banner: "const __createElement = require('inferno-create-element').createElement; const __Fragment = require('inferno').Fragment;",
    sourcefile: filename,
  });
  module._compile(code, filename);
};

function compile(data) {
  const Component = require(data.path);
  const DOCTYPE = "<!doctype html>\n";
  const startTag = "<html";

  return (locals) => {
    const element = createElement(Component, locals);
    const markup = renderToStaticMarkup(element);
    // test if the layout is root layout file so we can skip costly large string comparison
    if ("layout" in locals && "view_dir" in locals && "filename" in locals) {
      if (locals.filename.startsWith(locals.view_dir) && locals.layout === false) {
        // this is root layout file, add doctype
        return DOCTYPE + markup;
      }
      return markup;
    }
    // do not use substr, substring, slice to prevent string copy
    for (let i = 0; i < 5; i++) {
      if (markup.charAt(i).toLowerCase() !== startTag.charAt(i)) {
        return markup;
      }
    }
    return DOCTYPE + markup;
  };
}

function renderer(data, locals) {
  return compile(data)(locals);
}

renderer.compile = compile;

module.exports = (hexo) => {
  const markdownConfig = hexo.config.markdown_exit || {};
  const markdownRenderer = async (data) => getMarkdownRenderer(hexo).render(data);
  markdownRenderer.disableNunjucks = Boolean(markdownConfig.disableNunjucks);

  hexo.extend.renderer.register("md", "html", markdownRenderer);
  hexo.extend.renderer.register("jsx", "html", renderer, true);
};
