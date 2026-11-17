const { Component } = require("inferno");
const { generateSrcset, withImageParams } = require("../../include/util/image");

module.exports = class extends Component {
  render() {
    const { page, cover, helper } = this.props;

    const metadata = helper.image_metadata(cover);
    const canResize = helper.image_resize_supported(cover);
    const imageSrcset = metadata && canResize ? generateSrcset(cover, metadata.width, [400, 600, 800, 1200, 1600, 2000]) : undefined;
    const placeholder = metadata?.dataURL || (canResize ? withImageParams(cover, { w: 32, q: 30 }) : null);
    // 封面在首屏 ≥1024 时占 12 栏里的右 6 栏（版心最宽 96rem），窄屏宽到版心
    const sizes = "(min-width: 1024px) min(50vw, 48rem), calc(100vw - 2.5rem)";

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
