const {
  Component,
  Fragment,
  cacheComponent,
} = require("../../include/util/common");

const netlifyJs = `if (window.netlifyIdentity) {
  window.netlifyIdentity.on("init", function(user) {
    if (!user) {
      window.netlifyIdentity.on("login", function() {
        document.location.href = "/admin/";
      });
    }
  });
}`;

class Netlify extends Component {
  render() {
    if (this.props.head) {
      return null;
    }
    return (
      <Fragment>
        <script
          defer
          src="https://identity.netlify.com/v1/netlify-identity-widget.js"
        ></script>
        <script defer dangerouslySetInnerHTML={{ __html: netlifyJs }}></script>
      </Fragment>
    );
  }
}

Netlify.Cacheable = cacheComponent(Netlify, "plugin.netlify", (props) => {
  const { head } = props;
  return { head };
});

module.exports = Netlify;
