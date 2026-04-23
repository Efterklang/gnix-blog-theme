const { Component } = require("../include/util/common");
const Paginator = require("./misc/paginator");
const Article = require("./common/article");

module.exports = class extends Component {
  render() {
    const { config, page, helper } = this.props;
    const { url_for } = helper;

    return (
      <div class="page-shell page-shell-home">
        <header class="feed-hero">
          <p class="feed-hero-kicker">Journal</p>
          <h1 class="feed-hero-title">{config.title}</h1>
          {config.description ? <p class="feed-hero-description">{config.description}</p> : null}
        </header>
        <div class="post-feed">
          {page.posts.map((post) => (
            <Article config={config} page={post} helper={helper} index={true} />
          ))}
        </div>
        {page.total > 1 ? <Paginator current={page.current} total={page.total} baseUrl={page.base} path={config.pagination_dir} urlFor={url_for} /> : null}
      </div>
    );
  }
};
