const {
  Component,
  Fragment,
  loadComponent,
} = require("../../include/util/common");

module.exports = class extends Component {
  render() {
    const { site, config, page, helper, head } = this.props;
    const { plugins = [] } = config;

    return (
      <Fragment>
        {Object.keys(plugins).map((name) => {
          // plugin is not enabled or is 'swup' (which is now built-in)
          if (!plugins[name] || name === "swup") {
            return null;
          }
          const Plugin = loadComponent(`plugin/${name}`);
          return (
            <Plugin
              site={site}
              config={config}
              page={page}
              helper={helper}
              plugin={plugins[name]}
              head={head}
            />
          );
        })}
      </Fragment>
    );
  }
};
