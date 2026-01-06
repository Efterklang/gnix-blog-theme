(() => {
  let pjax;

  function initPjax() {
    try {
      const Pjax = window.Pjax || (() => {});
      pjax = new Pjax({
        selectors: ["[data-pjax]", ".pjax-reload", "head title"],
        cacheBust: false,
      });

      window.addEventListener("popstate", () => {
        if (pjax?.loadUrl) {
          pjax.loadUrl(window.location.href);
        }
      });
    } catch (e) {
      console.warn(`PJAX error: ${e}`);
    }
  }

  document.addEventListener("DOMContentLoaded", () => initPjax());
})();
