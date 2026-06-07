/**
 * Theme Stacked Card Selector Component
 * Displays themes as a stack of interactive cards with circular navigation
 */

const PREVIEW_COLORS = [
  "rosewater",
  "flamingo",
  "pink",
  "mauve",
  "red",
  "maroon",
  "peach",
  "yellow",
  "green",
  "teal",
  "sky",
  "sapphire",
  "blue",
  "lavender",
  "text",
  "subtext1",
  "subtext0",
  "overlay2",
  "overlay1",
  "overlay0",
  "surface2",
  "surface1",
  "surface0",
];

const THEME_DATA_CACHE_PREFIX = "themeDataCache";

function getThemeOptions() {
  const config = window.__GNIX_THEME_CONFIG__;

  if (!Array.isArray(config?.themes)) return [];

  return config.themes.filter((theme) => theme.value !== config.defaultTheme).map((theme) => ({ id: theme.value, name: theme.name }));
}

function getThemeDataCacheKey(themes) {
  return `${THEME_DATA_CACHE_PREFIX}:${themes.map((theme) => theme.id).join(",")}`;
}

function hasThemeDataForThemes(themeData, themes) {
  return Boolean(themeData) && themes.every((theme) => themeData[theme.id]);
}

class ThemeStackedElement extends HTMLElement {
  constructor() {
    super();
    this._currentIndex = 0;
    this._cards = [];
    this._isVisible = false;
    this._themeData = {};
    this._themes = [];
    this.attachShadow({ mode: "open" });
  }

  async connectedCallback() {
    this._themes = getThemeOptions();
    if (this._themes.length === 0) return;

    this._observer = new IntersectionObserver((e) => {
      this._isVisible = e[0].isIntersecting;
    });
    this._observer.observe(this);
    await this.loadThemeData();
    this.render();
    this.init();
  }

  disconnectedCallback() {
    this._observer?.disconnect();
    document.removeEventListener("keydown", this._keyHandler);
    document.removeEventListener("mouseup", this._mouseUpHandler);
  }

  async loadThemeData() {
    if (hasThemeDataForThemes(window.__cachedThemeData, this._themes)) {
      this._themeData = window.__cachedThemeData;
      return;
    }

    const cacheKey = getThemeDataCacheKey(this._themes);

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const cachedThemeData = JSON.parse(cached);
        if (hasThemeDataForThemes(cachedThemeData, this._themes)) {
          this._themeData = window.__cachedThemeData = cachedThemeData;
          return;
        }
      }
    } catch (_e) {}

    const temp = document.createElement("div");
    temp.style.cssText = "position:absolute;left:-9999px;width:0;height:0;overflow:hidden;";
    document.body.appendChild(temp);

    for (const theme of this._themes) {
      temp.setAttribute("data-theme", theme.id);
      const computed = window.getComputedStyle(temp);
      this._themeData[theme.id] = Object.fromEntries(PREVIEW_COLORS.map((c) => [c, computed.getPropertyValue(`--${c}`).trim()]).filter(([, v]) => v));
    }

    temp.remove();
    window.__cachedThemeData = this._themeData;
    try {
      localStorage.setItem(cacheKey, JSON.stringify(this._themeData));
    } catch (_e) {}
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          padding: 2rem 0;
        }

        * {
          box-sizing: border-box;
        }

        .stacked-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          width: 100%;
          max-width: 1100px;
          margin: 0 auto;
        }

        .card-stack {
          position: relative;
          width: 100%;
          padding: 40px 0;
          perspective: 1200px;
          overflow: hidden;
          display: grid;
          place-items: center;
        }

        .theme-card {
          grid-area: 1 / 1;
          position: relative;
          width: min(550px, 90%);
          background: var(--base);
          border: 2px solid color-mix(in oklch, var(--base) 80%, var(--text));
          border-radius: 16px;
          padding: 1.5rem;
          cursor: grab;
          transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          user-select: none;
          touch-action: pan-y;
          opacity: 0;
          transform: scale(0.8) translateX(200px);
          pointer-events: none;
          contain: layout style;

          &.active {
            opacity: 1;
            transform: scale(1) translateX(0) translateZ(0);
            z-index: 10;
            pointer-events: auto;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          }

          &.prev {
            opacity: 0.6;
            transform: scale(0.85) translateX(-150px) rotateY(10deg);
            z-index: 5;
            pointer-events: auto;
          }

          &.next {
            opacity: 0.6;
            transform: scale(0.85) translateX(150px) rotateY(-10deg);
            z-index: 5;
            pointer-events: auto;
          }

          &.hidden {
            opacity: 0;
            transform: scale(0.7) translateX(0);
            z-index: 0;
          }
        }

        @media (max-width: 640px) {
          .theme-card {
            width: min(340px, 90%);
            &.prev {
              transform: scale(0.9) translateY(-15%)translateZ(-50px);
            }

            &.next {
              transform: scale(0.9) translateY(15%)translateZ(-100px);
            }
          }

        }
        .card-title {
          font-family: var(--font-handwriting);
          font-size: 2em;
          font-weight: 600;
          color: var(--lavender);
          margin: 0 0 0.75rem;
          text-align: center;
        }

        .color-grid {
          display: grid;
          grid-template-columns: repeat(9, 1fr);
          gap: 6px;
          margin-bottom: 1rem;

          @media (max-width: 640px) {
            gap: 4px;
          }
        }

        .color-swatch {
          aspect-ratio: 1 / 1;
          border-radius: 6px;
          cursor: pointer;
          transition: transform 0.2s ease;
          border: 2px solid hsl(from var(--color) h s calc(l - 10) / 0.7);
          background-color: var(--color);
          position: relative;

          &:hover {
            transform: scale(1.15);
            z-index: 10;

            &::before,
            &::after {
              opacity: 1;
              visibility: visible;
            }
          }

          &::before {
            content: attr(data-color) "\\A" attr(data-value);
            text-transform: uppercase;
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%) translateY(-6px);
            background: var(--crust);
            color: var(--text);
            padding: 0.4rem 0.6rem;
            border-radius: 6px;
            font-size: 0.7rem;
            font-family: var(--font-mono);
            white-space: pre;
            text-align: center;
            line-height: 1.4;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            border: 1px solid var(--surface0);
            z-index: 100;
            pointer-events: none;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.15s ease, visibility 0.15s ease;
          }
        }

        .card-footer {
          display: flex;
        }

        .apply-btn {
          flex: 1;
          padding: 0.6rem 1rem;
          background: var(--blue);
          color: var(--crust);
          border: none;
          border-radius: 8px;
          font-family: var(--font-mono);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            background: var(--blue);
            transform: translateY(-1px);
          }

          &.applied {
            background: var(--green);
          }
        }

        .controls {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .nav-btn {
          width: 40px;
          height: 40px;
          border: 1px solid var(--surface0);
          border-radius: 8px;
          background: var(--base);
          color: var(--text);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;

          &:hover {
            border-color: var(--overlay0);
            color: var(--mauve);
          }

          &:active {
            transform: scale(0.95);
          }
        }

        .dots {
          display: flex;
          gap: 8px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--surface0);
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0;
          margin: 0;
          display: inline-block;
          aspect-ratio: 1;

          &.active {
            background: var(--mauve);
            width: 24px;
            border-radius: 4px;
          }

          &:hover {
            background: var(--overlay0);
          }
        }
      </style>

      <div class="stacked-container">
        <div class="card-stack" id="card-stack"></div>

        <div class="controls">
          <button class="nav-btn" id="prev-btn" aria-label="Previous theme">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>

          <div class="dots" id="dots"></div>

          <button class="nav-btn" id="next-btn" aria-label="Next theme">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  init() {
    this._cardStack = this.shadowRoot.querySelector("#card-stack");
    this._dotsContainer = this.shadowRoot.querySelector("#dots");
    this._prevBtn = this.shadowRoot.querySelector("#prev-btn");
    this._nextBtn = this.shadowRoot.querySelector("#next-btn");

    this.renderCards();
    this.renderDots();
    this.attachEvents();

    const idx = this._themes.findIndex((t) => t.id === this.getCurrentTheme());
    this.goTo(idx !== -1 ? idx : 0, false);
  }

  renderCards() {
    const current = this.getCurrentTheme();
    this._cardStack.innerHTML = this._themes
      .map((theme, i) => {
        const colors = this._themeData[theme.id] || {};
        const themeVars = Object.entries(colors)
          .map(([k, v]) => `--${k}: ${v}`)
          .join(";");
        const swatches = PREVIEW_COLORS.map((c) => {
          const v = colors[c] || "transparent";
          return `<div class="color-swatch" data-color="${c}" data-value="${v}" style="--color:${v}"></div>`;
        }).join("");
        const active = current === theme.id;
        return `<div class="theme-card" data-index="${i}" data-theme="${theme.id}" style="${themeVars}">
        <h4 class="card-title">${theme.name}</h4>
        <div class="color-grid">${swatches}</div>
        <div class="card-footer">
          <button class="apply-btn${active ? " applied" : ""}" data-theme="${theme.id}">
            ${active ? "Applied ✓" : "Apply"}
          </button>
        </div>
      </div>`;
      })
      .join("");
    this._cards = [...this._cardStack.querySelectorAll(".theme-card")];
  }

  renderDots() {
    this._dotsContainer.innerHTML = this._themes.map((_, i) => `<button class="dot" data-index="${i}" aria-label="Go to theme ${i + 1}"></button>`).join("");
    this._dotsContainer.querySelectorAll(".dot").forEach((dot, i) => dot.addEventListener("click", () => this.goTo(i)));
  }

  updateStack() {
    const total = this._cards.length;
    const distClass = { 0: "active", "-1": "prev", 1: "next" };
    this._cards.forEach((card, i) => {
      const cls = distClass[this.getDistance(i, this._currentIndex, total)] ?? "hidden";
      card.className = `theme-card ${cls}`;
    });
    this._dotsContainer.querySelectorAll(".dot").forEach((dot, i) => dot.classList.toggle("active", i === this._currentIndex));
  }

  getDistance(index, current, total) {
    const d = (index - current + total) % total;
    return d === 0 ? 0 : d === 1 ? 1 : d === total - 1 ? -1 : 2;
  }

  goTo(index, animate = true) {
    if (this._themes.length === 0) return;

    this._currentIndex = ((index % this._themes.length) + this._themes.length) % this._themes.length;
    this.updateStack();
    if (animate)
      this.dispatchEvent(
        new CustomEvent("themeChange", {
          detail: { index: this._currentIndex, theme: this._themes[this._currentIndex] },
        }),
      );
  }

  next() {
    this.goTo(this._currentIndex + 1);
  }
  prev() {
    this.goTo(this._currentIndex - 1);
  }

  attachEvents() {
    this._prevBtn.addEventListener("click", () => this.prev());
    this._nextBtn.addEventListener("click", () => this.next());

    this._cardStack.addEventListener("click", (e) => {
      const swatch = e.target.closest(".color-swatch");
      if (swatch) {
        e.stopPropagation();
        const hex = (swatch.dataset.value || "").replace("#", "");
        if (hex && hex !== "transparent") window.open(`https://www.colorhexa.com/${hex}`, "_blank");
        return;
      }
      const applyBtn = e.target.closest(".apply-btn");
      if (applyBtn) {
        e.stopPropagation();
        this.applyTheme(applyBtn.dataset.theme);
        return;
      }
      const card = e.target.closest(".theme-card");
      if (card && !card.classList.contains("active")) this.goTo(Number(card.dataset.index));
    });

    this._keyHandler = (e) => {
      if (!this._isVisible) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        this.prev();
      } else if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        this.next();
      } else if (e.key === "Enter") this.applyTheme(this._themes[this._currentIndex].id);
    };
    document.addEventListener("keydown", this._keyHandler);

    let startX = 0,
      dragging = false;
    const onStart = (x) => {
      if (!this._isVisible) return;
      startX = x;
      dragging = true;
    };
    const onEnd = (x) => {
      if (!dragging) return;
      dragging = false;
      const diff = startX - x;
      if (Math.abs(diff) > 50) diff > 0 ? this.next() : this.prev();
    };

    this._cardStack.addEventListener("touchstart", (e) => onStart(e.touches[0].clientX), { passive: true });
    this._cardStack.addEventListener("touchend", (e) => onEnd(e.changedTouches[0].clientX));
    this._cardStack.addEventListener("mousedown", (e) => {
      onStart(e.clientX);
      this._cardStack.style.cursor = "grabbing";
    });
    this._mouseUpHandler = (e) => {
      if (!this._isVisible) return;
      onEnd(e.clientX);
      this._cardStack.style.cursor = "";
    };
    document.addEventListener("mouseup", this._mouseUpHandler, { passive: true });
  }

  getCurrentTheme() {
    const config = window.__GNIX_THEME_CONFIG__;
    if (typeof window.getResolvedTheme === "function") return window.getResolvedTheme();

    let storedTheme = null;

    try {
      storedTheme = config?.storageKey ? localStorage.getItem(config.storageKey) : null;
    } catch (_e) {}

    if (storedTheme && storedTheme !== config?.defaultTheme) {
      if (storedTheme.charAt(0) === "{") {
        try {
          const preferences = JSON.parse(storedTheme);
          return preferences.mode === "light" ? preferences.light : preferences.mode === "dark" ? preferences.dark : document.documentElement.getAttribute("data-theme");
        } catch (_e) {}
      }
      return storedTheme;
    }

    return document.documentElement.getAttribute("data-theme") || config?.systemTheme?.dark || this._themes[0]?.id;
  }

  applyTheme(themeId) {
    if (!window.applyTheme) return;
    window.applyTheme(themeId, true);
    this._cards.forEach((card, i) => {
      const btn = card.querySelector(".apply-btn");
      const match = this._themes[i].id === themeId;
      btn.classList.toggle("applied", match);
      btn.textContent = match ? "Applied ✓" : "Apply Theme";
    });
    const btn = this._cards[this._currentIndex].querySelector(".apply-btn");
    btn.style.transform = "scale(0.95)";
    setTimeout(() => {
      btn.style.transform = "";
    }, 150);
  }
}

if (!customElements.get("theme-stacked")) {
  customElements.define("theme-stacked", ThemeStackedElement);
}
