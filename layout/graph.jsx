const { Component } = require("../include/util/common");

// 双链图：文章是节点（大写标题 + 等宽灰字的话题），[[双链]] 是连线；布局与交互在 source/js/graph.js，
// 数据来自 include/hexo/generator/graph.js 生成的 graph.json
module.exports = class extends Component {
  render() {
    const { page, helper } = this.props;
    const nodes = Number(page.nodeCount || 0);
    const edges = Number(page.edgeCount || 0);

    return (
      <main class="graph-page">
        <header class="graph-head">
          <h1 class="graph-title">Graph</h1>
          <p class="graph-caption">
            <span class="graph-caption__count">{nodes}</span> {nodes === 1 ? "writing" : "writings"} · <span class="graph-caption__count">{edges}</span> {edges === 1 ? "link" : "links"}
          </p>
        </header>
        <div id="graph" class="graph-canvas" data-src={helper.url_for("/graph.json")} role="img" aria-label="Graph of writings linked to each other">
          <noscript>
            <p class="graph-caption">The graph needs JavaScript.</p>
          </noscript>
        </div>
      </main>
    );
  }
};
