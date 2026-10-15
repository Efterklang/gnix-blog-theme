// 可选的背景纹理，须与 default.css 中的 --page-texture-<id> 一一对应
const PAGE_TEXTURES = ["paper", "kraft", "linen", "cotton", "halftone", "film"];
const DEFAULT_PAGE_TEXTURE = "paper";

function getPageTextureInitScript() {
  return `
(function() {
  var key = "gnix-page-texture";
  var textures = ${JSON.stringify(PAGE_TEXTURES)};
  var html = document.documentElement;
  // 旧版本用 "on" 表示唯一一种纸张纹理，读到就迁移到默认材质
  function normalize(value) {
    if (value === "on" || value === true) return "${DEFAULT_PAGE_TEXTURE}";
    return textures.indexOf(value) === -1 ? "off" : value;
  }
  function read() {
    try { return normalize(localStorage.getItem(key)); } catch (_) { return "off"; }
  }
  function apply(texture, persist) {
    texture = normalize(texture);
    html.dataset.pageTexture = texture;
    if (persist) {
      try { localStorage.setItem(key, texture); } catch (_) {}
    }
    window.dispatchEvent(new CustomEvent("gnix:page-texture-change", { detail: texture }));
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

module.exports = { getPageTextureInitScript, PAGE_TEXTURES, DEFAULT_PAGE_TEXTURE };
