// Mermaid 图的浏览器端外壳：全屏预览 / 平移缩放 / 复制源码，以及回退图的 mermaid.js 渲染。
// 大多数图已在构建期由 agentic-mermaid 内联为 SVG（include/hexo/mdit/mermaid.js），
// 颜色走 CSS 变量随主题即时切换，这里只挂交互；只有 data-mermaid-renderer="mermaid-js"
// 的回退图才加载 mermaid.min.js 并监听主题重渲染
(() => {
  const instances = new Map();
  const mermaidFontFamily = "Avenir, system-ui";
  let mermaidPromise = null;
  let renderSeq = 0;
  let activePreview = null;

  const isZhLocale = () => (document.documentElement.lang || "").toLowerCase().startsWith("zh");

  const getUiText = (key) => {
    const zh = isZhLocale();
    const messages = {
      copied: zh ? "已复制" : "Copied!",
      copyCode: zh ? "复制代码" : "Copy Code",
      preview: zh ? "全屏预览" : "Fullscreen preview",
      previewTitle: zh ? "图表预览" : "Diagram preview",
      closePreview: zh ? "关闭全屏预览" : "Close fullscreen preview",
      panDown: zh ? "向下平移" : "Pan down",
      panLeft: zh ? "向左平移" : "Pan left",
      panRight: zh ? "向右平移" : "Pan right",
      panUp: zh ? "向上平移" : "Pan up",
      resetView: zh ? "重置视图" : "Reset view",
      zoomIn: zh ? "放大" : "Zoom in",
      zoomOut: zh ? "缩小" : "Zoom out",
    };
    return messages[key] || key;
  };

  // 与现有 16px 工具栏图标保持相同尺寸和线条粗细。
  const previewIcon = (path) => `<svg class="mermaid-preview-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="${path}"/></svg>`;

  const previewButton = (label, path) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn";
    button.setAttribute("aria-label", label);
    button.title = label;
    button.innerHTML = previewIcon(path);
    return button;
  };

  const loadMermaid = (jsUrl) => {
    if (mermaidPromise) return mermaidPromise;
    if (window.mermaid) {
      mermaidPromise = Promise.resolve(window.mermaid);
      return mermaidPromise;
    }
    return (mermaidPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = jsUrl;
      script.onload = () => resolve(window.mermaid);
      script.onerror = reject;
      document.head.appendChild(script);
    }));
  };

  const sweepBodyLeftovers = () => {
    document.body.querySelectorAll(':scope > div[id^="d"][id*="-svg-"]').forEach((el) => el.remove());
  };

  const renderDiagram = async (id, code, container, themeVariables) => {
    const content = container.querySelector(".mermaid-content");
    const mermaid = await mermaidPromise;
    if (!content || !mermaid) return;

    const instance = instances.get(id);
    if (!instance) return;
    const version = (instance.renderVersion = ++renderSeq);

    const isNight = document.documentElement.classList.contains("night");
    mermaid.initialize({
      startOnLoad: false,
      theme: isNight ? "dark" : "default",
      darkMode: isNight,
      themeVariables: {
        ...themeVariables,
        fontFamily: mermaidFontFamily,
      },
      securityLevel: "strict",
      fontFamily: mermaidFontFamily,
      fontSize: 16,
    });

    // Render workspace must be inside our container, not document.body —
    // otherwise an interrupted render leaks a tall <div> onto <body> that
    // extends document height and tanks scroll repaint on later pages.
    try {
      const { svg } = await mermaid.render(`${id}-svg-${version}`, code, content);
      if (instance.renderVersion !== version) return;
      content.innerHTML = svg;
    } catch (error) {
      if (instance.renderVersion !== version) return;
      console.error("Mermaid rendering error:", error);
      content.innerHTML = `<p style="color: red;">Failed to render diagram: ${error.message}</p>`;
    } finally {
      sweepBodyLeftovers();
    }
  };

  class PanZoomHandler {
    constructor(container) {
      this.container = container;
      this.content = container.querySelector(".mermaid-content");
      this.viewContainer = container.querySelector(".mermaid-view-container");
      this.scale = 1;
      this.tx = 0;
      this.ty = 0;
      this.isDragging = false;
      this.startX = 0;
      this.startY = 0;
      this.wrapper = container.querySelector(".mermaid-wrapper");
      const toolbar = container.querySelector(".mermaid-toolbar");
      if (toolbar && !toolbar.querySelector(".preview-diagram")) {
        const button = previewButton(getUiText("preview"), "M6 2H2v4M10 2h4v4M14 10v4h-4M2 10v4h4");
        button.classList.add("preview-diagram");
        button.setAttribute("aria-haspopup", "dialog");
        toolbar.append(button);
      }
      this.localizeControls();
      this.initEvents();
    }

    localizeControls() {
      const labels = [
        [".copy-code", getUiText("copyCode")],
        [".preview-diagram", getUiText("preview")],
        [".up", getUiText("panUp")],
        [".down", getUiText("panDown")],
        [".left", getUiText("panLeft")],
        [".right", getUiText("panRight")],
        [".reset", getUiText("resetView")],
        [".zoom-in", getUiText("zoomIn")],
        [".zoom-out", getUiText("zoomOut")],
      ];

      labels.forEach(([selector, label]) => {
        this.container.querySelectorAll(selector).forEach((button) => {
          button.type = "button";
          button.setAttribute("aria-label", label);
          button.title = label;
        });
      });
    }

    openPreview() {
      if (activePreview || !this.content || !this.wrapper) return;

      const trigger = this.container.querySelector(".preview-diagram");
      const previousView = { scale: this.scale, tx: this.tx, ty: this.ty };
      const bounds = this.container.getBoundingClientRect();
      const style = getComputedStyle(this.container);
      const placeholder = document.createElement("div");
      placeholder.style.height = `${bounds.height}px`;
      placeholder.style.marginBlockStart = style.marginBlockStart;
      placeholder.style.marginBlockEnd = style.marginBlockEnd;
      placeholder.setAttribute("aria-hidden", "true");

      const dialog = document.createElement("dialog");
      dialog.className = "mermaid-preview";
      dialog.setAttribute("aria-label", getUiText("previewTitle"));
      const header = document.createElement("div");
      header.className = "mermaid-preview-header";
      const title = document.createElement("h2");
      title.className = "mermaid-preview-title";
      title.textContent = getUiText("previewTitle");
      const close = previewButton(getUiText("closePreview"), "m4 4 8 8M12 4l-8 8");
      close.autofocus = true;
      header.append(title, close);

      // 移动原节点，保留异步渲染与交互，并避免复制 SVG 的 defs/无障碍 ID。
      this.container.replaceWith(placeholder);
      dialog.append(header, this.container);
      placeholder.after(dialog);
      this.scale = 1;
      this.tx = 0;
      this.ty = 0;
      this.apply();

      let restored = false;
      const restore = () => {
        if (restored) return;
        restored = true;
        if (dialog.open) dialog.close();
        placeholder.replaceWith(this.container);
        Object.assign(this, previousView);
        this.apply();
        dialog.remove();
        activePreview = null;
        if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      };
      activePreview = { close: restore };
      close.addEventListener("click", restore);
      dialog.addEventListener("close", restore);
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        restore();
      });
      dialog.addEventListener("keydown", (event) => {
        if (event.key === "Escape") event.stopPropagation();
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        const action = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", "+": "zoom-in", "=": "zoom-in", "-": "zoom-out", "0": "reset" }[event.key];
        if (!action) return;
        event.preventDefault();
        event.stopPropagation();
        this.container.querySelector(`.${action}`)?.click();
      });

      try {
        dialog.showModal();
        close.focus({ preventScroll: true });
      } catch (error) {
        restore();
        console.warn("[mermaid] Unable to open preview:", error);
      }
    }

    apply() {
      if (this.content) {
        this.content.style.transform = `scale(${this.scale}) translate(${this.tx}px, ${this.ty}px)`;
      }
    }

    initEvents() {
      this.container.addEventListener("pointerdown", () => {
        this.wrapper?.classList.add("is-controls-visible");
      });

      document.addEventListener("pointerdown", (e) => {
        if (this.container.contains(e.target)) return;
        this.wrapper?.classList.remove("is-controls-visible");
      });

      // Toolbar & Grid Panel
      this.container.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const cl = btn.classList;

        if (cl.contains("preview-diagram")) {
          this.openPreview();
          return;
        }
        if (cl.contains("zoom-in")) this.scale = Math.min(this.scale * 1.2, 5);
        else if (cl.contains("zoom-out")) this.scale = Math.max(this.scale / 1.2, 0.2);
        else if (cl.contains("reset")) {
          this.scale = 1;
          this.tx = 0;
          this.ty = 0;
        } else if (cl.contains("up")) this.ty += 40;
        else if (cl.contains("down")) this.ty -= 40;
        else if (cl.contains("left")) this.tx += 40;
        else if (cl.contains("right")) this.tx -= 40;
        else if (cl.contains("copy-code")) this.copyCode(btn);

        this.apply();
      });

      if (!this.viewContainer) return;

      let activePointerId = null;
      let initialTranslateX = 0;
      let initialTranslateY = 0;

      const onMove = (event) => {
        if (activePointerId === null || event.pointerId !== activePointerId) return;
        event.preventDefault();
        this.tx = initialTranslateX + (event.clientX - this.startX) / this.scale;
        this.ty = initialTranslateY + (event.clientY - this.startY) / this.scale;
        this.apply();
      };

      const finishDrag = (event) => {
        if (activePointerId === null || event.pointerId !== activePointerId) return;
        activePointerId = null;
        this.isDragging = false;
        this.viewContainer.classList.remove("is-dragging");
        if (this.viewContainer.hasPointerCapture(event.pointerId)) {
          this.viewContainer.releasePointerCapture(event.pointerId);
        }
      };

      this.viewContainer.addEventListener("pointerdown", (event) => {
        if (!event.isPrimary || event.button !== 0 || activePointerId !== null || !this.content || event.target.closest("button, a, input, textarea, select, [contenteditable]")) return;

        const transform = getComputedStyle(this.content).transform;
        const matrix = new DOMMatrixReadOnly(transform === "none" ? undefined : transform);
        this.scale = matrix.a;
        this.tx = matrix.e / this.scale;
        this.ty = matrix.f / this.scale;
        this.startX = event.clientX;
        this.startY = event.clientY;
        initialTranslateX = this.tx;
        initialTranslateY = this.ty;
        this.viewContainer.classList.add("is-dragging");
        this.isDragging = true;
        this.apply();
        activePointerId = event.pointerId;
        this.viewContainer.setPointerCapture(activePointerId);
      });

      this.viewContainer.addEventListener("pointermove", onMove);
      this.viewContainer.addEventListener("pointerup", finishDrag);
      this.viewContainer.addEventListener("pointercancel", finishDrag);
      this.viewContainer.addEventListener("lostpointercapture", finishDrag);
    }

    copyCode(btn) {
      const codeEl = this.container.querySelector(".mermaid-code");
      if (!codeEl) return;
      navigator.clipboard.writeText(codeEl.value).then(() => {
        const originalTitle = btn.getAttribute("title");
        btn.setAttribute("title", getUiText("copied"));
        setTimeout(() => btn.setAttribute("title", originalTitle), 2000);
      });
    }
  }

  const pruneInstances = () => {
    for (const [id, { container }] of instances) {
      if (!document.body.contains(container)) {
        instances.delete(id);
      }
    }
  };

  window.initMermaidDiagram = (id, jsUrl, themeVariables) => {
    const container = document.getElementById(id);
    if (!container) return;

    pruneInstances();
    if (instances.has(id)) return;

    const codeEl = container.querySelector(".mermaid-code");
    if (!codeEl) return;

    new PanZoomHandler(container);

    // 构建期已内联 SVG 的图只需交互外壳；登记实例是为了避免重复初始化
    if (container.dataset.mermaidRenderer !== "mermaid-js") {
      instances.set(id, { container, prerendered: true });
      return;
    }

    instances.set(id, { container, code: codeEl.value, themeVariables });

    loadMermaid(jsUrl).then(() => {
      renderDiagram(id, codeEl.value, container, themeVariables);
    });
  };

  // Theme Observer
  let lastIsNight = document.documentElement.classList.contains("night");
  const observer = new MutationObserver(() => {
    const isNight = document.documentElement.classList.contains("night");
    if (isNight === lastIsNight) return;
    lastIsNight = isNight;
    pruneInstances();
    instances.forEach(({ container, code, themeVariables, prerendered }, id) => {
      if (prerendered) return;
      renderDiagram(id, code, container, themeVariables);
    });
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  window.addEventListener("pagehide", () => activePreview?.close());
})();
