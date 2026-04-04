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
 * - ratio: Aspect ratio as CSS value (default: 3/2)
 */

// Shared stylesheet — parsed once, reused across all carousel instances
let _sheet;

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
    border-radius: var(--radius, 12px);
    overflow: hidden;
    background: var(--crust, #11111b);
    contain: content;
  }

  .slides {
    position: relative;
    width: 100%;
    aspect-ratio: var(--carousel-ratio, 3/2);
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
      else if (this._isVisible && this.hasAttribute("autoplay")) this._startAutoplay();
    };
  }

  connectedCallback() {
    this._images = this._collectImages();
    this.render();
    if (this._images.length > 1) {
      this._setupListeners();
      this._observeVisibility();
    }
    if (this.hasAttribute("autoplay") && this._images.length > 1) {
      this._startAutoplay();
    }
  }

  disconnectedCallback() {
    this._stopAutoplay();
    this._observer?.disconnect();
    document.removeEventListener("visibilitychange", this._handleVisibility);
  }

  _collectImages() {
    return Array.from(this.querySelectorAll("img")).map((img) => ({
      src: img.src || img.getAttribute("src"),
      alt: img.alt || "",
      srcset: img.getAttribute("srcset") || "",
    }));
  }

  _getInterval() {
    return parseInt(this.getAttribute("interval") || "3000", 10);
  }

  _startAutoplay() {
    this._stopAutoplay();
    this._timer = setInterval(() => {
      this._goTo((this._currentIndex + 1) % this._images.length);
    }, this._getInterval());
  }

  _stopAutoplay() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  _goTo(index) {
    const prev = this._currentIndex;
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

  render() {
    const images = this._images;
    const ratio = this.getAttribute("ratio") || "3/2";

    if (images.length === 0) {
      this.shadowRoot.innerHTML = "";
      return;
    }

    if (!_sheet) {
      _sheet = new CSSStyleSheet();
      _sheet.replaceSync(STYLES);
    }
    this.shadowRoot.adoptedStyleSheets = [_sheet];
    this.style.setProperty("--carousel-ratio", ratio);

    const slidesHTML = images
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

    const navHTML =
      images.length > 1
        ? `<button class="nav prev" aria-label="Previous slide"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg></button>
           <button class="nav next" aria-label="Next slide"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg></button>`
        : "";

    const dotsHTML =
      images.length > 1
        ? `<div class="dots" role="tablist" aria-label="Slide navigation">
        ${images.map((_img, i) => `<button class="dot${i === 0 ? " active" : ""}" data-index="${i}" role="tab" aria-label="Slide ${i + 1}" aria-selected="${i === 0}"></button>`).join("")}
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

  _setupListeners() {
    const root = this.shadowRoot;
    const carousel = root.querySelector(".carousel");
    const n = this._images.length;

    root.querySelector(".prev")?.addEventListener("click", () => {
      this._resetAutoplay();
      this._goTo((this._currentIndex - 1 + n) % n);
    });

    root.querySelector(".next")?.addEventListener("click", () => {
      this._resetAutoplay();
      this._goTo((this._currentIndex + 1) % n);
    });

    root.querySelector(".dots")?.addEventListener("click", (e) => {
      const dot = e.target.closest(".dot");
      if (!dot) return;
      this._resetAutoplay();
      this._goTo(parseInt(dot.dataset.index, 10));
    });

    // Pause autoplay on hover
    carousel.addEventListener("mouseenter", () => this._stopAutoplay());
    carousel.addEventListener("mouseleave", () => {
      if (this.hasAttribute("autoplay")) this._startAutoplay();
    });

    // Keyboard navigation
    carousel.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") {
        this._resetAutoplay();
        this._goTo((this._currentIndex - 1 + n) % n);
      } else if (e.key === "ArrowRight") {
        this._resetAutoplay();
        this._goTo((this._currentIndex + 1) % n);
      }
    });

    // Touch/swipe support
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
        if (Math.abs(dx) > 40) {
          this._resetAutoplay();
          this._goTo(dx < 0 ? (this._currentIndex + 1) % n : (this._currentIndex - 1 + n) % n);
        }
      },
      { passive: true },
    );
  }

  _observeVisibility() {
    this._observer = new IntersectionObserver(([entry]) => {
      this._isVisible = entry.isIntersecting;
      if (!entry.isIntersecting) {
        this._stopAutoplay();
      } else if (this.hasAttribute("autoplay")) {
        this._startAutoplay();
      }
    });
    this._observer.observe(this);
    document.addEventListener("visibilitychange", this._handleVisibility);
  }

  _resetAutoplay() {
    if (this.hasAttribute("autoplay")) {
      this._stopAutoplay();
      this._startAutoplay();
    }
  }

  static get observedAttributes() {
    return ["autoplay", "interval"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this._images.length) return;
    if (name === "autoplay") {
      newValue !== null ? this._startAutoplay() : this._stopAutoplay();
    }
    if (name === "interval" && this._timer) {
      this._startAutoplay();
    }
  }
}

customElements.define("image-carousel", ImageCarousel);

export { ImageCarousel };
