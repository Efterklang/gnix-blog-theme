const { Component } = require("../../include/util/common");

// 目录：文章卡片 #article-panel 里 Contents 一页的列表（见 common/article.jsx）。
// 不编号，层级只靠缩进；
// 当前小节由 article.js 加 .is-current。加密文章先输出空容器，解密后由 decrypt.js 按正文标题重建
module.exports = class extends Component {
  render() {
    const { content, encrypt } = this.props;
    if (!content && !encrypt) return null;
    return <nav id="toc" class="article-toc" aria-label="Table of contents" dangerouslySetInnerHTML={{ __html: content || "" }} />;
  }
};
