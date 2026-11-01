const { Component } = require("inferno");
const { generateSrcset, withImageParams } = require("../../include/util/image");

module.exports = class extends Component {
  render() {
    const { page, cover, helper } = this.props;

    const metadata = helper.image_metadata(cover);
    const canResize = helper.image_resize_supported(cover);
    const imageSrcset = metadata ? generateSrcset(cover, metadata.width, [400, 600, 800, 1200, 1600, 2000]) : undefined;
    const placeholder = metadata?.dataURL || (canResize ? withImageParams(cover, { w: 32, q: 30 }) : null);
    // 封面按原比例尽量放大：最宽到栏宽（随阅读宽度偏好，最宽 64em），高度另由 CSS 限在首屏内
    const sizes = "min(calc(100vw - 3rem), 64em)";

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
