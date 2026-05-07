const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Hexo = require("hexo");

const themeDir = path.resolve(__dirname, "..");

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function listFiles(dir, base = dir) {
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(filePath, base);

    return [path.relative(base, filePath).replace(/\\/g, "/")];
  });
}

async function main() {
  const siteDir = fs.mkdtempSync(path.join(os.tmpdir(), "gnix-md-generator-"));

  try {
    fs.mkdirSync(path.join(siteDir, "themes"), { recursive: true });
    fs.symlinkSync(themeDir, path.join(siteDir, "themes", "gnix"), "dir");

    writeFile(path.join(siteDir, "package.json"), `${JSON.stringify({ hexo: { version: Hexo.version } }, null, 2)}\n`);

    writeFile(
      path.join(siteDir, "_config.yml"),
      ["title: Markdown Generator Fixture", "url: https://example.test", "root: /", "theme: gnix", "language: en", "permalink: :title/", "comment: false", "article:", "  licenses: {}", ""].join("\n"),
    );

    writeFile(
      path.join(siteDir, "scripts", "markdown.js"),
      [
        'hexo.extend.renderer.register("md", "html", (data) => {',
        "  return data.text",
        "    .split(/\\n{2,}/)",
        '    .map((block) => "<p>" + block.trim() + "</p>")',
        '    .join("");',
        "});",
        "",
      ].join("\n"),
    );

    writeFile(
      path.join(siteDir, "source", "_posts", "plain.md"),
      ["---", "title: Plain Post", "date: 2026-05-07 12:00:00", "---", "", "# Plain Post", "", "Visible markdown source. 中文 🪗", ""].join("\n"),
    );

    writeFile(
      path.join(siteDir, "source", "_posts", "secret.md"),
      ["---", "title: Secret Post", "date: 2026-05-07 12:01:00", "password: open-sesame", "---", "", "# Secret Post", "", "Hidden markdown source.", ""].join("\n"),
    );

    const hexo = new Hexo(siteDir, { silent: true });
    await hexo.init();
    await hexo.call("generate", { bail: true, force: true });
    await hexo.exit();

    const routeFiles = hexo.route.list().sort();
    const publicFiles = listFiles(path.join(siteDir, "public"));
    const plainMdPath = path.join(siteDir, "public", "plain", "index.md");
    const plainHtmlPath = path.join(siteDir, "public", "plain", "index.html");

    assert.equal(fs.existsSync(plainHtmlPath), true, `plain post HTML should exist. Routes: ${routeFiles.join(", ")}. Generated files: ${publicFiles.join(", ")}`);
    const plainHtml = fs.readFileSync(plainHtmlPath, "utf8");
    const plainMdBuffer = fs.readFileSync(plainMdPath);
    const plainMd = plainMdBuffer.toString("utf8");

    assert.equal(fs.existsSync(plainMdPath), true, "plain post markdown source should be generated next to HTML");
    assert.deepEqual([...plainMdBuffer.subarray(0, 3)], [0xef, 0xbb, 0xbf], "generated markdown source should include a UTF-8 BOM for direct browser display");
    assert.match(plainMd, /Visible markdown source\. 中文 🪗/);
    assert.match(plainHtml, /<link rel="alternate" type="text\/markdown; charset=utf-8" title="Markdown source" href="\/plain\/index\.md">/);
    assert.match(plainHtml, /<span class="article-info-label">Markdown source<\/span>/);
    assert.match(plainHtml, /<a href="\/plain\/index\.md" target="_blank" rel="noopener" type="text\/markdown; charset=utf-8">/);

    assert.equal(fs.existsSync(path.join(siteDir, "public", "secret", "index.md")), false, "encrypted post markdown source should not be generated");
    assert.doesNotMatch(fs.readFileSync(path.join(siteDir, "public", "secret", "index.html"), "utf8"), /text\/markdown/);
  } finally {
    fs.rmSync(siteDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
