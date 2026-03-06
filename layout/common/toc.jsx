const { Component } = require("../../include/util/common");

class FloatingToc extends Component {
  render() {
    const { helper, page } = this.props;
    const tocContent = helper.toc(page.content, {
      class: "toc",
      list_number: false,
    });

    if (!tocContent) {
      return null;
    }

    return (
      <div class="toc-container" id="icarus-toc-container">
        <button class="toc-button" type="button" popovertarget="toc-body" aria-label="Table of Contents">
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </button>
        <div id="toc-body" popover="auto" class="toc-body" onclick="if(event.target===this||event.target.closest('.toc-link'))this.hidePopover();">
          <div dangerouslySetInnerHTML={{ __html: tocContent }} />
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
