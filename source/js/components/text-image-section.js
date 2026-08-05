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
 * - alt: Image alt text (also used as figcaption)
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
  }

  connectedCallback() {
    this.injectStyles();
    this.render();
    this.initZoom();
  }

  initZoom() {
    // main.js 的委托监听会处理点击，这里只需打上标记
    const img = this.querySelector(".ti-figure img");
    if (img) {
      img.dataset.zoomable = "true";
      img.style.cursor = "zoom-in";
    }
  }

  injectStyles() {
    if (styleSheetInjected) return;

    const style = `
      text-image-section {
        /* flow-root establishes a BFC so floats are contained
           and parent block formatting (e.g. blockquote borders)
           don't visually bleed into the image area */
        display: flow-root;
        margin: 1em 0;
        font-family: var(--ti-font-family, inherit);
        font-size: var(--ti-font-size);
        color: var(--ti-color, inherit);
        line-height: 1.8;
      }

      text-image-section > .ti-figure {
        float: right;
        width: var(--ti-image-width, 300px);
        margin: 0 0 12px 24px;
      }

      text-image-section[left] > .ti-figure {
        float: left;
        margin: 0 24px 12px 0;
      }

      text-image-section .ti-figure img {
        display: block;
        width: 100%;
        height: auto;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      text-image-section .ti-figure figcaption {
        font-family: var(--font-serif);
        font-size: 0.875em;
        color: var(--subtext0);
        text-align: center;
        margin-top: 8px;
        font-style: italic;
      }

      /* Tame nested blockquotes inside the text area so they
         don't fight the image's float/stacked layout. */
      text-image-section > blockquote {
        margin: 0;
      }

      @media (max-width: 640px) {
        text-image-section > .ti-figure,
        text-image-section[left] > .ti-figure {
          float: none;
          width: auto;
          /* Bottom margin separates the figure from any following
             blockquote so its left border doesn't visually align
             with the image edge */
          margin: 0 0 20px 0;
        }

        /* When a blockquote follows the figure on mobile, give it
           a touch more breathing room from the image above */
        text-image-section > .ti-figure + blockquote {
          margin-top: 4px;
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
    const fontFamily = this.getAttribute("font-family");
    const fontSize = this.getAttribute("font-size");
    const color = this.getAttribute("color");

    // Apply CSS variables directly to the host element so we no
    // longer need a wrapping <div> just to hold inline styles.
    this.style.setProperty("--ti-image-width", imageWidth);
    if (fontFamily) this.style.setProperty("--ti-font-family", fontFamily);
    if (fontSize) this.style.setProperty("--ti-font-size", fontSize);
    if (color) this.style.setProperty("--ti-color", color);

    // Without an image we have nothing extra to inject — leave the
    // user's original markdown/HTML content in place.
    if (!image) return;

    const figure = document.createElement("figure");
    figure.className = "ti-figure";

    const img = document.createElement("img");
    img.src = image;
    img.alt = alt;
    img.loading = "lazy";
    figure.appendChild(img);

    if (alt) {
      const figcaption = document.createElement("figcaption");
      figcaption.textContent = alt;
      figure.appendChild(figcaption);
    }

    // Prepend the <figure> so the existing user content (text,
    // blockquotes, paragraphs, etc.) stays as direct children of
    // the host element. This preserves semantic structure and
    // avoids re-parsing innerHTML.
    this.insertBefore(figure, this.firstChild);
  }
}

customElements.define("text-image-section", TextImageSection);

export { TextImageSection };
