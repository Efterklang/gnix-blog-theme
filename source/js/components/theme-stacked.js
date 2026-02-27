/**
 * Theme Stacked Card Selector Component
 * Displays themes as a stack of interactive cards with circular navigation
 */

class ThemeStackedElement extends HTMLElement {
  constructor() {
    super();
    this._currentIndex = 0;
    this._isDragging = false;
    this._startX = 0;
    this._currentX = 0;
    this._cards = [];
    this._isVisible = false;
    this._observer = null;
    this._keyHandler = null;
    this._mouseUpHandler = null;

    this.attachShadow({ mode: "open" });

    // All theme color variables to display
    this.previewColors = [
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

    this.themes = [
      { id: "latte", name: "Catppuccin Latte" },
      { id: "nord", name: "Nord Light" },
      { id: "nord_night", name: "Nord Night" },
      { id: "rose_pine", name: "Rosé Pine" },
      { id: "mocha", name: "Catppuccin Mocha" },
      { id: "tokyo_night", name: "Tokyo Night" },
    ];

    this._themeData = {};
  }

  connectedCallback() {
    this._observer = new IntersectionObserver((entries) => {
      this._isVisible = entries[0].isIntersecting;
    });
    this._observer.observe(this);

    this.loadThemeData().then(() => {
      this.render();
      this.init();
    });
  }

  disconnectedCallback() {
    this._observer?.disconnect();
    if (this._keyHandler) document.removeEventListener("keydown", this._keyHandler);
    if (this._mouseUpHandler) document.removeEventListener("mouseup", this._mouseUpHandler);
  }

  async loadThemeData() {
    if (window.__cachedThemeData) {
      this._themeData = window.__cachedThemeData;
      return;
    }

    // Restore from localStorage before doing any DOM work
    try {
      const cached = localStorage.getItem("themeDataCache");
      if (cached) {
        this._themeData = JSON.parse(cached);
        window.__cachedThemeData = this._themeData;
        return;
      }
    } catch (_e) {}

    const temp = document.createElement("div");
    temp.style.cssText = "position:absolute;left:-9999px;width:0;height:0;overflow:hidden;";
    document.body.appendChild(temp);

    for (const theme of this.themes) {
      temp.setAttribute("data-theme", theme.id);
      // Force style recalc once per theme
      const computed = window.getComputedStyle(temp);
      const colors = {};
      for (const colorVar of this.previewColors) {
        const v = computed.getPropertyValue(`--${colorVar}`).trim();
        if (v) colors[colorVar] = v;
      }
      this._themeData[theme.id] = colors;
    }

    temp.remove();
    window.__cachedThemeData = this._themeData; // in-memory cache
    try {
      localStorage.setItem("themeDataCache", JSON.stringify(this._themeData));
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
          border: 2px solid var(--surface0);
          border-radius: 16px;
          padding: 1.5rem;
          cursor: grab;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
          user-select: none;
          touch-action: pan-y;
          opacity: 0;
          transform: scale(0.8) translateX(200px);
          pointer-events: none;

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
          grid-template-columns: repeat(8, 1fr);
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
        <div class="card-stack" id="card-stack">
          <!-- Cards will be generated here -->
        </div>

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
    this.updateStack();
    this.attachEvents();

    // Set initial index based on current theme
    const currentTheme = this.getCurrentTheme();
    const initialIndex = this.themes.findIndex((t) => t.id === currentTheme);
    if (initialIndex !== -1) {
      this.goTo(initialIndex, false);
    }
  }

  renderCards() {
    this._cardStack.innerHTML = "";
    this._cards = [];

    this.themes.forEach((theme, index) => {
      const card = document.createElement("div");
      card.className = "theme-card";
      card.dataset.index = index;
      card.dataset.theme = theme.id;

      const colors = this._themeData[theme.id] || {};
      const colorSwatches = this.previewColors
        .map((color) => {
          const colorValue = colors[color] || "transparent";
          return `<div class="color-swatch" data-color="${color}" data-value="${colorValue}" style="--color: ${colorValue};"></div>`;
        })
        .join("");

      const isActive = this.getCurrentTheme() === theme.id;

      card.innerHTML = `
        <h4 class="card-title">${theme.name}</h4>
        <div class="color-grid">
          ${colorSwatches}
        </div>
        <div class="card-footer">
          <button class="apply-btn ${isActive ? "applied" : ""}" data-theme="${theme.id}">
            ${isActive ? "Applied ✓" : "Apply"}
          </button>
        </div>
      `;

      this._cardStack.appendChild(card);
      this._cards.push(card);
    });
  }

  renderDots() {
    this._dotsContainer.innerHTML = "";
    this.themes.forEach((_, index) => {
      const dot = document.createElement("button");
      dot.className = "dot";
      dot.dataset.index = index;
      dot.setAttribute("aria-label", `Go to theme ${index + 1}`);
      dot.addEventListener("click", () => this.goTo(index));
      this._dotsContainer.appendChild(dot);
    });
  }

  updateStack() {
    const total = this._cards.length;

    this._cards.forEach((card, index) => {
      card.classList.remove("active", "prev", "next", "hidden");

      const dist = this.getDistance(index, this._currentIndex, total);

      if (dist === 0) {
        card.classList.add("active");
      } else if (dist === -1) {
        card.classList.add("prev");
      } else if (dist === 1) {
        card.classList.add("next");
      } else {
        card.classList.add("hidden");
      }
    });

    // Update dots
    this._dotsContainer.querySelectorAll(".dot").forEach((dot, index) => {
      dot.classList.toggle("active", index === this._currentIndex);
    });
  }

  getDistance(index, current, total) {
    const diff = index - current;
    if (Math.abs(diff) <= 1) return diff;
    if (current === 0 && index === total - 1) return -1;
    if (current === total - 1 && index === 0) return 1;
    return 2;
  }

  goTo(index, animate = true) {
    const total = this.themes.length;

    // Handle circular wrapping for goTo as well
    if (index < 0) {
      index = total - 1;
    } else if (index >= total) {
      index = 0;
    }

    this._currentIndex = index;
    this.updateStack();

    // Trigger animation
    if (animate) {
      this.dispatchEvent(
        new CustomEvent("themeChange", {
          detail: { index, theme: this.themes[index] },
        }),
      );
    }
  }

  next() {
    this.goTo(this._currentIndex + 1);
  }
  prev() {
    this.goTo(this._currentIndex - 1);
  }

  attachEvents() {
    // Navigation buttons
    this._prevBtn.addEventListener("click", () => this.prev());
    this._nextBtn.addEventListener("click", () => this.next());

    // Single delegated click handler for the card stack
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
        const themeId = applyBtn.dataset.theme;
        this.applyTheme(themeId);
        return;
      }

      const card = e.target.closest(".theme-card");
      if (card) {
        const idx = Number(card.dataset.index);
        if (!card.classList.contains("active")) this.goTo(idx);
      }
    });

    // Keyboard navigation
    this._keyHandler = (e) => {
      if (!this._isVisible) return;

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          this.prev();
          break;
        case "ArrowRight":
        case " ":
          e.preventDefault();
          this.next();
          break;
        case "Enter":
          if (this._cards[this._currentIndex].classList.contains("active")) {
            this.applyTheme(this.themes[this._currentIndex].id);
          }
          break;
      }
    };
    document.addEventListener("keydown", this._keyHandler);

    // Touch/drag support
    let startX = 0;
    let isDragging = false;

    const handleStart = (x) => {
      startX = x;
      isDragging = true;
    };
    const handleEnd = (x) => {
      if (!isDragging) return;
      isDragging = false;
      const diff = startX - x;
      if (Math.abs(diff) > 50) diff > 0 ? this.next() : this.prev();
    };

    this._cardStack.addEventListener("touchstart", (e) => handleStart(e.touches[0].clientX), { passive: true });
    this._cardStack.addEventListener("touchend", (e) => handleEnd(e.changedTouches[0].clientX));

    this._cardStack.addEventListener("mousedown", (e) => {
      handleStart(e.clientX);
      this._cardStack.style.cursor = "grabbing";
    });
    this._mouseUpHandler = (e) => {
      handleEnd(e.clientX);
      this._cardStack.style.cursor = "";
    };
    document.addEventListener("mouseup", this._mouseUpHandler);
  }

  isVisible() {
    return this._isVisible;
  }

  getCurrentTheme() {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("themePreference");
      if (stored) return stored;
      return document.documentElement.getAttribute("data-theme") || "mocha";
    }
    return "mocha";
  }

  applyTheme(themeId) {
    if (typeof window !== "undefined" && window.applyTheme) {
      window.applyTheme(themeId, true);

      // Update all buttons
      this._cards.forEach((card, idx) => {
        const btn = card.querySelector(".apply-btn");
        const isThisTheme = this.themes[idx].id === themeId;

        btn.classList.toggle("applied", isThisTheme);
        btn.textContent = isThisTheme ? "Applied ✓" : "Apply Theme";
      });

      // Visual feedback on active card
      const activeCard = this._cards[this._currentIndex];
      const activeBtn = activeCard.querySelector(".apply-btn");
      activeBtn.style.transform = "scale(0.95)";
      setTimeout(() => {
        activeBtn.style.transform = "";
      }, 150);
    }
  }
}

// Register the custom element
if (!customElements.get("theme-stacked")) {
  customElements.define("theme-stacked", ThemeStackedElement);
}
