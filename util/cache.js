const crypto = require("node:crypto");
const { createElement } = require("inferno-create-element");

const cache = {};

function computeHash(props) {
  return crypto.createHash("md5").update(JSON.stringify(props)).digest("hex");
}

module.exports = {
  cacheComponent(type, prefix, transform) {
    return (props) => {
      const targetProps = transform(props);
      if (targetProps === null || typeof targetProps !== "object") {
        return null;
      }
      const cacheId = `${prefix}-${computeHash(targetProps)}`;
      if (!cache[cacheId]) {
        cache[cacheId] = createElement(type, targetProps);
      }
      return cache[cacheId];
    };
  },
};
