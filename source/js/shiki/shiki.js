// Constants and Configuration
const SELECTORS = {
  figureHighlight: "figure.shiki",
  preCode: "pre code",
  preShiki: "pre.shiki",
  expandBtn: ".code-expand-btn",
};

const CLASSES = {
  copyTrue: "copy-true",
  closed: "closed",
  wrapActive: "wrap-active",
  expandDone: "expand-done",
};

showAlert = (element, text, duration = 800) => {
  element.textContent = text;
  element.style.opacity = 1;
  element.style.visibility = "visible";
  setTimeout(() => {
    element.style.opacity = 0;
    element.style.visibility = "hidden";
  }, duration);
};

// Feature Handlers
const FeatureHandlers = {
  async copy(parentElement, clickElement) {
    const buttonParent = parentElement.parentNode;
    buttonParent.classList.add(CLASSES.copyTrue);

    const codeElement = buttonParent.querySelector(SELECTORS.preCode);
    await navigator.clipboard.writeText(codeElement.innerText);
    showAlert(clickElement.previousElementSibling, "Copied");

    buttonParent.classList.remove(CLASSES.copyTrue);
  },

  toggleWrap(element) {
    const code = element
      .closest(SELECTORS.figureHighlight)
      .querySelector("code");

    function setWrap(enabled) {
      Object.assign(code.style, {
        whiteSpace: enabled ? "pre-wrap" : "pre",
        wordBreak: enabled ? "break-all" : "normal",
        overflowWrap: enabled ? "anywhere" : "normal",
      });

      element.classList.toggle(CLASSES.wrapActive, enabled);
    }
    setWrap(code.style.whiteSpace !== "pre-wrap");
  },

  expandCode(figure) {
    const expandBtn = figure.querySelector(SELECTORS.expandBtn);
    const pre = figure.querySelector(SELECTORS.preShiki);
    const isExpanded = figure.classList.contains("expanded");
    const showLines = parseInt(figure.dataset.maxLines || "10", 10);

    if (isExpanded) {
      const computedStyle = getComputedStyle(pre);
      const lineHeight = parseFloat(computedStyle.lineHeight) || 20;
      const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
      const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
      const targetHeight = showLines * lineHeight + paddingTop + paddingBottom;

      figure.classList.remove("expanded");
      pre.style.maxHeight = `${targetHeight}px`;
      expandBtn.classList.remove(CLASSES.expandDone);
    } else {
      const fullHeight = pre.scrollHeight;

      figure.classList.add("expanded");
      pre.style.maxHeight = `${fullHeight}px`;
      expandBtn.classList.add(CLASSES.expandDone);

      setTimeout(() => {
        pre.style.maxHeight = "none";
      }, 300);
    }
  },
};

function handleToolbarClick(event) {
  const target = event.target;
  const classList = target.classList;

  const handlers = {
    expand: () => FeatureHandlers.expandCode(this),
    "copy-button": () => FeatureHandlers.copy(this, target),
    "toggle-wrap": () => FeatureHandlers.toggleWrap(this),
  };

  for (const [className, handler] of Object.entries(handlers)) {
    if (classList.contains(className)) {
      handler();
      break;
    }
  }
}

// Code expand button event handler
function handleExpandBtnClick(event) {
  event.preventDefault();
  event.stopPropagation();

  const expandBtn = event.currentTarget;
  const figure = expandBtn.closest(SELECTORS.figureHighlight);

  if (figure) {
    FeatureHandlers.expandCode(figure);
  }
}

// Main initialization function
function addHighlightTool() {
  const figures = document.querySelectorAll(SELECTORS.figureHighlight);
  if (!figures.length) return;

  figures.forEach((figure) => {
    if (figure.hasAttribute("data-shiki-initialized")) return;
    figure.setAttribute("data-shiki-initialized", "true");

    // Add event listener to existing shiki-tools
    const toolbar = figure.querySelector(".shiki-tools");
    if (toolbar) {
      toolbar.addEventListener("click", handleToolbarClick);
    }

    // Add event listener to code expand button
    const expandBtn = figure.querySelector(SELECTORS.expandBtn);
    if (expandBtn) {
      expandBtn.addEventListener("click", handleExpandBtnClick);
    }

    // Initialize collapsed state for collapsible code blocks
    if (figure.dataset.collapsible === "true") {
      const pre = figure.querySelector(SELECTORS.preShiki);
      const showLines = parseInt(figure.dataset.maxLines || "10", 10);

      if (pre) {
        // 确保元素已经渲染完成后再设置高度
        requestAnimationFrame(() => {
          const lineHeight = parseFloat(getComputedStyle(pre).lineHeight) || 20;
          const maxHeight = showLines * lineHeight;
          pre.style.maxHeight = `${maxHeight}px`;
          pre.style.overflow = "hidden";
        });
      }
    }
  });
} // Event listeners

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", addHighlightTool);
} else {
  addHighlightTool();
}
