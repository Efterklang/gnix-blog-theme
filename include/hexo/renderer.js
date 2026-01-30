const { transformSync } = require("esbuild");
const { createElement } = require("inferno-create-element");
const { renderToStaticMarkup } = require("inferno-server");
const fs = require("node:fs");
const Module = require("node:module");

Module._extensions[".jsx"] = (module, filename) => {
  const content = fs.readFileSync(filename, "utf8");
  const { code } = transformSync(content, {
    loader: "jsx",
    format: "cjs",
    jsxFactory: "__createElement",
    jsxFragment: "__Fragment",
    banner: "const __createElement = require('inferno-create-element').createElement; const __Fragment = require('inferno').Fragment;",
    sourcefile: filename,
  });
  module._compile(code, filename);
};

function compile(data) {
  const Component = require(data.path);
  const DOCTYPE = "<!doctype html>\n";
  const startTag = "<html";

  return (locals) => {
    const element = createElement(Component, locals);
    const markup = renderToStaticMarkup(element);
    // test if the layout is root layout file so we can skip costly large string comparison
    if ("layout" in locals && "view_dir" in locals && "filename" in locals) {
      if (locals.filename.startsWith(locals.view_dir) && locals.layout === false) {
        // this is root layout file, add doctype
        return DOCTYPE + markup;
      }
      return markup;
    }
    // do not use substr, substring, slice to prevent string copy
    for (let i = 0; i < 5; i++) {
      if (markup.charAt(i).toLowerCase() !== startTag.charAt(i)) {
        return markup;
      }
    }
    return DOCTYPE + markup;
  };
}

function renderer(data, locals) {
  return compile(data)(locals);
}

renderer.compile = compile;

module.exports = (hexo) => {
  hexo.extend.renderer.register("jsx", "html", renderer, true);
};
