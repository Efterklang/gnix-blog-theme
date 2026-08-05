/**
 * Tabs Custom Element
 *
 * Usage:
 * <x-tabs>
 *   <x-tab title="JavaScript" sync-id="js" active>
 *     Content here...
 *   </x-tab>
 *   <x-tab title="CSS" sync-id="css">
 *     More content...
 *   </x-tab>
 * </x-tabs>
 */

let styleSheetInjected = false;
let tabsCounter = 0;

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value;
  return span.innerHTML;
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

class Tabs extends HTMLElement {
  connectedCallback() {
    this.injectStyles();
    this.render();
    if (!this.hasAttribute("data-initialized")) {
      this.setupListeners();
      this.setAttribute("data-initialized", "true");
    }
  }

  injectStyles() {
    if (styleSheetInjected) return;

    const style = `
      x-tabs {
        display: block;
        overflow: hidden;
        margin: var(--tabs-margin, 10px auto);
      }

      .x-tabs-header {
        display: flex;
        gap: var(--tabs-header-gap, 0);
        padding: var(--tabs-header-padding, 0 0.5rem);
        white-space: nowrap;
        overflow-x: auto;
        overflow-y: hidden;
      }

      .x-tabs-tab {
        flex: 0 0 auto;
        padding: var(--tabs-tab-padding, 0.5em 1rem);
        border: none;
        border-bottom: var(--tabs-tab-border-width, 2px) solid transparent;
        background: transparent;
        color: var(--tabs-tab-color, var(--subtext0));
        font: inherit;
        cursor: pointer;
        position: relative;
        transition:
          color 0.3s ease,
          border-color 0.3s ease;
        outline: 0;
        white-space: nowrap;
      }

      .x-tabs-tab:hover,
      .x-tabs-tab[aria-selected="true"] {
        color: var(--tabs-tab-active-color, var(--text));
        border-color: var(--tabs-tab-active-border-color, var(--text));
      }

      .x-tabs-tab:focus-visible {
        outline: 2px solid var(--tabs-focus-color, var(--text));
        outline-offset: 2px;
      }

      .x-tabs-panels {
        padding: var(--tabs-panel-padding, 0.8em 0 10px 0);
      }

      .x-tabs-panel[hidden] {
        display: none;
      }
    `;

    const styleEl = document.createElement("style");
    styleEl.textContent = style;
    document.head.appendChild(styleEl);
    styleSheetInjected = true;
  }

  render() {
    const tabs = Array.from(this.children).filter((child) => child.tagName.toLowerCase() === "x-tab");
    if (tabs.length === 0) return;

    const instanceId = tabsCounter++;
    const activeIndex = Math.max(
      0,
      tabs.findIndex((tab) => tab.hasAttribute("active")),
    );

    const headers = tabs
      .map((tab, index) => {
        const title = tab.getAttribute("title") || `Tab ${index + 1}`;
        const syncId = tab.getAttribute("sync-id") || "";
        const selected = index === activeIndex;

        return `
          <button
            class="x-tabs-tab"
            type="button"
            role="tab"
            id="x-tabs-${instanceId}-tab-${index}"
            aria-controls="x-tabs-${instanceId}-panel-${index}"
            aria-selected="${selected}"
            tabindex="${selected ? "0" : "-1"}"
            data-index="${index}"
            ${syncId ? `data-sync-id="${escapeAttribute(syncId)}"` : ""}
          >${escapeHtml(title)}</button>
        `;
      })
      .join("");

    const panels = tabs
      .map((tab, index) => {
        const content = Array.from(tab.childNodes)
          .map((node) => (node.nodeType === Node.TEXT_NODE ? node.textContent : node.outerHTML))
          .join("");
        const selected = index === activeIndex;

        return `
          <div
            class="x-tabs-panel content"
            role="tabpanel"
            id="x-tabs-${instanceId}-panel-${index}"
            aria-labelledby="x-tabs-${instanceId}-tab-${index}"
            data-index="${index}"
            ${selected ? "" : "hidden"}
          >${content}</div>
        `;
      })
      .join("");

    this.innerHTML = `
      <div class="x-tabs-header" role="tablist">
        ${headers}
      </div>
      <div class="x-tabs-panels">
        ${panels}
      </div>
    `;
  }

  setupListeners() {
    this.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : event.target.parentElement;
      const button = target?.closest(".x-tabs-tab");
      if (!button || !this.contains(button)) return;

      this.activateTab(Number(button.dataset.index));
      this.syncRelatedTabs(button.dataset.syncId);
    });

    this.addEventListener("keydown", (event) => {
      const target = event.target instanceof Element ? event.target : event.target.parentElement;
      const button = target?.closest(".x-tabs-tab");
      if (!button || !this.contains(button)) return;

      const buttons = this.tabButtons;
      const currentIndex = buttons.indexOf(button);
      let nextIndex = currentIndex;

      switch (event.key) {
        case "ArrowLeft":
        case "ArrowUp":
          nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
          break;
        case "ArrowRight":
        case "ArrowDown":
          nextIndex = (currentIndex + 1) % buttons.length;
          break;
        case "Home":
          nextIndex = 0;
          break;
        case "End":
          nextIndex = buttons.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      buttons[nextIndex]?.focus();
      this.activateTab(nextIndex);
      this.syncRelatedTabs(buttons[nextIndex]?.dataset.syncId);
    });
  }

  get tabButtons() {
    return Array.from(this.querySelectorAll(".x-tabs-tab"));
  }

  activateTab(index) {
    if (!Number.isInteger(index)) return;

    const buttons = this.tabButtons;
    const panels = Array.from(this.querySelectorAll(".x-tabs-panel"));

    buttons.forEach((button, buttonIndex) => {
      const selected = buttonIndex === index;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });

    panels.forEach((panel, panelIndex) => {
      panel.hidden = panelIndex !== index;
    });
  }

  syncRelatedTabs(syncId) {
    if (!syncId) return;

    document.querySelectorAll(".x-tabs-tab[data-sync-id]").forEach((button) => {
      if (button.dataset.syncId !== syncId) return;

      const tabs = button.closest("x-tabs");
      if (!tabs || tabs === this) return;
      tabs.activateTab(Number(button.dataset.index));
    });
  }
}

class Tab extends HTMLElement {}

if (!customElements.get("x-tabs")) customElements.define("x-tabs", Tabs);
if (!customElements.get("x-tab")) customElements.define("x-tab", Tab);

export { Tab, Tabs };
