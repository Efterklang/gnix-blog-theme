const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const mermaidDiagram = require("../include/hexo/mdit/mermaid");

const cssPath = path.join(__dirname, "../source/css/optional/mermaid.css");
const css = fs.readFileSync(cssPath, "utf8");

async function createMd(options) {
  const { default: MarkdownIt } = await import("markdown-it-ts");
  return MarkdownIt({
    breaks: true,
    html: true,
    langPrefix: "language-",
    linkify: true,
    quotes: "“”‘’",
    typographer: true,
    xhtmlOut: false,
  }).use(mermaidDiagram, options);
}

const fence = (code, lang = "mermaid") => `\`\`\`${lang}\n${code}\n\`\`\`\n`;

const SUPPORTED = {
  flowchart: "graph LR\n  A[开始] --> B{判断}\n  B -->|yes| C[Done]",
  state: "stateDiagram-v2\n  [*] --> Idle\n  Idle --> Busy: start\n  Busy --> [*]",
  sequence: "sequenceDiagram\n  autonumber\n  participant A\n  A->>+B: hi\n  Note over A,B: note\n  B-->>-A: yo",
  class: "classDiagram\n  Animal <|-- Duck\n  Animal: +int age\n  Duck: +swim()",
  er: "erDiagram\n  CUSTOMER ||--o{ ORDER : places",
  xychart: 'xychart-beta\n  title "t"\n  x-axis [a, b, c]\n  bar [1, 2, 3]\n  line [3, 2, 1]',
};

// 只取图本身，跳过工具栏 / 方向盘里的 octicon 图标 svg
function svgsOf(html) {
  return [...html.matchAll(/<div class="mermaid-content">(<svg[\s\S]*?<\/svg>)/g)].map((match) => match[1]);
}

function withCapturedWarnings(run) {
  const warnings = [];
  const original = console.warn;
  console.warn = (...args) => warnings.push(args.join(" "));
  return run()
    .finally(() => {
      console.warn = original;
    })
    .then((result) => ({ result, warnings }));
}

let testCount = 0;
async function test(name, run) {
  await run();
  testCount += 1;
  console.log(`ok ${testCount} - ${name}`);
}

async function main() {
  const md = await createMd();
  const themedSvgBlock = css.match(/\[data-mermaid-renderer="beautiful-mermaid"\] \.mermaid-content svg \{([\s\S]*?)\n\}/);
  assert.ok(themedSvgBlock, "mermaid.css declares the scoped derived-variable block");
  const cssDeclarations = new Set([...themedSvgBlock[1].matchAll(/(--_[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => `${name}:${value.replace(/\s+/g, "")}`));

  await test("mermaid fences become build-time inline SVG inside the pan/zoom shell", async () => {
    const html = await md.renderAsync(fence(SUPPORTED.flowchart));
    assert.match(html, /<div class="mermaid-container" data-mermaid-renderer="beautiful-mermaid">/);
    assert.match(
      html,
      /<div class="mermaid-content"><svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="[^"]+" width="[^"]+" height="[^"]+" style="--bg:var\(--mantle\);--fg:var\(--text\);--accent:var\(--lavender\)">/,
    );
    assert.match(html, /<text[^>]*>开始<\/text>/);
    assert.match(html, /<button class="btn copy-code"/);
    assert.match(html, /<button class="btn zoom-in"/);
    assert.doesNotMatch(html, /background:var\(--bg\)/, "transparent: the wrapper supplies the --mantle backdrop");
    assert.doesNotMatch(html, / id="mermaid-/, "container ids are assigned client-side, output stays deterministic");
  });

  await test("the copy source survives escaping and has no trailing newline", async () => {
    const html = await md.renderAsync(fence('graph LR\n  A[a < b & "c"] --> B'));
    assert.match(html, /<textarea class="mermaid-code" style="display:none">graph LR\n {2}A\[a &lt; b &amp; "c"\] --&gt; B<\/textarea>/);
  });

  await test("the library <style> (Google Fonts @import, unscoped rules) is stripped; chart-only styles stay", async () => {
    for (const [name, code] of Object.entries(SUPPORTED)) {
      const html = await md.renderAsync(fence(code));
      assert.doesNotMatch(html, /googleapis|@import/, `${name}: no font import`);
      assert.doesNotMatch(html, /<style>[^<]*\btext \{/, `${name}: no unscoped text rule`);
      assert.doesNotMatch(html, /--_text:/, `${name}: derived variables come from mermaid.css, not the SVG`);
    }
    const chart = await md.renderAsync(fence(SUPPORTED.xychart));
    assert.match(chart, /<style>\s*\.xychart-grid/, "xychart keeps its own class rules");
  });

  await test("mermaid.css declares every derived variable the SVG output references", async () => {
    for (const [name, code] of Object.entries(SUPPORTED)) {
      const html = await md.renderAsync(fence(code));
      const referenced = new Set([...html.matchAll(/var\((--_[\w-]+)/g)].map((match) => match[1]));
      assert.ok(referenced.size > 0, `${name}: output uses derived variables`);
      for (const variable of referenced) {
        assert.ok(
          [...cssDeclarations].some((declaration) => declaration.startsWith(`${variable}:`)),
          `${name}: ${variable} is declared in mermaid.css`,
        );
      }
    }
  });

  await test("mermaid.css derivations match the library's own color-mix weights", async () => {
    const { renderMermaidSVG } = await import("beautiful-mermaid");
    const style = renderMermaidSVG("graph LR\n  A --> B").match(/<style>([\s\S]*?)<\/style>/)[1];
    const libraryDeclarations = [...style.matchAll(/(--_[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => `${name}:${value.replace(/\s+/g, "")}`);
    assert.ok(libraryDeclarations.length >= 12);
    for (const declaration of libraryDeclarations) {
      assert.ok(cssDeclarations.has(declaration), `mermaid.css is out of sync with beautiful-mermaid: ${declaration}`);
    }
    assert.match(css, /\[data-mermaid-renderer="beautiful-mermaid"\] \.mermaid-content svg \{[^}]*max-width: 100%;[^}]*height: auto;/);
    assert.match(themedSvgBlock[1], /text \{\s*font-family: var\(--font-sans-serif\);/);
    assert.match(themedSvgBlock[1], /\.mono \{\s*font-family: var\(--font-mono\);/);
  });

  await test("marker ids are scoped per diagram so several diagrams on one page do not collide", async () => {
    const html = await md.renderAsync([SUPPORTED.flowchart, SUPPORTED.state, SUPPORTED.sequence, SUPPORTED.class].map((code) => fence(code)).join("\n"));
    const svgs = svgsOf(html);
    assert.equal(svgs.length, 4);
    const allIds = [];
    for (const svg of svgs) {
      const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
      const refs = [...svg.matchAll(/url\(#([^)]+)\)/g)].map((match) => match[1]);
      assert.ok(ids.length > 0);
      assert.ok(refs.length > 0);
      for (const ref of refs) assert.ok(ids.includes(ref), `${ref} resolves inside its own svg`);
      allIds.push(...ids);
    }
    assert.equal(new Set(allIds).size, allIds.length, "no duplicate ids across the document");
  });

  await test("identical source renders identical markup (deterministic ids)", async () => {
    const [first, second] = await Promise.all([md.renderAsync(fence(SUPPORTED.flowchart)), md.renderAsync(fence(SUPPORTED.flowchart))]);
    assert.equal(first, second);
  });

  await test("unsupported diagram types fall back to the client-side mermaid.js shell with a warning", async () => {
    const { result: html, warnings } = await withCapturedWarnings(() =>
      md.renderAsync(fence("gantt\n  title t\n  section s\n  a :a1, 2024-01-01, 3d"), { path: `${process.cwd()}/source/_posts/demo.md` }),
    );
    assert.match(html, /<div class="mermaid-container" data-mermaid-renderer="mermaid-js">/);
    assert.match(html, /<div class="mermaid-content"><\/div>/);
    assert.match(html, /<textarea class="mermaid-code" style="display:none">gantt\n {2}title t/);
    assert.equal(svgsOf(html).length, 0, "no diagram svg, only the toolbar icons");
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /^\[mermaid\] beautiful-mermaid could not render `gantt` in source\/_posts\/demo\.md, falling back to client-side mermaid\.js: /);
  });

  await test("fallback: false emits the source as a plain code block instead", async () => {
    const strict = await createMd({ fallback: false });
    const { result: html, warnings } = await withCapturedWarnings(() => strict.renderAsync(fence('pie title x\n  "a" : 1')));
    assert.equal(html.trim(), '<pre><code class="language-mermaid">pie title x\n  "a" : 1</code></pre>');
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /emitting the source as a code block/);
  });

  await test("render options merge over the defaults", async () => {
    const custom = await createMd({ render: { accent: "var(--peach)", font: "Inter" } });
    const html = await custom.renderAsync(fence(SUPPORTED.flowchart));
    assert.match(html, /style="--bg:var\(--mantle\);--fg:var\(--text\);--accent:var\(--peach\)"/);
  });

  await test("other fences are left to the previous fence renderer", async () => {
    const html = await md.renderAsync(fence("console.log(1)", "js"));
    assert.match(html, /<pre><code class="language-js">console\.log\(1\)\n<\/code><\/pre>/);
    assert.doesNotMatch(html, /mermaid-container/);
  });

  console.log(`Passed ${testCount} Mermaid render tests.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
