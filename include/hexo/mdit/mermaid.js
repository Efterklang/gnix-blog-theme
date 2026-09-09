// Mermaid 代码块在构建期由 beautiful-mermaid 渲染为内联 SVG（同步、无 DOM 依赖）。
// 颜色一律写成站内色板的 CSS 变量，主题 / 夜间模式切换由级联即时生效，无需像 mermaid.js
// 那样监听主题重渲染；平移缩放与复制的外壳（toolbar / grid panel）沿用 source/js/mdit/mermaid.js。
// 不支持的图类型（gantt / pie / mindmap / gitGraph…）回退为浏览器端 mermaid.js 渲染。
const { createHash } = require("node:crypto");
const path = require("node:path");

const icons = {
  up: '<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-chevron-up" aria-hidden="true"><path d="M3.22 10.53a.749.749 0 0 1 0-1.06l4.25-4.25a.749.749 0 0 1 1.06 0l4.25 4.25a.749.749 0 1 1-1.06 1.06L8 6.811 4.28 10.53a.749.749 0 0 1-1.06 0Z"></path></svg>',
  down: '<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-chevron-down" aria-hidden="true"><path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z"></path></svg>',
  left: '<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-chevron-left" aria-hidden="true"><path d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06Z"></path></svg>',
  right:
    '<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-chevron-right" aria-hidden="true"><path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"></path></svg>',
  zoomIn:
    '<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-zoom-in" aria-hidden="true"><path d="M3.75 7.5a.75.75 0 0 1 .75-.75h2.25V4.5a.75.75 0 0 1 1.5 0v2.25h2.25a.75.75 0 0 1 0 1.5H8.25v2.25a.75.75 0 0 1-1.5 0V8.25H4.5a.75.75 0 0 1-.75-.75Z"></path><path d="M7.5 0a7.5 7.5 0 0 1 5.807 12.247l2.473 2.473a.749.749 0 1 1-1.06 1.06l-2.473-2.473A7.5 7.5 0 1 1 7.5 0Zm-6 7.5a6 6 0 1 0 12 0 6 6 0 0 0-12 0Z"></path></svg>',
  zoomOut:
    '<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-zoom-out" aria-hidden="true"><path d="M4.5 6.75h6a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1 0-1.5Z"></path><path d="M0 7.5a7.5 7.5 0 1 1 13.307 4.747l2.473 2.473a.749.749 0 1 1-1.06 1.06l-2.473-2.473A7.5 7.5 0 0 1 0 7.5Zm7.5-6a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"></path></svg>',
  reset:
    '<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-sync" aria-hidden="true"><path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z"></path></svg>',
  copy: '<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-copy" aria-hidden="true"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path></svg>',
};

const toolbarTemplate = `<div class="mermaid-toolbar">
      <button class="btn copy-code" aria-label="Copy Code" title="Copy Code">${icons.copy}</button>
    </div>`;

const gridPanelTemplate = `<div class="mermaid-viewer-grid-panel">
        <div class="grid-row">
          <div class="empty-cell"></div>
          <button class="btn up" aria-label="Pan up">${icons.up}</button>
          <button class="btn zoom-in" aria-label="Zoom in">${icons.zoomIn}</button>
        </div>
        <div class="grid-row">
          <button class="btn left" aria-label="Pan left">${icons.left}</button>
          <button class="btn reset" aria-label="Reset view">${icons.reset}</button>
          <button class="btn right" aria-label="Pan right">${icons.right}</button>
        </div>
        <div class="grid-row">
          <div class="empty-cell"></div>
          <button class="btn down" aria-label="Pan down">${icons.down}</button>
          <button class="btn zoom-out" aria-label="Zoom out">${icons.zoomOut}</button>
        </div>
      </div>`;

const DEFAULT_OPTIONS = {
  // 不支持的图类型是否回退为浏览器端 mermaid.js 渲染；关闭则改为输出源码块
  fallback: true,
  // 透传给 beautiful-mermaid 的 RenderOptions。bg 与 .mermaid-wrapper 的底色同为 --mantle，
  // 配合 transparent 让底色透出，color-mix 派生色阶才与实际底色吻合
  render: {
    bg: "var(--mantle)",
    fg: "var(--text)",
    accent: "var(--lavender)",
    transparent: true,
  },
};

function resolveOptions(userOptions = {}) {
  return {
    fallback: userOptions.fallback ?? DEFAULT_OPTIONS.fallback,
    render: { ...DEFAULT_OPTIONS.render, ...userOptions.render },
  };
}

function escapeHtml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

// beautiful-mermaid 仅提供 ESM 导出，与 markdown-it-ts 一样走惰性动态 import，模块级缓存一次
let beautifulMermaid = null;
function loadBeautifulMermaid() {
  beautifulMermaid ??= import("beautiful-mermaid");
  return beautifulMermaid;
}

// 库输出的 SVG 自带一段 <style>：Google Fonts 的 @import，以及 text / svg / .mono 这类不限定作用域
// 的规则——内联进 HTML 后会作用于整个文档且逐图重复。这里整段剥除，等价的派生色阶与字体规则
// 收敛到 source/css/optional/mermaid.css、限定在图内声明（test/mermaid_render.test.js 校验两者同步）。
// xychart 追加的第二段 <style> 只含 .xychart-* 规则，保留。
function stripThemeStyle(svg) {
  return svg.replace(/<style>[\s\S]*?<\/style>\s*/, "");
}

// marker 等 id 以源码哈希作后缀：同页多图时 url(#arrowhead) 不再一律解析到首图的定义
function scopeIds(svg, code) {
  const suffix = createHash("sha1").update(code).digest("base64url").slice(0, 8);
  return svg.replace(/ id="([^"]+)"/g, ` id="$1-${suffix}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${suffix})`);
}

async function renderSvg(code, options, env) {
  const { renderMermaidSVG } = await loadBeautifulMermaid();
  try {
    return scopeIds(stripThemeStyle(renderMermaidSVG(code, options.render)), code);
  } catch (error) {
    const header = code.trim().split("\n")[0].trim();
    const source = env?.path ? ` in ${path.relative(process.cwd(), env.path)}` : "";
    const action = options.fallback ? "falling back to client-side mermaid.js" : "emitting the source as a code block";
    console.warn(`[mermaid] beautiful-mermaid could not render \`${header}\`${source}, ${action}: ${String(error?.message || error).split("\n")[0]}`);
    return null;
  }
}

// 回退图的 .mermaid-content 留空，由 source/js/mdit/mermaid.js 按 data-mermaid-renderer 判断是否需要浏览器端渲染
function renderContainer(code, svg) {
  return `<div class="mermaid-container" data-mermaid-renderer="${svg ? "beautiful-mermaid" : "mermaid-js"}">
  <div class="mermaid-wrapper">
    ${toolbarTemplate}
    <textarea class="mermaid-code" style="display:none">${escapeHtml(code)}</textarea>
    <div class="mermaid-view-container">
      ${gridPanelTemplate}
      <div class="mermaid-content">${svg || ""}</div>
    </div>
  </div>
</div>`;
}

function mermaidDiagram(md, userOptions) {
  const options = resolveOptions(userOptions);
  const origFence = md.renderer.rules.fence;

  md.renderer.rules.fence = async (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    if (!token) return "";

    const lang = (token.info || "").trim().split(/\s+/)[0];
    if (lang !== "mermaid") {
      return origFence ? origFence(tokens, idx, opts, env, self) : self.renderToken(tokens, idx, opts);
    }

    const code = token.content.replace(/\r?\n$/, "");
    const svg = await renderSvg(code, options, env);
    if (!svg && !options.fallback) return `<pre><code class="language-mermaid">${escapeHtml(code)}</code></pre>`;
    return renderContainer(code, svg);
  };
}

module.exports = mermaidDiagram;
