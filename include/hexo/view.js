const path = require("node:path");

let themeDir = null;

function _resolve(filename) {
  if (path.isAbsolute(filename)) {
    return require.resolve(filename);
  }
  const resolved = [path.join(themeDir, "/layout/", filename)].find(
    (filepath) => {
      try {
        require.resolve(filepath);
        return true;
      } catch (_e) {
        return false;
      }
    },
  );

  return require.resolve(resolved ? resolved : filename);
}

function _require(filename) {
  return require(_resolve(filename));
}

_require.resolve = _resolve;

/**
 * Initialize module global variables, including the theme directory variable.
 * Must be used before {@link module:core/view.require} or {@link module:core/view.resolve}.
 */
function init(hexo) {
  themeDir = hexo.theme_dir;
}

module.exports = {
  init,
  require: _require,
};
