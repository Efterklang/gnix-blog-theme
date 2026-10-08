/**
 * Theme Stacked Card Selector Component
 * Displays themes as a stack of interactive cards with circular navigation
 */

const PREVIEW_COLORS = [
  "rosewater",
  "mauve",
  "red",
  "peach",
  "yellow",
  "green",
  "teal",
  "blue",
  "lavender",
  "title-text-color",
  "body-text-color",
  "sub-text-color",
  "overlay1",
  "overlay0",
  "surface1",
  "surface0",
];

function getThemeOptions() {
  const config = window.__GNIX_THEME_CONFIG__;

  if (!Array.isArray(config?.themes)) return [];

  return config.themes.filter((theme) => theme.value !== config.defaultTheme).map((theme) => ({ id: theme.value, name: theme.name }));
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

  connectedCallback() {
    this._themes = getThemeOptions();
    if (this._themes.length === 0) return;

    this._observer = new IntersectionObserver((e) => {
      this._isVisible = e[0].isIntersecting;
    });
    this._observer.observe(this);
    this.loadThemeData();
    this.render();
    this.init();
  }

  disconnectedCallback() {
    this._observer?.disconnect();
    this._cardStack?.removeEventListener("keydown", this._keyHandler);
    this._dragEvents?.abort();
    this._finishDrag(false);
  }

  loadThemeData() {
    if (hasThemeDataForThemes(window.__cachedThemeData, this._themes)) {
      this._themeData = window.__cachedThemeData;
      return;
    }

    // Read the current stylesheet once per page. Persisting computed colors in
    // localStorage made previews stale after palette changes or a deployment.
    const container = document.createElement("div");
    container.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;width:0;height:0;overflow:hidden;";
    const samples = this._themes.map((theme) => {
      const sample = document.createElement("div");
      sample.setAttribute("data-theme", theme.id);
      container.appendChild(sample);
      return { theme, sample };
    });
    // Attach all theme scopes before reading any styles, avoiding a forced
    // style recalculation between each theme's write and read.
    document.body.appendChild(container);
    try {
      for (const { theme, sample } of samples) {
        const computed = window.getComputedStyle(sample);
        this._themeData[theme.id] = Object.fromEntries(PREVIEW_COLORS.map((color) => [color, computed.getPropertyValue(`--${color}`).trim()]).filter(([, value]) => value));
      }
    } finally {
      container.remove();
    }
    window.__cachedThemeData = this._themeData;
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

        .card-stack:focus-visible {
          outline: 2px solid var(--blue);
          outline-offset: -2px;
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
          font-family: var(--font-handwritten);
          font-size: 2em;
          font-weight: 600;
          color: var(--title-text-color);
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
            background: var(--base);
            color: var(--body-text-color);
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
          color: var(--base);
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
          color: var(--title-text-color);
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

        .stacked-container[data-navigation-input="keyboard"] .theme-card,
        .stacked-container[data-navigation-input="keyboard"] .dot {
          transition: none;
        }

        .stacked-container[data-navigation-input="drag"] .theme-card {
          transition: transform 420ms var(--glass-spring, var(--ease-out)), opacity 240ms var(--ease-out);
        }

        .card-stack[data-dragging] .theme-card,
        .card-stack[data-dragging] .theme-card * {
          cursor: grabbing;
        }

        @media (prefers-reduced-motion: reduce) {
          .stacked-container[data-navigation-input="drag"] .theme-card {
            transition: opacity 160ms ease;
          }
        }
      </style>

      <div class="stacked-container">
        <div class="card-stack" id="card-stack" tabindex="0" role="group" aria-label="Theme previews"></div>

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
    this._stackedContainer = this.shadowRoot.querySelector(".stacked-container");
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
    this._dotsContainer.querySelectorAll(".dot").forEach((dot, index) => {
      dot.addEventListener("click", (event) => this.goTo(index, true, event.detail === 0 ? "keyboard" : "pointer"));
    });
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

  goTo(index, animate = true, input = "pointer") {
    if (this._themes.length === 0) return;

    this._stackedContainer.dataset.navigationInput = input;
    this._finishDrag(false);
    this._currentIndex = ((index % this._themes.length) + this._themes.length) % this._themes.length;
    this.updateStack();
    if (animate)
      this.dispatchEvent(
        new CustomEvent("themeChange", {
          detail: { index: this._currentIndex, theme: this._themes[this._currentIndex] },
        }),
      );
  }

  next(input = "pointer") {
    this.goTo(this._currentIndex + 1, true, input);
  }
  prev(input = "pointer") {
    this.goTo(this._currentIndex - 1, true, input);
  }

  attachEvents() {
    this._prevBtn.addEventListener("click", (event) => this.prev(event.detail === 0 ? "keyboard" : "pointer"));
    this._nextBtn.addEventListener("click", (event) => this.next(event.detail === 0 ? "keyboard" : "pointer"));

    this._cardStack.addEventListener("click", (event) => {
      const swatch = event.target.closest(".color-swatch");
      if (swatch) {
        event.stopPropagation();
        const hex = (swatch.dataset.value || "").replace("#", "");
        if (hex && hex !== "transparent") window.open(`https://www.colorhexa.com/${hex}`, "_blank");
        return;
      }
      const applyBtn = event.target.closest(".apply-btn");
      if (applyBtn) {
        event.stopPropagation();
        this.applyTheme(applyBtn.dataset.theme, event.detail === 0 ? "keyboard" : "pointer");
        return;
      }
      const card = event.target.closest(".theme-card");
      if (card && !card.classList.contains("active")) this.goTo(Number(card.dataset.index), true, event.detail === 0 ? "keyboard" : "pointer");
    });

    this._keyHandler = (event) => {
      if (
        event.target !== this._cardStack ||
        !this._isVisible ||
        this._themes.length === 0 ||
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      ) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        this.prev("keyboard");
      } else if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        this.next("keyboard");
      } else if (event.key === "Enter") {
        event.preventDefault();
        this.applyTheme(this._themes[this._currentIndex].id, "keyboard");
      }
    };
    this._cardStack.addEventListener("keydown", this._keyHandler);

    this.attachDragEvents();
  }

  attachDragEvents() {
    this._dragEvents = new AbortController();
    const { signal } = this._dragEvents;

    this._cardStack.addEventListener("pointerdown", (event) => {
      if (this._drag || !event.isPrimary || event.button !== 0 || !this._isVisible || this._themes.length < 2) return;
      this._suppressDragClick = false;
      const card = event.target.closest(".theme-card.active");
      if (!card) return;
      this._drag = {
        pointerId: event.pointerId,
        card,
        startX: event.clientX,
        startY: event.clientY,
        offset: 0,
        locked: false,
        samples: [{ x: event.clientX, time: event.timeStamp }],
      };
    }, { signal });

    // Listen outside the stack while deciding the axis; capture only once a
    // horizontal drag is confirmed, leaving pan-y and ordinary clicks intact.
    window.addEventListener("pointermove", (event) => this._moveDrag(event), { signal, passive: false });
    window.addEventListener("pointerup", (event) => {
      if (event.pointerId !== this._drag?.pointerId) return;
      if (this._drag.locked) this._moveDrag(event);
      this._finishDrag(true);
    }, { signal });
    window.addEventListener("pointercancel", (event) => {
      if (event.pointerId === this._drag?.pointerId) this._finishDrag(false);
    }, { signal });
    this._cardStack.addEventListener("lostpointercapture", (event) => {
      if (event.target === this._cardStack && event.pointerId === this._drag?.pointerId) this._finishDrag(false);
    }, { signal });
    window.addEventListener("blur", () => this._finishDrag(false), { signal });

    this._cardStack.addEventListener("click", (event) => {
      if (!this._suppressDragClick || event.detail === 0) return;
      this._suppressDragClick = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, { signal, capture: true });
  }

  _moveDrag(event) {
    const drag = this._drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.locked) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      if (Math.abs(dy) >= Math.abs(dx)) {
        this._finishDrag(false);
        return;
      }

      // Freeze the rendered position, including an interrupted settle, before
      // adding the pointer displacement. No transition runs under the finger.
      const transform = getComputedStyle(drag.card).transform;
      drag.transform = transform === "none" ? "" : transform;
      drag.card.style.transition = "none";
      drag.locked = true;
      this._stackedContainer.dataset.navigationInput = "drag";
      this._cardStack.dataset.dragging = "";
      this._cardStack.setPointerCapture(event.pointerId);
      this._cardStack.focus({ preventScroll: true });
    }

    if (event.cancelable) event.preventDefault();
    drag.offset = dx;
    drag.card.style.transform = `translateX(${dx}px) ${drag.transform}`;
    drag.samples.push({ x: event.clientX, time: event.timeStamp });
    while (drag.samples.length > 2 && drag.samples[0].time < event.timeStamp - 100) drag.samples.shift();
  }

  _finishDrag(commit) {
    const drag = this._drag;
    if (!drag) return;
    this._drag = null;
    delete this._cardStack.dataset.dragging;
    if (this._cardStack.hasPointerCapture(drag.pointerId)) this._cardStack.releasePointerCapture(drag.pointerId);
    if (!drag.locked) return;

    this._suppressDragClick = true;
    // Commit the last pointer position before letting CSS retarget from it.
    void getComputedStyle(drag.card).transform;
    drag.card.style.removeProperty("transition");
    drag.card.style.removeProperty("transform");

    const first = drag.samples[0];
    const last = drag.samples[drag.samples.length - 1];
    const velocity = (last.x - first.x) / Math.max(1, last.time - first.time);
    // Recent samples make a quick flick count, but not a swipe held still
    // before release. A reversal near release follows its latest direction.
    const direction = Math.abs(velocity) > 0.5 ? Math.sign(velocity) : Math.abs(drag.offset) > 50 ? Math.sign(drag.offset) : 0;
    if (commit && direction) this.goTo(this._currentIndex - direction, true, "drag");
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

  applyTheme(themeId, input = "pointer") {
    if (!window.applyTheme) return;
    window.applyTheme(themeId, true);
    this._cards.forEach((card, i) => {
      const btn = card.querySelector(".apply-btn");
      const match = this._themes[i].id === themeId;
      btn.classList.toggle("applied", match);
      btn.textContent = match ? "Applied ✓" : "Apply Theme";
    });
    const btn = this._cards[this._currentIndex].querySelector(".apply-btn");
    if (input === "keyboard") {
      btn.style.transform = "";
      return;
    }
    btn.style.transform = "scale(0.95)";
    setTimeout(() => {
      btn.style.transform = "";
    }, 150);
  }
}

if (!customElements.get("theme-stacked")) {
  customElements.define("theme-stacked", ThemeStackedElement);
}
