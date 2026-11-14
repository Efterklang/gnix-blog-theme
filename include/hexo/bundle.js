/**
 * 主题脚本的 npm 依赖：source/js 下的 ES 模块可直接 import npm 包（如 lucide 图标），
 * 生成时由 esbuild 把用到的导出内联进脚本——按引用摇树，只打进实际 import 的图标。
 * 浏览器解析不了裸模块名，这类脚本须以 <script type="module"> 加载并经过这一步；
 * 入口里相对路径的 import 保持原样，兄弟模块仍由浏览器按模块加载、共享同一份实例
 * @module hexo/bundle
 */
const path = require("node:path");
const esbuild = require("esbuild");

// 行首的静态 import，来源是裸模块名（不以 . 或 / 开头，也不带协议）
const PACKAGE_IMPORT_RE = /^import\s[^"';]*["'](?![./]|\w+:)/m;

const keepLocalImports = {
  name: "gnix-keep-local-imports",
  setup(build) {
    build.onResolve({ filter: /^\.{0,2}\// }, (args) => (args.importer === "<stdin>" ? { path: args.path, external: true } : undefined));
  },
};

module.exports = (hexo) => {
  const sourceDir = path.join(hexo.theme_dir, "source") + path.sep;

  hexo.extend.filter.register("after_render:js", (code, data) => {
    if (!data?.path?.startsWith(sourceDir) || !PACKAGE_IMPORT_RE.test(code)) return code;
    return esbuild
      .build({
        stdin: { contents: code, resolveDir: path.dirname(data.path), sourcefile: path.relative(hexo.theme_dir, data.path) },
        bundle: true,
        format: "esm",
        charset: "utf8",
        write: false,
        logLevel: "silent",
        plugins: [keepLocalImports],
      })
      .then((result) => result.outputFiles[0].text);
  });
};
