/**
 * Web app manifest.json generator.
 */

module.exports = (hexo) => {
  hexo.extend.generator.register("manifest", function (_locals) {
    const url_for = hexo.extend.helper.get("url_for").bind(this);
    let { manifest = {} } = this.theme?.config?.head || {};

    manifest = Object.assign({}, manifest);
    if (!manifest.name) {
      manifest.name = this.config.title;
    }
    if (!manifest.start_url) {
      manifest.start_url = url_for("/index.html");
    }

    return {
      path: "/manifest.json",
      data: JSON.stringify(manifest),
    };
  });
};
