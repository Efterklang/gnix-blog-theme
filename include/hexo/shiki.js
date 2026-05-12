const { codeToHtml } = require("shiki");
const t = require("@shikijs/transformers");
const { transformerColorizedBrackets } = require("@shikijs/colorized-brackets");
const { mkdir, writeFile } = require("node:fs/promises");
const { dirname } = require("node:path");

const THEMES = {
  light: "catppuccin-latte",
  dark: "catppuccin-mocha",
  song: "everforest-light",
  nord: "nord",
  tokyo: "tokyo-night",
  rose: "rose-pine",
};

const TRANSFORMERS = [
  t.transformerCompactLineOptions(),
  t.transformerMetaHighlight(),
  t.transformerMetaWordHighlight(),
  t.transformerNotationDiff(),
  t.transformerNotationErrorLevel(),
  t.transformerNotationFocus(),
  t.transformerNotationHighlight(),
  t.transformerNotationWordHighlight(),
  t.transformerRemoveLineBreak(),
  t.transformerRemoveNotationEscape(),
  t.transformerRenderWhitespace(),
  transformerColorizedBrackets(),
];

const SVG_WRAP =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="toggle-wrap" title="Toggle Wrap"><path d="m16 16-3 3 3 3"/><path d="M3 12h14.5a1 1 0 0 1 0 7H13"/><path d="M3 19h6"/><path d="M3 5h18"/></svg>';
const SVG_COPY =
  '<div class="copy-notice"></div><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="copy-button"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/><path d="M16 4h2a2 2 0 0 1 2 2v4"/><path d="M21 14H11"/><path d="m15 10-4 4 4 4"/></svg>';
const SVG_EXPAND =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="expand-icon"><path d="M12 22v-6"/><path d="M12 8V2"/><path d="M4 12H2"/><path d="M10 12H8"/><path d="M16 12h-2"/><path d="M22 12h-2"/><path d="m15 19-3 3-3-3"/><path d="m15 5-3-3-3 3"/></svg>';
const SVG_COLLAPSE =
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="collapse-icon"><path d="M12 22v-6"/><path d="M12 8V2"/><path d="M4 12H2"/><path d="M10 12H8"/><path d="M16 12h-2"/><path d="M22 12h-2"/><path d="m15 19-3-3-3 3"/><path d="m15 5 3 3-3 3"/></svg>';

const RE_LINE = /<span class="line/g;

function escapeHtml(code) {
  return code.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function createShikiTools(lang, title, { lang: showLang, title: showTitle, wrapToggle, copyButton }) {
  let left = '<div class="left"><div class="traffic-lights"> <span class="traffic-light red"></span> <span class="traffic-light yellow"></span> <span class="traffic-light green"></span> </div>';
  if (showLang) left += `<div class="code-lang">${lang.toUpperCase()}</div>`;
  left += "</div>";

  let center = '<div class="center">';
  if (showTitle && title) center += `\n<div class="code-title">${title}</div>`;
  center += "\n</div>";

  let right = '<div class="right">';
  if (wrapToggle) right += `\n${SVG_WRAP}`;
  if (copyButton) right += `\n${SVG_COPY}`;
  right += "\n</div>";

  return `<div class="shiki-tools">${left}${center}${right}</div>`;
}

async function writeCssAsync(cssGetter, cssOutputPath) {
  if (!cssGetter || !cssOutputPath) return;
  const css = cssGetter();
  await mkdir(dirname(cssOutputPath), { recursive: true });
  await writeFile(cssOutputPath, css, "utf8");
}

function computeCollapseAttributes(cfg, codeHtml) {
  const codeLines = (codeHtml.match(RE_LINE) || []).length;
  const shouldCollapse = cfg.collapseConfig.enable && codeLines > cfg.collapseConfig.maxLines;
  return {
    expandButton: shouldCollapse ? `<div class="code-expand-btn">${SVG_EXPAND}${SVG_COLLAPSE}</div>` : "",
    collapseAttrs: shouldCollapse ? ` data-collapsible="true" data-max-lines="${cfg.collapseConfig.maxLines}" data-total-lines="${codeLines}"` : "",
  };
}

function parseConfig(renderOptions) {
  const options = renderOptions || {};
  const { toolbar_items: ti = {}, style_to_class: stc } = options;

  let enabledTransformers;
  if (!options.transformers || options.transformers.includes("all")) {
    enabledTransformers = [...TRANSFORMERS];
  } else {
    enabledTransformers = options.transformers.map((name) => TRANSFORMERS.find((tr) => tr.name === name)).filter(Boolean);
  }

  let toClass = null;
  if (stc && stc.enable) {
    toClass = t.transformerStyleToClass({ classPrefix: stc.class_prefix || "_sk_" });
    enabledTransformers.push(toClass);
  }

  const maxLines = options.code_collapse != null ? options.code_collapse : 30;

  return {
    themes: THEMES,
    excludes: options.exclude_languages || ["mermaid"],
    aliases: options.language_aliases || {},
    collapseConfig: { enable: maxLines > 0, maxLines },
    styleToClass: {
      enable: !!(stc && stc.enable),
      cssGetter: toClass ? toClass.getCSS : undefined,
      css_output_path: stc ? stc.css_output_path : undefined,
    },
    transformers: enabledTransformers,
    toolbarItems: {
      lang: ti.lang != null ? ti.lang : true,
      title: ti.title != null ? ti.title : true,
      wrapToggle: ti.wrapToggle != null ? ti.wrapToggle : true,
      copyButton: ti.copyButton != null ? ti.copyButton : true,
    },
  };
}

function renderCode(md, renderOptions) {
  const cfg = parseConfig(renderOptions);

  md.renderer.rules.fence = async (tokens, idx) => {
    const token = tokens[idx];
    if (!token) return "";

    const code = token.content;
    const lang = token.info.split(/\s+/)[0] || "";
    const attrs = token.info.split(/\s+/).slice(1).join(" ");

    if (cfg.excludes.includes(lang)) {
      const escaped = escapeHtml(code);
      return `<pre><code class="${lang}">${escaped}</code></pre>`;
    }
    const normalizedCode = code.replace(/\r?\n$/, "");
    const mappedLang = cfg.aliases[lang] || lang;
    let codeHtml = await codeToHtml(normalizedCode, {
      lang: mappedLang,
      themes: cfg.themes,
      transformers: cfg.transformers,
    });
    await writeCssAsync(cfg.styleToClass.cssGetter, cfg.styleToClass.css_output_path);
    codeHtml = codeHtml.replace(/<pre[^>]*>/, (match) => match.replace(/\s*style\s*=\s*"[^"]*"\s*tabindex="0"/, ""));

    const title = attrs || "";
    const shikiToolsHtml = createShikiTools(lang || "", title, cfg.toolbarItems);
    const { expandButton, collapseAttrs } = computeCollapseAttributes(cfg, codeHtml);
    return `<figure class="shiki" ${collapseAttrs}> ${shikiToolsHtml} ${codeHtml}${expandButton} </figure>`;
  };

  md.renderer.rules.code_inline = async (tokens, idx, _options, _env, self) => {
    const token = tokens[idx];
    if (!token) return "";

    const content = token.content.trim();
    const match = content.match(/^\{(\w+)\}\s+(.+)$/);
    if (match === null) {
      return `<code${self.renderAttrs(token)}>${escapeHtml(content)}</code>`;
    }
    const [, lang, code] = match;
    if (!lang || !code) return `<code>${content}</code>`;
    const highlighted = await codeToHtml(code, {
      lang: lang,
      themes: cfg.themes,
      structure: "inline",
    });
    return `<code${self.renderAttrs(token)}>${highlighted}</code>`;
  };
}

module.exports = renderCode;
module.exports.default = renderCode;

