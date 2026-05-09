const path = require("node:path");
const { createMarkdownExit } = require("markdown-exit");
const mermaidDiagram = require("markdown-exit-mermaid");
const ratex = require("markdown-exit-ratex");
const code = require("../../vendor/markdown-exit-shiki");
const abbr = require("markdown-it-abbr");
const anchor = require("markdown-it-anchor");
const footnote = require("markdown-it-footnote");
const ins = require("markdown-it-ins");
const mark = require("markdown-it-mark");
const sub = require("markdown-it-sub");
const sup = require("markdown-it-sup");
const taskLists = require("markdown-it-task-lists");
const { createProfiler } = require("../util/profiler");

const profile = createProfiler("renderer");

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

function bucketLength(length) {
  if (length < 200) return "xs";
  if (length < 1000) return "sm";
  if (length < 4000) return "md";
  if (length < 12000) return "lg";
  return "xl";
}

function wrapRendererRule(md, ruleName, label, getDetail = () => "") {
  const original = md.renderer.rules[ruleName];
  if (typeof original !== "function") return;

  md.renderer.rules[ruleName] = async function (...args) {
    const resolvedLabel = typeof label === "function" ? label(...args) : label;
    const stop = profile.start(resolvedLabel);
    try {
      return await original.apply(this, args);
    } finally {
      stop(getDetail(...args));
    }
  };
}

function parseTabsMarker(state, line, name) {
  let pos = state.bMarks[line] + state.tShift[line];
  const max = state.eMarks[line];

  if (state.src.charCodeAt(pos) !== 0x3a /* : */) return false;

  let markerCount = 0;
  while (pos + markerCount < max && state.src.charCodeAt(pos + markerCount) === 0x3a) markerCount++;
  if (markerCount < 3) return false;

  pos = state.skipSpaces(pos + markerCount);
  if (state.src.slice(pos, pos + name.length) !== name) return false;

  pos += name.length;
  if (pos < max && !state.md.utils.isSpace(state.src.charCodeAt(pos))) return false;

  pos = state.skipSpaces(pos);
  const id = pos < max && state.src.charCodeAt(pos) === 0x23 /* # */ ? state.src.slice(state.skipSpaces(pos + 1), max).trim() : "";

  return { marker: ":".repeat(markerCount), id };
}

function parseTabMarker(state, line) {
  let pos = state.bMarks[line] + state.tShift[line];
  const max = state.eMarks[line];
  const marker = "@tab";
  const activeMarker = "@tab:active";

  if (state.src.charCodeAt(pos) !== 0x40 /* @ */) return false;

  let active = false;
  if (state.src.slice(pos, pos + activeMarker.length) === activeMarker) {
    active = true;
    pos += activeMarker.length;
  } else if (state.src.slice(pos, pos + marker.length) === marker) {
    pos += marker.length;
  } else {
    return false;
  }

  const titleStart = state.skipSpaces(pos);
  if (titleStart === pos || titleStart >= max) return false;

  const rawTitle = state.src.slice(titleStart, max).trim();
  const match = /^(.*?)(?:\s+#([A-Za-z0-9_-]+))?$/.exec(rawTitle);
  const title = (match?.[1] || rawTitle).trim();
  const id = match?.[2] || "";

  return { active, title, id };
}

function customTabs(md, options = {}) {
  const name = options.name || "tabs";

  md.block.ruler.before(
    "fence",
    `${name}_container`,
    (state, startLine, endLine, silent) => {
      const marker = parseTabsMarker(state, startLine, name);
      if (!marker) return false;
      if (silent) return true;

      const startIndent = state.sCount[startLine];
      let nextLine = startLine + 1;
      let autoClosed = false;

      for (; nextLine < endLine; nextLine++) {
        const pos = state.bMarks[nextLine] + state.tShift[nextLine];
        const max = state.eMarks[nextLine];

        if (state.sCount[nextLine] < startIndent) break;
        if (state.sCount[nextLine] === startIndent && state.src.charCodeAt(pos) === 0x3a /* : */) {
          let closePos = pos;
          while (closePos < max && state.src.charCodeAt(closePos) === 0x3a) closePos++;
          if (closePos - pos >= marker.marker.length && state.skipSpaces(closePos) >= max) {
            autoClosed = true;
            break;
          }
        }
      }

      const oldParent = state.parentType;
      const oldLineMax = state.lineMax;
      const oldBlkIndent = state.blkIndent;
      const oldInTabs = state.env.__gnixInTabs;

      const open = state.push("gnix_tabs_open", "", 1);
      open.block = true;
      open.markup = marker.marker;
      open.meta = { id: marker.id };
      open.map = [startLine, nextLine];

      state.parentType = `${name}_container`;
      state.lineMax = nextLine;
      state.blkIndent = startIndent;
      state.env.__gnixInTabs = true;
      state.md.block.tokenize(state, startLine + 1, nextLine);
      state.env.__gnixInTabs = oldInTabs;
      state.parentType = oldParent;
      state.lineMax = oldLineMax;
      state.blkIndent = oldBlkIndent;

      const close = state.push("gnix_tabs_close", "", -1);
      close.block = true;
      close.markup = marker.marker;

      state.line = nextLine + (autoClosed ? 1 : 0);
      return true;
    },
    { alt: ["paragraph", "reference", "blockquote", "list"] },
  );

  md.block.ruler.before(
    "paragraph",
    `${name}_tab`,
    (state, startLine, endLine, silent) => {
      if (!state.env.__gnixInTabs) return false;

      const marker = parseTabMarker(state, startLine);
      if (!marker) return false;
      if (silent) return true;

      const startIndent = state.sCount[startLine];
      let nextLine = startLine + 1;

      for (; nextLine < endLine; nextLine++) {
        const pos = state.bMarks[nextLine] + state.tShift[nextLine];
        if (state.sCount[nextLine] === startIndent && state.src.charCodeAt(pos) === 0x40 /* @ */ && parseTabMarker(state, nextLine)) break;
      }

      const oldParent = state.parentType;
      const oldLineMax = state.lineMax;
      const oldBlkIndent = state.blkIndent;

      const open = state.push("gnix_tab_open", "", 1);
      open.block = true;
      open.markup = "@tab";
      open.meta = marker;
      open.map = [startLine, nextLine];

      state.parentType = "tab";
      state.lineMax = nextLine;
      state.blkIndent = startIndent;
      state.md.block.tokenize(state, startLine + 1, nextLine);
      state.parentType = oldParent;
      state.lineMax = oldLineMax;
      state.blkIndent = oldBlkIndent;

      const close = state.push("gnix_tab_close", "", -1);
      close.block = true;

      state.line = nextLine;
      return true;
    },
    { alt: ["paragraph", "reference", "blockquote", "list"] },
  );

  md.renderer.rules.gnix_tabs_open = (tokens, idx) => {
    const { id } = tokens[idx].meta || {};
    return `<x-tabs${id ? ` group-id="${md.utils.escapeHtml(id)}"` : ""}>\n`;
  };
  md.renderer.rules.gnix_tabs_close = () => "</x-tabs>\n";
  md.renderer.rules.gnix_tab_open = (tokens, idx) => {
    const { title = "Tab", id = "", active = false } = tokens[idx].meta || {};
    return `<x-tab title="${md.utils.escapeHtml(title)}"${id ? ` sync-id="${md.utils.escapeHtml(id)}"` : ""}${active ? " active" : ""}>\n`;
  };
  md.renderer.rules.gnix_tab_close = () => "</x-tab>\n";

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
      code_options: {
        themes: {
          light: "catppuccin-latte",
        },
      },
      mermaid_options: {
        theme: "default",
      },
      ...(hexo.config.markdown_exit || {}),
    };

    this.md = createMarkdownExit(this.config.render_options);
    this.initPlugins();
  }

  initPlugins() {
    const stop = profile.start("markdownExit.initPlugins");
    try {
      if (this.config.defaultPlugins !== false) {
        const defaultsStop = profile.start("markdownExit.defaultPlugins");
        try {
          this.md
            .use(resolveDefault(footnote))
            .use(resolveDefault(mark))
            .use(resolveDefault(sub))
            .use(resolveDefault(sup))
            .use(resolveDefault(abbr))
            .use(resolveDefault(ins))
            .use(resolveDefault(taskLists))
            .use(resolveDefault(code), this.config.code_options)
            .use(resolveDefault(mermaidDiagram), this.config.mermaid_options)
            .use(resolveDefault(ratex), this.config.ratex_options)
            .use(customTabs)
            .use(wrapMarkdownItTable)
            .use(resolveDefault(anchor), {
              permalink: resolveDefault(anchor).permalink.headerLink(),
            });
        } finally {
          defaultsStop();
        }
      }

      this.loadUserPlugins();
      wrapRendererRule(this.md, "fence", (tokens, idx) => {
        const token = tokens?.[idx];
        const lang = String(token?.info || "").split(/\s+/)[0] || "plain";
        const size = bucketLength(String(token?.content || "").length);
        return `markdownExit.rule.fence.${lang}.${size}`;
      }, (tokens, idx) => {
        const token = tokens?.[idx];
        const lang = String(token?.info || "").split(/\s+/)[0] || "plain";
        const size = bucketLength(String(token?.content || "").length);
        return `${lang} ${size}`;
      });
      wrapRendererRule(this.md, "code_inline", (tokens, idx) => {
        const token = tokens?.[idx];
        const content = String(token?.content || "").trim();
        const match = content.match(/^\{(\w+)\}\s+/);
        const lang = match?.[1] || "plain";
        const size = bucketLength(content.length);
        return `markdownExit.rule.code_inline.${lang}.${size}`;
      }, (tokens, idx) => {
        const token = tokens?.[idx];
        const content = String(token?.content || "").trim();
        const match = content.match(/^\{(\w+)\}\s+/);
        const lang = match?.[1] || "plain";
        const size = bucketLength(content.length);
        return `${lang} ${size}`;
      });
      wrapRendererRule(this.md, "image", (tokens, idx) => {
        const token = tokens?.[idx];
        const src = String(token?.attrGet?.("src") || token?.attrs?.find?.(([name]) => name === "src")?.[1] || "");
        const kind = src.startsWith("http://") || src.startsWith("https://") ? "remote" : src.startsWith("data:") ? "data" : "local";
        return `markdownExit.rule.image.${kind}`;
      }, (tokens, idx) => {
        const token = tokens?.[idx];
        return String(token?.attrGet?.("src") || token?.attrs?.find?.(([name]) => name === "src")?.[1] || "");
      });
    } finally {
      stop();
    }
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
    const stop = profile.start("markdownExit.userPlugins");
    try {
      for (const pluginConfig of plugins) {
        const isString = typeof pluginConfig === "string";
        const pluginName = isString ? pluginConfig : pluginConfig.name;
        const pluginOptions = isString ? {} : pluginConfig.options || {};

        try {
          const pluginPath = path.join(this.hexo.base_dir, "node_modules", pluginName);
          const plugin = require(pluginPath);
          const pluginFn = this.resolvePluginFunction(plugin);

          const pluginStop = profile.start(`markdownExit.plugin.${pluginName}`);
          try {
            this.md.use(pluginFn, pluginOptions);
          } finally {
            pluginStop();
          }

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
    } finally {
      stop();
    }
  }

  async render(data) {
    if (!data.text) return "";
    const label = getRenderLabel(data);
    const stop = profile.start(label);
    try {
      return await this.md.renderAsync(data.text);
    } finally {
      stop(String(data?.path || ""));
    }
  }
}

function getRenderLabel(data) {
  const sourcePath = String(data?.path || "");
  const normalized = sourcePath.replace(/\\/g, "/");
  const isMd = /\.mdx?$/i.test(normalized) || normalized.endsWith(".md");
  const langMatch = normalized.match(/\/source\/([^/]+)\//);
  const langKey = langMatch ? langMatch[1] : "";
  const bucket = normalized.includes("/_posts/") ? "post" : normalized.includes("/_drafts/") ? "draft" : normalized.includes("/source/") ? "asset" : "other";
  const size = bucketLength(String(data?.text || "").length);
  return `render.${isMd ? "md" : "text"}.${langKey || "default"}.${bucket}.${size}`;
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
