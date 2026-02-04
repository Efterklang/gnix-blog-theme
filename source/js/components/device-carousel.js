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

class DeviceCarousel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    this.setupIntersectionObserver();
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
      }

      .showcase-track:hover {
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

      /* Pause animation when not visible to save resources */
      @media (prefers-reduced-motion: reduce) {
        .showcase-track {
          animation: none;
        }
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
        <div class="showcase-label">${device.name}</div>
        <div class="showcase-content">
          <img src="${device.image}" alt="${device.alt}" class="device-image" loading="lazy"/>
        </div>
        <div class="showcase-meta">${device.specs}</div>
      </div>
    `,
      )
      .join("");

    this.shadowRoot.innerHTML = `
      <style>${style}</style>
      <div class="showcase-container">
        <div class="showcase-track">
          ${cardsHTML}
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

  // Pause animation when not visible
  setupIntersectionObserver() {
    const track = this.shadowRoot.querySelector(".showcase-track");
    if (!track) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            track.style.animationPlayState = "running";
          } else {
            track.style.animationPlayState = "paused";
          }
        });
      },
      { threshold: 0.1 },
    );

    observer.observe(this);
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
