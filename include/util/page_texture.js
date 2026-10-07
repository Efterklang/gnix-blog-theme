function getPageTextureInitScript() {
  return `
(function() {
  var key = "gnix-page-texture";
  var html = document.documentElement;
  function read() {
    try { return localStorage.getItem(key) === "on"; } catch (_) { return false; }
  }
  function apply(enabled, persist) {
    enabled = enabled === true;
    html.dataset.pageTexture = enabled ? "on" : "off";
    if (persist) {
      try { localStorage.setItem(key, enabled ? "on" : "off"); } catch (_) {}
    }
    window.dispatchEvent(new CustomEvent("gnix:page-texture-change", { detail: enabled }));
  }
  window.applyPageTexture = apply;
  apply(read());
  window.addEventListener("pageshow", function() { apply(read()); });
  window.addEventListener("storage", function(event) {
    if (event.key === key || event.key === null) apply(read());
  });
})();
`;
}

module.exports = { getPageTextureInitScript };
