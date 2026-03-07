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
