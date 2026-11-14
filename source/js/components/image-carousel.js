/**
 * Image Carousel Custom Element
 * A responsive image carousel with fade transitions and autoplay
 *
 * Usage:
 * <image-carousel autoplay interval="4000">
 *   ![alt text](image-url)
 *   ![alt text](image-url)
 * </image-carousel>
 *
 * Attributes:
 * - autoplay: Enable automatic slide advancement
 * - interval: Autoplay interval in ms (default: 3000)
 * - ratio: Aspect ratio as CSS value (default: derived from first image,
 *   falls back to 3/2 while loading or if dimensions are unknown)
 *
 * The carousel never grows taller than 80% of the viewport height; instead
 * of cropping, its width is capped (preserving the aspect ratio) so tall
 * images shrink and center. Override via the `--carousel-max-height` CSS var.
 *
 * Layout (Swiss): a square-cornered image; under it a strip of thin segments,
 * one per slide (the current one fills over the autoplay interval), then one
 * caption line — the image's alt text on the left, prev · 01 / 05 · next on
 * the right. Clicking the left / right half of the image steps back / forward.
 */

// Shared stylesheet — parsed once, reused across all carousel instances
let _sheet;

const DEFAULT_INTERVAL = 3000;
const FALLBACK_RATIO = "3 / 2";
const SWIPE_THRESHOLD_PX = 40;
const MAX_HEIGHT = "80vh";

function isZhLocale() {
  return (document.documentElement.lang || "").toLowerCase().startsWith("zh");
}

function getUiText(key, value) {
  const zh = isZhLocale();
  const messages = {
    imageCarousel: zh ? "图片轮播" : "Image carousel",
    slide: zh ? `第 ${value} 张` : `Slide ${value}`,
    slideNavigation: zh ? "幻灯片导航" : "Slide navigation",
    previous: zh ? "上一张" : "Previous slide",
    next: zh ? "下一张" : "Next slide",
  };
  return messages[key] || key;
}

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value == null ? "" : String(value);
  return span.innerHTML;
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

const ARROW_LEFT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>';
const ARROW_RIGHT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';

const pad2 = (n) => String(n).padStart(2, "0");

const STYLES = `
  :host {
    display: block;
    margin: 1.5em 0;
  }

  .carousel {
    max-width: var(--carousel-max-width, none);
    margin-inline: auto;
    outline: none;
  }

  .carousel:focus-visible .stage {
    outline: var(--focus-ring, 1px solid currentColor);
    outline-offset: 3px;
  }

  .stage {
    position: relative;
    overflow: hidden;
    background: var(--hover-fill, rgb(127 127 127 / 0.08));
    contain: content;
  }

  .slides {
    position: relative;
    width: 100%;
    aspect-ratio: var(--carousel-ratio, 3 / 2);
  }

  .slide {
    position: absolute;
    inset: 0;
    margin: 0;
    opacity: 0;
    transition: opacity 0.5s cubic-bezier(0.25, 1, 0.5, 1);
    pointer-events: none;
  }

  .slide.active {
    opacity: 1;
    pointer-events: auto;
  }

  .carousel[data-navigation-input="keyboard"] .slide {
    transition: none;
  }

  .slide img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* 图片左右两半是隐形的翻页区：左半上一张、右半下一张 */
  .zone {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 1;
    width: 50%;
    padding: 0;
    border: 0;
    background: none;
    -webkit-tap-highlight-color: transparent;
  }

  .zone--prev {
    left: 0;
    cursor: w-resize;
  }

  .zone--next {
    right: 0;
    cursor: e-resize;
  }

  /* 进度条：每张一段细线；当前段墨色，自动播放时在一个间隔里从左填满 */
  .segments {
    display: flex;
    gap: 4px;
    margin-top: 0.75rem;
  }

  .segment {
    position: relative;
    flex: 1 1 0;
    height: 14px;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
  }

  .segment::before,
  .segment::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 1px;
  }

  .segment::before {
    background: color-mix(in oklab, var(--sub-text-color, gray) 30%, transparent);
    transition: background-color 160ms ease;
  }

  .segment:hover::before {
    background: var(--sub-text-color, gray);
  }

  .segment::after {
    background: var(--title-text-color, currentColor);
    transform: scaleX(0);
    transform-origin: left center;
  }

  .segment.active::after {
    transform: scaleX(1);
  }

  .carousel[data-playing] .segment.active::after {
    animation: fill var(--carousel-interval, 3000ms) linear both;
  }

  @keyframes fill {
    from {
      transform: scaleX(0);
    }
  }

  .segment:focus-visible {
    outline: var(--focus-ring, 1px solid currentColor);
    outline-offset: 2px;
  }

  /* 说明行：左边图注（图片的 alt），右边 上一张 · 01 / 05 · 下一张 */
  .meta {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 0.5rem;
    color: var(--sub-text-color, gray);
    font-family: var(--font-sans-serif, sans-serif);
    font-size: var(--type-caption-size);
    line-height: 1.5;
  }

  .meta:only-child,
  .stage + .meta {
    margin-top: 0.75rem;
  }

  .caption {
    min-width: 0;
    margin: 0;
    text-wrap: pretty;
  }

  .controls {
    display: flex;
    flex: none;
    align-items: center;
    gap: 0.25rem;
    margin-left: auto;
    font-family: var(--font-mono, monospace);
    font-size: var(--type-label-size);
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.04em;
  }

  .counter {
    min-width: 4.5ch;
    color: var(--title-text-color, currentColor);
    text-align: center;
  }

  .counter span {
    color: var(--sub-text-color, gray);
  }

  .step {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    border: 0;
    background: none;
    color: var(--sub-text-color, gray);
    cursor: pointer;
    transition: color 120ms ease;
  }

  .step:hover {
    color: var(--title-text-color, currentColor);
  }

  .step:focus-visible {
    outline: var(--focus-ring, 1px solid currentColor);
    outline-offset: -2px;
  }

  .step svg {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.75;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  @media (prefers-reduced-motion: reduce) {
    .slide {
      transition: none;
    }

    .carousel[data-playing] .segment.active::after {
      animation: none;
    }
  }
`;

class ImageCarousel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._currentIndex = 0;
    this._timer = null;
    this._images = [];
    this._slides = [];
    this._dots = [];
    this._touchStartX = 0;
    this._observer = null;
    this._isVisible = false;
    this._isHovered = false;
    this._isFocused = false;
    this._isInteracting = false;
    this._handleVisibility = () => this._syncAutoplay();
  }

  connectedCallback() {
    this._isVisible = false;
    this._isHovered = false;
    this._isFocused = false;
    this._isInteracting = false;
    this._touchStartX = 0;
    this._images = this._collectImages();
    if (!this._images.length) return;

    this._resolveRatio();
    this._render();

    if (this._images.length > 1) {
      this._setupListeners();
      this._observeVisibility();
    }
    this._syncAutoplay();
  }

  disconnectedCallback() {
    this._isVisible = false;
    this._syncAutoplay();
    this._observer?.disconnect();
    this._observer = null;
    document.removeEventListener("visibilitychange", this._handleVisibility);
  }

  static get observedAttributes() {
    return ["autoplay", "interval", "ratio"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this._images.length) return;
    if (name === "autoplay") {
      this._syncAutoplay();
    } else if (name === "interval") {
      this._syncAutoplay(true);
    } else if (name === "ratio") {
      this._resolveRatio();
    }
  }

  // ─── content & layout ──────────────────────────────────────────────

  _collectImages() {
    return Array.from(this.querySelectorAll("img")).map((img) => ({
      src: img.src || img.getAttribute("src"),
      alt: img.alt || "",
      srcset: img.getAttribute("srcset") || "",
    }));
  }

  /**
   * Resolve the carousel aspect ratio.
   * Priority: explicit `ratio` attribute → first image's natural
   * dimensions → fallback constant. The first image is probed via a
   * detached Image() if the light-DOM <img> hasn't loaded yet.
   */
  _resolveRatio() {
    const explicit = this.getAttribute("ratio");
    if (explicit) {
      this._applyRatio(explicit);
      return;
    }

    // Set fallback first so the stage has dimensions while we wait.
    this._applyRatio(FALLBACK_RATIO);

    const first = this._images[0];
    if (!first?.src) return;

    const apply = (w, h) => {
      if (w && h) this._applyRatio(`${w} / ${h}`);
    };

    // Reuse the light-DOM <img> if it's already decoded — avoids a
    // second network request when the browser cached the image.
    const lightImg = this.querySelector("img");
    if (lightImg?.complete && lightImg.naturalWidth) {
      apply(lightImg.naturalWidth, lightImg.naturalHeight);
      return;
    }

    const probe = new Image();
    probe.onload = () => apply(probe.naturalWidth, probe.naturalHeight);
    if (first.srcset) probe.srcset = first.srcset;
    probe.src = first.src;
  }

  /**
   * Apply the aspect ratio and derive a max-width that keeps the stage from
   * growing taller than --carousel-max-height (default 80vh). Capping width
   * (max-width = ratio × max-height) preserves the aspect ratio, so tall
   * images shrink and center instead of being cropped or letterboxed.
   */
  _applyRatio(ratio) {
    this.style.setProperty("--carousel-ratio", ratio);
    const n = this._ratioToNumber(ratio);
    if (n) {
      this.style.setProperty("--carousel-max-width", `calc(${n} * var(--carousel-max-height, ${MAX_HEIGHT}))`);
    }
  }

  /** Parse a CSS ratio ("16 / 9" or "1.78") into a numeric width ÷ height. */
  _ratioToNumber(ratio) {
    const [w, h] = String(ratio)
      .split("/")
      .map((v) => parseFloat(v));
    if (h) return w / h;
    return w || 0;
  }

  _render() {
    if (!_sheet) {
      _sheet = new CSSStyleSheet();
      _sheet.replaceSync(STYLES);
    }
    this.shadowRoot.adoptedStyleSheets = [_sheet];

    const multiSlide = this._images.length > 1;

    const total = this._images.length;

    const slidesHTML = this._images
      .map((img, i) => {
        const label = img.alt || getUiText("slide", i + 1);
        return `
      <figure class="slide${i === 0 ? " active" : ""}" role="tabpanel" aria-label="${escapeAttribute(label)}">
        <img src="${escapeAttribute(img.src)}"${img.srcset ? ` srcset="${escapeAttribute(img.srcset)}"` : ""} alt="${escapeAttribute(img.alt)}" loading="${i === 0 ? "eager" : "lazy"}" decoding="async">
      </figure>
    `;
      })
      .join("");

    const zonesHTML = multiSlide
      ? `<button class="zone zone--prev" type="button" tabindex="-1" aria-hidden="true" data-step="prev"></button>
         <button class="zone zone--next" type="button" tabindex="-1" aria-hidden="true" data-step="next"></button>`
      : "";

    const segmentsHTML = multiSlide
      ? `<div class="segments" role="tablist" aria-label="${getUiText("slideNavigation")}">
          ${this._images
            .map(
              (_img, i) =>
                `<button class="segment${i === 0 ? " active" : ""}" type="button" data-index="${i}" role="tab" aria-label="${getUiText("slide", i + 1)}" aria-selected="${i === 0}"></button>`,
            )
            .join("")}
        </div>`
      : "";

    const controlsHTML = multiSlide
      ? `<div class="controls">
          <button class="step" type="button" data-step="prev" aria-label="${getUiText("previous")}">${ARROW_LEFT}</button>
          <span class="counter" aria-live="polite"><b class="counter-current" style="font-weight:inherit">01</b><span> / ${pad2(total)}</span></span>
          <button class="step" type="button" data-step="next" aria-label="${getUiText("next")}">${ARROW_RIGHT}</button>
        </div>`
      : "";

    const firstAlt = this._images[0].alt;
    const metaHTML = firstAlt || multiSlide ? `<div class="meta"><p class="caption">${escapeHtml(firstAlt)}</p>${controlsHTML}</div>` : "";

    this.shadowRoot.innerHTML = `
      <div class="carousel" role="region" aria-roledescription="carousel" aria-label="${getUiText("imageCarousel")}" tabindex="0">
        <div class="stage">
          <div class="slides">${slidesHTML}</div>
          ${zonesHTML}
        </div>
        ${segmentsHTML}
        ${metaHTML}
      </div>
      <slot style="display:none"></slot>
    `;

    this._slides = Array.from(this.shadowRoot.querySelectorAll(".slide"));
    this._dots = Array.from(this.shadowRoot.querySelectorAll(".segment"));
    this._caption = this.shadowRoot.querySelector(".caption");
    this._counter = this.shadowRoot.querySelector(".counter-current");
  }

  // ─── navigation ────────────────────────────────────────────────────

  _next(input = "pointer") {
    this._goTo((this._currentIndex + 1) % this._images.length, input);
  }

  _prev(input = "pointer") {
    const n = this._images.length;
    this._goTo((this._currentIndex - 1 + n) % n, input);
  }

  _goTo(index, input = "pointer") {
    this.shadowRoot.querySelector(".carousel").dataset.navigationInput = input;
    const prev = this._currentIndex;
    if (prev === index) return;
    this._currentIndex = index;
    this._toggleSlide(prev, false);
    this._toggleSlide(index, true);
    if (this._caption) this._caption.textContent = this._images[index].alt || "";
    if (this._counter) this._counter.textContent = pad2(index + 1);
  }

  _toggleSlide(i, active) {
    this._slides[i]?.classList.toggle("active", active);
    const dot = this._dots[i];
    if (dot) {
      dot.classList.toggle("active", active);
      dot.setAttribute("aria-selected", String(active));
    }
  }

  /** User triggered a navigation — restart the autoplay clock so the
   *  next auto-advance doesn't fire immediately after their action. */
  _userNav(direction, input = "pointer") {
    direction === "next" ? this._next(input) : this._prev(input);
    this._syncAutoplay(true);
  }

  // ─── autoplay ──────────────────────────────────────────────────────

  _canAutoplay() {
    return this.isConnected && this._isVisible && !document.hidden && !this._isHovered && !this._isFocused && !this._isInteracting && this.hasAttribute("autoplay") && this._images.length > 1;
  }

  _syncAutoplay(restart = false) {
    if (!this._canAutoplay()) {
      this._stopAutoplay();
      return;
    }
    if (restart || this._timer === null) this._startAutoplay();
  }

  _startAutoplay() {
    this._stopAutoplay();
    if (!this._canAutoplay()) return;
    const interval = parseInt(this.getAttribute("interval") || "", 10) || DEFAULT_INTERVAL;
    this._setPlaying(true, interval);
    this._timer = setInterval(() => {
      if (this._canAutoplay()) this._next();
    }, interval);
  }

  _stopAutoplay() {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._setPlaying(false);
  }

  /** 进度条：播放时当前段在一个间隔里填满；重新计时时让填充动画从头开始 */
  _setPlaying(playing, interval) {
    const carousel = this.shadowRoot?.querySelector(".carousel");
    if (!carousel) return;
    if (!playing) {
      delete carousel.dataset.playing;
      return;
    }
    carousel.style.setProperty("--carousel-interval", `${interval}ms`);
    delete carousel.dataset.playing;
    void carousel.offsetWidth;
    carousel.dataset.playing = "";
  }

  // ─── listeners ─────────────────────────────────────────────────────

  _setupListeners() {
    const root = this.shadowRoot;
    const carousel = root.querySelector(".carousel");

    root.querySelector(".segments")?.addEventListener("click", (e) => {
      const segment = e.target.closest(".segment");
      if (!segment) return;
      this._goTo(parseInt(segment.dataset.index, 10), e.detail === 0 ? "keyboard" : "pointer");
      this._syncAutoplay(true);
    });

    // 上一张 / 下一张：说明行里的两枚箭头，与图片左右两半的翻页区
    carousel.addEventListener("click", (e) => {
      const step = e.target.closest("[data-step]");
      if (!step) return;
      this._userNav(step.dataset.step, e.detail === 0 ? "keyboard" : "pointer");
    });

    carousel.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      this._isHovered = true;
      this._syncAutoplay();
    });
    carousel.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch") return;
      this._isHovered = false;
      this._syncAutoplay();
    });
    carousel.addEventListener("focusin", () => {
      this._isFocused = true;
      this._syncAutoplay();
    });
    carousel.addEventListener("focusout", () => {
      queueMicrotask(() => {
        if (!carousel.isConnected) return;
        this._isFocused = carousel.matches(":focus-within");
        this._syncAutoplay();
      });
    });

    // Keyboard navigation
    carousel.addEventListener("keydown", (e) => {
      if (e.defaultPrevented || e.isComposing || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      this._userNav(e.key === "ArrowLeft" ? "prev" : "next", "keyboard");
    });

    // Touch / swipe
    carousel.addEventListener(
      "touchstart",
      (event) => {
        this._touchStartX = event.touches[0].clientX;
        this._isInteracting = true;
        this._syncAutoplay();
      },
      { passive: true },
    );

    carousel.addEventListener(
      "touchend",
      (event) => {
        const deltaX = event.changedTouches[0].clientX - this._touchStartX;
        if (Math.abs(deltaX) > SWIPE_THRESHOLD_PX) {
          this._userNav(deltaX < 0 ? "next" : "prev");
        }
        this._isInteracting = Array.from(event.touches).some((touch) => carousel.contains(touch.target));
        this._syncAutoplay(true);
      },
      { passive: true },
    );
    carousel.addEventListener("touchcancel", (event) => {
      this._isInteracting = Array.from(event.touches).some((touch) => carousel.contains(touch.target));
      this._syncAutoplay(true);
    });
  }

  _observeVisibility() {
    const observer = new IntersectionObserver(([entry]) => {
      if (this._observer !== observer || !this.isConnected) return;
      this._isVisible = entry.isIntersecting;
      this._syncAutoplay();
    });
    this._observer = observer;
    observer.observe(this);
    document.addEventListener("visibilitychange", this._handleVisibility);
  }
}

customElements.define("image-carousel", ImageCarousel);

export { ImageCarousel };
