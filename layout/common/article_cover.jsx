const { Component } = require("inferno");

module.exports = class extends Component {
  render() {
    const { page, cover, helper, index } = this.props;
    const { url_for } = helper;

    const imageSrcset = `${cover}?w=800 800w, ${cover}?w=1500 1500w, ${cover}?w=2000 2000w, ${cover} 6144w`;
    const lqip_src = `${cover}?q=80&blur=80`;

    return (
      <a href={url_for(page.link || page.path)} class="cover-image">
        <img class="cover-lqip" src={lqip_src} alt="placeholder" />
        <img
          class="cover-origin"
          src={cover}
          alt={page.title || cover}
          srcset={imageSrcset}
          referrerpolicy="no-referrer"
          decoding="async"
          loading={index ? "lazy" : "eager"}
        />
      </a>
    );
  }
};
