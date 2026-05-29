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
 */

// Shared stylesheet — parsed once, reused across all carousel instances
let _sheet;

const DEFAULT_INTERVAL = 3000;
const FALLBACK_RATIO = "3 / 2";
const SWIPE_THRESHOLD_PX = 40;
const MAX_HEIGHT = "80vh";

const STYLES = `
  :host {
    display: block;
    margin: 1.5em 0;
  }

  .carousel {
    outline: none;
  }

  .carousel:focus-visible {
    outline: 2px solid var(--blue, #89b4fa);
    outline-offset: 2px;
  }

  .stage {
    position: relative;
    max-width: var(--carousel-max-width, none);
    margin-inline: auto;
    border-radius: var(--radius, 12px);
    overflow: hidden;
    background: var(--crust, #11111b);
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
    opacity: 0;
    transition: opacity 0.7s cubic-bezier(0.25, 1, 0.5, 1);
    pointer-events: none;
  }

  .slide.active {
    opacity: 1;
    pointer-events: auto;
  }

  .slide figure {
    margin: 0;
    width: 100%;
    height: 100%;
  }

  .slide img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .slide figcaption {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 2rem 1.25rem 0.875rem;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.55));
    color: #fff;
    font-size: 0.875rem;
    font-style: italic;
    font-family: var(--font-serif, serif);
    text-align: center;
    pointer-events: none;
  }

  .nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(0, 0, 0, 0.28);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    color: white;
    border: none;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: background 0.2s ease-out, opacity 0.2s ease-out;
    z-index: 2;
    padding: 0;
  }

  .nav svg {
    width: 1.5rem;
    height: 1.5rem;
  }

  .carousel:hover .nav,
  .carousel:focus-within .nav {
    opacity: 1;
  }

  .nav:hover {
    background: rgba(0, 0, 0, 0.55);
  }

  .nav:focus-visible {
    opacity: 1;
    outline: 2px solid #fff;
    outline-offset: 2px;
  }

  .nav:active {
    transform: translateY(-50%) scale(0.92);
  }

  .prev { left: 0.75rem; }
  .next { right: 0.75rem; }

  .dots {
    display: flex;
    justify-content: center;
    gap: 6px;
    padding: 0.5rem 0 0;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: none;
    background: var(--overlay0, rgba(127, 127, 127, 0.45));
    cursor: pointer;
    padding: 0;
    transition: background 0.2s ease-out, transform 0.2s ease-out;
  }

  .dot:hover {
    background: var(--overlay1);
  }

  .dot:focus-visible {
    outline: 2px solid var(--blue, #89b4fa);
    outline-offset: 2px;
  }

  .dot.active {
    background: var(--text);
    transform: scale(1.25);
  }

  @media (prefers-reduced-motion: reduce) {
    .slide { transition: none; }
    .nav, .dot { transition: none; }
  }
`;

const CHEVRON_LEFT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>`;
const CHEVRON_RIGHT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>`;

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
    this._isVisible = true;
    this._handleVisibility = () => {
      if (document.hidden) this._stopAutoplay();
      else if (this._isVisible) this._maybeStartAutoplay();
    };
  }

  connectedCallback() {
    this._images = this._collectImages();
    if (!this._images.length) return;

    this._resolveRatio();
    this._render();

    if (this._images.length > 1) {
      this._setupListeners();
      this._observeVisibility();
      this._maybeStartAutoplay();
    }
  }

  disconnectedCallback() {
    this._stopAutoplay();
    this._observer?.disconnect();
    document.removeEventListener("visibilitychange", this._handleVisibility);
  }

  static get observedAttributes() {
    return ["autoplay", "interval", "ratio"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this._images.length) return;
    if (name === "autoplay") {
      newValue !== null ? this._startAutoplay() : this._stopAutoplay();
    } else if (name === "interval" && this._timer) {
      this._startAutoplay();
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
      this.style.setProperty(
        "--carousel-max-width",
        `calc(${n} * var(--carousel-max-height, ${MAX_HEIGHT}))`,
      );
    }
  }

  /** Parse a CSS ratio ("16 / 9" or "1.78") into a numeric width ÷ height. */
  _ratioToNumber(ratio) {
    const [w, h] = String(ratio).split("/").map((v) => parseFloat(v));
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

    const slidesHTML = this._images
      .map(
        (img, i) => `
      <div class="slide${i === 0 ? " active" : ""}" role="tabpanel" aria-label="${img.alt || `Slide ${i + 1}`}">
        <figure>
          <img src="${img.src}"${img.srcset ? ` srcset="${img.srcset}"` : ""} alt="${img.alt}" loading="${i === 0 ? "eager" : "lazy"}">
          ${img.alt ? `<figcaption>${img.alt}</figcaption>` : ""}
        </figure>
      </div>
    `,
      )
      .join("");

    const navHTML = multiSlide
      ? `<button class="nav prev" aria-label="Previous slide">${CHEVRON_LEFT}</button>
         <button class="nav next" aria-label="Next slide">${CHEVRON_RIGHT}</button>`
      : "";

    const dotsHTML = multiSlide
      ? `<div class="dots" role="tablist" aria-label="Slide navigation">
          ${this._images
            .map(
              (_img, i) =>
                `<button class="dot${i === 0 ? " active" : ""}" data-index="${i}" role="tab" aria-label="Slide ${i + 1}" aria-selected="${i === 0}"></button>`,
            )
            .join("")}
        </div>`
      : "";

    this.shadowRoot.innerHTML = `
      <div class="carousel" role="region" aria-label="Image carousel" tabindex="0">
        <div class="stage">
          <div class="slides">${slidesHTML}</div>
          ${navHTML}
        </div>
        ${dotsHTML}
      </div>
      <slot style="display:none"></slot>
    `;

    this._slides = Array.from(this.shadowRoot.querySelectorAll(".slide"));
    this._dots = Array.from(this.shadowRoot.querySelectorAll(".dot"));
  }

  // ─── navigation ────────────────────────────────────────────────────

  _next() {
    this._goTo((this._currentIndex + 1) % this._images.length);
  }

  _prev() {
    const n = this._images.length;
    this._goTo((this._currentIndex - 1 + n) % n);
  }

  _goTo(index) {
    const prev = this._currentIndex;
    if (prev === index) return;
    this._currentIndex = index;
    this._toggleSlide(prev, false);
    this._toggleSlide(index, true);
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
  _userNav(direction) {
    direction === "next" ? this._next() : this._prev();
    this._maybeStartAutoplay();
  }

  // ─── autoplay ──────────────────────────────────────────────────────

  _maybeStartAutoplay() {
    if (this.hasAttribute("autoplay") && this._images.length > 1) {
      this._startAutoplay();
    }
  }

  _startAutoplay() {
    this._stopAutoplay();
    const interval = parseInt(this.getAttribute("interval") || "", 10) || DEFAULT_INTERVAL;
    this._timer = setInterval(() => this._next(), interval);
  }

  _stopAutoplay() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  // ─── listeners ─────────────────────────────────────────────────────

  _setupListeners() {
    const root = this.shadowRoot;
    const carousel = root.querySelector(".carousel");

    root.querySelector(".prev")?.addEventListener("click", () => this._userNav("prev"));
    root.querySelector(".next")?.addEventListener("click", () => this._userNav("next"));

    root.querySelector(".dots")?.addEventListener("click", (e) => {
      const dot = e.target.closest(".dot");
      if (!dot) return;
      this._goTo(parseInt(dot.dataset.index, 10));
      this._maybeStartAutoplay();
    });

    // Pause autoplay while the cursor sits on the carousel
    carousel.addEventListener("mouseenter", () => this._stopAutoplay());
    carousel.addEventListener("mouseleave", () => this._maybeStartAutoplay());

    // Keyboard navigation
    carousel.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") this._userNav("prev");
      else if (e.key === "ArrowRight") this._userNav("next");
    });

    // Touch / swipe
    carousel.addEventListener(
      "touchstart",
      (e) => {
        this._touchStartX = e.touches[0].clientX;
      },
      { passive: true },
    );

    carousel.addEventListener(
      "touchend",
      (e) => {
        const dx = e.changedTouches[0].clientX - this._touchStartX;
        if (Math.abs(dx) > SWIPE_THRESHOLD_PX) {
          this._userNav(dx < 0 ? "next" : "prev");
        }
      },
      { passive: true },
    );
  }

  _observeVisibility() {
    this._observer = new IntersectionObserver(([entry]) => {
      this._isVisible = entry.isIntersecting;
      if (entry.isIntersecting) this._maybeStartAutoplay();
      else this._stopAutoplay();
    });
    this._observer.observe(this);
    document.addEventListener("visibilitychange", this._handleVisibility);
  }
}

customElements.define("image-carousel", ImageCarousel);

export { ImageCarousel };
