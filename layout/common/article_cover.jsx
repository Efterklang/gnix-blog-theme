const { Component } = require("inferno");

module.exports = class extends Component {
  render() {
    const { page, cover } = this.props;

    const imageSrcset = `${cover}?w=800 800w, ${cover}?w=1500 1500w, ${cover}?w=2000 2000w, ${cover} 6144w`;
    const lqip_src = `${cover}?q=80&blur=80`;

    return (
      <div class="cover-image">
        <img class="cover-lqip" src={lqip_src} alt="" aria-hidden="true" />
        <img
          class="cover-origin"
          src={cover}
          alt={page.title || cover}
          srcset={imageSrcset}
          sizes="(max-width: 768px) 100vw, 50vw"
          referrerpolicy="no-referrer"
          decoding="async"
          loading="eager"
          fetchpriority="high"
        />
      </div>
    );
  }
};
