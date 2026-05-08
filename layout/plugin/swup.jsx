const { Component } = require("../../include/util/common");

class Swup extends Component {
  render() {
    if (this.props.head) {
      return null;
    }

    return <script type="module" data-swup-ignore-script src="/js/swup.js"></script>;
  }
}

module.exports = Swup;
