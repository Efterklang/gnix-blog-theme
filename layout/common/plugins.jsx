const {
  Component,
  Fragment,
  loadComponent,
  handleWidgetError,
} = require("../../include/util/common");

module.exports = class extends Component {
  render() {
    const { site, config, page, helper, head } = this.props;
    const { plugins = [] } = config;

    return (
      <Fragment>
        {Object.keys(plugins).map((name) => {
          // plugin is not enabled
          if (!plugins[name]) {
            return null;
          }
          const Plugin = loadComponent(`plugin/${name}`);
          if (!Plugin) {
            handleWidgetError(`plugin "${name}"`);
            return null;
          }
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
