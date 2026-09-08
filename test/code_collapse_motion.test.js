const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const articlePath = path.join(__dirname, "../source/js/article.js");
const articleSource = fs.readFileSync(articlePath, "utf8");
const highlightStart = articleSource.indexOf("const SELECTORS = {");
const highlightEnd = articleSource.indexOf("// #endregion", highlightStart);
assert.ok(highlightStart !== -1 && highlightEnd > highlightStart, "Highlight handler source is available");
const highlightSource = articleSource.slice(highlightStart, highlightEnd);

function createClassList() {
  const classes = new Set();
  return {
    add(className) {
      classes.add(className);
    },
    remove(className) {
      classes.delete(className);
    },
    contains(className) {
      return classes.has(className);
    },
  };
}

function createHarness() {
  const operations = [];
  const timers = new Map();
  const frames = [];
  const listeners = new Map();
  const attributes = new Map();
  const measurements = {
    height: "480.5px",
    lineHeight: "20px",
    paddingTop: "8px",
    paddingBottom: "12px",
  };
  let elapsed = 0;
  let nextTimerId = 1;
  let maxHeight = "none";
  const pre = {
    scrollHeight: 501,
    style: {
      get maxHeight() {
        return maxHeight;
      },
      set maxHeight(value) {
        maxHeight = value;
        operations.push(["maxHeight", value]);
      },
    },
    getBoundingClientRect() {
      operations.push(["layout", maxHeight]);
      return { height: pre.scrollHeight };
    },
  };
  const expandButton = {
    classList: createClassList(),
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
  };
  const figure = {
    dataset: { collapsible: "true", maxLines: "3" },
    classList: createClassList(),
    hasAttribute(name) {
      return attributes.has(name);
    },
    setAttribute(name, value) {
      attributes.set(name, value);
    },
    querySelector(selector) {
      return { "pre.shiki": pre, ".code-expand-btn": expandButton }[selector] || null;
    },
  };

  vm.runInNewContext(`${highlightSource}\naddHighlightTool();`, {
    document: {
      querySelectorAll(selector) {
        assert.equal(selector, "figure.shiki");
        return [figure];
      },
    },
    getComputedStyle(element) {
      assert.equal(element, pre);
      return { maxHeight, ...measurements };
    },
    requestAnimationFrame(callback) {
      frames.push(callback);
    },
    setTimeout(callback, delay) {
      const timerId = nextTimerId++;
      timers.set(timerId, { callback, at: elapsed + delay });
      return timerId;
    },
    clearTimeout(timerId) {
      timers.delete(timerId);
    },
  }, { filename: articlePath });

  assert.equal(frames.length, 1);
  for (const callback of frames) callback();

  function click() {
    const event = {
      defaultPrevented: false,
      propagationStopped: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      stopPropagation() {
        this.propagationStopped = true;
      },
    };
    listeners.get("click")(event);
    assert.ok(event.defaultPrevented);
    assert.ok(event.propagationStopped);
  }

  function advance(milliseconds) {
    const targetTime = elapsed + milliseconds;
    while (timers.size) {
      const [timerId, timer] = [...timers.entries()].sort((first, second) => first[1].at - second[1].at)[0];
      if (timer.at > targetTime) break;
      elapsed = timer.at;
      timers.delete(timerId);
      timer.callback();
    }
    elapsed = targetTime;
  }

  return { figure, pre, expandButton, measurements, operations, timers, click, advance };
}

function assertExpanded(harness, expected) {
  assert.equal(harness.figure.classList.contains("expanded"), expected);
  assert.equal(harness.expandButton.classList.contains("expand-done"), expected);
}

function testSettledCollapse() {
  const harness = createHarness();
  assert.deepEqual(harness.operations, [["maxHeight", "80px"]]);
  assert.equal(harness.pre.style.overflow, "hidden");
  assertExpanded(harness, false);

  harness.operations.length = 0;
  harness.click();
  assertExpanded(harness, true);
  assert.deepEqual(harness.operations, [["maxHeight", "501px"]]);
  assert.equal(harness.timers.size, 1);
  harness.advance(299);
  assert.equal(harness.pre.style.maxHeight, "501px");
  harness.advance(1);
  assert.equal(harness.pre.style.maxHeight, "none");
  assert.equal(harness.timers.size, 0);

  harness.operations.length = 0;
  harness.click();
  assert.deepEqual(harness.operations, [
    ["maxHeight", "480.5px"],
    ["layout", "480.5px"],
    ["maxHeight", "80px"],
  ]);
  assertExpanded(harness, false);
  harness.advance(1000);
  assert.equal(harness.pre.style.maxHeight, "80px");
}

function testRapidReversals() {
  const harness = createHarness();
  harness.operations.length = 0;
  harness.click();
  harness.advance(100);
  harness.measurements.height = "180px";
  harness.measurements.maxHeight = "200px";
  harness.click();
  assertExpanded(harness, false);
  assert.equal(harness.timers.size, 0);

  harness.advance(50);
  harness.measurements.height = "120px";
  harness.measurements.maxHeight = "140px";
  harness.click();
  assertExpanded(harness, true);
  assert.equal(harness.timers.size, 1);
  harness.advance(150);
  assert.equal(harness.pre.style.maxHeight, "501px", "Canceled cleanup must not interrupt the new expansion");

  harness.advance(50);
  harness.measurements.height = "240px";
  harness.measurements.maxHeight = "260px";
  harness.click();
  assertExpanded(harness, false);
  assert.equal(harness.timers.size, 0);
  harness.advance(1000);
  assert.equal(harness.pre.style.maxHeight, "80px", "Canceled cleanup must not reopen a collapsed block");
  assert.deepEqual(harness.operations, [
    ["maxHeight", "501px"],
    ["maxHeight", "80px"],
    ["maxHeight", "501px"],
    ["maxHeight", "80px"],
  ]);
}

function testFreshExpandedHeight() {
  const harness = createHarness();
  harness.click();
  harness.advance(1000);
  assert.equal(harness.pre.style.maxHeight, "none");

  harness.measurements.height = "713.75px";
  harness.measurements.lineHeight = "24px";
  harness.measurements.paddingTop = "10px";
  harness.measurements.paddingBottom = "14px";
  harness.pre.scrollHeight = 738;
  harness.operations.length = 0;
  harness.click();
  assert.deepEqual(harness.operations, [
    ["maxHeight", "713.75px"],
    ["layout", "713.75px"],
    ["maxHeight", "96px"],
  ]);
  assertExpanded(harness, false);

  harness.operations.length = 0;
  harness.click();
  assert.deepEqual(harness.operations, [["maxHeight", "738px"]]);
  harness.advance(300);
  assert.equal(harness.pre.style.maxHeight, "none");
  assertExpanded(harness, true);

  harness.measurements.height = "355.125px";
  harness.pre.scrollHeight = 380;
  harness.operations.length = 0;
  harness.click();
  assert.deepEqual(harness.operations, [
    ["maxHeight", "355.125px"],
    ["layout", "355.125px"],
    ["maxHeight", "96px"],
  ]);
  assertExpanded(harness, false);
}

testSettledCollapse();
testRapidReversals();
testFreshExpandedHeight();
console.log("Code collapse motion regression tests passed.");
