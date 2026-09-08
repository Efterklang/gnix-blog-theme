const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const componentPath = path.join(__dirname, "../source/js/components/theme-stacked.js");
const componentSource = fs.readFileSync(componentPath, "utf8");
const handledKeys = ["ArrowLeft", "ArrowRight", " ", "Enter"];
const themes = [
  { id: "mocha", name: "Mocha" },
  { id: "latte", name: "Latte" },
  { id: "frappe", name: "Frappe" },
];

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
    this.parentNode = null;
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  listenerCount(type) {
    return this.listeners.get(type)?.size || 0;
  }

  dispatchEvent(event) {
    event.target ??= this;
    event.currentTarget = this;
    for (const listener of this.listeners.get(event.type) || []) listener.call(this, event);
    if (event.bubbles && !event.propagationStopped) this.parentNode?.dispatchEvent(event);
    return !event.defaultPrevented;
  }
}

class FakeElement extends FakeEventTarget {
  constructor(className = "", dataset = {}) {
    super();
    this.className = className;
    this.dataset = dataset;
    this.children = [];
    this.style = { transform: "", cursor: "" };
    this.innerHTML = "";
    this.classList = {
      contains: (name) => this.className.split(/\s+/).includes(name),
      toggle: (name, force) => {
        const names = new Set(this.className.split(/\s+/).filter(Boolean));
        const included = force ?? !names.has(name);
        if (included) names.add(name);
        else names.delete(name);
        this.className = [...names].join(" ");
        return included;
      },
    };
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  matches(selector) {
    return selector.startsWith(".") ? this.classList.contains(selector.slice(1)) : selector === `#${this.id}`;
  }

  closest(selector) {
    return this.matches(selector) ? this : this.parentNode?.closest?.(selector) || null;
  }

  querySelectorAll(selector) {
    return this.children.flatMap((child) => [...(child.matches(selector) ? [child] : []), ...child.querySelectorAll(selector)]);
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }
}

function createShadowRoot(host) {
  const shadowRoot = new FakeElement();
  shadowRoot.parentNode = host;
  let markup = "";
  Object.defineProperty(shadowRoot, "innerHTML", {
    get: () => markup,
    set: (value) => {
      markup = value;
      shadowRoot.children = [];
      const container = shadowRoot.appendChild(new FakeElement("stacked-container"));
      const cardStack = container.appendChild(new FakeElement("card-stack"));
      cardStack.id = "card-stack";
      themes.forEach((theme, index) => {
        const card = cardStack.appendChild(new FakeElement("theme-card", { index: String(index), theme: theme.id }));
        const button = card.appendChild(new FakeElement("apply-btn", { theme: theme.id }));
        button.tagName = "BUTTON";
      });
      const previousButton = container.appendChild(new FakeElement("nav-btn"));
      previousButton.id = "prev-btn";
      previousButton.tagName = "BUTTON";
      const dots = container.appendChild(new FakeElement("dots"));
      dots.id = "dots";
      themes.forEach((theme, index) => {
        const dot = dots.appendChild(new FakeElement("dot", { index: String(index) }));
        dot.tagName = "BUTTON";
      });
      const nextButton = container.appendChild(new FakeElement("nav-btn"));
      nextButton.id = "next-btn";
      nextButton.tagName = "BUTTON";
    },
  });
  return shadowRoot;
}

function createHarness() {
  const documentTarget = new FakeEventTarget();
  const registry = new Map();
  const applications = [];
  const timers = [];
  let currentTheme = "latte";
  const context = {
    document: documentTarget,
    HTMLElement: class extends FakeEventTarget {
      attachShadow() {
        this.parentNode = documentTarget;
        this.shadowRoot = createShadowRoot(this);
        return this.shadowRoot;
      }
    },
    CustomEvent: class {
      constructor(type, options) {
        this.type = type;
        this.detail = options.detail;
        this.bubbles = false;
      }
    },
    IntersectionObserver: class {
      constructor(callback) {
        this.callback = callback;
        this.disconnected = false;
      }
      observe() {
        this.callback([{ isIntersecting: true }]);
      }
      disconnect() {
        this.disconnected = true;
      }
    },
    window: {
      __GNIX_THEME_CONFIG__: {
        defaultTheme: "auto",
        themes: [{ value: "auto", name: "System" }, ...themes.map((theme) => ({ value: theme.id, name: theme.name }))],
      },
      __cachedThemeData: Object.fromEntries(themes.map((theme) => [theme.id, {}])),
      getResolvedTheme: () => currentTheme,
      applyTheme(themeId, persist) {
        currentTheme = themeId;
        applications.push({ themeId, persist });
      },
    },
    customElements: {
      get: (name) => registry.get(name),
      define: (name, constructor) => registry.set(name, constructor),
    },
    setTimeout(callback, delay) {
      timers.push({ callback, delay });
      return timers.length;
    },
  };
  vm.runInNewContext(componentSource, context, { filename: componentPath });
  return {
    documentTarget,
    applications,
    timers,
    async connect() {
      const Component = registry.get("theme-stacked");
      const component = new Component();
      const changes = [];
      component.addEventListener("themeChange", (event) => changes.push(event.detail));
      await component.connectedCallback();
      return { component, changes };
    },
  };
}

function dispatch(target, type, properties = {}) {
  const event = {
    type,
    bubbles: true,
    defaultPrevented: false,
    preventDefaultCalls: 0,
    preventDefault() {
      this.defaultPrevented = true;
      this.preventDefaultCalls += 1;
    },
    stopPropagation() {
      this.propagationStopped = true;
    },
    ...properties,
  };
  target.dispatchEvent(event);
  return event;
}

function assertNavigation(component, changes, action, expectedIndex, input) {
  const previousCount = changes.length;
  action();
  assert.equal(component._currentIndex, expectedIndex);
  assert.equal(component._stackedContainer.dataset.navigationInput, input);
  assert.equal(changes.length, previousCount + 1, "Navigation must emit exactly one themeChange");
  assert.deepEqual(Object.keys(changes.at(-1)), ["index", "theme"]);
  assert.equal(changes.at(-1).index, expectedIndex);
  assert.equal(changes.at(-1).theme, component._themes[expectedIndex]);
  component._cards.forEach((card, index) => assert.equal(card.classList.contains("active"), index === expectedIndex));
  component._dotsContainer.querySelectorAll(".dot").forEach((dot, index) => assert.equal(dot.classList.contains("active"), index === expectedIndex));
}

function assertIgnored(harness, component, changes, target, key, properties = {}) {
  const previousIndex = component._currentIndex;
  const previousChanges = changes.length;
  const previousApplications = harness.applications.length;
  const previousInput = component._stackedContainer.dataset.navigationInput;
  const event = dispatch(target, "keydown", { key, ...properties });
  assert.equal(event.preventDefaultCalls, 0, `${key} must retain its native behavior`);
  assert.equal(event.defaultPrevented, properties.defaultPrevented || false);
  assert.equal(component._currentIndex, previousIndex);
  assert.equal(changes.length, previousChanges);
  assert.equal(harness.applications.length, previousApplications);
  assert.equal(component._stackedContainer.dataset.navigationInput, previousInput);
}

function assertApplied(component, themeId) {
  component._cards.forEach((card, index) => {
    const button = card.querySelector(".apply-btn");
    const applied = component._themes[index].id === themeId;
    assert.equal(button.classList.contains("applied"), applied);
    assert.equal(button.textContent, applied ? "Applied ✓" : "Apply Theme");
  });
}

async function testFocusedKeyboard() {
  const harness = createHarness();
  const { component, changes } = await harness.connect();
  const second = await harness.connect();
  assert.equal(harness.documentTarget.listenerCount("keydown"), 0, "The document must not own theme-stack shortcuts");
  assert.equal(component._cardStack.listenerCount("keydown"), 1);
  assert.equal(component._currentIndex, 1, "Initialization must preserve the currently applied theme");
  assert.equal(changes.length, 0, "Initialization must not emit themeChange");
  assert.equal(component._stackedContainer, component.shadowRoot.querySelector(".stacked-container"));
  assert.equal(component._stackedContainer.dataset.navigationInput, "pointer");
  const markup = component.shadowRoot.innerHTML;
  assert.match(markup, /<div class="card-stack"[^>]*tabindex="0"[^>]*role="group"[^>]*aria-label="Theme previews"/);
  assert.match(markup, /\.card-stack:focus-visible\s*\{\s*outline: 2px solid var\(--blue\);\s*outline-offset: -2px;\s*\}/);
  assert.match(
    markup,
    /\.stacked-container\[data-navigation-input="keyboard"\] \.theme-card,\s*\.stacked-container\[data-navigation-input="keyboard"\] \.dot\s*\{\s*transition: none;\s*\}/,
  );
  assert.match(markup, /transition: transform 0\.5s cubic-bezier\(0\.4, 0, 0\.2, 1\), opacity 0\.5s cubic-bezier\(0\.4, 0, 0\.2, 1\);/);

  const observedInputs = [];
  const updateStack = component.updateStack;
  component.updateStack = function () {
    observedInputs.push(this._stackedContainer.dataset.navigationInput);
    return updateStack.call(this);
  };
  for (const [key, expectedIndex] of [["ArrowLeft", 0], ["ArrowLeft", 2], ["ArrowRight", 0], [" ", 1]]) {
    assertNavigation(component, changes, () => {
      const event = dispatch(component._cardStack, "keydown", { key });
      assert.equal(event.preventDefaultCalls, 1);
    }, expectedIndex, "keyboard");
  }
  assert.deepEqual(observedInputs, ["keyboard", "keyboard", "keyboard", "keyboard"]);
  const enterEvent = dispatch(component._cardStack, "keydown", { key: "Enter" });
  assert.equal(enterEvent.preventDefaultCalls, 1);
  assert.deepEqual(harness.applications, [{ themeId: "latte", persist: true }]);
  assert.equal(changes.length, 4, "Applying a theme is not card navigation");
  assertApplied(component, "latte");
  assert.equal(harness.timers.length, 0, "Keyboard navigation and application must not schedule motion timers");
  assert.equal(second.component._currentIndex, 1);
  assert.equal(second.changes.length, 0, "An unfocused stack must not navigate");
  assertNavigation(second.component, second.changes, () => dispatch(second.component._cardStack, "keydown", { key: "ArrowRight" }), 2, "keyboard");
  assert.equal(changes.length, 4);
  assert.equal(component._currentIndex, 1);
  await Promise.resolve();
  assert.equal(component._stackedContainer.dataset.navigationInput, "keyboard", "Keyboard mode must persist after the event");
  assertNavigation(component, changes, () => component.next(), 2, "pointer");
  assert.equal(observedInputs.at(-1), "pointer", "Pointer mode must be restored before updating the stack");
  component.goTo(0, false);
  assert.equal(component._currentIndex, 0);
  assert.equal(changes.length, 5, "goTo(index, false) must remain silent");
}

async function testIgnoredKeyboard() {
  const harness = createHarness();
  const { component, changes } = await harness.connect();
  const outsideInput = new FakeElement();
  outsideInput.tagName = "INPUT";
  outsideInput.parentNode = harness.documentTarget;
  const nestedInput = component._cards[1].appendChild(new FakeElement());
  nestedInput.tagName = "INPUT";
  const editable = component._cardStack.appendChild(new FakeElement());
  editable.isContentEditable = true;
  const targets = [harness.documentTarget, outsideInput, nestedInput, editable, component._cards[1].querySelector(".apply-btn"), component._prevBtn, component._nextBtn, component._dotsContainer.querySelector(".dot")];
  for (const target of targets) {
    for (const key of handledKeys) assertIgnored(harness, component, changes, target, key);
  }
  for (const modifier of ["altKey", "ctrlKey", "metaKey", "shiftKey", "isComposing", "defaultPrevented"]) {
    for (const key of handledKeys) assertIgnored(harness, component, changes, component._cardStack, key, { [modifier]: true });
  }
  for (const key of ["ArrowUp", "ArrowDown", "Home", "End", "Tab", "Escape", "a"]) {
    assertIgnored(harness, component, changes, component._cardStack, key);
  }
  component._isVisible = false;
  for (const key of handledKeys) assertIgnored(harness, component, changes, component._cardStack, key);
  component._isVisible = true;
  const originalThemes = component._themes;
  component._themes = [];
  for (const key of handledKeys) assertIgnored(harness, component, changes, component._cardStack, key);
  component.goTo(2, true, "keyboard");
  assert.equal(changes.length, 0);
  assert.equal(component._currentIndex, 1);
  assert.equal(component._stackedContainer.dataset.navigationInput, "pointer");
  component._themes = originalThemes;
}

async function testClickInputs() {
  const harness = createHarness();
  const { component, changes } = await harness.connect();
  const activations = [{ detail: 0, key: "Enter", input: "keyboard" }, { detail: 0, key: " ", input: "keyboard" }, { detail: 1, input: "pointer" }];
  const controls = [
    { target: component._prevBtn, expectedIndex: 0 },
    { target: component._nextBtn, expectedIndex: 2 },
    { target: component._dotsContainer.querySelectorAll(".dot")[0], expectedIndex: 0 },
    { target: component._cards[0], expectedIndex: 0 },
  ];
  for (const { target, expectedIndex } of controls) {
    for (const activation of activations) {
      component.goTo(1, false, activation.input === "keyboard" ? "pointer" : "keyboard");
      if (activation.key) assertIgnored(harness, component, changes, target, activation.key);
      assertNavigation(component, changes, () => dispatch(target, "click", { detail: activation.detail }), expectedIndex, activation.input);
    }
  }
  assert.equal(harness.timers.length, 0);
  for (const activation of activations) {
    component.goTo(1, false);
    const button = component._cards[1].querySelector(".apply-btn");
    const previousApplications = harness.applications.length;
    const previousChanges = changes.length;
    const previousTimers = harness.timers.length;
    button.style.transform = "scale(0.95)";
    if (activation.key) assertIgnored(harness, component, changes, button, activation.key);
    dispatch(button, "click", { detail: activation.detail });
    assert.equal(harness.applications.length, previousApplications + 1, "Native Apply activation must apply exactly once");
    assert.deepEqual(harness.applications.at(-1), { themeId: "latte", persist: true });
    assert.equal(changes.length, previousChanges);
    assertApplied(component, "latte");
    assert.equal(button.style.transform, activation.input === "keyboard" ? "" : "scale(0.95)");
    assert.equal(harness.timers.length, previousTimers + (activation.input === "pointer" ? 1 : 0));
  }
  const button = component._cards[1].querySelector(".apply-btn");
  assert.equal(harness.timers[0].delay, 150, "Pointer Apply feedback must retain its timing");
  component.applyTheme("frappe", "keyboard");
  assert.equal(button.style.transform, "");
  assert.equal(harness.timers.length, 1, "Keyboard Apply must not add a pulse timer");
  assertApplied(component, "frappe");
  harness.timers[0].callback();
  assert.equal(button.style.transform, "", "An earlier pointer timer must not reintroduce a transform");
}

async function testSwipesAndReconnect() {
  const harness = createHarness();
  const { component, changes } = await harness.connect();
  component.goTo(1, false, "keyboard");
  assertNavigation(component, changes, () => {
    dispatch(component._cardStack, "touchstart", { touches: [{ clientX: 100 }] });
    dispatch(component._cardStack, "touchend", { changedTouches: [{ clientX: 0 }] });
  }, 2, "pointer");
  component.goTo(1, false, "keyboard");
  assertNavigation(component, changes, () => {
    dispatch(component._cardStack, "mousedown", { clientX: 0 });
    dispatch(harness.documentTarget, "mouseup", { clientX: 100 });
  }, 0, "pointer");
  assert.equal(component._cardStack.style.cursor, "");
  for (let reconnectCount = 0; reconnectCount < 2; reconnectCount++) {
    const previousStack = component._cardStack;
    const previousObserver = component._observer;
    component.disconnectedCallback();
    assert.equal(previousObserver.disconnected, true);
    assert.equal(previousStack.listenerCount("keydown"), 0);
    assert.equal(harness.documentTarget.listenerCount("mouseup"), 0);
    assertIgnored(harness, component, changes, previousStack, "ArrowRight");
    const previousChanges = changes.length;
    await component.connectedCallback();
    assert.notEqual(component._cardStack, previousStack);
    assert.equal(previousStack.listenerCount("keydown"), 0);
    assert.equal(component._cardStack.listenerCount("keydown"), 1);
    assert.equal(harness.documentTarget.listenerCount("keydown"), 0);
    assert.equal(harness.documentTarget.listenerCount("mouseup"), 1);
    assert.equal(changes.length, previousChanges, "Reconnection initialization must not emit themeChange");
    assertNavigation(component, changes, () => dispatch(component._cardStack, "keydown", { key: "ArrowRight" }), 2, "keyboard");
  }
}

async function main() {
  await testFocusedKeyboard();
  await testIgnoredKeyboard();
  await testClickInputs();
  await testSwipesAndReconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
