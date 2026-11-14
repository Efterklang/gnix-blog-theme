// Shared, one-time entrances for archive rows and article blocks. Visibility is
// opt-in: without JS, observer support or motion preference, content stays put.
export function initScrollReveal(root, elements) {
  if (!root || !("IntersectionObserver" in window)) return () => {};

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reducedMotion.matches) return () => {};

  const targets = new Set(elements);
  if (!targets.size) return () => {};
  const pending = new Set();
  let observer;
  let disposed = false;

  // Read geometry before changing styles. Never hide content already in view;
  // restored scroll positions also skip the page's initial entrance sequence.
  const measurements = Array.from(targets, (target) => ({ target, rect: target.getBoundingClientRect() }));
  for (const { target, rect } of measurements) {
    if (target.dataset.scrollReveal) continue;
    if (rect.top >= window.innerHeight && rect.height > 0) {
      target.dataset.scrollReveal = "pending";
      pending.add(target);
    } else if (window.scrollY > 0) {
      target.dataset.scrollReveal = "shown";
    }
  }

  function reveal(target, delay = 0, instant = false) {
    if (instant) {
      target.style.removeProperty("--scroll-reveal-delay");
      target.dataset.scrollReveal = "shown";
    } else {
      target.style.setProperty("--scroll-reveal-delay", `${delay}ms`);
      target.dataset.scrollReveal = "visible";
    }
    pending.delete(target);
    observer?.unobserve(target);
    if (!pending.size) observer?.disconnect();
  }

  if (pending.size) {
    observer = new window.IntersectionObserver(
      (entries) => {
        entries
          .filter((entry) => entry.isIntersecting && pending.has(entry.target))
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          .forEach((entry, index) => reveal(entry.target, Math.min(index, 3) * 30));
      },
      { rootMargin: "0px 0px -24px 0px", threshold: 0 },
    );
    for (const target of pending) observer.observe(target);
  }

  function revealContaining(node) {
    for (let target = node; target && target !== root; target = target.parentElement) {
      if (!targets.has(target)) continue;
      reveal(target, 0, true);
      break;
    }
  }

  function revealInteraction(event) {
    revealContaining(event.target);
  }

  function revealFragment() {
    let id = window.location.hash.slice(1);
    if (!id) return;
    try {
      id = decodeURIComponent(id);
    } catch {
      // A malformed fragment can still be a literal element ID.
    }
    const target = document.getElementById(id);
    revealContaining(target === root ? root.firstElementChild : target);
  }

  function onMotionChange() {
    if (reducedMotion.matches) cleanup();
  }

  const interactions = ["focusin", "pointerover", "pointerdown", "click", "beforematch"];
  // Capture intent before image zoom / footnote handlers measure their targets.
  for (const type of interactions) root.addEventListener(type, revealInteraction, { capture: true, passive: true });
  reducedMotion.addEventListener("change", onMotionChange);
  window.addEventListener("hashchange", revealFragment);
  window.addEventListener("pagehide", cleanup);
  window.addEventListener("beforeprint", cleanup);
  revealFragment();
  revealContaining(document.activeElement);

  function cleanup() {
    if (disposed) return;
    disposed = true;
    for (const target of targets) reveal(target, 0, true);
    observer?.disconnect();
    for (const type of interactions) root.removeEventListener(type, revealInteraction, true);
    reducedMotion.removeEventListener("change", onMotionChange);
    window.removeEventListener("hashchange", revealFragment);
    window.removeEventListener("pagehide", cleanup);
    window.removeEventListener("beforeprint", cleanup);
  }

  return cleanup;
}
