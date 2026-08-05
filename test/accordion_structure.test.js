const assert = require("node:assert/strict");

async function createMd() {
  const { default: MarkdownIt } = await import("markdown-it-ts");
  return MarkdownIt({
    breaks: true,
    html: true,
    langPrefix: "language-",
    linkify: true,
    quotes: "“”‘’",
    typographer: true,
    xhtmlOut: false,
  });
}

function accordion(markdown) {
  return `<link rel="stylesheet" href="/css/optional/accordion.css">
<div class="accordion">
  <details class="accordion-item" name="test-accordion">
    <summary>A</summary>

${markdown}

  </details>
  <details class="accordion-item" name="test-accordion">
    <summary>B</summary>

Next item.

  </details>
</div>`;
}

function hasListOpenAtAccordionClose(html) {
  const stack = [];
  const tagRe = /<\/?([a-z][\w-]*)(?:\s[^>]*)?>/gi;
  const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  let match;

  while ((match = tagRe.exec(html))) {
    const full = match[0];
    const tag = match[1].toLowerCase();
    const isClosing = full.startsWith("</");
    const isSelfClosing = full.endsWith("/>") || voidTags.has(tag);

    if (!isClosing && !isSelfClosing) {
      stack.push(tag);
      continue;
    }

    if (isClosing && tag === "details") {
      const itemIndex = stack.lastIndexOf("details");
      if (itemIndex !== -1 && stack.slice(itemIndex + 1).some((name) => name === "ul" || name === "ol" || name === "li")) {
        return true;
      }
    }

    if (isClosing) {
      const openIndex = stack.lastIndexOf(tag);
      if (openIndex !== -1) stack.splice(openIndex);
    }
  }

  return false;
}

async function assertAccordionListBoundary(md, name, markdown, expected) {
  const html = await md.renderAsync(accordion(markdown));
  assert.equal(hasListOpenAtAccordionClose(html), expected, `${name}\n\n${html}`);
}

async function main() {
  const md = await createMd();
  await assertAccordionListBoundary(md, "plain paragraphs stay inside accordion-item", "Plain paragraph.\n\nAnother paragraph.", false);
  await assertAccordionListBoundary(md, "indented unordered list follows the documented accordion convention", "  Intro.\n\n  - one\n  - two", false);
  await assertAccordionListBoundary(md, "explicit HTML list keeps the custom element boundary stable", "Intro.\n\n<ul>\n  <li><p>one</p></li>\n  <li><p>two</p></li>\n</ul>", false);
  await assertAccordionListBoundary(md, "fenced code does not disturb accordion-item boundaries", "Text.\n\n```js\nconsole.log(1)\n```", false);
  await assertAccordionListBoundary(md, "nested ordered list remains aligned", "Intro.\n\n1. one\n   - nested\n2. two", false);
  await assertAccordionListBoundary(md, "unindented unordered list can leave list tags open across details", "Intro.\n\n- one\n- two", true);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
