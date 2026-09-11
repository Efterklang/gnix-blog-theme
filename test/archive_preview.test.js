const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const scriptPath = path.join(__dirname, "../source/js/archive.js");
const script = fs.readFileSync(scriptPath, "utf8").replace(/^import .*\n/gm, "");

class Element {
  constructor(className = "", parent = null) {
    this.className = className;
    this.parent = parent;
    this.children = [];
    this.dataset = {};
    this.listeners = new Map();
    this.focusVisible = false;
    this.popoverOpen = false;
    this.rect = { top: 200, bottom: 240 };
    parent?.children.push(this);
  }

  addEventListener(type, callback, options) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push({ callback, options });
  }

  emit(type, properties = {}) {
    const event = { type, target: this, ...properties };
    const bubbles = !["scroll", "pagehide", "change", "beforetoggle"].includes(type);
    for (let node = this; node; node = bubbles ? node.parent : null) {
      for (const { callback } of node.listeners.get(type) || []) callback(event);
    }
  }

  matches(selector) {
    if (selector === ":focus-visible") return this.focusVisible;
    if (selector === ":popover-open") return this.popoverOpen;
    return selector.split(",").some((part) => part.trim() === `.${this.className}`);
  }

  closest(selector) {
    return this.matches(selector) ? this : this.parent?.closest(selector) || null;
  }

  querySelector(selector) {
    for (const child of this.children) {
      if (child.matches(selector)) return child;
      const match = child.querySelector(selector);
      if (match) return match;
    }
    return null;
  }

  querySelectorAll(selector) {
    return this.children.flatMap((child) => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }

  contains(target) {
    return target === this || this.children.some((child) => child.contains(target));
  }

  toggleAttribute(name, value) {
    const key = name.replace(/^data-/, "").replace(/-([a-z])/g, (_, character) => character.toUpperCase());
    if (value) this.dataset[key] = "";
    else delete this.dataset[key];
  }

  getBoundingClientRect() {
    return this.rect;
  }
}

function fixture({ supported = true, finePointer = true } = {}) {
  const window = new Element();
  const document = new Element("document", window);
  const page = new Element("archive-page", document);
  const picker = new Element("archive-topic-picker", page);
  const outside = new Element("outside", document);
  const media = new Element();
  media.matches = finePointer;
  document.hidden = false;
  document.activeElement = outside;
  window.innerHeight = 900;
  window.matchMedia = () => media;
  let hitTarget = outside;
  const hitTests = [];
  document.elementFromPoint = (x, y) => {
    hitTests.push({ x, y });
    return hitTarget;
  };
  const items = Array.from({ length: 4 }, (_, index) => {
    const item = new Element("archive-item", page);
    const title = new Element("archive-title", item);
    const date = new Element("archive-title__date", title);
    const popup = index < 3 ? new Element("archive-popup", item) : null;
    return { item, title, date, popup };
  });

  let now = 0;
  let timerId = 0;
  const timers = new Map();
  const microtasks = [];
  vm.runInNewContext(
    script,
    {
      window,
      document,
      CSS: { supports: () => supported },
      performance: { now: () => now },
      getComputedStyle: () => ({ getPropertyValue: () => "140ms" }),
      runWhenActivated: (callback) => callback(),
      initScrollReveal: () => {},
      setTimeout(callback, delay) {
        const id = ++timerId;
        timers.set(id, { at: now + delay, callback });
        return id;
      },
      clearTimeout: (id) => timers.delete(id),
      queueMicrotask: (callback) => microtasks.push(callback),
    },
    { filename: scriptPath },
  );

  return {
    window,
    document,
    page,
    picker,
    outside,
    media,
    items,
    hitTests,
    advance(milliseconds) {
      const end = now + milliseconds;
      for (;;) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        const [id, timer] = next;
        timers.delete(id);
        now = timer.at;
        timer.callback();
      }
      now = end;
    },
    move(target, properties = {}) {
      target.emit("pointermove", { pointerType: "mouse", clientX: 200, clientY: 300, ...properties });
    },
    focus(target, visible = true) {
      const previous = document.activeElement;
      previous.focusVisible = false;
      document.activeElement = target;
      target.focusVisible = visible;
      previous.emit("focusout");
      target.emit("focusin");
      while (microtasks.length) microtasks.shift()();
    },
    hit(target) {
      hitTarget = target;
    },
    active() {
      return items.filter(({ item }) => "previewActive" in item.dataset).map(({ item }) => item);
    },
  };
}

test("initial hover follows the latest title without restarting inside a title", () => {
  const f = fixture();
  const [first, second] = f.items;
  f.move(first.title);
  f.advance(100);
  f.move(second.title);
  f.advance(100);
  assert.deepEqual(f.active(), []);
  f.move(second.date);
  f.advance(40);
  assert.deepEqual(f.active(), [second.item]);
  assert.equal(f.page.dataset.previewState, "open");
});

test("nearby previews switch immediately and bridge gaps without accumulating active rows", () => {
  const f = fixture();
  const [first, second, third] = f.items;
  f.move(first.title);
  f.advance(140);
  for (const row of [second, third, first, third]) {
    f.move(row.title);
    assert.deepEqual(f.active(), [row.item]);
    assert.equal(f.page.dataset.previewState, "open");
  }
  f.move(f.outside);
  f.advance(60);
  assert.deepEqual(f.active(), [third.item]);
  f.move(second.title);
  assert.deepEqual(f.active(), [second.item]);
  f.move(f.outside);
  f.advance(180);
  assert.deepEqual(f.active(), []);
  f.move(first.title);
  assert.deepEqual(f.active(), [first.item], "A short absence retains the hover session");
  f.move(f.outside);
  f.advance(400);
  f.move(second.title);
  assert.deepEqual(f.active(), [], "A fresh visit waits for hover intent again");
  f.advance(140);
  assert.deepEqual(f.active(), [second.item]);
});

test("the popup itself neither opens nor holds a preview", () => {
  const f = fixture();
  const [first] = f.items;
  f.move(first.popup);
  f.advance(500);
  assert.deepEqual(f.active(), []);
  f.move(first.title);
  f.advance(140);
  assert.deepEqual(f.active(), [first.item]);
  f.move(first.popup);
  f.advance(80);
  assert.deepEqual(f.active(), []);
});

test("scroll closes immediately, stays closed through momentum and resolves the stationary pointer afresh", () => {
  const f = fixture();
  const [first, second, third] = f.items;
  f.move(first.title);
  f.advance(140);
  f.window.emit("scroll");
  assert.deepEqual(f.active(), []);
  assert.equal(f.page.dataset.previewState, "scrolling");
  f.move(second.title, { clientX: 250, clientY: 350 });
  f.advance(150);
  f.window.emit("scroll");
  f.hit(third.title);
  f.advance(159);
  assert.deepEqual(f.active(), []);
  f.advance(1);
  assert.deepEqual(f.active(), [third.item]);
  assert.deepEqual(f.hitTests, [{ x: 250, y: 350 }]);
  assert.equal(f.window.listeners.get("scroll")[0].options.passive, true);
  third.popup.emit("scroll");
  assert.deepEqual(f.active(), [third.item], "Only document scrolling should suspend previews");
});

test("scroll cancels pending opens and does not revive previews over blank space or outside the window", () => {
  const f = fixture();
  const [first] = f.items;
  f.move(first.title);
  f.advance(50);
  f.window.emit("scroll");
  f.advance(500);
  assert.deepEqual(f.active(), []);
  assert.equal(f.page.dataset.previewState, "idle");
  f.move(first.title);
  f.advance(140);
  f.window.emit("scroll");
  f.hit(first.title);
  first.title.emit("pointerout", { relatedTarget: null });
  f.advance(500);
  assert.deepEqual(f.active(), []);
});

test("keyboard focus opens immediately, supersedes hover timers and ignores restored mouse focus", () => {
  const f = fixture();
  const [first, second] = f.items;
  f.focus(first.title, false);
  f.advance(500);
  assert.deepEqual(f.active(), []);
  f.move(first.title);
  f.focus(first.title);
  assert.deepEqual(f.active(), [first.item]);
  assert.equal(f.page.dataset.previewInput, "keyboard");
  f.focus(second.title);
  assert.deepEqual(f.active(), [second.item]);
  f.move(second.date);
  assert.equal(f.page.dataset.previewInput, "pointer");
  f.focus(second.title);
  f.focus(f.outside);
  assert.deepEqual(f.active(), []);
});

test("Escape dismisses until the pointer leaves the current title", () => {
  const f = fixture();
  const [first, second] = f.items;
  f.move(first.title);
  f.advance(140);
  f.document.emit("keydown", { key: "Escape" });
  f.move(first.date);
  f.advance(500);
  assert.deepEqual(f.active(), []);
  f.move(second.title);
  f.advance(140);
  assert.deepEqual(f.active(), [second.item]);
});

test("unsupported pointers, missing excerpts, the picker and page lifecycle cannot leave an open preview", () => {
  for (const options of [{ supported: false }, { finePointer: false }]) {
    const f = fixture(options);
    f.move(f.items[0].title);
    f.advance(500);
    assert.deepEqual(f.active(), []);
  }
  const f = fixture();
  f.move(f.items[3].title);
  f.advance(500);
  assert.deepEqual(f.active(), []);
  f.move(f.items[0].title, { pointerType: "touch" });
  f.advance(500);
  assert.deepEqual(f.active(), []);
  for (const reset of [
    () => f.window.emit("pagehide"),
    () => f.picker.emit("beforetoggle", { newState: "open" }),
    () => f.media.emit("change"),
    () => {
      f.document.hidden = true;
      f.document.emit("visibilitychange");
    },
  ]) {
    f.move(f.items[0].title);
    f.advance(140);
    assert.equal(f.active().length, 1);
    f.window.emit("scroll");
    f.hit(f.items[1].title);
    reset();
    f.advance(500);
    assert.deepEqual(f.active(), []);
    assert.equal(f.page.dataset.previewState, "idle");
  }
});
