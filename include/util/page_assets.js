// Keep early resource discovery and body entry points in sync. Optional article
// styles are blocking only on pages that use them, including encrypted content.
function getPageAssets(page, helper) {
  const article = helper.is_post() || helper.is_page();
  const archive = helper.is_archive() || helper.is_tag();
  const content = page.content || "";
  const styles = ["/css/default.css"];
  const modules = ["/js/main.js"];
  const dependencies = [];

  if (article) {
    styles.push("/css/article.css");
    modules.push("/js/article.js");
    dependencies.push("/js/scroll-reveal.js", "/js/wiki-link.js");
    if (page.encrypt || /class=["'][^"']*\bcallout\b/.test(content)) styles.push("/css/callout_blocks.css");
    if (page.encrypt || /class=["'][^"']*\bshiki\b/.test(content)) styles.push("/css/shiki/shiki.css");
    if (page.encrypt || content.includes("mermaid-container")) styles.push("/css/optional/mermaid.css");
  }
  if (archive) {
    styles.push("/css/archive.css");
    modules.push("/js/archive.js");
    dependencies.push("/js/crypto.js");
  }
  if (page.status) styles.push("/css/status.css");
  if (page.preferences) styles.push("/css/preferences.css");
  if (page.home) styles.push("/css/home.css");
  if (page.graph) {
    styles.push("/css/graph.css");
    modules.push("/js/graph.js");
  }
  if (page.encrypt) {
    styles.push("/css/encrypt.css");
    modules.push("/js/decrypt.js");
    dependencies.push("/js/crypto.js");
  }
  styles.push("/css/responsive.css");
  return { styles, modules, modulepreloads: [...new Set([...modules, ...dependencies])] };
}

module.exports = { getPageAssets };
