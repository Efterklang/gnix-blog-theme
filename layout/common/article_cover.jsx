const { Component } = require("inferno");
const { generateSrcset, withImageParams } = require("../../include/util/image");

module.exports = class extends Component {
  render() {
    const { page, cover, helper } = this.props;

    const metadata = helper.image_metadata(cover);
    const canResize = helper.image_resize_supported(cover);
    const imageSrcset = metadata ? generateSrcset(cover, metadata.width, [400, 600, 800, 1200, 1600, 2000]) : undefined;
    const placeholder = metadata?.dataURL || (canResize ? withImageParams(cover, { w: 32, q: 30 }) : null);
    // Desktop posts span five columns of the twelve-column, min(90vw, 96rem) hero.
    // Pages have a full-column cover; mobile post covers also subtract hero padding.
    const sizes = page.layout === "page"
      ? "(max-width: 768px) 100vw, min(calc(100vw - 3rem), 42rem)"
      : "(min-width: 1024px) min(37.5vw, 40rem), (max-width: 768px) calc(100vw - 2.25rem), calc((min(100vw, 45rem) - 5.5rem - clamp(1.5rem, 4vw, 3.5rem)) * 0.52381)";

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
