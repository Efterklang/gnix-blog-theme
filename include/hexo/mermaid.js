const icons = {
  up: '<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-chevron-up" aria-hidden="true"><path d="M3.22 10.53a.749.749 0 0 1 0-1.06l4.25-4.25a.749.749 0 0 1 1.06 0l4.25 4.25a.749.749 0 1 1-1.06 1.06L8 6.811 4.28 10.53a.749.749 0 0 1-1.06 0Z"></path></svg>',
  down: '<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-chevron-down" aria-hidden="true"><path d="M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z"></path></svg>',
  left: '<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-chevron-left" aria-hidden="true"><path d="M9.78 12.78a.75.75 0 0 1-1.06 0L4.47 8.53a.75.75 0 0 1 0-1.06l4.25-4.25a.751.751 0 0 1 1.042.018.751.751 0 0 1 .018 1.042L6.06 8l3.72 3.72a.75.75 0 0 1 0 1.06Z"></path></svg>',
  right: '<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-chevron-right" aria-hidden="true"><path d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"></path></svg>',
  zoomIn: '<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-zoom-in" aria-hidden="true"><path d="M3.75 7.5a.75.75 0 0 1 .75-.75h2.25V4.5a.75.75 0 0 1 1.5 0v2.25h2.25a.75.75 0 0 1 0 1.5H8.25v2.25a.75.75 0 0 1-1.5 0V8.25H4.5a.75.75 0 0 1-.75-.75Z"></path><path d="M7.5 0a7.5 7.5 0 0 1 5.807 12.247l2.473 2.473a.749.749 0 1 1-1.06 1.06l-2.473-2.473A7.5 7.5 0 1 1 7.5 0Zm-6 7.5a6 6 0 1 0 12 0 6 6 0 0 0-12 0Z"></path></svg>',
  zoomOut: '<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-zoom-out" aria-hidden="true"><path d="M4.5 6.75h6a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1 0-1.5Z"></path><path d="M0 7.5a7.5 7.5 0 1 1 13.307 4.747l2.473 2.473a.749.749 0 1 1-1.06 1.06l-2.473-2.473A7.5 7.5 0 0 1 0 7.5Zm7.5-6a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"></path></svg>',
  reset: '<svg version="1.1" width="16" height="16" viewBox="0 0 16 16" class="octicon octicon-sync" aria-hidden="true"><path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z"></path></svg>',
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

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function mermaidDiagram(md) {
  const origFence = md.renderer.rules.fence;

  md.renderer.rules.fence = (tokens, idx, _opts, _env, self) => {
    const token = tokens[idx];
    if (!token) return "";

    const info = (token.info || "").trim();
    const lang = info.split(/\s+/)[0];

    if (lang !== "mermaid") {
      return origFence
        ? origFence(tokens, idx, _opts, _env, self)
        : self.renderToken(tokens, idx, _opts);
    }

    const code = escapeHtml(token.content) || "";
    const id = `mermaid-${Math.random().toString(36).slice(2)}`;

    return `<div id="${id}" class="mermaid-container">
  <div class="mermaid-wrapper">
    ${toolbarTemplate}
    <div class="mermaid-view-container">
      ${gridPanelTemplate}
      <pre class="mermaid-content">
         <code class="mermaid-code" style="display: none;">${code}</code>
      </pre>
    </div>
  </div>
</div>`;
  };
}

module.exports = mermaidDiagram;