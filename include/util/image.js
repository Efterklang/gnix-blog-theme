const { promises: fs } = require("node:fs");
const path = require("node:path");

const DEFAULT_OPTIONS = {
  progressive: { enable: true, srcset_widths: [400, 600, 800, 1200, 2000, 3000] },
  ignore_formats: ["svg", "gif", "webm"],
  bitiful_domains: ["assets.vluv.space", "s3.bitiful.net", "bitiful.com"],
  cache_path: "thumbcache.json",
  concurrency: 4,
  request_timeout: 10000,
};

function resolveOptions(options = {}, baseDir = process.cwd()) {
  const cachePath = options.cache_path === undefined ? DEFAULT_OPTIONS.cache_path : options.cache_path;
  return {
    ...DEFAULT_OPTIONS,
    ...options,
    progressive: { ...DEFAULT_OPTIONS.progressive, ...options.progressive },
    cache_path: cachePath ? path.resolve(baseDir, cachePath) : null,
    concurrency: Math.max(1, Math.floor(Number(options.concurrency) || DEFAULT_OPTIONS.concurrency)),
    request_timeout: Math.max(1, Number(options.request_timeout) || DEFAULT_OPTIONS.request_timeout),
  };
}

function supportsImage(src, options) {
  if (!options.progressive.enable) return false;
  try {
    const url = new URL(src);
    return ["http:", "https:"].includes(url.protocol)
      && options.bitiful_domains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`))
      && !options.ignore_formats.some((format) => url.pathname.toLowerCase().endsWith(`.${format.toLowerCase()}`));
  } catch {
    return false;
  }
}

function withImageParams(src, params) {
  const url = new URL(src);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  return url.href;
}

function generateSrcset(src, width, candidates) {
  const widths = [...new Set(candidates.filter((value) => Number.isFinite(value) && value > 0 && value < width).concat(width))].sort((a, b) => a - b);
  return widths.map((value) => `${withImageParams(src, { w: value })} ${value}w`).join(", ");
}

function cacheKey(src) {
  // Metadata endpoints describe the original image, irrespective of resize parameters.
  const url = new URL(src);
  url.search = "";
  url.hash = "";
  return decodeURI(url.href);
}

function validMetadata(value) {
  return Number.isFinite(value?.width) && value.width > 0 && Number.isFinite(value?.height) && value.height > 0;
}

class ImageMetadata {
  constructor(options = {}, baseDir) {
    this.options = resolveOptions(options, baseDir);
    this.records = new Map();
    this.pending = new Map();
    this.queue = [];
    this.active = 0;
    this.version = 0;
    this.savedVersion = 0;
    this.saving = Promise.resolve();
    this.ready = this.load();
  }

  supports(src) {
    return supportsImage(src, this.options);
  }

  get(src) {
    if (!this.supports(src)) return null;
    return this.records.get(cacheKey(src)) ?? null;
  }

  async load() {
    if (!this.options.cache_path || !this.options.progressive.enable) return;
    try {
      const cache = JSON.parse(await fs.readFile(this.options.cache_path, "utf8"));
      for (const [src, value] of Object.entries(cache)) {
        // An incomplete response is usable for this run, but retry its placeholder
        // next time. Retain other valid cache entries when the domain list changes.
        if (!validMetadata(value) || !value.dataURL) continue;
        try { this.records.set(cacheKey(src), value); } catch { /* Ignore malformed legacy URLs. */ }
      }
    } catch (error) {
      if (error.code !== "ENOENT") console.warn("[ImageCache] Unable to read metadata cache:", error.message);
    }
  }

  save() {
    // Serialize writes; updates arriving during a write remain dirty for the next save.
    this.saving = this.saving.then(async () => {
      await this.ready;
      if (!this.options.cache_path || this.version === this.savedVersion) return;
      const version = this.version;
      const content = JSON.stringify(Object.fromEntries(this.records), null, 2);
      const temporary = `${this.options.cache_path}.${process.pid}.tmp`;
      await fs.mkdir(path.dirname(this.options.cache_path), { recursive: true });
      await fs.writeFile(temporary, content, "utf8");
      await fs.rename(temporary, this.options.cache_path);
      this.savedVersion = version;
    }).catch((error) => console.warn("[ImageCache] Unable to save metadata cache:", error.message));
    return this.saving;
  }

  async limit(callback) {
    await new Promise((resolve) => {
      this.queue.push(resolve);
      this.runNext();
    });
    try {
      return await callback();
    } finally {
      this.active -= 1;
      this.runNext();
    }
  }

  runNext() {
    if (this.active >= this.options.concurrency || !this.queue.length) return;
    this.active += 1;
    this.queue.shift()();
  }

  async fetch(src) {
    // Metadata is optional: neither Markdown rendering nor before_generate
    // should fail because an image service or placeholder conversion failed.
    try {
      await this.ready;
      if (!this.supports(src)) return null;
      const key = cacheKey(src);
      const cached = this.records.get(key);
      if (cached) return cached;
      if (this.pending.has(key)) return await this.pending.get(key);
      const promise = this.limit(async () => {
        const [dimensions, dataURL] = await Promise.all([
          getBitifulDimension(src, this.options.request_timeout),
          getBitifulThumbhash(src, this.options.request_timeout),
        ]);
        if (!validMetadata(dimensions)) return null;
        const result = { ...dimensions, dataURL: dataURL ?? "" };
        this.records.set(key, result);
        this.version += 1;
        return result;
      }).finally(() => this.pending.delete(key));
      this.pending.set(key, promise);
      return await promise;
    } catch (error) {
      console.warn(`[ImageCache] Metadata unavailable for ${src}; using the original image:`, error instanceof Error ? error.message : String(error));
      return null;
    }
  }
}

async function getBitifulDimension(imageUrl, timeout) {
  try {
    const url = new URL(imageUrl);
    url.search = "?fmt=info";
    url.hash = "";
    const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const { ImageWidth: width, ImageHeight: height } = await response.json();
    if (typeof width === "number" && typeof height === "number") {
      return { width, height };
    }
    return null;
  } catch (error) {
    console.warn(`[Bitiful] Dimensions unavailable for ${imageUrl}; using the original image:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}

async function getBitifulThumbhash(imageUrl, timeout) {
  try {
    const url = new URL(imageUrl);
    url.search = "?fmt=thumbhash";
    url.hash = "";
    const response = await fetch(url, { signal: AbortSignal.timeout(timeout) });
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
    console.warn(`[Bitiful] Thumbhash unavailable for ${imageUrl}; continuing without a placeholder:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}
module.exports = { ImageMetadata, generateSrcset, withImageParams };
