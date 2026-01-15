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
        <button
          class="toc-button"
          type="button"
          onclick="document.getElementById('icarus-toc-container').classList.toggle('is-open')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <title>Table of Contents</title>
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </button>
        <div
          class="toc-body"
          onclick="if(event.target === this || event.target.closest('.toc-link')) { document.getElementById('icarus-toc-container').classList.remove('is-open'); }"
        >
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
