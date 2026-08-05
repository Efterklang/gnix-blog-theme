// S3/Bitiful progressive image plugin, ported from markdown-exit-s3-image.
// Features: thumbhash placeholders, Obsidian-style `![alt|WxH]` sizing,
// automatic srcset generation, and JSON metadata caching.
const { promises: fs } = require("node:fs");

const DEFAULT_OPTIONS = {
  progressive: {
    enable: true,
    srcset_widths: [400, 600, 800, 1200, 2000, 3000],
  },
  ignore_formats: ["svg", "gif", "webm"],
  bitiful_domains: ["assets.vluv.space", "s3.bitiful.net", "bitiful.com"],
  cache_path: null,
};

function resolveOptions(userOptions = {}) {
  return {
    ...DEFAULT_OPTIONS,
    ...userOptions,
    progressive: {
      ...DEFAULT_OPTIONS.progressive,
      ...userOptions.progressive,
    },
    ignore_formats: userOptions.ignore_formats ?? DEFAULT_OPTIONS.ignore_formats,
    bitiful_domains: userOptions.bitiful_domains ?? DEFAULT_OPTIONS.bitiful_domains,
    cache_path: userOptions.cache_path ?? DEFAULT_OPTIONS.cache_path,
  };
}

class ImageCache {
  constructor(cacheFilePath) {
    this.cacheFilePath = cacheFilePath;
    this.cache = {};
    this.isDirty = false;
  }

  async load() {
    try {
      const content = await fs.readFile(this.cacheFilePath, "utf8");
      this.cache = JSON.parse(content || "{}");
      console.log(`[ImageCache] Cache loaded from ${this.cacheFilePath} with ${Object.keys(this.cache).length} items.`);
    } catch {
      console.log("[ImageCache] Cache file not found or failed to read, starting with an empty cache.");
      this.cache = {};
    }
  }

  async save() {
    if (!this.isDirty) return;
    try {
      await fs.writeFile(this.cacheFilePath, JSON.stringify(this.cache, null, 2), "utf8");
      this.isDirty = false;
      console.log(`[ImageCache] Cache saved to ${this.cacheFilePath}.`);
    } catch (error) {
      console.error("[ImageCache] Failed to save cache file:", error);
    }
  }

  get(key) {
    return this.cache[decodeURI(key)] ?? null;
  }

  set(key, value) {
    const decodedKey = decodeURI(key);
    if (JSON.stringify(this.cache[decodedKey]) !== JSON.stringify(value)) {
      this.cache[decodedKey] = value;
      this.isDirty = true;
    }
  }
}

function isBitifulDomain(url, bitifulDomains) {
  try {
    const { hostname } = new URL(url);
    return bitifulDomains.some((domain) => hostname.includes(domain));
  } catch {
    return false;
  }
}

async function getBitifulDimension(imageUrl) {
  try {
    const baseUrl = imageUrl.split("?")[0];
    const response = await fetch(`${baseUrl}?fmt=info`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const { ImageWidth: width, ImageHeight: height } = await response.json();
    if (typeof width === "number" && typeof height === "number") {
      return { width, height };
    }
    return null;
  } catch (error) {
    console.warn(`[Bitiful] Dimension error for ${imageUrl}:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function getBitifulThumbhash(imageUrl) {
  try {
    const baseUrl = imageUrl.split("?")[0];
    const response = await fetch(`${baseUrl}?fmt=thumbhash`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const base64String = await response.text();
    const thumbhashBytes = new Uint8Array(Buffer.from(base64String.trim(), "base64"));
    const { thumbHashToDataURL } = await import("thumbhash");
    const pngDataUrl = thumbHashToDataURL(thumbhashBytes);

    // recompress the thumbhash PNG placeholder to a smaller WebP data URL
    const buffer = Buffer.from(pngDataUrl.replace(/^data:image\/\w+;base64,/, ""), "base64");
    const sharp = require("sharp");
    const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();
    return `data:image/webp;base64,${webpBuffer.toString("base64")}`;
  } catch (error) {
    console.warn(`[Bitiful] Thumbhash error for ${imageUrl}:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

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

function shouldIgnoreFormat(url, formats) {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return formats.some((format) => pathname.endsWith(`.${format.toLowerCase()}`));
  } catch {
    return false;
  }
}

function shouldUseProgressiveImage(src, options) {
  return Boolean(
    options.progressive.enable &&
      src &&
      src.startsWith("http") &&
      isBitifulDomain(src, options.bitiful_domains) &&
      !shouldIgnoreFormat(src, options.ignore_formats) &&
      process.env.NODE_ENV !== "development",
  );
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
  let style = `max-width: ${width}px; width: ${width}px;`;
  if (height) style += ` height: ${height}px;`;
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

function generateSrcset(src, width, srcsetWidths) {
  const sortedWidths = Array.from(
    new Set(
      srcsetWidths
        .filter((candidate) => Number.isFinite(candidate) && candidate > 0)
        .filter((candidate) => candidate < width)
        .concat(width),
    ),
  ).sort((a, b) => a - b);

  return sortedWidths
    .map((candidateWidth) => {
      const url = candidateWidth === width ? src : src.includes("?") ? `${src}&w=${candidateWidth}` : `${src}?w=${candidateWidth}`;
      return `${url} ${candidateWidth}w`;
    })
    .join(", ");
}

function buildProgressiveImageHTML(parsedAlt, src, options, originalWidth, originalHeight, dataURL) {
  const displayWidth = parsedAlt.width ?? originalWidth;
  const displayHeight = parsedAlt.height ?? Math.round((originalHeight / originalWidth) * displayWidth);
  const srcset = generateSrcset(src, originalWidth, options.progressive.srcset_widths);
  const escapedAlt = escapeHtml(parsedAlt.alt);
  const escapedSrc = escapeHtml(src);
  const figcaption = parsedAlt.alt
    ? `<figcaption style="margin-top: 8px; text-align: center; color: #666; font-size: 0.9em;">${escapedAlt}</figcaption>`
    : "";

  // the onload handler clears the thumbhash background on the wrapper once the real image is in
  const mainImgAttrs = [
    `src="${escapedSrc}"`,
    `alt="${escapedAlt}"`,
    `srcset="${escapeHtml(srcset)}"`,
    `sizes="${escapeHtml(options.progressive.sizes ?? `${displayWidth}px`)}"`,
    `loading="lazy"`,
    `decoding="async"`,
    `style="width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.6s ease-in-out; display: block;"`,
    `onload="this.style.opacity=1; setTimeout(() => { this.parentElement.style.backgroundImage='none'; }, 600);"`,
  ].join(" ");

  if (!dataURL) {
    const imageHtml = `<img ${mainImgAttrs}>`;
    return figcaption ? `<figure style="max-width: ${displayWidth}px;">${imageHtml}${figcaption}</figure>` : imageHtml;
  }

  return `
  <figure class="pic" style="max-width: ${displayWidth}px; width: 100%; margin: 1em auto;">
    <div class="img-wrapper" style="
      position: relative;
      width: 100%;
      background-image: url('${dataURL}');
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

async function getProgressiveImageData(src, cache) {
  if (cache) {
    const cached = cache.get(src);
    if (cached) return cached;
  }

  const [dimensionResult, thumbhashResult] = await Promise.all([getBitifulDimension(src), getBitifulThumbhash(src)]);

  if (!dimensionResult) {
    console.warn(`[ImagePlugin] Skipping progressive image for ${src} - dimensions unavailable`);
    return null;
  }

  const result = {
    width: dimensionResult.width,
    height: dimensionResult.height,
    dataURL: thumbhashResult ?? "",
  };

  if (cache && result.dataURL) {
    cache.set(src, result);
  }

  return result;
}

module.exports = function image(md, userOptions = {}) {
  const options = resolveOptions(userOptions);
  const cache = options.cache_path && options.progressive.enable ? new ImageCache(options.cache_path) : null;
  const cacheReady = cache
    ? cache.load().catch((error) => {
        console.error("[ImageCache] Failed to load cache:", error);
      })
    : Promise.resolve();

  if (cache) {
    process.once("beforeExit", () => {
      void cache.save();
    });
  }

  const imageRule = md.renderer.rules.image;
  if (!imageRule) return;

  md.renderer.rules.image = async (tokens, idx, info, env, self) => {
    const token = tokens[idx];
    const src = token.attrGet("src");
    const parsedAlt = parseObsidianImageAlt(token.content);

    if (!shouldUseProgressiveImage(src, options)) {
      return renderStandardImage(imageRule, tokens, idx, info, env, self, parsedAlt);
    }

    await cacheReady;

    const progressiveData = await getProgressiveImageData(src, cache);
    if (!progressiveData) {
      return renderStandardImage(imageRule, tokens, idx, info, env, self, parsedAlt);
    }

    return buildProgressiveImageHTML(parsedAlt, src, options, progressiveData.width, progressiveData.height, progressiveData.dataURL);
  };
};
