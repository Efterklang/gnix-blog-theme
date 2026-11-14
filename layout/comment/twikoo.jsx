const { Component, Fragment, cacheComponent } = require("../../include/util/common");

class Twikoo extends Component {
  render() {
    const { envId, region, lang, jsUrl, cssUrl, loadingLabel, errorLabel, retryLabel } = this.props;
    return (
      <Fragment>
        <div class="comment-load-status" data-comment-load-status data-loading-label={loadingLabel} data-error-label={errorLabel}>
          <p data-comment-load-message role="status" aria-live="polite">
            {loadingLabel}
          </p>
          <button type="button" class="comment-load-retry" data-comment-load-retry hidden>
            {retryLabel}
          </button>
        </div>
        <div id="tko" class="comment-thread" data-env-id={envId} data-region={JSON.stringify(region)} data-lang={JSON.stringify(lang)} data-js-url={jsUrl} data-css-url={cssUrl}>
          <div id="twikoo-mount"></div>
        </div>
      </Fragment>
    );
  }
}

Twikoo.Cacheable = cacheComponent(Twikoo, "comment.twikoo", (props) => {
  const { comment, page, config, helper } = props;

  return {
    envId: comment.env_id,
    region: comment.region,
    lang: comment.lang || page.lang || page.language || config.language || "zh-CN",
    jsUrl: helper.url_for("/js/host/twikoo/1.6.41/dist/twikoo.all.min.js"),
    cssUrl: helper.url_for("/css/twikoo.css"),
    loadingLabel: helper.__("article.comments_loading"),
    errorLabel: helper.__("article.comments_error"),
    retryLabel: helper.__("article.comments_retry"),
  };
});

module.exports = Twikoo;
