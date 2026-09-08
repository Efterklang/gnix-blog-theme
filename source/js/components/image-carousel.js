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

function isZhLocale() {
  return (document.documentElement.lang || "").toLowerCase().startsWith("zh");
}

function getUiText(key, value) {
  const zh = isZhLocale();
  const messages = {
    imageCarousel: zh ? "图片轮播" : "Image carousel",
    nextSlide: zh ? "下一张" : "Next slide",
    pauseAutoplay: zh ? "暂停自动播放" : "Pause autoplay",
    playbackNote: zh ? "悬停或聚焦时保持暂停。" : "Pauses while hovered or focused.",
    previousSlide: zh ? "上一张" : "Previous slide",
    resumeAutoplay: zh ? "恢复自动播放" : "Resume autoplay",
    slide: zh ? `第 ${value} 张` : `Slide ${value}`,
    slideNavigation: zh ? "幻灯片导航" : "Slide navigation",
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

  .playback-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding-block: 0.5rem;
  }

  .playback-controls[hidden] {
    display: none;
  }

  .playback-toggle {
    min-block-size: 44px;
    min-inline-size: 44px;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--surface1, #45475a);
    border-radius: var(--radius, 12px);
    background: var(--base, #1e1e2e);
    color: var(--text, #cdd6f4);
    font: inherit;
    cursor: pointer;
  }

  .playback-toggle:focus-visible {
    outline: 2px solid var(--blue, #89b4fa);
    outline-offset: 2px;
  }

  .playback-note {
    margin: 0;
    color: var(--subtext0, #a6adc8);
    font-size: 0.75rem;
    line-height: 1.5;
    text-align: center;
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
    this._isVisible = false;
    this._isHovered = false;
    this._isFocused = false;
    this._isInteracting = false;
    this._userPaused = false;
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

    const slidesHTML = this._images
      .map((img, i) => {
        const label = img.alt || getUiText("slide", i + 1);
        return `
      <div class="slide${i === 0 ? " active" : ""}" role="tabpanel" aria-label="${escapeAttribute(label)}">
        <figure>
          <img src="${escapeAttribute(img.src)}"${img.srcset ? ` srcset="${escapeAttribute(img.srcset)}"` : ""} alt="${escapeAttribute(img.alt)}" loading="${i === 0 ? "eager" : "lazy"}">
          ${img.alt ? `<figcaption>${escapeHtml(img.alt)}</figcaption>` : ""}
        </figure>
      </div>
    `;
      })
      .join("");

    const navHTML = multiSlide
      ? `<button class="nav prev" aria-label="${getUiText("previousSlide")}">${CHEVRON_LEFT}</button>
         <button class="nav next" aria-label="${getUiText("nextSlide")}">${CHEVRON_RIGHT}</button>`
      : "";

    const dotsHTML = multiSlide
      ? `<div class="dots" role="tablist" aria-label="${getUiText("slideNavigation")}">
          ${this._images
            .map((_img, i) => `<button class="dot${i === 0 ? " active" : ""}" data-index="${i}" role="tab" aria-label="${getUiText("slide", i + 1)}" aria-selected="${i === 0}"></button>`)
            .join("")}
        </div>`
      : "";

    const playbackHTML = multiSlide
      ? `<div class="playback-controls"${this.hasAttribute("autoplay") ? "" : " hidden"}>
          <button type="button" class="playback-toggle">${getUiText(this._userPaused ? "resumeAutoplay" : "pauseAutoplay")}</button>
          <p class="playback-note">${getUiText("playbackNote")}</p>
        </div>`
      : "";

    this.shadowRoot.innerHTML = `
      <div class="carousel" role="region" aria-label="${getUiText("imageCarousel")}" tabindex="0">
        <div class="stage">
          <div class="slides">${slidesHTML}</div>
          ${navHTML}
        </div>
        ${dotsHTML}
        ${playbackHTML}
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
    this._syncAutoplay(true);
  }

  // ─── autoplay ──────────────────────────────────────────────────────

  _canAutoplay() {
    return (
      this.isConnected &&
      this._isVisible &&
      !document.hidden &&
      !this._isHovered &&
      !this._isFocused &&
      !this._isInteracting &&
      !this._userPaused &&
      this.hasAttribute("autoplay") &&
      this._images.length > 1
    );
  }

  _syncAutoplay(restart = false) {
    this._updatePlaybackControl();
    if (!this._canAutoplay()) {
      this._stopAutoplay();
      return;
    }
    if (restart || this._timer === null) this._startAutoplay();
  }

  _updatePlaybackControl() {
    const controls = this.shadowRoot.querySelector(".playback-controls");
    if (!controls) return;
    controls.hidden = !this.hasAttribute("autoplay") || this._images.length < 2;
    controls.querySelector(".playback-toggle").textContent = getUiText(this._userPaused ? "resumeAutoplay" : "pauseAutoplay");
  }

  _startAutoplay() {
    this._stopAutoplay();
    if (!this._canAutoplay()) return;
    const interval = parseInt(this.getAttribute("interval") || "", 10) || DEFAULT_INTERVAL;
    this._timer = setInterval(() => {
      if (this._canAutoplay()) this._next();
    }, interval);
  }

  _stopAutoplay() {
    if (this._timer !== null) {
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
      this._syncAutoplay(true);
    });

    root.querySelector(".playback-toggle")?.addEventListener("click", () => {
      this._userPaused = !this._userPaused;
      this._syncAutoplay();
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
      if (e.key === "ArrowLeft") this._userNav("prev");
      else if (e.key === "ArrowRight") this._userNav("next");
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
        this._isInteracting = Array.from(event.touches).some((touch) =>
          carousel.contains(touch.target),
        );
        this._syncAutoplay(true);
      },
      { passive: true },
    );
    carousel.addEventListener("touchcancel", (event) => {
      this._isInteracting = Array.from(event.touches).some((touch) =>
        carousel.contains(touch.target),
      );
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
