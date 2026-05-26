import { Swup, SwupHeadPlugin, SwupScriptsPlugin } from "./host/swup/swup-bundle.js";

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

window.swup = swup;

export { swup };
