import { runWhenActivated } from "./main.js";

// 首页专属：把页尾的实际高度写进 --home-footer-space，第二屏据此让位，
// 页尾因此直接落在第二屏底部，而不是另占一屏。
// 量不到时 CSS 里的保守估计值兜底，布局仍然可用（页尾只多出几十像素的落点）。
function initHomeFooterSpace() {
  const footer = document.querySelector(".footer");
  if (!footer || !document.querySelector(".home-page")) return;

  const root = document.documentElement;
  const apply = () => {
    // 取分数高度，避免取整带来的 1px 偏差把两个吸附落点错开
    root.style.setProperty("--home-footer-space", `${footer.getBoundingClientRect().height}px`);
  };

  apply();
  // 页尾高度随字号、换行与视口变化。它自身不受这个变量影响，不会形成观察回路
  if ("ResizeObserver" in window) new ResizeObserver(apply).observe(footer);
  else window.addEventListener("resize", apply, { passive: true });
}

runWhenActivated(initHomeFooterSpace);
