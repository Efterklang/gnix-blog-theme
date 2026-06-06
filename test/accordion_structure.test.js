const assert = require("node:assert/strict");
const { createMarkdownExit } = require("markdown-exit");

const md = createMarkdownExit({
  breaks: true,
  html: true,
  langPrefix: "language-",
  linkify: true,
  quotes: "“”‘’",
  typographer: true,
  xhtmlOut: false,
});

function accordion(markdown) {
  return `<x-accordion>
  <accordion-item title="A">

${markdown}

  </accordion-item>
  <accordion-item title="B">

Next item.

  </accordion-item>
</x-accordion>`;
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

    if (isClosing && tag === "accordion-item") {
      const itemIndex = stack.lastIndexOf("accordion-item");
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

async function assertAccordionListBoundary(name, markdown, expected) {
  const html = await md.renderAsync(accordion(markdown));
  assert.equal(hasListOpenAtAccordionClose(html), expected, `${name}\n\n${html}`);
}

async function main() {
  await assertAccordionListBoundary("plain paragraphs stay inside accordion-item", "Plain paragraph.\n\nAnother paragraph.", false);
  await assertAccordionListBoundary("indented unordered list follows the documented accordion convention", "  Intro.\n\n  - one\n  - two", false);
  await assertAccordionListBoundary("explicit HTML list keeps the custom element boundary stable", "Intro.\n\n<ul>\n  <li><p>one</p></li>\n  <li><p>two</p></li>\n</ul>", false);
  await assertAccordionListBoundary("fenced code does not disturb accordion-item boundaries", "Text.\n\n```js\nconsole.log(1)\n```", false);
  await assertAccordionListBoundary("nested ordered list remains aligned", "Intro.\n\n1. one\n   - nested\n2. two", false);

  await assertAccordionListBoundary("unindented unordered list can leave list tags open across accordion-item", "Intro.\n\n- one\n- two", true);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
