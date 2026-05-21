const { Component } = require("../include/util/common");
const Archive = require("./archive");

module.exports = class extends Component {
  render() {
    return <Archive {...this.props} />;
  }
};
