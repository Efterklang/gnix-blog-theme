const { Component } = require("../../include/util/common");
const { Icon } = require("../../include/util/lucide");

// 目录是左侧工具栏的一节（见 article.jsx 的 .article-rail）：「TOC」一行是开关，底下的面板可展开 / 收起；
// 放不下工具栏时（窄屏或正文左侧空白太窄）点它改为打开弹层 toc-body，顶栏的目录钮也开同一个弹层。
// 开合由 source/js/article.js 管：首屏默认收起、进入正文后展开
class FloatingToc extends Component {
  render() {
    const { helper, page } = this.props;
    const tocContent = helper.toc(page.content, {
      class: "toc",
      list_number: false,
    });

    if (!tocContent && !page.encrypt) {
      return null;
    }

    return (
      <section class="article-rail__section toc-container" id="toc" data-rail="toc" style={page.encrypt ? "display:none" : null}>
        <button class="article-rail__toggle toc-toggle" type="button" aria-expanded="false" aria-controls="toc-rail">
          <Icon name="plus" size={14} class="article-rail__mark article-rail__mark--closed" />
          <Icon name="minus" size={14} class="article-rail__mark article-rail__mark--open" />
          TOC
        </button>
        <div class="article-rail__panel">
          <nav id="toc-rail" class="toc-rail" aria-label="Table of contents" dangerouslySetInnerHTML={{ __html: tocContent || "" }} />
        </div>
        <div id="toc-body" popover="auto" class="toc-body">
          <div id="toc-insert" class="toc-panel" dangerouslySetInnerHTML={{ __html: tocContent || "" }} />
        </div>
      </section>
    );
  }
}

module.exports = FloatingToc;
