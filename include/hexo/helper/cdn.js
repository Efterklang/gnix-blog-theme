function getCDN(cdn, pkg, version, filename) {
  switch (cdn) {
    case "host":
      return `/js/host/${pkg}/${version}/${filename}`;
    case "loli":
      return `https://cdnjs.loli.net/ajax/libs/${pkg}/${version}/${filename}`;
    case "jsdelivr":
      return `https://cdn.jsdelivr.net/npm/${pkg}@${version}/${filename}`;
    case "bootcdn":
      return `https://cdn.bootcdn.net/ajax/libs/${pkg}/${version}/${filename}`;
    default:
      throw new Error(`Unknown CDN provider: ${cdn}`);
  }
}

module.exports = (hexo) => {
  hexo.extend.helper.register("cdn", function (_package, version, filename) {
    cdn = this.config.providers?.cdn ? this.config.providers.cdn : "jsdelivr";
    return getCDN(cdn, _package, version, filename);
  });
};
