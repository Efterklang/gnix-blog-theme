// #region mdit@tab-plugin
/**
 * 初始化页面上所有的 Tab 组件
 */
function initializeTabs() {
  // 选取页面上所有的 Tab 容器
  const tabContainers = document.querySelectorAll(".tabs-tabs-wrapper");

  tabContainers.forEach((container) => {
    // 先移除已有事件（防止PJAX重复绑定）
    const buttons = container.querySelectorAll(".tabs-tab-button");
    buttons.forEach((button) => {
      // 移除旧事件，避免叠加
      button.removeEventListener("click", handleTabClick);
      button.addEventListener("click", handleTabClick);
    });
  });
}

// 抽离Tab点击处理函数，方便移除事件
function handleTabClick() {
  const tabContainer = this.closest(".tabs-tabs-wrapper");
  const targetIndex = this.getAttribute("data-tab");
  const syncId = this.getAttribute("data-id");
  activateTab(tabContainer, targetIndex);
  if (syncId) {
    syncRelatedTabs(syncId);
  }
}

/**
 * 激活指定容器中的特定 Tab
 * @param {HTMLElement} container - Tab 容器元素
 * @param {string} targetIndex - 要激活的 Tab 的 data-tab 值
 */
function activateTab(container, targetIndex) {
  // 先重置该容器内所有 Tab 的状态
  resetTabsState(container);

  const buttonToActivate = container.querySelector(
    `.tabs-tab-button[data-tab="${targetIndex}"]`,
  );
  const contentToActivate = container.querySelector(
    `.tabs-tab-content[data-index="${targetIndex}"]`,
  );

  if (buttonToActivate) {
    buttonToActivate.classList.add("active");
    buttonToActivate.setAttribute("data-active", "");
  }
  if (contentToActivate) {
    contentToActivate.classList.add("active");
    contentToActivate.setAttribute("data-active", "");
  }
}

/**
 * 重置指定容器内所有 Tab 按钮和内容面板的状态
 * @param {HTMLElement} container - Tab 容器元素
 */
function resetTabsState(container) {
  const buttons = container.querySelectorAll(".tabs-tab-button");
  const contents = container.querySelectorAll(".tabs-tab-content");

  buttons.forEach((btn) => {
    btn.classList.remove("active");
    btn.removeAttribute("data-active");
  });
  contents.forEach((content) => {
    content.classList.remove("active");
    content.removeAttribute("data-active");
  });
}

/**
 * 同步所有具有相同 data-id 的关联 Tab
 * @param {string} syncId - 用于同步的 data-id
 */
function syncRelatedTabs(syncId) {
  const relatedButtons = document.querySelectorAll(
    `.tabs-tab-button[data-id="${syncId}"]`,
  );

  relatedButtons.forEach((button) => {
    const container = button.closest(".tabs-tabs-wrapper");
    const targetIndex = button.getAttribute("data-tab");
    activateTab(container, targetIndex);
  });
}

// #endregion

// #region Keyboard Shortcuts

function handleKeyDown(e) {
  const isModifier = e.metaKey || e.ctrlKey;
  if (!isModifier) return;

  const tag = e.target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) {
    return;
  }

  if (e.code === "KeyK") {
    e.preventDefault();
    const searchBtn = document.querySelector(".navbar-main .search");
    if (searchBtn) searchBtn.click();
  } else if ((e.shiftKey && e.code === "KeyP") || e.code === "KeyP") {
    e.preventDefault();
    window.openThemeModal?.();
  }
}

function handleMermaid() {
  const containers = document.querySelectorAll(".mermaid-container");
  if (containers.length === 0) return;

  const cssUrl = "/css/optional/mermaid.css";
  const adapterUrl = "/js/mdit/mermaid.js";

  if (!document.querySelector(`link[href="${cssUrl}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssUrl;
    document.head.appendChild(link);
  }

  const runInit = () => {
    const isNight = document.documentElement.classList.contains("night");
    const theme = isNight ? "dark" : "default";
    const libUrl = "/js/host/mermaid/mermaid.min.js";

    containers.forEach((container, index) => {
      if (!container.id) {
        container.id = `mermaid-${Date.now()}-${index}`;
      }
      if (window.initMermaidDiagram) {
        window.initMermaidDiagram(container.id, libUrl, theme, {});
      }
    });
  };

  if (window.initMermaidDiagram) {
    runInit();
  } else {
    const existingScript = document.querySelector(
      `script[src="${adapterUrl}"]`,
    );
    if (existingScript) {
      existingScript.addEventListener("load", runInit);
    } else {
      const script = document.createElement("script");
      script.src = adapterUrl;
      script.onload = runInit;
      document.head.appendChild(script);
    }
  }
}

// #endregion

function initLogic() {
  initializeTabs();
  handleMermaid();
  mediumZoom(".article img", {
    background: "hsla(from var(--mantle) / 0.9)",
  });
  if (document.getElementById("twikoo")) {
    const initTwikoo = () => {
      if (window.twikoo && window.twikooConfig) {
        window.twikoo.init(window.twikooConfig);
      }
    };

    if (typeof twikoo !== "undefined") {
      initTwikoo();
    } else {
      const script = document.querySelector('script[src*="twikoo.all.min.js"]');
      if (script) {
        script.addEventListener("load", initTwikoo);
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initLogic();
});

// Re-initialize on page changes when using swup
if (typeof swup !== "undefined") {
  swup.hooks.on("page:view", (visit) => {
    console.log("New page loaded:", visit.to.url);
    initLogic();
  });
}

// Global functions
// biome-ignore lint/correctness/noUnusedVariables: used in <nav click="handleNavbarClick(event)">
function handleNavbarClick(e) {
  const target = e.target;
  const navbarBurger = document.querySelector(".navbar-burger");
  const navbarMenu = document.querySelector(".navbar-menu");

  if (!navbarBurger || !navbarMenu) return;

  // 处理 burger 点击
  if (target.closest(".navbar-burger")) {
    navbarBurger.classList.toggle("is-active");
    navbarMenu.classList.toggle("is-active");
    return;
  }

  // 处理 item 点击
  if (target.closest(".navbar-item")) {
    if (navbarBurger.classList.contains("is-active")) {
      navbarBurger.classList.remove("is-active");
      navbarMenu.classList.remove("is-active");
    }
  }
}

function tableWrapFix() {
  document.querySelectorAll(".content table").forEach((table) => {
    if (
      table.hasAttribute("data-nowrap") ||
      table.parentElement.classList.contains("table-wrapper")
    ) {
      return;
    }
    // if width exceeds container, wrap it
    const wrapper = document.createElement("div");
    Object.assign(wrapper.style, {
      width: "100%",
      overflowX: "auto",
    });
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
}

tableWrapFix();
document.addEventListener("keydown", handleKeyDown, {
  capture: true, // 捕获阶段监听，优先于浏览器默认处理
  passive: false, // 允许调用 preventDefault
});
