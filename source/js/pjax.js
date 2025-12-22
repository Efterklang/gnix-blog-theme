(() => {
  // biome-ignore lint/correctness/noUnusedVariables: will be used
  let pjax;

  function initPjax() {
    try {
      const Pjax = window.Pjax || (() => {});
      pjax = new Pjax({
        selectors: [
          "[data-pjax]",
          ".pjax-reload",
          "head title",
          ".main-content",
          ".navbar-start",
          ".navbar-end",
          ".searchbox link",
          ".searchbox script",
          "#comments link",
          "#comments script",
        ],
        cacheBust: false,
      });
    } catch (e) {
      console.warn(`PJAX error: ${e}`);
    }
  }

  document.addEventListener("DOMContentLoaded", () => initPjax());
})();
