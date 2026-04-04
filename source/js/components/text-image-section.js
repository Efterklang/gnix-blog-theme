/**
 * Text-Image Section Custom Element
 * A responsive text-image layout component
 *
 * Usage:
 * <text-image-section
 *   image="https://example.com/image.jpg"
 *   alt="Image description"
 *   width="300px"
 * >
 *   Your text content here...
 * </text-image-section>
 *
 * Attributes:
 * - image: Image URL (required)
 * - alt: Image alt text
 * - width: Image width (default: 300px)
 * - left: Put image on left (default: image on right)
 * - font-family: Text font family
 * - font-size: Text font size (default: 0.8rem)
 * - color: Text color
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
        /* Clearfix to contain float */
        overflow: hidden;
      }

      .ti-container::after {
        content: "";
        display: table;
        clear: both;
      }

      .ti-text {
        line-height: 1.8;
        font-family: var(--ti-font-family, inherit);
        font-size: var(--ti-font-size, 1rem);
        color: var(--ti-color, inherit);
      }

      .ti-image {
        float: right;
        width: var(--ti-image-width, 300px);
        margin-left: 24px;
        margin-bottom: 12px;
      }

      .ti-container.image-left .ti-image {
        float: left;
        margin-left: 0;
        margin-right: 24px;
      }

      .ti-image img {
        width: 100%;
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
        .ti-image,
        .ti-container.image-left .ti-image {
          float: none;
          width: 100%;
          margin: 0 0 16px 0;
          --ti-image-width: 100%;
        }

        .ti-image img {
          width: 100%;
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
    const imageWidth = this.getAttribute("width") || "300px";
    const imageLeft = this.hasAttribute("left");
    const fontFamily = this.getAttribute("font-family");
    const fontSize = this.getAttribute("font-size");
    const color = this.getAttribute("color");
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

    const containerClass = imageLeft ? "ti-container image-left" : "ti-container";

    const figureHtml = alt
      ? `<figure>
          <img src="${image}" alt="${alt}" loading="lazy">
          <figcaption>${alt}</figcaption>
        </figure>`
      : `<img src="${image}" alt="${alt}" loading="lazy">`;

    const styleAttrs = [];
    styleAttrs.push(`--ti-image-width: ${imageWidth};`);
    if (fontFamily) styleAttrs.push(`--ti-font-family: ${fontFamily};`);
    if (fontSize) styleAttrs.push(`--ti-font-size: ${fontSize};`);
    if (color) styleAttrs.push(`--ti-color: ${color};`);
    this.innerHTML = `
      <div class="${containerClass}" style="${styleAttrs.join(" ")}">
        <div class="ti-image">
          ${figureHtml}
        </div>
        <div class="ti-text">${content}</div>
      </div>
    `;
  }
}

customElements.define("text-image-section", TextImageSection);

export { TextImageSection };
