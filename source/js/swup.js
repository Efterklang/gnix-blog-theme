import SwupHeadPlugin from "https://unpkg.com/@swup/head-plugin@2?module";
import SwupScriptsPlugin from "https://unpkg.com/@swup/scripts-plugin@2?module";
import Swup from "https://unpkg.com/swup@4?module";

const swup = new Swup({
  containers: ["#swup"],
  cache: true,
  native: false,
  animationSelector: false,
  plugins: [
    new SwupHeadPlugin({
      persistTags: true,
    }),
    new SwupScriptsPlugin({
      optin: true,
    }),
  ],
});

document.addEventListener(
  "click",
  (event) => {
    if (!swup.navigating || event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (!link || link.matches('[download], [target="_blank"]')) return;

    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin) return;

    event.preventDefault();
    event.stopImmediatePropagation();
  },
  { capture: true },
);

window.swup = swup;
document.dispatchEvent(new CustomEvent("gnix:swup-ready", { detail: { swup } }));
