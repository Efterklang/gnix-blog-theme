const { Component, Fragment } = require("../../include/util/common");

class Swup extends Component {
  render() {
    if (this.props.head) {
      return null;
    }

    const swupScript =
      'const swup = new Swup({ containers: [".main-content"], });';
    return (
      <Fragment>
        <script src="/js/host/swup/Swup.umd.min.js"></script>
        <script dangerouslySetInnerHTML={{ __html: swupScript }}> </script>
      </Fragment>
    );
  }
}

module.exports = Swup;
