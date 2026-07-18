const { Component } = require("../../include/util/common");

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

    const tocLabel = helper.__("article.toc");

    return (
      <div class="toc-container" id="toc" style={page.encrypt ? "display:none" : null}>
        <button class="toc-button" type="button" popovertarget="toc-body" aria-label={tocLabel}>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </button>
        <div id="toc-body" popover="auto" class="toc-body">
          <div id="toc-insert" dangerouslySetInnerHTML={{ __html: tocContent || "" }} />
        </div>
      </div>
    );
  }
}

class Widgets extends Component {
  render() {
    return <FloatingToc {...this.props} />;
  }
}

module.exports = Widgets;
