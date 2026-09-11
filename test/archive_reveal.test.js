const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const scriptPath = path.join(__dirname, "../source/js/archive.js");
const source = fs.readFileSync(scriptPath, "utf8");
const revealSource = source.slice(source.indexOf("function initArchiveReveal()"), source.indexOf("function initArchivePreview()"));

function fixture({ tops = [100, 700, 900, 950, 1000, 1050, 1100], supported = true, reduce = false } = {}) {
  const targets = tops.map((top) => {
    const properties = new Map();
    const target = {
      dataset: {},
      properties,
      style: {
        setProperty: (key, value) => properties.set(key, value),
        removeProperty: (key) => properties.delete(key),
      },
      getBoundingClientRect: () => ({ top }),
      closest: () => target,
    };
    return target;
  });
  const listeners = new Map();
  const page = {
    querySelectorAll: () => targets,
    addEventListener: (type, callback) => listeners.set(type, callback),
  };
  let onPreferenceChange;
  const preference = {
    matches: reduce,
    addEventListener: (_type, callback) => {
      onPreferenceChange = callback;
    },
  };
  let observer;
  const window = { innerHeight: 800, matchMedia: () => preference };
  if (supported) {
    window.IntersectionObserver = class {
      constructor(callback, options) {
        this.callback = callback;
        this.options = options;
        this.observed = new Set();
        this.disconnected = false;
        observer = this;
      }
      observe(target) {
        this.observed.add(target);
      }
      unobserve(target) {
        this.observed.delete(target);
      }
      disconnect() {
        this.disconnected = true;
        this.observed.clear();
      }
    };
  }
  vm.runInNewContext(`${revealSource}\ninitArchiveReveal();`, { window, document: { querySelector: () => page } }, { filename: scriptPath });
  return {
    targets,
    observer,
    enter(entries) {
      observer.callback(entries.map(([index, top, isIntersecting = true]) => ({ target: targets[index], boundingClientRect: { top }, isIntersecting })));
    },
    interact(type, index) {
      listeners.get(type)?.({ target: targets[index] });
    },
    reduce() {
      preference.matches = true;
      onPreferenceChange?.();
    },
  };
}

test("only content below the initial viewport waits for a scroll reveal", () => {
  const f = fixture();
  assert.equal(f.targets[0].dataset.scrollReveal, undefined);
  assert.equal(f.targets[1].dataset.scrollReveal, undefined);
  assert.ok(f.targets.slice(2).every((target) => target.dataset.scrollReveal === "pending"));
  assert.deepEqual([...f.observer.observed], f.targets.slice(2));
});

test("newly visible content enters in visual order with a bounded stagger", () => {
  const f = fixture();
  f.enter([
    [6, 700],
    [4, 600],
    [2, 500],
    [5, 650],
    [3, 550],
  ]);
  assert.deepEqual(
    f.targets.slice(2).map((target) => target.properties.get("--archive-scroll-delay")),
    ["0ms", "30ms", "60ms", "90ms", "90ms"],
  );
  assert.ok(f.targets.slice(2).every((target) => target.dataset.scrollReveal === "visible"));
  assert.equal(f.observer.disconnected, true);
});

test("leaving and re-entering never replays a revealed row or resets its delay", () => {
  const f = fixture();
  f.enter([
    [2, 900, false],
    [3, 700],
  ]);
  assert.equal(f.targets[2].dataset.scrollReveal, "pending");
  assert.equal(f.targets[3].dataset.scrollReveal, "visible");
  assert.equal(f.observer.observed.has(f.targets[3]), false);
  f.enter([
    [3, -20, false],
    [2, 500],
    [3, 700],
  ]);
  assert.equal(f.targets[3].properties.get("--archive-scroll-delay"), "0ms");
  assert.equal(f.targets[3].dataset.scrollReveal, "visible");
});

for (const type of ["focusin", "pointerover"]) {
  test(`${type} reveals immediately, even before observation or during entry`, () => {
    const f = fixture();
    f.interact(type, 2);
    assert.equal(f.targets[2].dataset.scrollReveal, "shown");
    assert.equal(f.observer.observed.has(f.targets[2]), false);
    f.enter([[2, 600]]);
    assert.equal(f.targets[2].dataset.scrollReveal, "shown", "A queued intersection must not restart motion after interaction");
    f.enter([[3, 700]]);
    f.interact(type, 3);
    assert.equal(f.targets[3].dataset.scrollReveal, "shown");
    assert.equal(f.targets[3].properties.has("--archive-scroll-delay"), false);
    f.interact(type, 0);
    assert.equal(f.targets[0].dataset.scrollReveal, undefined, "Initial viewport entrance stays independent");
  });
}

test("enabling reduced motion reveals all pending content and disconnects observation", () => {
  const f = fixture();
  f.enter([[2, 700]]);
  f.reduce();
  assert.ok(f.targets.slice(2).every((target) => target.dataset.scrollReveal === "shown"));
  assert.equal(f.observer.disconnected, true);
  f.enter([[3, 700]]);
  assert.equal(f.targets[3].dataset.scrollReveal, "shown");
});

test("reduced motion, missing observer support and short archives stay fully visible", () => {
  for (const options of [{ reduce: true }, { supported: false }, { tops: [100, 200, 700] }]) {
    const f = fixture(options);
    assert.equal(f.observer, undefined);
    assert.ok(f.targets.every((target) => target.dataset.scrollReveal === undefined));
  }
});
