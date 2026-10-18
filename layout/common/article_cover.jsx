const { Component } = require("inferno");
const { generateSrcset, withImageParams } = require("../../include/util/image");

module.exports = class extends Component {
  render() {
    const { page, cover, helper } = this.props;

    const metadata = helper.image_metadata(cover);
    const canResize = helper.image_resize_supported(cover);
    const imageSrcset = metadata ? generateSrcset(cover, metadata.width, [400, 600, 800, 1200, 1600, 2000]) : undefined;
    const placeholder = metadata?.dataURL || (canResize ? withImageParams(cover, { w: 32, q: 30 }) : null);
    // Desktop post covers take the left seven-twelfths of the min(90vw, 96rem)
    // hero band; narrower screens show a full-width band above the text. Pages
    // keep a full-column cover above the article.
    const sizes = page.layout === "page"
      ? "(max-width: 768px) 100vw, min(calc(100vw - 3rem), 42rem)"
      : "(min-width: 1024px) min(52vw, 54rem), (max-width: 768px) calc(100vw - 1.75rem), min(calc(100vw - 2.5rem), 45rem)";

    return (
      <div class="cover-image">
        {placeholder && <img class="cover-lqip" src={placeholder} alt="" aria-hidden="true" decoding="async" />}
        <img
          class="cover-origin"
          src={cover}
          alt={page.title || cover}
          srcset={imageSrcset}
          sizes={imageSrcset ? sizes : undefined}
          width={metadata?.width}
          height={metadata?.height}
          referrerpolicy="no-referrer"
          decoding="async"
          loading="eager"
          fetchpriority="high"
        />
      </div>
    );
  }
};
