// Image-only fences reuse the site's async image renderer (srcset, sizing and
// placeholders included). Raw HTML and arbitrary attributes are not accepted.
const OPTION_PATTERN = /([\w-]+)=(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;
const COUNT_OPTIONS = new Set(["columns", "rows", "mobile-columns", "mobile-rows"]);
const LENGTH_OPTIONS = new Set(["height", "gap"]);

function parseOptions(info) {
  const source = info.replace(/^image-group\b/, "").trim();
  const attributes = {};
  let end = 0;
  for (const match of source.matchAll(OPTION_PATTERN)) {
    if (source.slice(end, match.index).trim()) throw new Error("Expected image-group options as key=value.");
    const name = match[1] === "cols" ? "columns" : match[1];
    const value = match[2] ?? match[3] ?? match[4];
    if (COUNT_OPTIONS.has(name)) {
      if (!/^[1-9]\d*$/.test(value) || Number(value) > 100) throw new Error(`Invalid image-group ${name}: ${value}`);
    } else if (LENGTH_OPTIONS.has(name)) {
      if (!/^(?:0|\d+(?:\.\d+)?(?:px|rem|em|vw|vh|svh|dvh|%))$/.test(value)) throw new Error(`Invalid image-group ${name}: ${value}`);
    } else if (name !== "label") {
      throw new Error(`Unknown image-group option: ${name}`);
    }
    if (Object.hasOwn(attributes, name)) throw new Error(`Duplicate image-group option: ${name}`);
    attributes[name] = value;
    end = match.index + match[0].length;
  }
  if (source.slice(end).trim()) throw new Error("Expected image-group options as key=value.");
  return attributes;
}

module.exports = function imageGroup(md) {
  const originalFence = md.renderer.rules.fence;
  md.renderer.rules.fence = async (tokens, index, options, env, self) => {
    const token = tokens[index];
    if (token.info.trim().split(/\s+/)[0] !== "image-group") return originalFence ? originalFence(tokens, index, options, env, self) : self.renderToken(tokens, index, options);
    try {
      const attributes = parseOptions(token.info.trim());
      // A nested document needs fresh plugin state. Inheriting the parent's
      // footnotes makes footnote_tail append the article's notes to this grid.
      // Only reference definitions belong to both parsing contexts.
      const bodyEnv = { references: { ...env?.references } };
      const body = md.parse(token.content, bodyEnv);
      const imageEnv = { ...env, ...bodyEnv };
      const images = [];
      for (const block of body) {
        if (["paragraph_open", "paragraph_close"].includes(block.type)) continue;
        if (block.type !== "inline") throw new Error("image-group accepts Markdown images only.");
        for (const child of block.children || []) {
          if (child.type === "image") images.push(child);
          else if (!["softbreak", "hardbreak"].includes(child.type) && !(child.type === "text" && !child.content.trim())) {
            throw new Error("image-group accepts Markdown images only.");
          }
        }
      }
      if (!images.length) throw new Error("image-group needs at least one Markdown image.");
      const layout = attributes.rows || !attributes.columns ? "rail" : "grid";
      if (layout === "rail" && !attributes.rows) attributes.rows = "1";
      const escaped = (value) => md.utils.escapeHtml(String(value));
      const attrs = Object.entries(attributes).map(([name, value]) => `${name}="${escaped(value)}"`).join(" ");
      // Match the enhanced layout before JavaScript loads, including natural
      // image ratios and a fixed row count for horizontal scrolling.
      const variables = layout === "rail"
        ? [`--image-group-rows:${Math.min(Number(attributes.rows), images.length)}`, `--image-group-mobile-rows:${Math.min(Number(attributes["mobile-rows"]) || 1, images.length)}`]
        : [`--image-group-columns:${attributes.columns}`, `--image-group-mobile-columns:${attributes["mobile-columns"] || 1}`];
      if (attributes.height) variables.push(`--image-group-height:${attributes.height}`, `--image-group-grid-height:${attributes.height}`);
      if (attributes.gap) variables.push(`--image-group-gap:${attributes.gap}`);
      const rendered = await Promise.all(images.map(async (image) => {
        const html = await md.renderer.rules.image([image], 0, options, imageEnv, self);
        const img = html.match(/<img\b[^>]*>/)?.[0] || "";
        const width = Number(img.match(/\bwidth="(\d+)"/)?.[1]);
        const height = Number(img.match(/\bheight="(\d+)"/)?.[1]);
        const ratio = width > 0 && height > 0 ? width / height : 4 / 3;
        const figure = /^\s*<figure\b/.test(html) ? html : `<figure>${html}</figure>`;
        return `<div class="image-group-item" style="--image-group-ratio:${ratio}">${figure}</div>`;
      }));
      const label = attributes.label || ((env?.lang || env?.language || "").startsWith("en") ? "Image group" : "图片组");
      let content = rendered.join("\n");
      if (layout === "rail") {
        const rowCount = Math.min(Number(attributes.rows), rendered.length);
        const perRow = Math.floor(rendered.length / rowCount);
        const remainder = rendered.length % rowCount;
        const rows = [];
        let start = 0;
        for (let index = 0; index < rowCount; index++) {
          const end = start + perRow + (index < remainder ? 1 : 0);
          rows.push(`<div class="image-group-row">${rendered.slice(start, end).join("\n")}</div>`);
          start = end;
        }
        content = rows.join("\n");
      }
      return `<image-group layout="${layout}" ${attrs} style="${variables.join(";")}" role="region" aria-label="${escaped(label)}"><div class="image-group-fallback"${layout === "rail" ? ' tabindex="0"' : ""}>${content}</div></image-group>\n`;
    } catch (error) {
      throw new Error(`[image-group] ${error.message}${env?.path ? ` in ${env.path}` : ""}`, { cause: error });
    }
  };
};
