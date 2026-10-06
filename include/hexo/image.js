const { ImageMetadata } = require("../util/image");

const services = new WeakMap();

module.exports = function getImageMetadata(hexo) {
  if (services.has(hexo)) return services.get(hexo);
  const images = new ImageMetadata(hexo.config.markdown_exit?.image_options, hexo.base_dir);
  services.set(hexo, images);

  hexo.extend.helper.register("image_metadata", (src) => images.get(src));
  hexo.extend.helper.register("image_resize_supported", (src) => images.supports(src));

  // JSX rendering is synchronous. Resolve cover dimensions before layouts run,
  // sharing both the disk cache and in-flight requests with Markdown images.
  hexo.extend.filter.register("before_generate", async () => {
    await images.ready;
    if (process.env.NODE_ENV === "development") return;
    const covers = new Set();
    for (const model of ["Post", "Page"]) {
      hexo.model(model).find().forEach((page) => {
        if (images.supports(page.cover)) covers.add(page.cover);
      });
    }
    await Promise.all([...covers].map((src) => images.fetch(src)));
  });
  hexo.extend.filter.register("after_generate", () => images.save());
  hexo.extend.filter.register("before_exit", () => images.save());
  return images;
};
