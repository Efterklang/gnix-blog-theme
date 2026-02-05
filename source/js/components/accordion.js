/**
 * Accordion Custom Element
 *
 * Usage:
 * <x-accordion>
 *   <accordion-item title="Introduction">
 *     Content here...
 *   </accordion-item>
 *   <accordion-item title="Design Patterns">
 *     More content...
 *   </accordion-item>
 * </x-accordion>
 */

let styleSheetInjected = false;

class Accordion extends HTMLElement {
  connectedCallback() {
    this.injectStyles();
    this.render();
    this.setupListeners();
  }

  injectStyles() {
    if (styleSheetInjected) return;

    const style = `
      x-accordion {
        display: block;
        margin: 1em 0;
      }

      .accordion-item {
        border-bottom: 1px solid var(--surface0);
      }

      .accordion-item:last-child {
        border-bottom: none;
      }

      .accordion-header {
        width: 100%;
        padding: 16px 0;
        border: none;
        color: var(--text);
        background: transparent;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        transition: color 0.2s;
        text-align: left;
        & :hover {
         color: var(--subtext0);
        }
      }

      .accordion-icon {
        font-size: 16px;
        font-weight: 300;
        color: var(--subtext0);
        transition: transform 0.2s ease;
        flex-shrink: 0;
        display: inline-flex;
        width: 16px;
        justify-content: center;
      }

      .accordion-item.active .accordion-icon {
        transform: rotate(45deg);
      }

      .accordion-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
      }

      .accordion-content-inner {
        padding: 0 0 16px 28px;
        color: var(--subtext1);
        font-size: 14px;
        line-height: 1.6;
      }
    `;

    const styleEl = document.createElement("style");
    styleEl.textContent = style;
    document.head.appendChild(styleEl);
    styleSheetInjected = true;
  }

  render() {
    const items = this.querySelectorAll("accordion-item");
    if (items.length === 0) return; // Already rendered or empty

    const itemsHTML = Array.from(items)
      .map((item) => {
        const title = item.getAttribute("title") || "Item";

        // Filter out nested accordion-item elements to handle malformed HTML
        const contentNodes = Array.from(item.childNodes).filter((node) => {
          return node.nodeType !== Node.ELEMENT_NODE || node.tagName.toLowerCase() !== "accordion-item";
        });

        const content = contentNodes
          .map((node) => {
            return node.nodeType === Node.TEXT_NODE ? node.textContent : node.outerHTML;
          })
          .join("");

        return `
        <div class="accordion-item">
          <button class="accordion-header" aria-expanded="false">
            <span class="accordion-icon">+</span>
            <span>${title}</span>
          </button>
          <div class="accordion-content">
            <div class="accordion-content-inner content">${content}</div>
          </div>
        </div>
      `;
      })
      .join("");

    this.innerHTML = itemsHTML;
  }

  setupListeners() {
    const headers = this.querySelectorAll(".accordion-header");

    headers.forEach((header) => {
      header.addEventListener("click", () => {
        const item = header.closest(".accordion-item");
        const isActive = item.classList.contains("active");
        const content = item.querySelector(".accordion-content");

        // Close all items (accordion mode - single expansion)
        this.querySelectorAll(".accordion-item").forEach((i) => {
          i.classList.remove("active");
          i.querySelector(".accordion-header").setAttribute("aria-expanded", "false");
          const c = i.querySelector(".accordion-content");
          if (c) c.style.maxHeight = null;
        });

        // Open clicked item if it wasn't active
        if (!isActive) {
          item.classList.add("active");
          header.setAttribute("aria-expanded", "true");
          if (content) {
            content.style.maxHeight = `${content.scrollHeight}px`;
          }
        }
      });
    });
  }

  // Public method to expand a specific item by index
  expandItem(index) {
    const items = this.querySelectorAll(".accordion-item");
    if (items[index]) {
      items[index].querySelector(".accordion-header").click();
    }
  }

  // Public method to collapse all items
  collapseAll() {
    this.querySelectorAll(".accordion-item").forEach((item) => {
      item.classList.remove("active");
      item.querySelector(".accordion-header").setAttribute("aria-expanded", "false");
      const content = item.querySelector(".accordion-content");
      if (content) content.style.maxHeight = null;
    });
  }

  static get observedAttributes() {
    return ["single-expand"];
  }

  attributeChangedCallback() {
    // Future: support multi-expand mode
  }
}

// Define accordion-item as a placeholder for slot content
class AccordionItem extends HTMLElement {}

// Register custom elements
customElements.define("x-accordion", Accordion);
customElements.define("accordion-item", AccordionItem);

export { Accordion, AccordionItem };
