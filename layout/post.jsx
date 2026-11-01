const { Component } = require("../include/util/common");
const Article = require("./common/article");

// 目录由 Article 渲染进左侧工具栏（见 common/article.jsx）
module.exports = class extends Component {
  render() {
    const { config, page, helper } = this.props;

    return <Article config={config} page={page} helper={helper} index={false} />;
  }
};
