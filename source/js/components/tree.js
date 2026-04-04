/**
 * File Tree Custom Element
 *
 * Renders markdown-style indented unordered lists as a beautiful folder/file tree.
 *
 * Usage:
 * <x-tree>
 *
 * - src
 *   - components
 *     - accordion.js
 *     - tree.js
 *   - styles
 *     - main.css
 * - package.json
 * - README.md
 *
 * </x-tree>
 *
 * Note: The markdown content inside is compiled to HTML <ul>/<li> by the markdown renderer.
 * This component transforms that structure into a file tree visualization.
 */

const ICON_FOLDER = "\uf07b";
const ICON_FILE = "\uf15b";
const ICON_CHEVRON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><polyline points="6 9 12 15 18 9"/></svg>`;

const FILE_ICONS = {
  js: "\ue74e",
  jsx: "\ue7ba",
  ts: "\ue628",
  tsx: "\ue7ba",
  mjs: "\ue74e",
  cjs: "\ue74e",
  py: "\ue73c",
  pyc: "\ue73c",
  css: "\ue749",
  scss: "\ue749",
  less: "\ue758",
  html: "\uf13b",
  htm: "\uf13b",
  md: "\uf48a",
  markdown: "\uf48a",
  yaml: "\uf481",
  yml: "\uf481",
  json: "\ue60b",
  toml: "\ue60b",
  sh: "\uf489",
  bash: "\uf489",
  zsh: "\uf489",
  fish: "\uf489",
  rs: "\ue7a8",
  go: "\ue626",
  vue: "\ufde1",
  svelte: "\ue697",
  png: "\uf1c5",
  jpg: "\uf1c5",
  jpeg: "\uf1c5",
  gif: "\uf1c5",
  svg: "\uf1c5",
  webp: "\uf1c5",
  ico: "\uf1c5",
  avif: "\uf1c5",
  mp4: "\uf03d",
  mp3: "\uf03d",
  wav: "\uf03d",
  pdf: "\uf1c1",
  zip: "\uf410",
  tar: "\uf410",
  gz: "\uf410",
  lock: "\uf023",
  env: "\uf469",
  gitignore: "\uf1d3",
};

const SPECIAL_FILES = {
  "package.json": "\ue71e",
  "package-lock.json": "\ue71e",
  "tsconfig.json": "\ue628",
  "jsconfig.json": "\ue74e",
  "vite.config.js": "\ue74e",
  "vite.config.ts": "\ue628",
  "webpack.config.js": "\ue74e",
  "next.config.js": "\ue74e",
  "next.config.ts": "\ue628",
  "nuxt.config.js": "\ue69f",
  "tailwind.config.js": "\ue69f",
  "tailwind.config.ts": "\ue69f",
  "postcss.config.js": "\ue749",
  "eslint.config.js": "\uf469",
  ".eslintrc": "\uf469",
  ".prettierrc": "\uf469",
  "readme.md": "\uf02d",
  "changelog.md": "\uf02d",
  license: "\uf4d2",
  dockerfile: "\uf308",
  "docker-compose.yml": "\uf308",
  makefile: "\uf469",
  "cargo.toml": "\ue7a8",
  "go.mod": "\ue626",
  "go.sum": "\ue626",
  "requirements.txt": "\ue73c",
  pipfile: "\ue73c",
  "pipfile.lock": "\ue73c",
};

const STYLES = `
  :host {
    display: block;
    margin: 1.5em 0;
    font-family: var(--font-mono, 'SF Mono', 'Fira Code', monospace);
    font-size: 14px;
    line-height: 1.6;
  }

  .file-tree {
    background: var(--mantle, #1e1e2e);
    border: 1px solid var(--surface0, #313244);
    border-radius: 10px;
    padding: 16px 20px;
    overflow-x: auto;
    position: relative;
  }

  .file-tree::before {
    content: attr(data-root);
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--subtext0, #7f849c);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 12px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--surface0, #313244);
  }

  .tree-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .tree-item {
    position: relative;
  }

  .tree-row {
    display: flex;
    align-items: center;
    gap: .75rem;
    padding: 3px 0;
    cursor: default;
    border-radius: 4px;
    transition: background 0.15s ease;
    white-space: nowrap;
  }

  .tree-row:hover {
    background: var(--surface0, #313244);
  }

  .tree-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: none;
    background: transparent;
    color: var(--subtext0, #7f849c);
    cursor: pointer;
    padding: 0;
    border-radius: 3px;
    transition: transform 0.2s ease, color 0.15s ease;
    flex-shrink: 0;
  }

  .tree-toggle:hover {
    color: var(--text, #cdd6f4);
    background: var(--surface1, #45475a);
  }

  .tree-toggle.collapsed {
    transform: rotate(-90deg);
  }

  .tree-toggle-placeholder {
    width: 18px;
    flex-shrink: 0;
  }

  .tree-icon {
    flex-shrink: 0;
    color: var(--blue, #89b4fa);
    display: inline-flex;
    align-items: center;
    font-size: 15px;
    line-height: 1;
  }

  .tree-icon.folder {
    color: var(--yellow, #f9e2af);
  }

  .tree-icon.js, .tree-icon.ts, .tree-icon.mjs {
    color: var(--yellow, #f9e2af);
  }

  .tree-icon.css, .tree-icon.scss, .tree-icon.less {
    color: var(--mauve, #cba6f7);
  }

  .tree-icon.py {
    color: var(--green, #a6e3a1);
  }

  .tree-icon.md {
    color: var(--peach, #fab387);
  }

  .tree-icon.go {
    color: var(--sky, #89dceb);
  }

  .tree-icon.rs {
    color: var(--red, #f38ba8);
  }

  .tree-icon.vue {
    color: var(--green, #a6e3a1);
  }

  .tree-icon.svelte {
    color: var(--red, #f38ba8);
  }

  .tree-label {
    color: var(--text, #cdd6f4);
    font-size: 13px;
  }

  .tree-children {
    list-style: none;
    margin: 0;
    padding: 0 0 0 20px;
    overflow: hidden;
    transition: max-height 0.3s ease;
  }

  .tree-children.collapsed {
    max-height: 0 !important;
    display: none;
  }

`;

class XTree extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const ulElements = this.querySelectorAll(":scope > ul");
    if (ulElements.length === 0) {
      this.renderFromText();
      return;
    }

    const treeData = this.parseUL(ulElements[0]);
    this.buildTree(treeData);
  }

  parseUL(ul) {
    const items = ul.querySelectorAll(":scope > li");
    const result = [];

    items.forEach((li) => {
      const text = this.extractText(li);
      const childUL = li.querySelector(":scope > ul");
      const children = childUL ? this.parseUL(childUL) : [];

      result.push({
        label: text,
        children,
        hasChildren: children.length > 0,
      });
    });

    return result;
  }

  extractText(li) {
    const clone = li.cloneNode(true);
    clone.querySelectorAll("ul").forEach((ul) => ul.remove());
    return clone.textContent.trim();
  }

  buildTree(treeData) {
    const rootName = this.getAttribute("root") || "";
    const treeHTML = this.renderTreeItems(treeData);

    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <div class="file-tree"${rootName ? ` data-root="${rootName}"` : ""}>
        <ul class="tree-list">${treeHTML}</ul>
      </div>
    `;

    this.shadowRoot.querySelectorAll(".tree-children").forEach((el) => {
      el.style.maxHeight = el.scrollHeight + "px";
    });

    this.shadowRoot.querySelectorAll(".tree-toggle:not(.collapsed)").forEach((btn) => {
      btn.addEventListener("click", () => this.toggleNode(btn));
    });
  }

  getIcon(label, isFolder) {
    if (isFolder) return ICON_FOLDER;

    const lower = label.toLowerCase();
    if (SPECIAL_FILES[lower]) return SPECIAL_FILES[lower];

    const ext = label.includes(".") ? label.split(".").pop().toLowerCase() : "";
    if (ext && FILE_ICONS[ext]) return FILE_ICONS[ext];

    return ICON_FILE;
  }

  renderTreeItems(items) {
    return items
      .map((item) => {
        const isFolder = item.hasChildren;
        const icon = this.getIcon(item.label, isFolder);
        const extClass = isFolder ? "folder" : this.getExtClass(item.label);

        const toggleHTML = isFolder ? `<button class="tree-toggle" aria-expanded="true">${ICON_CHEVRON}</button>` : `<span class="tree-toggle-placeholder"></span>`;

        const childrenHTML = isFolder ? `<ul class="tree-children">${this.renderTreeItems(item.children)}</ul>` : "";

        return `
          <li class="tree-item">
            <div class="tree-row">
              ${toggleHTML}
              <span class="tree-icon ${extClass}">${icon}</span>
              <span class="tree-label">${this.escapeHTML(item.label)}</span>
            </div>
            ${childrenHTML}
          </li>
        `;
      })
      .join("");
  }

  getExtClass(filename) {
    const ext = filename.includes(".") ? filename.split(".").pop().toLowerCase() : "";
    return ext;
  }

  toggleNode(btn) {
    const treeItem = btn.closest(".tree-item");
    const children = treeItem.querySelector(":scope > .tree-children");
    if (!children) return;

    const isCollapsed = btn.classList.contains("collapsed");

    if (isCollapsed) {
      btn.classList.remove("collapsed");
      btn.setAttribute("aria-expanded", "true");
      children.classList.remove("collapsed");
      children.style.maxHeight = children.scrollHeight + "px";
    } else {
      btn.classList.add("collapsed");
      btn.setAttribute("aria-expanded", "false");
      children.style.maxHeight = children.scrollHeight + "px";
      children.offsetHeight;
      children.classList.add("collapsed");
    }
  }

  escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  renderFromText() {
    const rawText = this.textContent.trim();
    if (!rawText) {
      this.shadowRoot.innerHTML = "";
      return;
    }

    const lines = rawText.split("\n").filter((line) => line.trim());
    const treeData = this.parseIndentedLines(lines);
    this.buildTree(treeData);
  }

  parseIndentedLines(lines) {
    const root = { children: [] };
    const stack = [{ indent: -1, node: root }];

    for (const line of lines) {
      const match = line.match(/^(\s*)[-*+]\s+(.*)/);
      if (!match) continue;

      const indent = match[1].length;
      const label = match[2].trim();

      const node = { label, children: [], hasChildren: false };

      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1].node;
      parent.children.push(node);
      parent.hasChildren = true;

      stack.push({ indent, node });
    }

    return root.children;
  }
}

if (!customElements.get("x-tree")) {
  customElements.define("x-tree", XTree);
}

export { XTree };
