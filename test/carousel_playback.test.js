const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const componentNames = ["image-carousel", "device-carousel"];
const sources = new Map(componentNames.map((name) => [name, fs.readFileSync(path.join(__dirname, "..", "source", "js", "components", `${name}.js`), "utf8")]));
const tests = [];

function test(name, run) {
  tests.push({ name, run });
}

function decodeText(value) {
  const entities = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"' };
  return value.replace(/&(?:amp|lt|gt|quot);/g, (entity) => entities[entity]);
}

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener, options) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Map());
    this.listeners.get(type).set(listener, options);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  listenerCount(type) {
    return this.listeners.get(type)?.size || 0;
  }

  emit(type, properties = {}) {
    const event = { type, target: this, ...properties };
    let current = this;
    while (current) {
      event.currentTarget = current;
      for (const listener of Array.from(current.listeners.get(type)?.keys() || [])) listener.call(current, event);
      if (type === "pointerenter" || type === "pointerleave") break;
      current = current.parentNode;
    }
  }
}

function createStyle() {
  return new Proxy(
    {
      values: new Map(),
      changes: [],
      setProperty(name, value) {
        this.values.set(name, String(value));
        this.changes.push([name, String(value)]);
      },
      getPropertyValue(name) {
        return this.values.get(name) || "";
      },
    },
    {
      get(target, name) {
        return name in target ? target[name] : target.getPropertyValue(name);
      },
      set(target, name, value) {
        target.setProperty(name, value);
        return true;
      },
    },
  );
}

class FakeElement extends FakeEventTarget {
  constructor(tagName) {
    super();
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this.style = createStyle();
    this._connected = false;
    this._text = "";
    this._markup = null;
    this.htmlWrites = 0;
    this.classList = {
      contains: (name) => (this.getAttribute("class") || "").split(/\s+/).includes(name),
      toggle: (name, active) => {
        const classes = new Set((this.getAttribute("class") || "").split(/\s+/).filter(Boolean));
        active ? classes.add(name) : classes.delete(name);
        this.setAttribute("class", Array.from(classes).join(" "));
      },
    };
  }

  get isConnected() {
    return this.host ? this.host.isConnected : this.parentNode ? this.parentNode.isConnected : this._connected;
  }

  get dataset() {
    return { index: this.getAttribute("data-index") };
  }

  get hidden() {
    return this.hasAttribute("hidden");
  }

  set hidden(value) {
    value ? this.setAttribute("hidden", "") : this.removeAttribute("hidden");
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  setAttribute(name, value) {
    const oldValue = this.getAttribute(name);
    this.attributes.set(name, String(value));
    if (this.constructor.observedAttributes?.includes(name)) this.attributeChangedCallback(name, oldValue, String(value));
  }

  removeAttribute(name) {
    const oldValue = this.getAttribute(name);
    if (!this.attributes.delete(name)) return;
    if (this.constructor.observedAttributes?.includes(name)) this.attributeChangedCallback(name, oldValue, null);
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  contains(target) {
    while (target) {
      if (target === this) return true;
      target = target.parentNode;
    }
    return false;
  }

  matches(selector) {
    if (selector === ":focus-within") {
      let root = this;
      while (root.parentNode) root = root.parentNode;
      return this.contains(root.activeElement);
    }
    return selector.startsWith(".") ? this.classList.contains(selector.slice(1)) : this.tagName === selector.toUpperCase();
  }

  closest(selector) {
    let current = this;
    while (current && !current.matches(selector)) current = current.parentNode;
    return current;
  }

  querySelectorAll(selector) {
    return this.children.flatMap((child) => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  get textContent() {
    return this._text + this.children.map((child) => child.textContent).join("");
  }

  set textContent(value) {
    for (const child of this.children) child.parentNode = null;
    this.children = [];
    this._text = String(value);
    this._markup = null;
  }

  get innerHTML() {
    return this._markup ?? this._text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  set innerHTML(markup) {
    this.textContent = "";
    this._markup = markup;
    this.htmlWrites += 1;
    const stack = [this];
    const voidTags = new Set(["IMG", "BR", "HR", "INPUT", "LINK", "META"]);
    for (const token of markup.match(/<[^>]*>|[^<]+/g) || []) {
      if (token.startsWith("</")) {
        stack.pop();
      } else if (token.startsWith("<")) {
        const [, tagName, attributes] = token.match(/^<([\w-]+)([\s\S]*?)\/?>$/);
        const child = new FakeElement(tagName);
        for (const [, name, value] of attributes.matchAll(/([^\s=/>]+)(?:="([^"]*)")?/g)) child.setAttribute(name, decodeText(value || ""));
        stack[stack.length - 1].appendChild(child);
        if (!voidTags.has(child.tagName) && !token.endsWith("/>")) stack.push(child);
      } else {
        stack[stack.length - 1]._text += decodeText(token);
      }
    }
  }
}

class FakeClock {
  constructor() {
    this.now = 0;
    this.nextId = 0;
    this.timers = new Map();
    this.allocations = [];
    this.cleared = [];
  }

  setInterval(callback, interval) {
    const timerId = this.nextId++;
    this.timers.set(timerId, { callback, interval, nextAt: this.now + interval });
    this.allocations.push({ timerId, interval, createdAt: this.now });
    return timerId;
  }

  clearInterval(timerId) {
    this.cleared.push(timerId);
    this.timers.delete(timerId);
  }

  advance(duration) {
    const target = this.now + duration;
    while (true) {
      const next = Array.from(this.timers.values()).filter((timer) => timer.nextAt <= target).sort((first, second) => first.nextAt - second.nextAt)[0];
      if (!next) break;
      this.now = next.nextAt;
      next.nextAt += next.interval;
      next.callback();
    }
    this.now = target;
  }
}

function createHarness(name, { autoplay = true, imageCount = 3, interval, lang = "en", hidden = false } = {}) {
  const clock = new FakeClock();
  const observers = [];
  const microtasks = [];
  const probes = [];
  const registry = new Map();
  const document = Object.assign(new FakeEventTarget(), {
    hidden,
    documentElement: { lang },
    activeElement: null,
    createElement: (tagName) => new FakeElement(tagName),
  });

  class FakeHTMLElement extends FakeElement {
    constructor() {
      super(name);
    }

    attachShadow() {
      this.shadowRoot = new FakeElement("shadow-root");
      this.shadowRoot.host = this;
      this.shadowRoot.activeElement = null;
      return this.shadowRoot;
    }
  }

  class FakeIntersectionObserver {
    constructor(callback, options) {
      this.callback = callback;
      this.options = options;
      this.disconnected = false;
      observers.push(this);
    }

    observe(target) {
      this.target = target;
    }

    disconnect() {
      this.disconnected = true;
    }

    emit(isIntersecting) {
      this.callback([{ target: this.target, isIntersecting }]);
    }
  }

  const source = sources.get(name);
  const finalExport = /\nexport \{ (?:ImageCarousel|DeviceCarousel) \};\s*$/;
  assert.match(source, finalExport);
  vm.runInNewContext(
    source.replace(finalExport, "\n"),
    {
      HTMLElement: FakeHTMLElement,
      document,
      customElements: { define: (tagName, componentClass) => registry.set(tagName, componentClass) },
      CSSStyleSheet: class {
        replaceSync(cssText) {
          this.cssText = cssText;
        }
      },
      Image: class {
        constructor() {
          probes.push(this);
        }
      },
      IntersectionObserver: FakeIntersectionObserver,
      setInterval: clock.setInterval.bind(clock),
      clearInterval: clock.clearInterval.bind(clock),
      queueMicrotask: (callback) => microtasks.push(callback),
    },
    { filename: `${name}.js` },
  );

  const Component = registry.get(name);
  const component = new Component();
  if (name === "image-carousel") {
    for (let index = 0; index < imageCount; index += 1) {
      const image = new FakeElement("img");
      Object.assign(image, { src: `/image-${index}.jpg`, alt: `Image ${index + 1}`, complete: true, naturalWidth: 1600, naturalHeight: 900 });
      component.appendChild(image);
    }
    if (autoplay) component.setAttribute("autoplay", "");
    if (interval !== undefined) component.setAttribute("interval", interval);
  }

  return {
    name,
    component,
    document,
    clock,
    observers,
    probes,
    get region() {
      return component.shadowRoot.querySelector(name === "image-carousel" ? ".carousel" : ".showcase-region");
    },
    get button() {
      return component.shadowRoot.querySelector(".playback-toggle");
    },
    get css() {
      return name === "image-carousel" ? component.shadowRoot.adoptedStyleSheets[0].cssText : component.shadowRoot.querySelector("style").textContent;
    },
    connect() {
      component._connected = true;
      component.connectedCallback();
    },
    disconnect() {
      component._connected = false;
      component.disconnectedCallback();
      component.shadowRoot.activeElement = null;
      document.activeElement = null;
    },
    intersect(isIntersecting) {
      observers[observers.length - 1].emit(isIntersecting);
    },
    visibility(isHidden) {
      document.hidden = isHidden;
      document.emit("visibilitychange");
    },
    focus(target) {
      const previous = component.shadowRoot.activeElement;
      component.shadowRoot.activeElement = null;
      document.activeElement = null;
      previous?.emit("focusout", { relatedTarget: target });
      component.shadowRoot.activeElement = target;
      document.activeElement = target ? component : null;
      target?.emit("focusin", { relatedTarget: previous });
    },
    flushMicrotasks() {
      while (microtasks.length) microtasks.shift()();
    },
  };
}

function assertPaused(harness) {
  if (harness.name === "image-carousel") {
    assert.equal(harness.component._timer, null);
    assert.equal(harness.clock.timers.size, 0);
  } else {
    assert.equal(harness.component.shadowRoot.querySelector(".showcase-track").style.animationPlayState, "paused");
  }
}

function assertPlaying(harness) {
  if (harness.name === "image-carousel") {
    assert.notEqual(harness.component._timer, null);
    assert.equal(harness.clock.timers.size, 1);
    assert.ok(harness.clock.timers.has(harness.component._timer));
  } else {
    assert.equal(harness.component.shadowRoot.querySelector(".showcase-track").style.animationPlayState, "running");
  }
}

function touchStart(harness, clientX = 100) {
  harness.region.emit("touchstart", { touches: [{ clientX }] });
}

function touchEnd(harness, clientX = 100) {
  harness.region.emit("touchend", { touches: [], changedTouches: [{ clientX }] });
}

const playbackCss = `
  .playback-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding-block: 0.5rem;
  }
  .playback-controls[hidden] { display: none; }
  .playback-toggle {
    min-block-size: 44px;
    min-inline-size: 44px;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--surface1, #45475a);
    border-radius: var(--radius, 12px);
    background: var(--base, #1e1e2e);
    color: var(--text, #cdd6f4);
    font: inherit;
    cursor: pointer;
  }
  .playback-toggle:focus-visible {
    outline: 2px solid var(--blue, #89b4fa);
    outline-offset: 2px;
  }
  .playback-note {
    margin: 0;
    color: var(--subtext0, #a6adc8);
    font-size: 0.75rem;
    line-height: 1.5;
    text-align: center;
  }
`;

for (const name of componentNames) {
  for (const eventType of ["touchend", "touchcancel"]) {
    test(`${name}: ${eventType} waits for local touches but ignores another carousel's touch`, () => {
      const harness = createHarness(name);
      const outsideHarness = createHarness(name);
      harness.connect();
      outsideHarness.connect();
      harness.intersect(true);
      assertPlaying(harness);
      const firstTouch = { identifier: 1, clientX: 100, target: harness.button };
      const remainingTouch = { identifier: 2, clientX: 100, target: harness.button };
      const outsideTouch = { identifier: 3, clientX: 100, target: outsideHarness.button };
      harness.button.emit("touchstart", { touches: [firstTouch], changedTouches: [firstTouch] });
      assertPaused(harness);
      harness.button.emit("touchstart", { touches: [firstTouch, remainingTouch, outsideTouch], changedTouches: [remainingTouch] });
      harness.button.emit(eventType, { touches: [outsideTouch, remainingTouch], changedTouches: [firstTouch] });
      assert.equal(harness.component._isInteracting, true);
      assertPaused(harness);
      harness.button.emit(eventType, { touches: [outsideTouch], changedTouches: [remainingTouch] });
      assert.equal(harness.component._isInteracting, false);
      assertPlaying(harness);
    });
  }

  test(`${name}: visibility must be known and unchanged notifications do not restart playback`, () => {
    const harness = createHarness(name);
    const { component, clock } = harness;
    assert.equal(component._isVisible, false);
    harness.connect();
    assertPaused(harness);
    assert.equal(harness.document.listenerCount("visibilitychange"), 1);
    assert.equal(harness.observers.length, 1);
    assert.equal(harness.observers[0].target, component);
    if (name === "device-carousel") assert.equal(harness.observers[0].options.threshold, 0.1);
    harness.visibility(false);
    harness.intersect(false);
    assertPaused(harness);
    if (name === "image-carousel") component._startAutoplay();
    assertPaused(harness);
    assert.equal(clock.allocations.length, 0);
    harness.visibility(true);
    harness.intersect(true);
    assertPaused(harness);
    harness.visibility(false);
    assertPlaying(harness);
    const timerId = component._timer;
    if (name === "image-carousel") assert.equal(timerId, 0);
    clock.advance(1200);
    harness.intersect(true);
    harness.intersect(true);
    harness.visibility(false);
    assertPlaying(harness);
    if (name === "image-carousel") {
      assert.equal(component._timer, timerId);
      assert.equal(clock.allocations.length, 1);
      clock.advance(1799);
      assert.equal(component._currentIndex, 0);
      clock.advance(1);
      assert.equal(component._currentIndex, 1);
    }
    harness.intersect(false);
    assertPaused(harness);
    harness.intersect(false);
    harness.visibility(false);
    assertPaused(harness);
    harness.intersect(true);
    assertPlaying(harness);
  });

  test(`${name}: manual intent survives competing blockers and resume waits for focus and hover`, () => {
    const harness = createHarness(name);
    const { component, clock } = harness;
    harness.connect();
    harness.intersect(true);
    clock.advance(1200);
    harness.region.emit("pointerenter", { pointerType: "mouse" });
    assertPaused(harness);
    assert.equal(harness.button.textContent, "Pause autoplay");
    harness.focus(harness.button);
    touchStart(harness);
    harness.button.emit("click");
    assert.equal(component._userPaused, true);
    assert.equal(harness.button.textContent, "Resume autoplay");
    clock.advance(10000);
    if (name === "image-carousel") assert.equal(component._currentIndex, 0);
    harness.region.emit("pointerleave", { pointerType: "mouse" });
    assertPaused(harness);
    harness.focus(null);
    harness.flushMicrotasks();
    assertPaused(harness);
    touchEnd(harness);
    assert.equal(component._isInteracting, false);
    assertPaused(harness);
    harness.intersect(false);
    harness.intersect(true);
    harness.visibility(true);
    harness.visibility(false);
    assert.equal(component._userPaused, true);
    assertPaused(harness);
    harness.region.emit("pointerenter", { pointerType: "mouse" });
    harness.focus(harness.button);
    harness.button.emit("click");
    assert.equal(component._userPaused, false);
    assert.equal(harness.button.textContent, "Pause autoplay");
    assert.equal(component.shadowRoot.activeElement, harness.button);
    assert.equal(component._isHovered, true);
    assertPaused(harness);
    harness.region.emit("pointerleave", { pointerType: "mouse" });
    assertPaused(harness);
    harness.focus(null);
    assertPaused(harness);
    harness.flushMicrotasks();
    assertPlaying(harness);
    if (name === "image-carousel") {
      clock.advance(2999);
      assert.equal(component._currentIndex, 0);
      clock.advance(1);
      assert.equal(component._currentIndex, 1);
    }
  });

  test(`${name}: focus transfers inside the shadow root remain paused`, () => {
    const harness = createHarness(name);
    harness.connect();
    harness.intersect(true);
    const otherControl = harness.component.shadowRoot.querySelector(".next") || harness.region.appendChild(new FakeElement("button"));
    harness.focus(harness.button);
    assert.equal(harness.document.activeElement, harness.component);
    assert.equal(harness.region.contains(harness.document.activeElement), false);
    assertPaused(harness);
    const allocations = harness.clock.allocations.length;
    harness.focus(otherControl);
    harness.intersect(true);
    harness.visibility(false);
    assertPaused(harness);
    harness.flushMicrotasks();
    assert.equal(harness.component._isFocused, true);
    assertPaused(harness);
    harness.clock.advance(10000);
    assert.equal(harness.clock.allocations.length, allocations);
    if (name === "image-carousel") assert.equal(harness.component._currentIndex, 0);
    harness.focus(harness.button);
    harness.flushMicrotasks();
    assertPaused(harness);
    harness.focus(null);
    assert.equal(harness.component._isFocused, true);
    harness.flushMicrotasks();
    assert.equal(harness.component._isFocused, false);
    assertPlaying(harness);
  });

  test(`${name}: touch and pointer hover remain independent through end and cancel`, () => {
    const harness = createHarness(name);
    harness.connect();
    harness.intersect(true);
    const timerId = harness.component._timer;
    harness.region.emit("pointerenter", { pointerType: "touch" });
    harness.region.emit("pointerleave", { pointerType: "touch" });
    assert.equal(harness.component._isHovered, false);
    assertPlaying(harness);
    assert.equal(harness.component._timer, timerId);
    touchStart(harness);
    assert.equal(harness.component._isInteracting, true);
    assertPaused(harness);
    harness.intersect(true);
    harness.visibility(true);
    harness.visibility(false);
    harness.clock.advance(10000);
    assertPaused(harness);
    if (name === "image-carousel") assert.equal(harness.component._currentIndex, 0);
    harness.region.emit("touchcancel", { touches: [] });
    assert.equal(harness.component._isInteracting, false);
    assertPlaying(harness);
    touchStart(harness);
    harness.region.emit("pointerenter", { pointerType: "mouse" });
    harness.region.emit("pointerleave", { pointerType: "touch" });
    assert.equal(harness.component._isHovered, true);
    touchEnd(harness);
    assert.equal(harness.component._isInteracting, false);
    assertPaused(harness);
    harness.region.emit("pointerleave", { pointerType: "mouse" });
    assertPlaying(harness);
  });

  test(`${name}: reconnect retains user intent without leaked or stale callbacks`, () => {
    const harness = createHarness(name);
    const { component, clock, document } = harness;
    harness.connect();
    harness.intersect(true);
    const oldObserver = harness.observers[0];
    const oldRegion = harness.region;
    const oldButton = harness.button;
    const oldTick = clock.timers.get(component._timer)?.callback;
    harness.region.emit("pointerenter", { pointerType: "mouse" });
    harness.focus(harness.button);
    touchStart(harness);
    harness.button.emit("click");
    harness.focus(null);
    harness.disconnect();
    assertPaused(harness);
    assert.equal(oldObserver.disconnected, true);
    assert.equal(component._observer, null);
    assert.equal(document.listenerCount("visibilitychange"), 0);
    oldObserver.emit(true);
    harness.visibility(false);
    oldTick?.();
    assertPaused(harness);
    assert.equal(component._isVisible, false);
    if (name === "image-carousel") assert.equal(component._currentIndex, 0);
    harness.connect();
    assert.notEqual(harness.region, oldRegion);
    assert.notEqual(harness.button, oldButton);
    assert.equal(oldRegion.isConnected, false);
    assert.equal(component._isVisible, false);
    assert.equal(component._isHovered, false);
    assert.equal(component._isFocused, false);
    assert.equal(component._isInteracting, false);
    assert.equal(component._userPaused, true);
    assert.equal(harness.button.textContent, "Resume autoplay");
    assert.equal(document.listenerCount("visibilitychange"), 1);
    assert.equal(harness.region.listenerCount("pointerenter"), 1);
    assert.equal(harness.button.listenerCount("click"), 1);
    harness.focus(harness.button);
    harness.flushMicrotasks();
    assert.equal(component._isFocused, true);
    oldObserver.emit(true);
    assert.equal(component._isVisible, false);
    assertPaused(harness);
    harness.intersect(true);
    harness.button.emit("click");
    assert.equal(component._userPaused, false);
    assertPaused(harness);
    harness.focus(null);
    harness.flushMicrotasks();
    assertPlaying(harness);
    const previousObserver = component._observer;
    harness.disconnect();
    harness.connect();
    previousObserver.emit(true);
    assert.equal(component._isVisible, false);
    assertPaused(harness);
    harness.intersect(true);
    assertPlaying(harness);
    assert.equal(document.listenerCount("visibilitychange"), 1);
    harness.disconnect();
    assertPaused(harness);
    assert.equal(document.listenerCount("visibilitychange"), 0);
    assert.ok(harness.observers.every((observer) => observer.disconnected));
  });

  for (const locale of [
    { lang: "en", pause: "Pause autoplay", resume: "Resume autoplay", note: "Pauses while hovered or focused.", region: name === "image-carousel" ? "Image carousel" : "Device carousel" },
    { lang: "ZH-cn", pause: "暂停自动播放", resume: "恢复自动播放", note: "悬停或聚焦时保持暂停。", region: name === "image-carousel" ? "图片轮播" : "设备轮播" },
  ]) {
    test(`${name}: stationary native controls and exact styles (${locale.lang})`, () => {
      const harness = createHarness(name, { lang: locale.lang });
      harness.connect();
      const controls = harness.component.shadowRoot.querySelector(".playback-controls");
      const movingArea = harness.component.shadowRoot.querySelector(name === "image-carousel" ? ".stage" : ".showcase-container");
      assert.equal(harness.region.getAttribute("role"), "region");
      assert.equal(harness.region.getAttribute("aria-label"), locale.region);
      assert.equal(controls.parentNode, harness.region);
      assert.equal(movingArea.contains(controls), false);
      assert.ok(harness.region.children.indexOf(controls) > harness.region.children.indexOf(movingArea));
      assert.equal(controls.hidden, false);
      assert.equal(harness.component.shadowRoot.querySelectorAll(".playback-toggle").length, 1);
      assert.equal(harness.button.tagName, "BUTTON");
      assert.equal(harness.button.getAttribute("type"), "button");
      assert.equal(harness.button.hasAttribute("aria-pressed"), false);
      assert.equal(harness.button.textContent, locale.pause);
      assert.equal(controls.querySelector(".playback-note").textContent, locale.note);
      assert.ok(harness.css.replace(/\s+/g, " ").includes(playbackCss.replace(/\s+/g, " ").trim()));
      assert.doesNotMatch(harness.css, /prefers-reduced-motion/);
      harness.button.emit("click");
      assert.equal(harness.button.textContent, locale.resume);
      harness.button.emit("click");
      assert.equal(harness.button.textContent, locale.pause);
      assert.equal(harness.component.shadowRoot.htmlWrites, 1);
      if (name === "device-carousel") assert.equal(harness.component.shadowRoot.querySelector(".showcase-label").textContent, "Galaxy S24+");
    });
  }
}

test("image-carousel: navigation works while hovered, focused, or manually paused", () => {
  const harness = createHarness("image-carousel");
  const { component, clock } = harness;
  harness.connect();
  harness.intersect(true);
  assert.equal(component._timer, 0);
  harness.region.emit("pointerenter", { pointerType: "mouse" });
  assert.deepEqual(clock.cleared, [0]);
  const allocations = clock.allocations.length;
  component.shadowRoot.querySelector(".next").emit("click");
  assert.equal(component._currentIndex, 1);
  component.shadowRoot.querySelector(".prev").emit("click");
  assert.equal(component._currentIndex, 0);
  component._dots[2].emit("click");
  assert.equal(component._currentIndex, 2);
  assert.equal(component._dots[2].getAttribute("aria-selected"), "true");
  assert.equal(component._slides[2].classList.contains("active"), true);
  harness.region.emit("keydown", { key: "ArrowRight" });
  assert.equal(component._currentIndex, 0);
  harness.region.emit("keydown", { key: "ArrowLeft" });
  assert.equal(component._currentIndex, 2);
  harness.intersect(true);
  assertPaused(harness);
  assert.equal(clock.allocations.length, allocations);
  harness.focus(component.shadowRoot.querySelector(".next"));
  harness.region.emit("pointerleave", { pointerType: "mouse" });
  component.shadowRoot.querySelector(".next").emit("click");
  assert.equal(component._currentIndex, 0);
  assertPaused(harness);
  harness.button.emit("click");
  harness.focus(null);
  harness.flushMicrotasks();
  component._dots[1].emit("click");
  assert.equal(component._currentIndex, 1);
  assertPaused(harness);
  assert.equal(clock.allocations.length, allocations);
  assert.equal(component._userPaused, true);
});

test("image-carousel: every manual navigation gets a full interval only when eligible", () => {
  const harness = createHarness("image-carousel", { interval: "1000" });
  const { component, clock } = harness;
  harness.connect();
  component.shadowRoot.querySelector(".next").emit("click");
  component._dots[2].emit("click");
  harness.region.emit("keydown", { key: "ArrowLeft" });
  assert.equal(component._currentIndex, 1);
  assertPaused(harness);
  assert.equal(clock.allocations.length, 0);
  harness.intersect(true);
  for (const navigate of [
    () => component.shadowRoot.querySelector(".next").emit("click"),
    () => component.shadowRoot.querySelector(".prev").emit("click"),
    () => component._dots[component._currentIndex].emit("click"),
    () => harness.region.emit("keydown", { key: "ArrowRight" }),
    () => harness.region.emit("keydown", { key: "ArrowLeft" }),
  ]) {
    clock.advance(700);
    const oldTimer = component._timer;
    navigate();
    const selected = component._currentIndex;
    assert.notEqual(component._timer, oldTimer);
    assertPlaying(harness);
    clock.advance(999);
    assert.equal(component._currentIndex, selected);
    clock.advance(1);
    assert.equal(component._currentIndex, (selected + 1) % 3);
  }
  clock.advance(700);
  component.setAttribute("interval", "800");
  const selected = component._currentIndex;
  clock.advance(799);
  assert.equal(component._currentIndex, selected);
  clock.advance(1);
  assert.equal(component._currentIndex, (selected + 1) % 3);
});

for (const blocker of [
  { name: "unknown visibility", block: () => {}, release: (harness) => harness.intersect(true) },
  { name: "offscreen", block: (harness) => harness.intersect(false), release: (harness) => harness.intersect(true) },
  { name: "hover", block: (harness) => harness.region.emit("pointerenter", { pointerType: "mouse" }), release: (harness) => harness.region.emit("pointerleave", { pointerType: "mouse" }) },
  { name: "focus", block: (harness) => harness.focus(harness.button), release: (harness) => { harness.focus(null); harness.flushMicrotasks(); } },
  { name: "touch", block: (harness) => touchStart(harness), release: (harness) => harness.region.emit("touchcancel", { touches: [] }) },
  { name: "manual pause", block: (harness) => harness.button.emit("click"), release: (harness) => harness.button.emit("click") },
  { name: "hidden document", block: (harness) => harness.visibility(true), release: (harness) => harness.visibility(false) },
  { name: "disconnect", block: (harness) => harness.disconnect(), release: (harness) => { harness.connect(); harness.intersect(true); } },
]) {
  test(`image-carousel: autoplay and interval changes cannot bypass ${blocker.name}`, () => {
    const harness = createHarness("image-carousel");
    const { component, clock } = harness;
    harness.connect();
    if (blocker.name !== "unknown visibility") harness.intersect(true);
    blocker.block(harness);
    assertPaused(harness);
    const allocations = clock.allocations.length;
    const controls = component.shadowRoot.querySelector(".playback-controls");
    const firstSlide = component._slides[0];
    component.setAttribute("interval", "500");
    component.removeAttribute("autoplay");
    assert.equal(controls.hidden, true);
    component.setAttribute("interval", "750");
    component.setAttribute("autoplay", "");
    component._startAutoplay();
    component._userNav("next");
    assert.equal(controls.hidden, false);
    assert.equal(component._slides[0], firstSlide);
    assert.equal(component.shadowRoot.htmlWrites, 1);
    assertPaused(harness);
    assert.equal(clock.allocations.length, allocations);
    blocker.release(harness);
    assertPlaying(harness);
    const selected = component._currentIndex;
    assert.equal(clock.timers.get(component._timer).interval, 750);
    clock.advance(749);
    assert.equal(component._currentIndex, selected);
    clock.advance(1);
    assert.equal(component._currentIndex, (selected + 1) % 3);
  });
}

test("image-carousel: autoplay opt-in toggles the existing control without rebuilding slides", () => {
  const harness = createHarness("image-carousel", { autoplay: false });
  const { component } = harness;
  harness.connect();
  harness.intersect(true);
  const controls = component.shadowRoot.querySelector(".playback-controls");
  const firstSlide = component._slides[0];
  assert.equal(controls.hidden, true);
  assertPaused(harness);
  component.setAttribute("interval", "900");
  assertPaused(harness);
  component.setAttribute("autoplay", "");
  assert.equal(controls.hidden, false);
  assertPlaying(harness);
  const timerId = component._timer;
  component.setAttribute("autoplay", "enabled");
  component.setAttribute("interval", "900");
  assert.equal(component._timer, timerId);
  harness.button.emit("click");
  component.removeAttribute("autoplay");
  assert.equal(controls.hidden, true);
  component.setAttribute("autoplay", "");
  assert.equal(controls.hidden, false);
  assert.equal(component._userPaused, true);
  assert.equal(harness.button.textContent, "Resume autoplay");
  assertPaused(harness);
  assert.equal(component._slides[0], firstSlide);
  assert.equal(component.shadowRoot.querySelector(".playback-controls"), controls);
  assert.equal(component.shadowRoot.htmlWrites, 1);
});

for (const imageCount of [0, 1]) {
  test(`image-carousel: ${imageCount} image instances never expose autoplay controls or timers`, () => {
    const harness = createHarness("image-carousel", { imageCount });
    harness.connect();
    assert.equal(harness.button, null);
    assert.equal(harness.component.shadowRoot.querySelector(".playback-controls"), null);
    assert.equal(harness.observers.length, 0);
    assert.equal(harness.document.listenerCount("visibilitychange"), 0);
    harness.component.setAttribute("interval", "100");
    harness.component.removeAttribute("autoplay");
    harness.component.setAttribute("autoplay", "");
    harness.component._startAutoplay();
    assertPaused(harness);
    assert.equal(harness.clock.allocations.length, 0);
    harness.disconnect();
    harness.connect();
    assertPaused(harness);
  });
}

test("image-carousel: swipe threshold, directions, cancel, and post-touch interval are preserved", () => {
  const harness = createHarness("image-carousel", { interval: "1000" });
  const { component, clock } = harness;
  harness.connect();
  harness.intersect(true);
  clock.advance(600);
  touchStart(harness);
  clock.advance(5000);
  assert.equal(component._currentIndex, 0);
  assertPaused(harness);
  touchEnd(harness, 60);
  assert.equal(component._currentIndex, 0);
  assertPlaying(harness);
  clock.advance(999);
  assert.equal(component._currentIndex, 0);
  clock.advance(1);
  assert.equal(component._currentIndex, 1);
  for (const swipe of [{ end: 59, index: 2 }, { end: 141, index: 1 }]) {
    touchStart(harness);
    const allocations = clock.allocations.length;
    touchEnd(harness, swipe.end);
    assert.equal(component._currentIndex, swipe.index);
    assert.equal(clock.allocations.length, allocations + 1);
    assertPlaying(harness);
  }
  touchStart(harness);
  harness.focus(harness.button);
  touchEnd(harness, 59);
  assert.equal(component._currentIndex, 2);
  assertPaused(harness);
  harness.focus(null);
  harness.flushMicrotasks();
  touchStart(harness);
  harness.region.emit("touchcancel", { touches: [] });
  clock.advance(999);
  assert.equal(component._currentIndex, 2);
  clock.advance(1);
  assert.equal(component._currentIndex, 0);
});

test("image-carousel: default interval parsing, crossfade, and image sizing remain unchanged", () => {
  for (const [interval, expected] of [[undefined, 3000], ["0", 3000], ["invalid", 3000], ["1250ms", 1250]]) {
    const harness = createHarness("image-carousel", { interval });
    harness.connect();
    harness.intersect(true);
    assert.equal(harness.clock.timers.get(harness.component._timer).interval, expected);
    assert.match(harness.css, /transition: opacity 0\.7s cubic-bezier\(0\.25, 1, 0\.5, 1\)/);
    assert.match(harness.css, /object-fit: cover/);
    assert.equal(harness.component.style.getPropertyValue("--carousel-ratio"), "1600 / 900");
    assert.equal(harness.component.style.getPropertyValue("--carousel-max-width"), `calc(${1600 / 900} * var(--carousel-max-height, 80vh))`);
    harness.component.setAttribute("ratio", "4 / 5");
    assert.equal(harness.component.style.getPropertyValue("--carousel-ratio"), "4 / 5");
    assert.equal(harness.component.style.getPropertyValue("--carousel-max-width"), "calc(0.8 * var(--carousel-max-height, 80vh))");
    harness.component.removeAttribute("ratio");
    assert.equal(harness.component.style.getPropertyValue("--carousel-ratio"), "1600 / 900");
  }
  const harness = createHarness("image-carousel");
  harness.component.querySelector("img").complete = false;
  harness.connect();
  assert.equal(harness.component.style.getPropertyValue("--carousel-ratio"), "3 / 2");
  assert.equal(harness.probes.length, 1);
  Object.assign(harness.probes[0], { naturalWidth: 900, naturalHeight: 1600 });
  harness.probes[0].onload();
  assert.equal(harness.component.style.getPropertyValue("--carousel-ratio"), "900 / 1600");
  assertPaused(harness);
});

test("device-carousel: playback changes preserve the track, timing, geometry, and loop content", () => {
  const harness = createHarness("device-carousel");
  const { component } = harness;
  harness.connect();
  const track = component.shadowRoot.querySelector(".showcase-track");
  assert.match(harness.css, /--animation-duration: 40s/);
  assert.match(harness.css, /animation: scroll var\(--animation-duration\) linear infinite;\s*animation-play-state: paused/);
  assert.match(harness.css, /0% \{ transform: translateX\(0\); \}\s*100% \{ transform: translateX\(-50%\); \}/);
  assert.doesNotMatch(harness.css, /\.showcase-track:hover/);
  const cards = track.querySelectorAll(".showcase-card");
  assert.equal(cards.length, 12);
  assert.deepEqual(cards.slice(0, 6).map((card) => card.textContent), cards.slice(6).map((card) => card.textContent));
  component.setAttribute("speed", "55");
  component.setAttribute("card-width", "320px");
  assert.equal(track.style.getPropertyValue("--animation-duration"), "55s");
  assert.equal(component.style.getPropertyValue("--card-width"), "320px");
  track.style.changes.length = 0;
  harness.intersect(true);
  harness.region.emit("pointerenter", { pointerType: "mouse" });
  harness.intersect(true);
  assertPaused(harness);
  harness.region.emit("pointerleave", { pointerType: "mouse" });
  harness.focus(harness.button);
  harness.button.emit("click");
  harness.intersect(false);
  harness.intersect(true);
  harness.visibility(true);
  harness.visibility(false);
  assertPaused(harness);
  harness.button.emit("click");
  harness.focus(null);
  harness.flushMicrotasks();
  touchStart(harness);
  touchEnd(harness);
  assertPlaying(harness);
  assert.equal(component.shadowRoot.querySelector(".showcase-track"), track);
  assert.equal(component.shadowRoot.htmlWrites, 1);
  assert.deepEqual(new Set(track.style.changes.map(([property]) => property)), new Set(["animationPlayState"]));
  assert.equal(track.style.getPropertyValue("--animation-duration"), "55s");
  assert.equal(component.style.getPropertyValue("--card-width"), "320px");
});

for (const { name, run } of tests) {
  try {
    run();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

console.log(`Passed ${tests.length} carousel playback tests.`);
