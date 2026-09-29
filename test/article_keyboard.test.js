const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const source = fs.readFileSync(path.join(__dirname, "../source/js/article.js"), "utf8");
const handler = source.slice(source.indexOf("function handleArticleKeyDown("), source.indexOf("// #endregion", source.indexOf("function handleArticleKeyDown(")));

function press({ top = 800, tagName = "BODY", popover = false, reduce = false, shiftKey = false } = {}) {
  let prevented = false;
  let scroll;
  const content = { getBoundingClientRect: () => ({ top }) };
  const context = {
    document: {
      querySelector: (selector) => selector === ".article-hero-full" ? {} : popover,
      getElementById: () => content,
    },
    window: {
      innerHeight: 900,
      scrollY: 120,
      matchMedia: () => ({ matches: reduce }),
      scrollTo: (options) => { scroll = options; },
    },
  };
  vm.createContext(context);
  vm.runInContext(handler, context);
  context.handleArticleKeyDown({ code: "Space", target: { tagName }, shiftKey, preventDefault: () => { prevented = true; } });
  return { prevented, scroll };
}

test("space aligns the body with the viewport without a navbar offset", () => {
  const { prevented, scroll } = press();
  assert.ok(prevented);
  assert.equal(scroll.top, 920);
  assert.equal(scroll.behavior, "smooth");
});

test("reduced motion jumps directly to the body", () => {
  assert.equal(press({ reduce: true }).scroll.behavior, "instant");
});

test("reading, controls, open popovers and Shift+Space retain native behavior", () => {
  for (const options of [{ top: 300 }, { tagName: "BUTTON" }, { tagName: "INPUT" }, { popover: true }, { shiftKey: true }]) {
    const result = press(options);
    assert.equal(result.prevented, false);
    assert.equal(result.scroll, undefined);
  }
});
