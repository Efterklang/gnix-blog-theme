/**
 * Device Carousel Custom Element
 * A seamless infinite scrolling carousel for showcasing devices
 *
 * Usage:
 * <device-carousel></device-carousel>
 *
 * Or with custom devices:
 * <device-carousel>
 *   <device-card
 *     name="Device Name"
 *     image="/path/to/image.png"
 *     specs="Spec 1<br>Spec 2"
 *   ></device-card>
 * </device-carousel>
 */

function getUiText(key) {
  const zh = (document.documentElement.lang || "").toLowerCase().startsWith("zh");
  const messages = {
    deviceCarousel: zh ? "设备轮播" : "Device carousel",
    pauseAutoplay: zh ? "暂停自动播放" : "Pause autoplay",
    playbackNote: zh ? "悬停或聚焦时保持暂停。" : "Pauses while hovered or focused.",
    resumeAutoplay: zh ? "恢复自动播放" : "Resume autoplay",
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

function renderSpecs(value) {
  return String(value || "")
    .split(/<br\s*\/?>|\n/i)
    .map((part) => escapeHtml(part))
    .join("<br>");
}

class DeviceCarousel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._observer = null;
    this._isVisible = false;
    this._isHovered = false;
    this._isFocused = false;
    this._isInteracting = false;
    this._userPaused = false;
    this._handleVisibility = () => this._syncPlayback();
  }

  connectedCallback() {
    this._isVisible = false;
    this._isHovered = false;
    this._isFocused = false;
    this._isInteracting = false;
    this.render();
    this._setupListeners();
    this.setupIntersectionObserver();
    this._syncPlayback();
  }

  disconnectedCallback() {
    this._isVisible = false;
    this._syncPlayback();
    this._observer?.disconnect();
    this._observer = null;
    document.removeEventListener("visibilitychange", this._handleVisibility);
  }

  get defaultDevices() {
    return [
      {
        name: "Galaxy S24+",
        image: "/assets/common/s24_plus.png",
        alt: "Samsung Galaxy S24 Plus",
        specs: "Snapdragon 8 Gen 3<br>12GB RAM + 512GB Storage",
      },
      {
        name: "MacBook Air",
        image: "/assets/common/MacBook_Air.png",
        alt: "MacBook Air",
        specs: "Apple M3 Chip<br>24GB Unified Memory<br>15-inch Liquid Retina",
      },
      {
        name: "Legion R9000P",
        image: "/assets/common/r9kp.webp",
        alt: "Lenovo Legion R9000P 2021",
        specs: 'AMD Ryzen 7 5800H<br>RTX 3060 / 16GB RAM<br>15.6" 165Hz Display',
      },
      {
        name: "Galaxy Watch7",
        image: "/assets/common/galaxy-watch7.webp",
        alt: "Galaxy Watch 7",
        specs: "44mm LTE Version<br>Exynos W1000<br>Health & Fitness Tracking",
      },
      {
        name: "Beoplay H9i",
        image: "/assets/common/beoplay-h9i.png",
        alt: "Beoplay H9i",
        specs: "Over-ear Wireless Headphones<br>Active Noise Cancellation",
      },
      {
        name: "Galaxy Buds2 Pro",
        image: "/assets/common/galaxy-buds2pro.webp",
        alt: "Galaxy Buds2 Pro",
        specs: "In-ear Wireless Earbuds<br>Active Noise Cancellation",
      },
    ];
  }

  render() {
    const style = `
      :host {
        display: block;
        --card-width: 280px;
        --card-gap: 1.5rem;
        --card-padding: 1.5rem;
        --animation-duration: 40s;
      }

      .showcase-container {
        position: relative;
        overflow: hidden;
        margin: 1.5rem 0;
        mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
        -webkit-mask-image: linear-gradient(to right, transparent, black 5%, black 95%, transparent);
      }

      .showcase-track {
        display: flex;
        padding: 1.5rem 0;
        width: max-content;
        animation: scroll var(--animation-duration) linear infinite;
        animation-play-state: paused;
      }

      @keyframes scroll {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }

      .showcase-card {
        flex: 0 0 auto;
        width: var(--card-width);
        margin-right: var(--card-gap);
        padding: var(--card-padding);
        border-radius: 12px;
        background: var(--crust, #1e1e2e);
        border: 1px solid var(--surface0, #313244);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        box-sizing: border-box;
      }

      .showcase-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }

      .showcase-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: var(--subtext1, #bac2de);
        margin-bottom: 0.75rem;
      }

      .showcase-content {
        margin-bottom: 0.75rem;
        color: var(--text, #cdd6f4);
      }

      .device-image {
        height: 120px;
        width: auto;
        max-width: 100%;
        object-fit: contain;
        transition: transform 0.3s ease;
        display: block;
      }

      .showcase-card:hover .device-image {
        transform: scale(1.1);
      }

      .showcase-meta {
        font-family: var(--font-mono, 'Maple Mono', 'Fira Code', monospace);
        font-size: 0.75rem;
        color: var(--subtext0, #a6adc8);
        padding: 0.5rem 0.75rem;
        background: var(--mantle, #181825);
        border-radius: 6px;
        word-break: break-all;
        line-height: 1.5;
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

    // Get devices from slots or use defaults
    const devices = this.getDevices();

    // Duplicate for seamless infinite scroll
    const allDevices = [...devices, ...devices];

    const cardsHTML = allDevices
      .map(
        (device) => `
      <div class="showcase-card">
        <div class="showcase-label">${escapeHtml(device.name)}</div>
        <div class="showcase-content">
          <img src="${escapeAttribute(device.image)}" alt="${escapeAttribute(device.alt)}" class="device-image" loading="lazy"/>
        </div>
        <div class="showcase-meta">${renderSpecs(device.specs)}</div>
      </div>
    `,
      )
      .join("");

    this.shadowRoot.innerHTML = `
      <style>${style}</style>
      <div class="showcase-region" role="region" aria-label="${getUiText("deviceCarousel")}">
        <div class="showcase-container">
          <div class="showcase-track">
            ${cardsHTML}
          </div>
        </div>
        <div class="playback-controls">
          <button type="button" class="playback-toggle">${getUiText(this._userPaused ? "resumeAutoplay" : "pauseAutoplay")}</button>
          <p class="playback-note">${getUiText("playbackNote")}</p>
        </div>
      </div>
      <slot style="display: none;"></slot>
    `;
  }

  getDevices() {
    // Check if there are any device-card children in the slot
    const slot = this.querySelectorAll("device-card");
    if (slot.length > 0) {
      return Array.from(slot).map((card) => ({
        name: card.getAttribute("name") || "Device",
        image: card.getAttribute("image") || "",
        alt: card.getAttribute("alt") || card.getAttribute("name") || "Device",
        specs: card.getAttribute("specs") || "",
      }));
    }
    return this.defaultDevices;
  }

  _syncPlayback() {
    const button = this.shadowRoot.querySelector(".playback-toggle");
    if (button) button.textContent = getUiText(this._userPaused ? "resumeAutoplay" : "pauseAutoplay");

    const track = this.shadowRoot.querySelector(".showcase-track");
    if (!track) return;
    const canPlay = this.isConnected && this._isVisible && !document.hidden && !this._isHovered && !this._isFocused && !this._isInteracting && !this._userPaused;
    track.style.animationPlayState = canPlay ? "running" : "paused";
  }

  _setupListeners() {
    const region = this.shadowRoot.querySelector(".showcase-region");
    region.querySelector(".playback-toggle").addEventListener("click", () => {
      this._userPaused = !this._userPaused;
      this._syncPlayback();
    });
    region.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      this._isHovered = true;
      this._syncPlayback();
    });
    region.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch") return;
      this._isHovered = false;
      this._syncPlayback();
    });
    region.addEventListener("focusin", () => {
      this._isFocused = true;
      this._syncPlayback();
    });
    region.addEventListener("focusout", () => {
      queueMicrotask(() => {
        if (!region.isConnected) return;
        this._isFocused = region.matches(":focus-within");
        this._syncPlayback();
      });
    });
    region.addEventListener(
      "touchstart",
      () => {
        this._isInteracting = true;
        this._syncPlayback();
      },
      { passive: true },
    );
    region.addEventListener("touchend", (event) => {
      this._isInteracting = Array.from(event.touches).some((touch) =>
        region.contains(touch.target),
      );
      this._syncPlayback();
    });
    region.addEventListener("touchcancel", (event) => {
      this._isInteracting = Array.from(event.touches).some((touch) =>
        region.contains(touch.target),
      );
      this._syncPlayback();
    });
  }

  setupIntersectionObserver() {
    const observer = new IntersectionObserver(
      (entries) => {
        if (this._observer !== observer || !this.isConnected) return;
        entries.forEach((entry) => {
          this._isVisible = entry.isIntersecting;
          this._syncPlayback();
        });
      },
      { threshold: 0.1 },
    );

    this._observer = observer;
    observer.observe(this);
    document.addEventListener("visibilitychange", this._handleVisibility);
  }

  static get observedAttributes() {
    return ["speed", "card-width"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    if (name === "speed" && this.shadowRoot) {
      const track = this.shadowRoot.querySelector(".showcase-track");
      if (track) {
        track.style.setProperty("--animation-duration", `${newValue}s`);
      }
    }

    if (name === "card-width" && this.shadowRoot) {
      this.shadowRoot.host.style.setProperty("--card-width", newValue);
    }
  }
}

// Register custom elements
customElements.define("device-carousel", DeviceCarousel);

export { DeviceCarousel };
