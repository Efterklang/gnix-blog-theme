const { Component, Fragment } = require("../../include/util/common");

class Swup extends Component {
  render() {
    if (this.props.head) {
      return null;
    }

    const swupScript = `
const swup = new Swup({
  containers: ["#swup"],
  cache: true,
  plugins: [
    new SwupHeadPlugin({
      persistTags: true
    })
  ]
});
`;
    return (
      <Fragment>
        <script src="/js/host/swup/Swup.umd.min.js"></script>
        <script src="/js/host/swup/head-plugin.umd.min.js"></script>
        <script dangerouslySetInnerHTML={{ __html: swupScript }}></script>
      </Fragment>
    );
  }
}

module.exports = Swup;
