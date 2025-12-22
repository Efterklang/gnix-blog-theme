/**
 * Insight search plugin JSX component.
 * @module view/search/insight
 */
const { Component, cacheComponent } = require("../../include/util/common");
class Insight extends Component {
  render() {
    const { translation, contentUrl, jsUrl } = this.props;

    const js = `document.addEventListener('DOMContentLoaded', function () {
            loadInsight(${JSON.stringify({ contentUrl })}, ${JSON.stringify(translation)});
        });`;

    return (
      <>
        <div class="searchbox">
          <div class="searchbox-container">
            <div class="searchbox-input-container">
              <input
                type="text"
                name="search-input"
                class="searchbox-input"
                placeholder={translation.hint}
              />
            </div>
            <div class="searchbox-body"></div>
          </div>
        </div>
        <script data-pjax src={jsUrl} defer={true}></script>
        <script data-pjax dangerouslySetInnerHTML={{ __html: js }}></script>
      </>
    );
  }
}

Insight.Cacheable = cacheComponent(Insight, "search.insight", (props) => {
  const { helper } = props;

  return {
    translation: {
      hint: helper.__("search.hint"),
      untitled: helper.__("search.untitled"),
      posts: helper._p("common.post", Infinity),
      pages: helper._p("common.page", Infinity),
      categories: helper._p("common.category", Infinity),
      tags: helper._p("common.tag", Infinity),
    },
    contentUrl: helper.url_for("/content.json"),
    jsUrl: helper.url_for("/js/insight.js"),
  };
});

module.exports = Insight;
