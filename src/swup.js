import SwupHeadPlugin from "@swup/head-plugin";
import SwupScriptsPlugin from "@swup/scripts-plugin";
import Swup from "swup";

const swup = new Swup({
  containers: ["#swup"],
  cache: true,
  native: true,
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
