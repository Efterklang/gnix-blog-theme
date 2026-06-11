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
let accordionId = 0;

class Accordion extends HTMLElement {
  connectedCallback() {
    this.injectStyles();
    this.render();
  }

  injectStyles() {
    if (styleSheetInjected) return;

    const style = `
      x-accordion {
        display: block;
        interpolate-size: allow-keywords;
        margin: 1em 0;
      }

      x-accordion > details.accordion-item {
        border-bottom: 1px solid var(--surface0);
        margin: 0;
        padding: 0;
      }

      x-accordion > details.accordion-item:last-child {
        border-bottom: none;
      }

      x-accordion .accordion-header {
        width: 100%;
        padding: 16px 0;
        border: none;
        color: var(--text);
        background: transparent;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        font-size: 0.875em;
        line-height: 1.45;
        list-style: none;
        transition: color 0.2s;
        text-align: left;
        user-select: none;
      }

      x-accordion .accordion-header::-webkit-details-marker,
      x-accordion .accordion-header::marker {
        display: none;
        content: "";
      }

      x-accordion .accordion-header:hover {
        color: var(--subtext0);
      }

      x-accordion .accordion-icon {
        font-size: 16px;
        font-weight: 300;
        color: var(--subtext0);
        transition: transform 0.2s ease;
        flex-shrink: 0;
        display: inline-flex;
        width: 16px;
        justify-content: center;
      }

      x-accordion > details.accordion-item[open] > .accordion-header .accordion-icon {
        transform: rotate(45deg);
      }

      x-accordion > details.accordion-item::details-content {
        block-size: 0;
        overflow: clip;
        transition:
          block-size 0.3s ease,
          content-visibility 0.3s ease allow-discrete;
      }

      x-accordion > details.accordion-item[open]::details-content {
        block-size: auto;
      }

      x-accordion .accordion-content {
        overflow: clip;
      }

      x-accordion .accordion-content-inner {
        padding: 0 0 16px 28px;
        color: var(--subtext1);
        font-size: 14px;
        line-height: 1.6;
      }

      @media (prefers-reduced-motion: reduce) {
        x-accordion .accordion-icon,
        x-accordion > details.accordion-item::details-content {
          transition: none;
        }
      }
    `;

    const styleEl = document.createElement("style");
    styleEl.textContent = style;
    document.head.appendChild(styleEl);
    styleSheetInjected = true;
  }

  get accordionName() {
    const name = this.getAttribute("name");
    if (name) return name;

    if (!this._accordionName) {
      accordionId += 1;
      this._accordionName = `x-accordion-${accordionId}`;
    }

    return this._accordionName;
  }

  render() {
    const items = Array.from(this.querySelectorAll("accordion-item"));
    if (items.length === 0) return; // Already rendered or empty

    const fragment = document.createDocumentFragment();
    const accordionName = this.accordionName;

    items.forEach((item) => {
      const details = document.createElement("details");
      details.className = "accordion-item";
      details.setAttribute("name", accordionName);
      if (item.hasAttribute("open")) details.open = true;

      const summary = document.createElement("summary");
      summary.className = "accordion-header";

      const icon = document.createElement("span");
      icon.className = "accordion-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = "+";

      const title = document.createElement("span");
      title.textContent = item.getAttribute("title") || "Item";

      const content = document.createElement("div");
      content.className = "accordion-content";

      const contentInner = document.createElement("div");
      contentInner.className = "accordion-content-inner content";

      // Filter out nested accordion-item elements to handle malformed HTML.
      const contentNodes = Array.from(item.childNodes).filter((node) => {
        return node.nodeType !== Node.ELEMENT_NODE || node.tagName.toLowerCase() !== "accordion-item";
      });

      contentInner.append(...contentNodes);
      content.append(contentInner);
      summary.append(icon, title);
      details.append(summary, content);
      fragment.append(details);
    });

    this.replaceChildren(fragment);
  }

  // Public method to expand a specific item by index
  expandItem(index) {
    const items = Array.from(this.querySelectorAll("details.accordion-item"));
    const target = items[index];
    if (!target) return;

    items.forEach((item) => {
      item.open = item === target;
    });
  }

  // Public method to collapse all items
  collapseAll() {
    this.querySelectorAll("details.accordion-item").forEach((item) => {
      item.open = false;
    });
  }

  static get observedAttributes() {
    return ["name"];
  }

  attributeChangedCallback() {
    this.querySelectorAll("details.accordion-item").forEach((item) => {
      item.setAttribute("name", this.accordionName);
    });
  }
}

// Define accordion-item as a placeholder for slot content
class AccordionItem extends HTMLElement {}

// Register custom elements
customElements.define("x-accordion", Accordion);
customElements.define("accordion-item", AccordionItem);

export { Accordion, AccordionItem };
