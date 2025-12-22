const {
  Component,
  Fragment,
  cacheComponent,
  lazy_load_css,
} = require("../../include/util/common");

/**
 * Twikoo comment JSX component.
 *
 * @see https://twikoo.js.org/quick-start.html
 * @example
 * <Twikoo
 *     envId="env_id"
 *     region="ap-guangzhou"
 *     lang="zh-CN"
 *     jsUrl="/path/to/Twikoo.js" />
 */
class Twikoo extends Component {
  render() {
    const { envId, region, lang, jsUrl } = this.props;
    const js = `twikoo.init({ envId: '${envId}', ${region ? `region: ${JSON.stringify(region)},` : ""} ${lang ? `lang: ${JSON.stringify(lang)},` : ""} });`;
    const lazy_load_css_script = lazy_load_css("/css/twikoo.css");
    return (
      <Fragment>
        <div id="twikoo" class="content twikoo"></div>
        <script
          dangerouslySetInnerHTML={{ __html: lazy_load_css_script }}
        ></script>
        <script async data-pjax src={jsUrl} onload={`${js};`}></script>
      </Fragment>
    );
  }
}

/**
 * Cacheable Twikoo comment JSX component.
 * <p>
 * This class is supposed to be used in combination with the <code>locals</code> hexo filter
 * ({@link module:hexo/filter/locals}).
 *
 * @see module:util/cache.cacheComponent
 * @example
 * <Twikoo.Cacheable
 *     comment={{
 *         env_id: "env_id",
 *         region: "ap-guangzhou",
 *         lang: "zh-CN",
 *     }} />
 */
Twikoo.Cacheable = cacheComponent(Twikoo, "comment.twikoo", (props) => {
  const { comment, helper, page, config } = props;

  return {
    envId: comment.env_id,
    region: comment.region,
    lang:
      comment.lang || page.lang || page.language || config.language || "zh-CN",
    jsUrl: helper.cdn("twikoo", "1.6.41", "dist/twikoo.all.min.js"),
  };
});

module.exports = Twikoo;
