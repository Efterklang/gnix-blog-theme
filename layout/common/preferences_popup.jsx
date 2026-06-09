const { Component } = require("../../include/util/common");
const Preferences = require("../preferences");

function translate(helper, key, fallback) {
  const value = helper.__(key);
  return value === key ? fallback : value;
}

module.exports = class extends Component {
  render() {
    const { config, helper, page } = this.props;
    const title = translate(helper, "preferences.title", "Preferences");
    const closeLabel = translate(helper, "article.close", "Close");

    return (
      <div id="preference-popup" class="preference-popup" popover="manual" role="dialog" aria-modal="true" aria-label={title} hidden>
        <button type="button" class="preference-popup__backdrop" data-preference-popup-close aria-label={closeLabel} tabindex="-1"></button>
        <div class="preference-popup__panel" tabindex="-1">
          <Preferences config={config} helper={helper} page={page} surface="popup" closeLabel={closeLabel} />
        </div>
      </div>
    );
  }
};
