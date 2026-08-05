const { Component } = require("../include/util/common");
const PreferencesPage = require("./common/preferences_page");

module.exports = class extends Component {
  render() {
    const { helper } = this.props;

    return (
      <main class="preference-standalone">
        <PreferencesPage helper={helper} />
      </main>
    );
  }
};
