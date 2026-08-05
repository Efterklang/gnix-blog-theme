/**
 * Image Group Custom Element
 * A horizontal contact sheet for mixed-ratio images.
 *
 * Usage:
 * <image-group height="280px">
 *   ![alt text](image-url)
 *   ![alt text](image-url)
 * </image-group>
 *
 * Attributes:
 * - height: Frame height as a CSS length (default: responsive clamp)
 * - gap: Space between images as a CSS length
 * - wide: Expand beyond the article column, centered in the viewport
 * - label: Accessible region label
 *
 * Images are never cropped. The group reserves a stable vertical size from
 * the start, then each item uses the image's natural ratio when available.
 */

let _sheet;
let _documentStylesInjected = false;

const DEFAULT_RATIO = 4 / 3;
const DEFAULT_HEIGHT = "clamp(160px, 32vw, 320px)";
const CHEVRON_LEFT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>`;
const CHEVRON_RIGHT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`;

function isZhLocale() {
  return (document.documentElement.lang || "").toLowerCase().startsWith("zh");
}

function getUiText(key) {
  const zh = isZhLocale();
  const messages = {
    nextImages: zh ? "下一组图片" : "Next images",
    previousImages: zh ? "上一组图片" : "Previous images",
  };
  return messages[key] || key;
}

const STYLES = `
  :host {
    display: block;
    margin: 1.5em 0;
    --image-group-height: ${DEFAULT_HEIGHT};
    --image-group-gap: 0.75rem;
    --image-group-radius: min(var(--radius, 12px), 12px);
    --image-group-frame-bg: color-mix(in oklab, var(--surface0, #313244) 62%, transparent);
    --image-group-frame-border: color-mix(in oklab, var(--surface1, #45475a) 72%, transparent);
  }

  .group {
    position: relative;
    isolation: isolate;
    contain: layout paint;
  }

  .rail {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: max-content;
    gap: var(--image-group-gap);
    align-items: stretch;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-inline: contain;
    scroll-padding-inline: 0.25rem;
    scroll-snap-type: x proximity;
    padding: 0.25rem 0.25rem 0.65rem;
    outline: none;
    scrollbar-width: thin;
    scrollbar-color: var(--overlay0, rgba(127, 127, 127, 0.45)) transparent;
  }

  .rail::-webkit-scrollbar {
    height: 8px;
  }

  .rail::-webkit-scrollbar-track {
    background: transparent;
  }

  .rail::-webkit-scrollbar-thumb {
    background: var(--overlay0, rgba(127, 127, 127, 0.45));
    border-radius: 999px;
  }

  .rail:focus-visible {
    outline: 2px solid var(--blue, #89b4fa);
    outline-offset: 2px;
  }

  .item {
    position: relative;
    width: clamp(
      calc(var(--image-group-height) * 0.58),
      calc(var(--image-group-height) * var(--image-group-ratio, ${DEFAULT_RATIO})),
      min(88vw, calc(var(--image-group-height) * 2.35))
    );
    height: var(--image-group-height);
    margin: 0;
    scroll-snap-align: center;
  }

  .frame {
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    overflow: hidden;
    border: 1px solid var(--image-group-frame-border);
    border-radius: var(--image-group-radius);
    background: var(--image-group-frame-bg);
    box-sizing: border-box;
  }

  .frame img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .caption {
    position: absolute;
    right: 1px;
    bottom: 1px;
    left: 1px;
    padding: 2.25rem 0.75rem 0.55rem;
    border-radius: 0 0 calc(var(--image-group-radius) - 1px) calc(var(--image-group-radius) - 1px);
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.64));
    color: #fff;
    font-family: var(--font-serif, serif);
    font-size: 0.82rem;
    font-style: italic;
    line-height: 1.35;
    text-align: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.18s ease-out;
  }

  .item:hover .caption,
  .item:focus-visible .caption {
    opacity: 1;
  }

  .nav {
    position: absolute;
    top: calc(var(--image-group-height) / 2 + 0.25rem);
    z-index: 2;
    display: grid;
    place-items: center;
    width: 2.4rem;
    height: 2.4rem;
    padding: 0;
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.3);
    color: #fff;
    cursor: pointer;
    opacity: 0;
    transform: translateY(-50%);
    transition:
      background 0.18s ease-out,
      opacity 0.18s ease-out,
      transform 0.18s ease-out;
  }

  .nav svg {
    width: 1.4rem;
    height: 1.4rem;
  }

  .group.is-scrollable:hover .nav,
  .group.is-scrollable:focus-within .nav {
    opacity: 1;
  }

  .nav:hover {
    background: rgba(0, 0, 0, 0.58);
  }

  .nav:focus-visible {
    opacity: 1;
    outline: 2px solid #fff;
    outline-offset: 2px;
  }

  .nav:active {
    transform: translateY(-50%) scale(0.94);
  }

  .group:not(.is-scrollable) .nav {
    display: none;
  }

  .prev { left: 0.6rem; }
  .next { right: 0.6rem; }

  @media (min-width: 900px) {
    :host([wide]) {
      --image-group-wide-size: min(var(--image-group-wide-max-width, 72rem), calc(100vw - 2rem));
      width: var(--image-group-wide-size);
      max-width: var(--image-group-wide-size);
      margin-inline: calc((100% - var(--image-group-wide-size)) / 2);
    }
  }

  @media (max-width: 640px) {
    :host {
      --image-group-height: var(--image-group-mobile-height, clamp(140px, 58vw, 240px));
    }

    .nav {
      width: 2.1rem;
      height: 2.1rem;
      opacity: 1;
    }
  }
`;

const DOCUMENT_STYLES = `
  @media (min-width: 900px) {
    .content:has(> image-group[wide]) {
      overflow: visible;
    }
  }
`;

class ImageGroup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._images = [];
    this._items = [];
    this._rail = null;
    this._group = null;
    this._resizeObserver = null;
    this._updateScrollable = () => this._setScrollableState();
  }

  connectedCallback() {
    this._images = this._collectImages();
    if (!this._images.length) return;

    this._injectDocumentStyles();
    this._render();
    this._setupListeners();
    this._setScrollableState();
  }

  disconnectedCallback() {
    this._resizeObserver?.disconnect();
  }

  static get observedAttributes() {
    return ["height", "gap", "label", "wide"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "height" || name === "gap") this._applyHostOptions();
    if (name === "label" && this._group) {
      this._group.setAttribute("aria-label", this._getLabel());
    }
    if (name === "wide") this._setScrollableState();
  }

  _collectImages() {
    return Array.from(this.querySelectorAll("img")).map((img) => ({
      src: img.currentSrc || img.src || img.getAttribute("src") || "",
      alt: img.alt || "",
      srcset: img.getAttribute("srcset") || "",
      sizes: img.getAttribute("sizes") || "",
      width: this._toNumber(img.getAttribute("width")) || img.naturalWidth || 0,
      height: this._toNumber(img.getAttribute("height")) || img.naturalHeight || 0,
    }));
  }

  _render() {
    if (!_sheet) {
      _sheet = new CSSStyleSheet();
      _sheet.replaceSync(STYLES);
    }
    this.shadowRoot.adoptedStyleSheets = [_sheet];
    this.shadowRoot.replaceChildren();
    this._applyHostOptions();

    const group = document.createElement("div");
    group.className = "group";
    group.setAttribute("role", "region");
    group.setAttribute("aria-label", this._getLabel());

    const rail = document.createElement("div");
    rail.className = "rail";
    rail.setAttribute("role", "list");
    rail.tabIndex = 0;

    this._items = this._images.map((image, index) => this._createItem(image, index));
    rail.append(...this._items);

    group.append(this._createNavButton("prev"), rail, this._createNavButton("next"));

    const slot = document.createElement("slot");
    slot.style.display = "none";

    this.shadowRoot.append(group, slot);
    this._group = group;
    this._rail = rail;
  }

  _createItem(image, index) {
    const item = document.createElement("figure");
    item.className = "item";
    item.setAttribute("role", "listitem");
    item.tabIndex = 0;

    const ratio = this._ratioFromDimensions(image.width, image.height);
    item.style.setProperty("--image-group-ratio", String(ratio || DEFAULT_RATIO));

    const frame = document.createElement("div");
    frame.className = "frame";

    const img = document.createElement("img");
    img.src = image.src;
    img.alt = image.alt;
    img.loading = index === 0 ? "eager" : "lazy";
    img.decoding = "async";
    if (image.srcset) img.srcset = image.srcset;
    if (image.sizes) img.sizes = image.sizes;

    const applyLoadedRatio = () => {
      const loadedRatio = this._ratioFromDimensions(img.naturalWidth, img.naturalHeight);
      if (loadedRatio) {
        item.style.setProperty("--image-group-ratio", String(loadedRatio));
        this._setScrollableState();
      }
    };

    if (img.complete && img.naturalWidth) {
      applyLoadedRatio();
    } else {
      img.addEventListener("load", applyLoadedRatio, { once: true });
    }

    frame.appendChild(img);
    item.appendChild(frame);

    if (image.alt) {
      const caption = document.createElement("figcaption");
      caption.className = "caption";
      caption.textContent = image.alt;
      item.appendChild(caption);
    }

    return item;
  }

  _createNavButton(direction) {
    const button = document.createElement("button");
    button.className = `nav ${direction}`;
    button.type = "button";
    button.setAttribute("aria-label", direction === "prev" ? getUiText("previousImages") : getUiText("nextImages"));
    button.innerHTML = direction === "prev" ? CHEVRON_LEFT : CHEVRON_RIGHT;
    button.addEventListener("click", () => this._scroll(direction === "prev" ? -1 : 1));
    return button;
  }

  _injectDocumentStyles() {
    if (_documentStylesInjected) return;
    const style = document.createElement("style");
    style.textContent = DOCUMENT_STYLES;
    document.head.appendChild(style);
    _documentStylesInjected = true;
  }

  _setupListeners() {
    this._resizeObserver?.disconnect();
    this._resizeObserver = new ResizeObserver(this._updateScrollable);
    this._resizeObserver.observe(this);
    if (this._rail) this._resizeObserver.observe(this._rail);
  }

  _scroll(direction) {
    if (!this._rail) return;
    this._rail.scrollBy({
      left: direction * Math.max(this._rail.clientWidth * 0.82, 180),
      behavior: "smooth",
    });
  }

  _setScrollableState() {
    if (!this._group || !this._rail) return;
    const isScrollable = this._rail.scrollWidth > this._rail.clientWidth + 1;
    this._group.classList.toggle("is-scrollable", isScrollable);
  }

  _applyHostOptions() {
    const height = this.getAttribute("height");
    const gap = this.getAttribute("gap");
    if (height) this.style.setProperty("--image-group-height", height);
    else this.style.removeProperty("--image-group-height");
    if (gap) this.style.setProperty("--image-group-gap", gap);
    else this.style.removeProperty("--image-group-gap");
  }

  _getLabel() {
    return this.getAttribute("label") || "Image group";
  }

  _ratioFromDimensions(width, height) {
    return width > 0 && height > 0 ? width / height : 0;
  }

  _toNumber(value) {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? number : 0;
  }
}

if (!customElements.get("image-group")) {
  customElements.define("image-group", ImageGroup);
}

export { ImageGroup };
