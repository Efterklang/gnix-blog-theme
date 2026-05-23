/**
 * Insight search plugin JSX component.
 * @module view/common/search
 */
const { Component, cacheComponent } = require("../../include/util/common");

class Search extends Component {
  render() {
    const { translation, contentUrl, jsUrl } = this.props;

    const js = `document.addEventListener('DOMContentLoaded', function () {
            loadInsight(${JSON.stringify({ contentUrl })}, ${JSON.stringify(translation)});
        });`;

    return (
      <>
        <div class="searchbox" id="searchbox" popover="auto">
          <div class="searchbox-container">
            <div class="searchbox-input-container">
              <input
                type="text"
                name="search-input"
                class="searchbox-input"
                placeholder={translation.hint}
                autofocus
                autocomplete="off"
                role="combobox"
                aria-haspopup="listbox"
                aria-autocomplete="list"
                aria-controls="searchbox-results"
                aria-expanded="false"
                aria-label={translation.hint}
              />
            </div>
            <div class="searchbox-body" id="searchbox-results" role="listbox"></div>
          </div>
        </div>
        <script defer src={jsUrl}></script>
        <script dangerouslySetInnerHTML={{ __html: js }}></script>
      </>
    );
  }
}

module.exports = cacheComponent(Search, "common.search", (props) => {
  const { config, helper } = props;
  if (!config.search) {
    return null;
  }
  return {
    translation: {
      hint: helper.__("search.hint"),
      untitled: helper.__("search.untitled"),
      posts: helper._p("common.post", Infinity),
      pages: helper._p("common.page", Infinity),
      tags: helper._p("common.tag", Infinity),
    },
    contentUrl: helper.is_i18n_enabled() ? helper.localized_url_for("/content.json") : helper.url_for("/content.json"),
    jsUrl: helper.url_for("/js/insight.js"),
  };
});
