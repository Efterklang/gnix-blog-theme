(() => {
  const instances = new Map();
  const mermaidFontFamily = "ChillKai, Avenir, system-ui";
  let mermaidPromise = null;
  let renderSeq = 0;

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
      this.initEvents();
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

      // Dragging — bind window listeners only while a drag is active
      if (!this.viewContainer) return;

      const onMove = (e) => {
        e.preventDefault();
        this.tx = e.clientX - this.startX;
        this.ty = e.clientY - this.startY;
        this.apply();
      };
      const onUp = () => {
        this.isDragging = false;
        this.viewContainer.style.cursor = "grab";
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      this.viewContainer.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        this.isDragging = true;
        this.startX = e.clientX - this.tx;
        this.startY = e.clientY - this.ty;
        this.viewContainer.style.cursor = "grabbing";
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      });
    }

    copyCode(btn) {
      const codeEl = this.container.querySelector(".mermaid-code");
      if (!codeEl) return;
      navigator.clipboard.writeText(codeEl.value).then(() => {
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

  window.initMermaidDiagram = (id, jsUrl, themeVariables) => {
    const container = document.getElementById(id);
    if (!container) return;

    pruneInstances();
    if (instances.has(id)) return;

    const codeEl = container.querySelector(".mermaid-code");
    if (!codeEl) return;

    new PanZoomHandler(container);
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
    instances.forEach(({ container, code, themeVariables }, id) => {
      renderDiagram(id, code, container, themeVariables);
    });
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
})();
