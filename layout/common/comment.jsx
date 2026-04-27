const { Component, loadComponent } = require("../../include/util/common");

module.exports = class extends Component {
  render() {
    const { config, page, helper, embedded = false } = this.props;
    const { comment } = config;
    if (!comment || typeof comment.type !== "string") {
      return null;
    }

    const content = (() => {
      const Comment = loadComponent(`comment/${comment.type}`);
      return <Comment config={config} page={page} helper={helper} comment={comment} />;
    })();

    if (embedded) {
      return (
        <div class="article-comment-panel" id="comments">
          {content}
        </div>
      );
    }

    return (
      <div class="card" id="comments">
        <div class="card-content">{content}</div>
      </div>
    );
  }
};
