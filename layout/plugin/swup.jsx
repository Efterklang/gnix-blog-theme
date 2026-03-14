const { Component } = require("../../include/util/common");

class Swup extends Component {
  render() {
    if (this.props.head) {
      return null;
    }

    return <script defer src="/js/swup.bundle.js"></script>;
  }
}

module.exports = Swup;
