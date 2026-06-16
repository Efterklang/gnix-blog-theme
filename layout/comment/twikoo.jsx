const { Component, cacheComponent } = require("../../include/util/common");

class Twikoo extends Component {
  render() {
    const { envId, region, lang, jsUrl, cssUrl } = this.props;
    return <div id="tko" class="content twikoo" data-env-id={envId} data-region={JSON.stringify(region)} data-lang={JSON.stringify(lang)} data-js-url={jsUrl} data-css-url={cssUrl}></div>;
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
  };
});

module.exports = Twikoo;
