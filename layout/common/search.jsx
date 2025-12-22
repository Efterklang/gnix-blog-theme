const {
  Component,
  loadComponent,
  handleWidgetError,
} = require("../../include/util/common");

module.exports = class extends Component {
  render() {
    const { config, helper } = this.props;
    const { search } = config;
    if (!search || typeof search.type !== "string") {
      return null;
    }

    const Search = loadComponent(`search/${search.type}`);
    if (!Search) {
      handleWidgetError(`search "${search.type}"`);
      return null;
    }
    return <Search config={config} helper={helper} search={search} />;
  }
};
