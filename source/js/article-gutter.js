// 量正文列左侧的空白（视口宽减 .main-content 宽的一半）：够宽（≥ 14rem）时 <html data-article-gutter="wide">，
// 文章页的 Back / INFO / TOC 工具栏钉在左侧；否则为 "none"，工具栏随文排版、规格表排在摘要下方。
// 由 layout.jsx 内联成一个真正的 <script>，紧跟在 .main-content 之后、首帧之前同步执行
// （文章标记是经 innerHTML 注入的，写在里面的脚本不会执行）。量完先强制一次样式解析，再给 <html>
// 打上 data-rail-ready 放行面板的过渡（见 article.css）：从“属性未定”的展开态到收起态的这一步不播动画。
// 窗口与栏宽偏好变化时 article.js 复用这里挂到 window 上的同一函数重量
(() => {
  const root = document.documentElement;
  const RAIL_MEDIA = "(min-width: 1024px)";
  const RAIL_WIDE_REM = 14;
  if (!window.gnixMeasureArticleGutter) {
    window.gnixMeasureArticleGutter = () => {
      const main = document.querySelector(".main-content");
      const rem = parseFloat(getComputedStyle(root).fontSize) || 16;
      const gutter = main && window.matchMedia(RAIL_MEDIA).matches ? (root.clientWidth - main.getBoundingClientRect().width) / 2 : 0;
      root.dataset.articleGutter = gutter >= RAIL_WIDE_REM * rem ? "wide" : "none";
    };
  }
  window.gnixMeasureArticleGutter();
  const panel = document.querySelector(".article-rail__panel");
  if (panel) void getComputedStyle(panel).gridTemplateRows;
  root.dataset.railReady = "true";
})();
