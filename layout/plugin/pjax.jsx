const { Component, Fragment } = require("../../include/util/common");

class Pjax extends Component {
  render() {
    if (this.props.head) {
      return null;
    }
    const { helper } = this.props;
    const { url_for, cdn } = helper;

    return (
      <Fragment>
        <script defer src={cdn("pjax", "0.2.8", "pjax.min.js")}></script>
        <script defer src={url_for("/js/pjax.js")}></script>
      </Fragment>
    );
  }
}

module.exports = Pjax;
