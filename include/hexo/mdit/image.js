// S3/Bitiful progressive image plugin, ported from markdown-exit-s3-image.
// Features: thumbhash placeholders, Obsidian-style `![alt|WxH]` sizing,
// automatic srcset generation, and JSON metadata caching.
const { ImageMetadata, generateSrcset } = require("../../util/image");

// Parse Obsidian-style dimensions from alt text: `![alt|width]` or `![alt|widthxheight]`
function parseObsidianImageAlt(content) {
  const match = content.trim().match(/^(.*?)\|(\d+)(?:x(\d+))?$/);
  if (!match) return { alt: content };
  return {
    alt: match[1].trim(),
    width: Number.parseInt(match[2], 10),
    height: match[3] ? Number.parseInt(match[3], 10) : undefined,
  };
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function addOrMergeStyleAttribute(html, style) {
  if (!html.includes("<img")) return html;

  if (html.includes('style="')) {
    return html.replace(/style="([^"]*)"/, (_match, existingStyle) => {
      const separator = existingStyle.length > 0 && !existingStyle.trim().endsWith(";") ? "; " : " ";
      return `style="${existingStyle}${separator}${style}"`;
    });
  }

  return html.replace(/<img\b/, `<img style="${style}"`);
}

function applyDimensionToHTML(html, width, height) {
  if (!width) return html;
  let style = `max-width: 100%; width: ${width}px; height: auto;`;
  if (height) style += ` aspect-ratio: ${width} / ${height}; object-fit: cover;`;
  return addOrMergeStyleAttribute(html, style);
}

function wrapWithFigure(html, caption) {
  if (!caption) return html;
  return `<figure>${html}<figcaption>${escapeHtml(caption)}</figcaption></figure>`;
}

async function renderStandardImage(imageRule, tokens, idx, info, env, self, parsedAlt) {
  const token = tokens[idx];
  const originalContent = token.content;
  const originalChildren = token.children;
  token.content = parsedAlt.alt;
  // markdown-it derives the alt attribute from children, not content
  if (originalChildren?.length && originalChildren[0].type === "text") {
    const textToken = Object.assign(Object.create(Object.getPrototypeOf(originalChildren[0])), originalChildren[0]);
    textToken.content = parsedAlt.alt;
    token.children = [textToken, ...originalChildren.slice(1)];
  }

  try {
    const html = await imageRule(tokens, idx, info, env, self);
    return wrapWithFigure(applyDimensionToHTML(html, parsedAlt.width, parsedAlt.height), parsedAlt.alt);
  } finally {
    token.content = originalContent;
    token.children = originalChildren;
  }
}

function buildProgressiveImageHTML(parsedAlt, src, options, originalWidth, originalHeight, dataURL) {
  const displayWidth = parsedAlt.width ?? originalWidth;
  const displayHeight = parsedAlt.height ?? Math.round((originalHeight / originalWidth) * displayWidth);
  const srcset = generateSrcset(src, originalWidth, options.progressive.srcset_widths);
  const escapedAlt = escapeHtml(parsedAlt.alt);
  const escapedSrc = escapeHtml(src);
  // auto follows the actual laid-out width, including reading-width preferences.
  // Older browsers use the default article column minus its horizontal padding.
  const sizes = options.progressive.sizes ?? `auto, (max-width: 768px) min(${displayWidth}px, calc(100vw - 1.75rem)), min(${displayWidth}px, calc(100vw - 5.5rem), 39.5rem)`;
  const figcaption = parsedAlt.alt
    ? `<figcaption style="margin-top: 8px; text-align: center; color: #666; font-size: 0.9em;">${escapedAlt}</figcaption>`
    : "";

  // the onload handler clears the thumbhash background on the wrapper once the real image is in
  const mainImgAttrs = [
    `src="${escapedSrc}"`,
    `alt="${escapedAlt}"`,
    `srcset="${escapeHtml(srcset)}"`,
    `sizes="${escapeHtml(sizes)}"`,
    `width="${displayWidth}"`,
    `height="${displayHeight}"`,
    `loading="lazy"`,
    `decoding="async"`,
    `style="width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.6s ease-in-out; display: block;"`,
    `onload="this.style.opacity=1; setTimeout(() => { this.parentElement.style.backgroundImage='none'; }, 600);"`,
  ].join(" ");

  // 纵向间距交给 article.css 的媒体块档位（margin-block），行内只负责居中
  // Keep the same explicit aspect ratio when the placeholder endpoint is unavailable.
  return `
  <figure class="pic" style="max-width: ${displayWidth}px; width: 100%; margin-inline: auto;">
    <div class="img-wrapper" style="
      position: relative;
      width: 100%;
      ${dataURL ? `background-image: url('${escapeHtml(dataURL)}');` : ""}
      background-size: cover;
      background-repeat: no-repeat;
      aspect-ratio: ${displayWidth} / ${displayHeight};
      overflow: hidden;
    ">
      <img ${mainImgAttrs}>
    </div>
    ${figcaption}
  </figure>`.replace(/\n\s+/g, "");
}

module.exports = function image(md, userOptions = {}, images = new ImageMetadata(userOptions)) {
  const options = images.options;
  const imageRule = md.renderer.rules.image;
  if (!imageRule) return;

  md.renderer.rules.image = async (tokens, idx, info, env, self) => {
    const token = tokens[idx];
    const src = token.attrGet("src");
    const parsedAlt = parseObsidianImageAlt(token.content);

    if (process.env.NODE_ENV === "development" || !images.supports(src)) {
      return renderStandardImage(imageRule, tokens, idx, info, env, self, parsedAlt);
    }

    const progressiveData = await images.fetch(src);
    if (!progressiveData) {
      return renderStandardImage(imageRule, tokens, idx, info, env, self, parsedAlt);
    }

    return buildProgressiveImageHTML(parsedAlt, src, options, progressiveData.width, progressiveData.height, progressiveData.dataURL);
  };
};
