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
  native: true,
  plugins: [
    new SwupHeadPlugin({
      persistTags: true
    }),
    new SwupScriptsPlugin()
  ]
});
`;
    return (
      <Fragment>
        <script src="/js/host/swup/Swup.umd.min.js"></script>
        <script src="/js/host/swup/head-plugin.umd.min.js"></script>
        <script src="/js/host/swup/scripts-plugin.umd.min.js"></script>
        <script data-swup-ignore-script dangerouslySetInnerHTML={{ __html: swupScript }}></script>
      </Fragment>
    );
  }
}

module.exports = Swup;
