const { Component } = require("../include/util/common");
const Article = require("./common/article");
const Widgets = require("./common/toc");

module.exports = class extends Component {
  render() {
    const { config, page, helper } = this.props;

    return (
      <div class="page-shell page-shell-post">
        <Article config={config} page={page} helper={helper} index={false} />
        <Widgets {...this.props} />
      </div>
    );
  }
};
