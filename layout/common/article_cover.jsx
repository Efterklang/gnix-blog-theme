const { Component } = require("inferno");

module.exports = class extends Component {
  render() {
    const { page, cover, helper } = this.props;
    const { url_for } = helper;

    const imageSrcset = `${cover}?w=800 800w, ${cover}?w=1500 1500w, ${cover}?w=2000 2000w, ${cover} 6144w`;
    const CoverImage = (
      <img
        class="fill"
        src={cover}
        alt={page.title || cover}
        onLoad={"this.classList.add('loaded')"}
        srcset={imageSrcset}
        referrerpolicy="no-referrer"
        decoding="async"
        loading="lazy"
      />
    );
    return (
      <div class="card-image">
        <a href={url_for(page.link || page.path)} class="image is-7by3">
          {CoverImage}
        </a>
      </div>
    );
  }
};
