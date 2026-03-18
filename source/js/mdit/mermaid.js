(() => {
  const instances = new Map();
  let mermaidPromise = null;
  let renderSeq = 0;
  let lastTheme = document.documentElement.classList.contains("night");

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
      themeVariables,
      securityLevel: "strict",
      fontSize: 16,
    });

    try {
      content.innerHTML = "";
      const { svg } = await mermaid.render(`${id}-svg-${version}`, code);
      if (instance.renderVersion !== version) return;
      content.insertAdjacentHTML("beforeend", svg);
    } catch (error) {
      if (instance.renderVersion !== version) return;
      console.error("Mermaid rendering error:", error);
      content.innerHTML = `<p style="color: red;">Failed to render diagram: ${error.message}</p>`;
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
      this.initEvents();
    }

    apply() {
      if (this.content) {
        this.content.style.transform = `scale(${this.scale}) translate(${this.tx}px, ${this.ty}px)`;
      }
    }

    initEvents() {
      // Toolbar & Grid Panel
      this.container.addEventListener("click", (e) => {
        const btn = e.target.closest("button");
        if (!btn) return;
        const cl = btn.classList;

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

      // Dragging
      if (this.viewContainer) {
        this.viewContainer.addEventListener("mousedown", (e) => {
          this.isDragging = true;
          this.startX = e.clientX - this.tx;
          this.startY = e.clientY - this.ty;
          this.viewContainer.style.cursor = "grabbing";
        });
      }

      window.addEventListener("mousemove", (e) => {
        if (!this.isDragging) return;
        e.preventDefault();
        this.tx = e.clientX - this.startX;
        this.ty = e.clientY - this.startY;
        this.apply();
      });

      window.addEventListener("mouseup", () => {
        if (this.isDragging) {
          this.isDragging = false;
          if (this.viewContainer) this.viewContainer.style.cursor = "grab";
        }
      });
    }

    copyCode(btn) {
      const codeEl = this.container.querySelector(".mermaid-code");
      if (!codeEl) return;
      navigator.clipboard.writeText(codeEl.textContent).then(() => {
        const originalTitle = btn.getAttribute("title");
        btn.setAttribute("title", "Copied!");
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

  window.initMermaidDiagram = (id, jsUrl, _theme, themeVariables) => {
    const container = document.getElementById(id);
    if (!container) return;

    pruneInstances();
    if (instances.has(id)) return;

    const codeEl = container.querySelector(".mermaid-code");
    if (!codeEl) return;

    new PanZoomHandler(container);
    instances.set(id, { container, code: codeEl.textContent, themeVariables });

    loadMermaid(jsUrl).then(() => {
      renderDiagram(id, codeEl.textContent, container, themeVariables);
    });
  };

  // Theme Observer
  const observer = new MutationObserver((mutations) => {
    const isThemeChange = mutations.some((m) => m.type === "attributes" && m.attributeName === "class");
    if (isThemeChange) {
      pruneInstances();
      instances.forEach(({ container, code, themeVariables }, id) => {
        renderDiagram(id, code, container, themeVariables);
      });
    }
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
})();
