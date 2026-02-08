const { Component, Fragment, cacheComponent, lazy_load_css } = require("../../include/util/common");

class Twikoo extends Component {
  render() {
    const { envId, region, lang, jsUrl } = this.props;
    const configJs = `window.twikooConfig = { envId: '${envId}', ${region ? `region: ${JSON.stringify(region)},` : ""} ${lang ? `lang: ${JSON.stringify(lang)},` : ""} el: '#tko' };`;
    const lazy_load_css_script = lazy_load_css("/css/twikoo.css");
    return (
      <Fragment>
        <div id="tko" class="content twikoo"></div>
        <script dangerouslySetInnerHTML={{ __html: lazy_load_css_script }}></script>
        <script dangerouslySetInnerHTML={{ __html: configJs }}></script>
        <script defer src={jsUrl}></script>
      </Fragment>
    );
  }
}

Twikoo.Cacheable = cacheComponent(Twikoo, "comment.twikoo", (props) => {
  const { comment, helper, page, config } = props;

  return {
    envId: comment.env_id,
    region: comment.region,
    lang: comment.lang || page.lang || page.language || config.language || "zh-CN",
    jsUrl: helper.cdn("twikoo", "1.6.41", "dist/twikoo.all.min.js"),
  };
});

module.exports = Twikoo;
