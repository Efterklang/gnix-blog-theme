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
 * - wide: Legacy attribute; all groups now extend to the viewport edges
 * - label: Accessible region label
 *
 * Images are never cropped. The group reserves a stable vertical size from
 * the start, then each item uses the image's natural ratio when available.
 * The first image starts at the text edge; scrolling can use the full viewport.
 */

let _sheet;
let _documentStylesInjected = false;

const DEFAULT_RATIO = 4 / 3;
const DEFAULT_HEIGHT = "clamp(160px, 32vw, 320px)";
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
    width: var(--image-group-viewport-width, 100%);
    margin-left: calc(-1 * var(--image-group-left-inset, 0px));
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
    scroll-padding-left: var(--image-group-left-inset, 0px);
    scroll-padding-right: var(--image-group-right-inset, 0px);
    scroll-snap-type: x proximity;
    padding: 0.25rem var(--image-group-right-inset, 0px) 0.65rem var(--image-group-left-inset, 0px);
    outline: none;
    scrollbar-width: none;
  }

  .rail::-webkit-scrollbar {
    display: none;
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
    scroll-snap-align: start;
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

  @media (max-width: 640px) {
    :host {
      --image-group-height: var(--image-group-mobile-height, clamp(140px, 58vw, 240px));
      --image-group-radius: 0px;
      --image-group-frame-bg: transparent;
    }

    .frame { border: 0; }

    .caption {
      right: 0;
      bottom: 0;
      left: 0;
      border-radius: 0;
    }
  }
`;

const DOCUMENT_STYLES = `
  .content:has(image-group) {
    overflow: visible;
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
    this._updateLayout = () => this._updateViewportLayout();
  }

  connectedCallback() {
    this._images = this._collectImages();
    if (!this._images.length) return;

    this._injectDocumentStyles();
    this._render();
    this._updateViewportLayout();
    this._setupListeners();
  }

  disconnectedCallback() {
    this._resizeObserver?.disconnect();
    window.removeEventListener("resize", this._updateLayout);
  }

  static get observedAttributes() {
    return ["height", "gap", "label"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    if (name === "height" || name === "gap") this._applyHostOptions();
    if (name === "label" && this._group) {
      this._group.setAttribute("aria-label", this._getLabel());
    }
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

    group.append(rail);

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

  _injectDocumentStyles() {
    if (_documentStylesInjected) return;
    const style = document.createElement("style");
    style.textContent = DOCUMENT_STYLES;
    document.head.appendChild(style);
    _documentStylesInjected = true;
  }

  _setupListeners() {
    this._resizeObserver?.disconnect();
    this._resizeObserver = new ResizeObserver(this._updateLayout);
    this._resizeObserver.observe(this);
    this._resizeObserver.observe(document.documentElement);
    if (this._rail) this._resizeObserver.observe(this._rail);
    window.addEventListener("resize", this._updateLayout);
  }

  _updateViewportLayout() {
    if (!this._group) return;
    // Keep the host in the text column as a stable measurement anchor.
    // Only its inner scroller breaks out, excluding the browser scrollbar.
    const bounds = this.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    this._group.style.setProperty("--image-group-viewport-width", `${viewportWidth}px`);
    this._group.style.setProperty("--image-group-left-inset", `${Math.max(0, bounds.left)}px`);
    this._group.style.setProperty("--image-group-right-inset", `${Math.max(0, viewportWidth - bounds.right)}px`);
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
