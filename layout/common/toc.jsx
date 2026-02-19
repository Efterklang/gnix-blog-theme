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
        <button class="toc-button" type="button" onclick="document.getElementById('icarus-toc-container').classList.toggle('is-open')" aria-label="Table of Contents">
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </button>
        <div class="toc-body" onclick="if(event.target === this || event.target.matches('.toc-link')) { document.getElementById('icarus-toc-container').classList.remove('is-open'); }">
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
