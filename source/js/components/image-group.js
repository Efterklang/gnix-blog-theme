// rows fixes the visible row count and lets columns scroll horizontally.
// Explicit columns opts into a contained grid; rows takes precedence.
const DEFAULT_RATIO = 4 / 3;
let sheet;
const styles = `
  :host {
    display: block;
    min-width: 0;
    margin: 1.5em 0;
    container-type: inline-size;
    --image-group-gap: 0.75rem;
    --image-group-radius: 6px;
  }
  .group {
    --image-group-frame-height: var(--image-group-height, clamp(140px, calc(32vw / var(--image-group-rows, 1)), 320px));
    position: relative;
    width: var(--image-group-viewport-width, 100%);
    margin-left: calc(-1 * var(--image-group-left-inset, 0px));
    isolation: isolate;
    contain: layout paint;
  }
  .rail {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: var(--image-group-gap);
    align-items: start;
    overflow-x: auto;
    overflow-y: hidden;
    overscroll-behavior-inline: contain;
    scroll-padding-left: var(--image-group-left-inset, 0px);
    scroll-padding-right: var(--image-group-right-inset, 0px);
    scroll-snap-type: x proximity;
    padding: 0.25rem var(--image-group-right-inset, 0px) 0.65rem var(--image-group-left-inset, 0px);
    direction: ltr;
    outline: none;
    scrollbar-width: none;
  }
  .row { display: flex; flex: none; align-items: start; width: max-content; gap: var(--image-group-gap); }
  .rail::-webkit-scrollbar { display: none; }
  .rail:focus-visible { outline: 2px solid var(--blue, #89b4fa); outline-offset: -2px; }
  .item {
    position: relative;
    width: min(calc(var(--image-group-frame-height) * var(--image-group-ratio, ${DEFAULT_RATIO})), 88vw);
    height: var(--image-group-frame-height);
    flex: none;
    margin: 0;
    scroll-snap-align: start;
  }
  .frame {
    display: grid;
    place-items: center;
    box-sizing: border-box;
    min-width: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    border-radius: var(--image-group-radius);
    overflow: hidden;
    color: inherit;
    background-color: transparent;
    -webkit-tap-highlight-color: transparent;
  }
  .frame:not(:disabled) { cursor: zoom-in; }
  .frame img { display: block; width: 100%; height: 100%; min-width: 0; min-height: 0; object-fit: contain; }
  .frame:focus-visible { outline: 2px solid var(--blue, #89b4fa); outline-offset: -3px; }
  @media (forced-colors: active) { .frame { border: 1px solid CanvasText; } }
  .caption {
    position: absolute;
    inset-inline: 0;
    bottom: 0;
    box-sizing: border-box;
    max-height: 100%;
    margin: 0;
    padding: 2.25rem 0.75rem 0.55rem;
    border-radius: 0 0 var(--image-group-radius) var(--image-group-radius);
    color: #fff;
    background: linear-gradient(transparent, rgb(0 0 0 / 0.64));
    font-family: var(--font-serif, serif);
    font-style: italic;
    font-size: var(--type-caption-size, 0.875rem);
    line-height: 1.5;
    text-align: center;
    overflow: auto;
    overflow-wrap: anywhere;
    opacity: 0;
    pointer-events: none;
    transition: opacity 120ms ease;
  }
  .item:focus-within .caption { opacity: 1; transition: none; }
  .item[data-caption-dismissed] .caption { opacity: 0; pointer-events: none; }
  @media (hover: hover) and (pointer: fine) {
    .item:hover:not([data-caption-dismissed]) .caption { opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) { .caption { transition: none; } }
  @media (forced-colors: active) { .caption { color: CanvasText; background: Canvas; border: 1px solid CanvasText; } }
  :host([layout="grid"]) .group { width: 100%; margin-left: 0; contain: none; }
  :host([layout="grid"]) .rail {
    display: grid;
    grid-auto-flow: row;
    grid-auto-columns: auto;
    grid-template-columns: repeat(var(--image-group-columns, 2), minmax(0, 1fr));
    padding: 0;
    overflow: visible;
  }
  :host([layout="grid"]) .item { width: auto; min-width: 0; height: var(--image-group-grid-height, auto); aspect-ratio: 4 / 3; }
  @container (max-width: 480px) {
    .group { --image-group-frame-height: var(--image-group-mobile-height, clamp(120px, calc(52vw / var(--image-group-mobile-rows, 1)), 240px)); }
    :host([layout="grid"]) .rail { grid-template-columns: repeat(var(--image-group-mobile-columns, 1), minmax(0, 1fr)); }
  }
`;

class ImageGroup extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._images = [];
    this._items = [];
    this._updateLayout = () => { this._arrangeRows(); this._updateViewportLayout(); this._updateCaptionLayout(); };
  }

  static get observedAttributes() { return ["height", "gap", "label", "columns", "rows", "mobile-columns", "mobile-rows"]; }

  connectedCallback() { this._initialize(); }

  _initialize() {
    this._controller?.abort();
    this._controller = new AbortController();
    const images = Array.from(this.querySelectorAll("img"));
    if (images.length) this._images = images;
    if (!this._images.length) { this._waitForImages(); return; }
    this._childrenObserver?.disconnect();
    this._applyHostOptions();
    this._render();
    this._setupListeners();
    this._updateLayout();
    this.dispatchEvent(new CustomEvent("gnix:image-gallery-ready", { bubbles: true }));
  }

  disconnectedCallback() {
    this._controller?.abort();
    this._childrenObserver?.disconnect();
    this._resizeObserver?.disconnect();
    window.removeEventListener("resize", this._updateLayout);
  }

  attributeChangedCallback(name, previous, value) {
    if (previous === value || !this.isConnected) return;
    if (name === "label") this.setAttribute("aria-label", this._getLabel());
    else { this._applyHostOptions(); this._updateLayout(); }
  }

  _render() {
    if (!sheet) { sheet = new CSSStyleSheet(); sheet.replaceSync(styles); }
    this.shadowRoot.adoptedStyleSheets = [sheet];
    this.shadowRoot.replaceChildren();
    this.setAttribute("role", "region");
    this.setAttribute("aria-label", this._getLabel());
    const group = document.createElement("div");
    group.className = "group";
    const rail = document.createElement("div");
    rail.className = "rail";
    rail.setAttribute("role", "list");
    rail.tabIndex = this.getAttribute("layout") === "grid" ? -1 : 0;
    this._items = this._images.map(image => this._createItem(image));
    rail.append(...this._items);
    group.append(rail);
    this.shadowRoot.append(group);
    this._group = group;
    this._rail = rail;
    this._rowLayoutKey = null;
    this._arrangeRows();
  }

  _createItem(image) {
    const item = document.createElement("figure");
    item.className = "item";
    item.setAttribute("role", "listitem");
    const updateRatio = () => {
      const width = image.naturalWidth || Number(image.getAttribute("width"));
      const height = image.naturalHeight || Number(image.getAttribute("height"));
      item.style.setProperty("--image-group-ratio", String(width > 0 && height > 0 ? width / height : DEFAULT_RATIO));
      this._updateCaptionLayout(item);
    };
    updateRatio();
    if (!image.complete) image.addEventListener("load", updateRatio, { once: true, signal: this._controller.signal });
    item.append(this._createFrame(image));
    if (image.alt) {
      const caption = document.createElement("figcaption");
      caption.className = "caption";
      caption.textContent = image.alt;
      caption.dir = "auto";
      item.append(caption);
    }
    return item;
  }

  _setupListeners() {
    const options = { signal: this._controller.signal };
    this._rail.addEventListener("keydown", event => {
      if (this.getAttribute("layout") === "grid" || event.target !== this._rail || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return;
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const left = event.key === "Home" ? 0 : event.key === "End" ? this._rail.scrollWidth : this._rail.scrollLeft + (event.key === "ArrowLeft" ? -1 : 1) * this._rail.clientWidth * 0.8;
      this._rail.scrollTo({ left, behavior: "instant" });
    }, options);
    document.addEventListener("keydown", event => {
      if (event.key !== "Escape") return;
      for (const item of this._items) if (item.matches(":hover, :focus-within")) item.dataset.captionDismissed = "";
    }, { ...options, capture: true });
    for (const item of this._items) {
      item.addEventListener("pointerleave", () => { if (!item.matches(":focus-within")) delete item.dataset.captionDismissed; }, options);
      item.addEventListener("focusout", () => { delete item.dataset.captionDismissed; }, options);
    }
    this._resizeObserver?.disconnect();
    this._resizeObserver = new ResizeObserver(this._updateLayout);
    this._resizeObserver.observe(this);
    this._resizeObserver.observe(document.documentElement);
    this._resizeObserver.observe(this._rail);
    window.addEventListener("resize", this._updateLayout);
  }

  _updateViewportLayout() {
    if (!this._group || this.getAttribute("layout") === "grid") return;
    const bounds = this.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const values = { "--image-group-viewport-width": viewportWidth, "--image-group-left-inset": Math.max(0, bounds.left), "--image-group-right-inset": Math.max(0, viewportWidth - bounds.right) };
    for (const [property, value] of Object.entries(values)) {
      const length = `${value}px`;
      if (this._group.style.getPropertyValue(property) !== length) this._group.style.setProperty(property, length);
    }
  }

  _arrangeRows() {
    if (!this._rail || !this._items.length) return;
    const layout = this.getAttribute("layout");
    const narrow = this.getBoundingClientRect().width <= 480;
    const variable = narrow ? "--image-group-mobile-rows" : "--image-group-rows";
    const rows = Number(this.style.getPropertyValue(variable)) || 1;
    const key = `${layout}:${rows}:${this._items.length}`;
    if (key === this._rowLayoutKey) return;
    this._rowLayoutKey = key;
    const focused = this.shadowRoot.activeElement;
    if (layout === "grid") this._rail.replaceChildren(...this._items);
    else {
      // Each row is an independent flex track. Shorter photographs never
      // inherit a wider photograph's column and leave a gap before the next.
      const perRow = Math.floor(this._items.length / rows);
      const remainder = this._items.length % rows;
      const tracks = [];
      let start = 0;
      for (let index = 0; index < rows; index++) {
        const end = start + perRow + (index < remainder ? 1 : 0);
        const row = document.createElement("div");
        row.className = "row";
        row.setAttribute("role", "presentation");
        row.append(...this._items.slice(start, end));
        tracks.push(row);
        start = end;
      }
      this._rail.replaceChildren(...tracks);
    }
    if (focused?.isConnected) focused.focus({ preventScroll: true });
  }

  _updateCaptionLayout(target) {
    // Anchor the gradient to the contained photograph, including letterboxing.
    // Read every frame before writing any caption to avoid repeated layout work.
    const measurements = [];
    for (const item of target ? [target] : this._items) {
      const caption = item.querySelector(".caption");
      if (!caption) continue;
      const ratio = Number(item.style.getPropertyValue("--image-group-ratio")) || DEFAULT_RATIO;
      const width = item.clientWidth;
      const height = item.clientHeight;
      const imageWidth = Math.min(width, height * ratio);
      const imageHeight = Math.min(height, width / ratio);
      measurements.push({ caption, inset: Math.max(0, (width - imageWidth) / 2), bottom: Math.max(0, (height - imageHeight) / 2), height: imageHeight });
    }
    for (const measurement of measurements) {
      const style = measurement.caption.style;
      for (const [property, value] of [["inset-inline", measurement.inset], ["bottom", measurement.bottom], ["max-height", measurement.height]]) {
        const length = `${value}px`;
        if (style.getPropertyValue(property) !== length) style.setProperty(property, length);
      }
    }
  }

  _applyHostOptions() {
    const count = name => { const value = Number(this.getAttribute(name)); return Number.isInteger(value) && value > 0 && value <= 100 ? value : 0; };
    const layout = count("rows") || !count("columns") ? "rail" : "grid";
    if (this.getAttribute("layout") !== layout) this.setAttribute("layout", layout);
    const rows = Math.min(count("rows") || 1, this._images.length || 100);
    const mobileRows = Math.min(count("mobile-rows") || 1, this._images.length || 100);
    this.style.setProperty("--image-group-rows", String(rows));
    this.style.setProperty("--image-group-mobile-rows", String(mobileRows));
    this.style.setProperty("--image-group-columns", String(count("columns") || 2));
    this.style.setProperty("--image-group-mobile-columns", String(count("mobile-columns") || 1));
    for (const [attribute, properties] of [["height", ["--image-group-height", "--image-group-grid-height"]], ["gap", ["--image-group-gap"]]]) {
      const value = this.getAttribute(attribute);
      for (const property of properties) {
        if (value && CSS.supports(attribute, value)) this.style.setProperty(property, value);
        else this.style.removeProperty(property);
      }
    }
    if (this._rail) this._rail.tabIndex = layout === "grid" ? -1 : 0;
    for (const image of this._images) image.sizes = layout === "grid" ? `auto, (max-width: 640px) calc((100vw - 2rem) / ${count("mobile-columns") || 1}), calc(39.5rem / ${count("columns") || 2})` : "auto, (max-width: 480px) 88vw, 640px";
  }

  _waitForImages() {
    this._childrenObserver?.disconnect();
    // A connected element can precede its parsed children during innerHTML
    // insertion. Initialize once an image exists, without calling a lifecycle.
    this._childrenObserver = new MutationObserver(() => {
      if (this.isConnected && this.querySelector("img")) this._initialize();
    });
    this._childrenObserver.observe(this, { childList: true, subtree: true });
  }

  _createFrame(image) {
    const placeholder = image.closest(".img-wrapper, .frame")?.style.backgroundImage;
    const frame = document.createElement("button");
    frame.type = "button";
    frame.className = "frame";
    frame.dataset.imagePreview = "";
    // article.js enables this native button when its preview dialog is ready.
    frame.disabled = true;
    if (placeholder && placeholder !== "none" && !image.complete) {
      frame.style.backgroundImage = placeholder;
      frame.style.backgroundSize = "contain";
      frame.style.backgroundPosition = "center";
      frame.style.backgroundRepeat = "no-repeat";
    }
    for (const property of ["width", "height", "max-width", "aspect-ratio", "object-fit", "visibility"]) image.style.removeProperty(property);
    for (const attribute of ["tabindex", "role", "aria-label", "aria-haspopup"]) image.removeAttribute(attribute);
    image.loading = "lazy";
    image.decoding = "async";
    image.draggable = false;
    frame.append(image);
    return frame;
  }

  _getLabel() { return this.getAttribute("label") || ((document.documentElement.lang || "").startsWith("zh") ? "图片组" : "Image group"); }
}

if (!customElements.get("image-group")) customElements.define("image-group", ImageGroup);

export { ImageGroup };
