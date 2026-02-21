/**
 * Text-Image Section Custom Element
 * A responsive text-image layout component
 *
 * Usage:
 * <text-image-section
 *   image="https://example.com/image.jpg"
 *   alt="Image description"
 *   image-width="300px"
 * >
 *   Your text content here...
 * </text-image-section>
 *
 * Attributes:
 * - image: Image URL (required)
 * - alt: Image alt text
 * - image-width: Image width (default: 300px)
 * - reverse: Reverse layout (image on left, text on right)
 * - breakpoint: Mobile breakpoint (default: 640px)
 */

let styleSheetInjected = false;

class TextImageSection extends HTMLElement {
  constructor() {
    super();
    this._rendered = false;
    this._originalContent = null;
  }

  connectedCallback() {
    this.injectStyles();
    this.render();
  }

  injectStyles() {
    if (styleSheetInjected) return;

    const style = `
      text-image-section {
        display: block;
        margin: 1em 0;
      }

      .ti-container {
        display: flex;
        flex-wrap: wrap;
        gap: 24px;
        align-items: flex-start;
      }

      .ti-container.reverse {
        flex-direction: row-reverse;
      }

      .ti-text {
        flex: 1;
        min-width: 280px;
        line-height: 1.8;
      }

      .ti-image {
        flex: 0 0 var(--ti-image-width, 300px);
        display: flex;
        justify-content: center;
        align-items: flex-start;
      }

      .ti-image img {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .ti-image figure {
        margin: 0;
      }

      .ti-image figcaption {
        font-family: var(--font-serif);
        font-size: 0.875em;
        color: var(--subtext0);
        text-align: center;
        margin-top: 8px;
        font-style: italic;
      }

      @media (max-width: 640px) {
        .ti-container,
        .ti-container.reverse {
          flex-direction: column;
        }

        .ti-image {
          flex: none;
          width: 100%;
          --ti-image-width: 100%;
        }

        .ti-image img {
          max-width: 100%;
        }
      }
    `;

    const styleEl = document.createElement("style");
    styleEl.textContent = style;
    document.head.appendChild(styleEl);
    styleSheetInjected = true;
  }

  render() {
    if (this._rendered) return;
    this._rendered = true;

    const image = this.getAttribute("image");
    const alt = this.getAttribute("alt") || "";
    const imageWidth = this.getAttribute("image-width") || "300px";
    const reverse = this.hasAttribute("reverse");

    const contentNodes = Array.from(this.childNodes).filter((node) => {
      return node.nodeType !== Node.ELEMENT_NODE || node.tagName.toLowerCase() !== "text-image-section";
    });

    const content = contentNodes
      .map((node) => {
        return node.nodeType === Node.TEXT_NODE ? node.textContent : node.outerHTML;
      })
      .join("")
      .trim();

    if (!image) {
      this.innerHTML = `<div class="ti-container"><div class="ti-text">${content}</div></div>`;
      return;
    }

    const containerClass = reverse ? "ti-container reverse" : "ti-container";

    const figureHtml = alt
      ? `<figure>
          <img src="${image}" alt="${alt}" loading="lazy">
          <figcaption>${alt}</figcaption>
        </figure>`
      : `<img src="${image}" alt="${alt}" loading="lazy">`;

    this.innerHTML = `
      <div class="${containerClass}" style="--ti-image-width: ${imageWidth};">
        <div class="ti-text">${content}</div>
        <div class="ti-image">
          ${figureHtml}
        </div>
      </div>
    `;
  }
}

customElements.define("text-image-section", TextImageSection);

export { TextImageSection };
