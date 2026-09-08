const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const sourcePath = `${__dirname}/../source/js/mdit/mermaid.js`;
const source = fs.readFileSync(sourcePath, "utf8");
const classStart = source.indexOf("  class PanZoomHandler {");
const classEnd = source.indexOf("\n  const pruneInstances =", classStart);
assert.ok(classStart >= 0 && classEnd > classStart, "The real PanZoomHandler class must be available");
const handlerScript = new vm.Script(`${source.slice(classStart, classEnd)}\nPanZoomHandler;`, { filename: sourcePath });

class FakeElement {
  constructor(tagName = "div", parentElement = null, classNames = []) {
    this.tagName = tagName;
    this.parentElement = parentElement;
    this.listeners = new Map();
    this.attributes = new Map();
    this.style = {};
    this.capturedPointers = new Set();
    this.captureCalls = [];
    this.releaseCalls = [];
    const classes = new Set(classNames);
    this.classList = {
      add: (className) => classes.add(className),
      remove: (className) => classes.delete(className),
      contains: (className) => classes.has(className),
    };
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }

  emit(type, properties = {}) {
    const event = {
      type,
      target: this,
      pointerId: 1,
      isPrimary: true,
      button: 0,
      clientX: 100,
      clientY: 100,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      ...properties,
    };
    for (let element = this; element; element = element.parentElement) {
      for (const listener of element.listeners.get(type) || []) listener(event);
    }
    return event;
  }

  closest(selector) {
    const selectors = selector.split(",").map((part) => part.trim());
    for (let element = this; element; element = element.parentElement) {
      if (selectors.includes(element.tagName) || (selectors.includes("[contenteditable]") && element.attributes.has("contenteditable"))) return element;
    }
    return null;
  }

  contains(target) {
    for (let element = target; element; element = element.parentElement) {
      if (element === this) return true;
    }
    return false;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  setPointerCapture(pointerId) {
    this.capturedPointers.add(pointerId);
    this.captureCalls.push(pointerId);
  }

  hasPointerCapture(pointerId) {
    return this.capturedPointers.has(pointerId);
  }

  releasePointerCapture(pointerId) {
    assert.ok(this.hasPointerCapture(pointerId), "Only held capture may be released");
    this.capturedPointers.delete(pointerId);
    this.releaseCalls.push(pointerId);
    this.onRelease?.(pointerId);
    this.emit("lostpointercapture", { pointerId });
  }
}

class FakeDOMMatrixReadOnly {
  constructor(transform = "matrix(1, 0, 0, 1, 0, 0)") {
    const match = /^matrix\(([^)]+)\)$/.exec(transform);
    assert.ok(match, `Expected a computed matrix, received ${transform}`);
    const components = match[1].split(",").map(Number);
    assert.equal(components.length, 6);
    assert.ok(components.every(Number.isFinite));
    [this.a, this.b, this.c, this.d, this.e, this.f] = components;
  }
}

function createFixture(contentPresent = true) {
  const document = new FakeElement("document");
  const container = new FakeElement("div", document);
  const wrapper = new FakeElement("div", container);
  const view = new FakeElement("div", wrapper);
  const content = new FakeElement("div", view);
  const elements = {
    ".mermaid-content": contentPresent ? content : null,
    ".mermaid-view-container": view,
    ".mermaid-wrapper": wrapper,
  };
  container.querySelector = (selector) => elements[selector] || null;
  container.querySelectorAll = () => [];
  let renderedTransform = "none";
  let writtenTransform = "";
  const reads = [];
  const writes = [];
  Object.defineProperty(content.style, "transform", {
    get: () => writtenTransform,
    set(value) {
      writtenTransform = value;
      writes.push({ value, dragging: view.classList.contains("is-dragging") });
    },
  });
  const PanZoomHandler = handlerScript.runInNewContext({
    document,
    getUiText: (key) => key,
    getComputedStyle(element) {
      assert.equal(element, content);
      assert.equal(view.classList.contains("is-dragging"), false, "Sample before disabling the transition");
      reads.push(writtenTransform);
      return { transform: renderedTransform };
    },
    DOMMatrixReadOnly: FakeDOMMatrixReadOnly,
  });
  const handler = new PanZoomHandler(container);
  return {
    handler,
    view,
    content,
    reads,
    writes,
    setRenderedTransform(transform) {
      renderedTransform = transform;
    },
  };
}

let testCount = 0;
function test(name, run) {
  run();
  testCount += 1;
  console.log(`ok ${testCount} - ${name}`);
}

for (const [scale, transform, expectedTranslate] of [
  [1, "none", 20],
  [2, "matrix(2, 0, 0, 2, 0, 0)", 10],
  [0.5, "matrix(0.5, 0, 0, 0.5, 0, 0)", 40],
]) {
  test(`drag tracks screen-space movement at scale ${scale}`, () => {
    const fixture = createFixture();
    fixture.setRenderedTransform(transform);
    fixture.view.emit("pointerdown");
    assert.equal(fixture.handler.scale, scale);
    assert.equal(fixture.handler.isDragging, true);
    assert.deepEqual(fixture.view.captureCalls, [1]);
    const movement = fixture.view.emit("pointermove", { clientX: 120, clientY: 80 });
    assert.equal(movement.defaultPrevented, true);
    assert.equal(fixture.handler.tx, expectedTranslate);
    assert.equal(fixture.handler.ty, -expectedTranslate);
    assert.equal(fixture.content.style.transform, `scale(${scale}) translate(${expectedTranslate}px, ${-expectedTranslate}px)`);
    fixture.view.emit("pointermove", { clientX: 140, clientY: 60 });
    assert.equal(fixture.handler.tx, expectedTranslate * 2);
    assert.equal(fixture.handler.ty, -expectedTranslate * 2);
    assert.equal(fixture.reads.length, 1);
    assert.equal(fixture.writes.length, 3);
    assert.ok(fixture.writes.every((write) => write.dragging));
  });
}

test("none samples the identity rather than stale logical state", () => {
  const fixture = createFixture();
  fixture.handler.scale = 3;
  fixture.handler.tx = 80;
  fixture.handler.ty = -40;
  fixture.view.emit("pointerdown");
  assert.equal(fixture.handler.scale, 1);
  assert.equal(fixture.handler.tx, 0);
  assert.equal(fixture.handler.ty, 0);
  assert.equal(fixture.content.style.transform, "scale(1) translate(0px, 0px)");
});

test("interrupting a tween freezes the sampled pose before moving", () => {
  const fixture = createFixture();
  fixture.handler.scale = 2;
  fixture.handler.tx = 80;
  fixture.handler.ty = -40;
  fixture.handler.apply();
  fixture.setRenderedTransform("matrix(1.5, 0, 0, 1.5, 45, -30)");
  fixture.view.emit("pointerdown", { clientX: 200, clientY: 100 });
  assert.deepEqual(fixture.reads, ["scale(2) translate(80px, -40px)"]);
  assert.equal(fixture.handler.scale, 1.5);
  assert.equal(fixture.handler.tx, 30);
  assert.equal(fixture.handler.ty, -20);
  assert.deepEqual(fixture.writes[1], { value: "scale(1.5) translate(30px, -20px)", dragging: true });
  fixture.view.emit("pointermove", { clientX: 230, clientY: 70 });
  assert.equal(fixture.content.style.transform, "scale(1.5) translate(50px, -40px)");
});

for (const properties of [{ isPrimary: false }, { button: 1 }, { button: 2 }]) {
  test(`pointerdown ignores ${JSON.stringify(properties)}`, () => {
    const fixture = createFixture();
    assert.equal(fixture.view.emit("pointerdown", properties).defaultPrevented, false);
    assert.equal(fixture.view.emit("pointermove", { clientX: 120 }).defaultPrevented, false);
    assert.equal(fixture.handler.isDragging, false);
    assert.equal(fixture.view.classList.contains("is-dragging"), false);
    assert.deepEqual(fixture.view.captureCalls, []);
    assert.deepEqual(fixture.reads, []);
    assert.deepEqual(fixture.writes, []);
  });
}

test("only the active pointer owns a drag, including pointer ID zero", () => {
  const fixture = createFixture();
  fixture.view.emit("pointerdown", { pointerId: 0 });
  fixture.view.emit("pointerdown", { pointerId: 2, clientX: 300, clientY: 400 });
  fixture.view.emit("pointerdown", { pointerId: 0, clientX: 300, clientY: 400 });
  assert.equal(fixture.view.emit("pointermove", { pointerId: 2, clientX: 500 }).defaultPrevented, false);
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    fixture.view.emit(type, { pointerId: 2 });
    assert.equal(fixture.handler.isDragging, true);
    assert.equal(fixture.view.classList.contains("is-dragging"), true);
  }
  fixture.view.emit("pointermove", { pointerId: 0, clientX: 120, clientY: 80 });
  assert.equal(fixture.content.style.transform, "scale(1) translate(20px, -20px)");
  assert.deepEqual(fixture.view.captureCalls, [0]);
  assert.deepEqual(fixture.view.releaseCalls, []);
  assert.equal(fixture.reads.length, 1);
});

for (const tagName of ["button", "a", "input", "textarea", "select", "div"]) {
  test(`native ${tagName === "div" ? "contenteditable" : tagName} targets do not start dragging`, () => {
    const fixture = createFixture();
    const control = new FakeElement(tagName, fixture.view);
    if (tagName === "div") control.setAttribute("contenteditable", "true");
    const descendant = new FakeElement("span", control);
    for (const target of [control, descendant]) {
      assert.equal(target.emit("pointerdown").defaultPrevented, false);
    }
    assert.equal(fixture.handler.isDragging, false);
    assert.deepEqual(fixture.view.captureCalls, []);
    assert.deepEqual(fixture.reads, []);
    assert.deepEqual(fixture.writes, []);
  });
}

test("missing content does not capture a pointer", () => {
  const fixture = createFixture(false);
  fixture.view.emit("pointerdown");
  assert.equal(fixture.handler.isDragging, false);
  assert.deepEqual(fixture.view.captureCalls, []);
  assert.deepEqual(fixture.reads, []);
  assert.deepEqual(fixture.writes, []);
});

test("native toolbar clicks retain zoom factors, limits, pan steps, and reset", () => {
  const fixture = createFixture();
  const clickControl = (className) => {
    const button = new FakeElement("button", fixture.view, [className]);
    const icon = new FakeElement("path", new FakeElement("svg", button));
    assert.equal(icon.emit("pointerdown").defaultPrevented, false);
    icon.emit("click");
  };
  for (const [className, expectedTransform] of [
    ["zoom-in", "scale(1.2) translate(0px, 0px)"],
    ["zoom-out", "scale(1) translate(0px, 0px)"],
    ["left", "scale(1) translate(40px, 0px)"],
    ["right", "scale(1) translate(0px, 0px)"],
    ["up", "scale(1) translate(0px, 40px)"],
    ["down", "scale(1) translate(0px, 0px)"],
    ["zoom-in", "scale(1.2) translate(0px, 0px)"],
    ["left", "scale(1.2) translate(40px, 0px)"],
    ["reset", "scale(1) translate(0px, 0px)"],
  ]) {
    clickControl(className);
    assert.equal(fixture.content.style.transform, expectedTransform);
  }
  fixture.handler.scale = 5;
  clickControl("zoom-in");
  assert.equal(fixture.handler.scale, 5);
  fixture.handler.scale = 0.2;
  clickControl("zoom-out");
  assert.equal(fixture.handler.scale, 0.2);
  assert.deepEqual(fixture.view.captureCalls, []);
  assert.deepEqual(fixture.reads, []);
  assert.ok(fixture.writes.every((write) => !write.dragging));
});

for (const finishType of ["pointerup", "pointercancel", "lostpointercapture"]) {
  test(`${finishType} cleans up idempotently without moving and permits another drag`, () => {
    const fixture = createFixture();
    fixture.setRenderedTransform("matrix(2, 0, 0, 2, 20, -10)");
    fixture.view.emit("pointerdown", { pointerId: 7 });
    fixture.view.emit("pointermove", { pointerId: 7, clientX: 120, clientY: 80 });
    fixture.view.onRelease = (pointerId) => {
      assert.equal(fixture.handler.isDragging, false);
      assert.equal(fixture.view.classList.contains("is-dragging"), false);
      const movement = fixture.view.emit("pointermove", { pointerId, clientX: 900 });
      assert.equal(movement.defaultPrevented, false, "Clear the active pointer before releasing capture");
    };
    if (finishType === "lostpointercapture") fixture.view.capturedPointers.delete(7);
    const writesBeforeFinish = fixture.writes.length;
    fixture.view.emit(finishType, { pointerId: 7 });
    assert.equal(fixture.handler.isDragging, false);
    assert.equal(fixture.view.classList.contains("is-dragging"), false);
    assert.equal(fixture.view.hasPointerCapture(7), false);
    assert.deepEqual(fixture.view.releaseCalls, finishType === "lostpointercapture" ? [] : [7]);
    for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) fixture.view.emit(type, { pointerId: 7 });
    assert.equal(fixture.view.emit("pointermove", { pointerId: 7, clientX: 500 }).defaultPrevented, false);
    assert.equal(fixture.content.style.transform, "scale(2) translate(20px, -15px)");
    assert.equal(fixture.writes.length, writesBeforeFinish);
    fixture.setRenderedTransform("matrix(2, 0, 0, 2, 40, -30)");
    fixture.view.emit("pointerdown", { pointerId: 8, clientX: 20, clientY: 30 });
    assert.equal(fixture.handler.isDragging, true);
    assert.equal(fixture.view.hasPointerCapture(8), true);
    fixture.view.emit("pointermove", { pointerId: 8, clientX: 40, clientY: 50 });
    assert.equal(fixture.content.style.transform, "scale(2) translate(30px, -5px)");
    fixture.view.emit("pointerup", { pointerId: 8 });
    assert.equal(fixture.handler.isDragging, false);
    assert.equal(fixture.view.hasPointerCapture(8), false);
    assert.deepEqual(fixture.view.captureCalls, [7, 8]);
  });
}

test("CSS keeps native pinch zoom and limits transform transitions to discrete actions", () => {
  const css = fs.readFileSync(`${__dirname}/../source/css/optional/mermaid.css`, "utf8");
  assert.match(css, /\.mermaid-view-container\s*\{[^}]*touch-action:\s*pinch-zoom;/);
  assert.match(css, /\.mermaid-content\s*\{[^}]*transition:\s*transform 200ms var\(--ease-out\);/);
  assert.match(css, /\.mermaid-view-container\.is-dragging\s*\{[^}]*cursor:\s*grabbing;/);
  assert.match(css, /\.mermaid-view-container\.is-dragging \.mermaid-content\s*\{[^}]*transition:\s*none;/);
});

console.log(`Passed ${testCount} Mermaid drag tests.`);
