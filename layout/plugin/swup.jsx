const { Component, Fragment } = require("../../include/util/common");

class Swup extends Component {
  render() {
    if (this.props.head) {
      return null;
    }

    return (
      <Fragment>
        <script defer src="/js/host/swup/Swup.umd.min.js"></script>
        <script defer src="/js/host/swup/head-plugin.umd.min.js"></script>
        <script defer src="/js/host/swup/scripts-plugin.umd.min.js"></script>
        <script defer src="/js/swup-init.js"></script>
      </Fragment>
    );
  }
}

module.exports = Swup;
