const { Component } = require("../include/util/common");

function translate(helper, key, fallback) {
  const value = helper.__(key);
  return value === key ? fallback : value;
}

module.exports = class extends Component {
  render() {
    const { helper, page } = this.props;
    const postCount = Number(page.postCount || 0);

    return (
      <main class="status-page">
        <section class="status-sonnet" aria-label={translate(helper, "status.metrics", "Site metrics")}>
          <p class="status-line">
            <span class="status-line__label">{translate(helper, "status.article_total", "Total posts")}</span>
            <strong class="status-line__value">{postCount}</strong>
          </p>
          <p class="status-line">
            <span class="status-line__label">{translate(helper, "status.site_pv", "Site PV")}</span>
            <strong id="busuanzi_container_site_pv" class="status-line__value">
              <span id="busuanzi_site_pv">-</span>
            </strong>
          </p>
          <p class="status-line">
            <span class="status-line__label">{translate(helper, "status.site_uv", "Site UV")}</span>
            <strong id="busuanzi_container_site_uv" class="status-line__value">
              <span id="busuanzi_site_uv">-</span>
            </strong>
          </p>
        </section>
      </main>
    );
  }
};
