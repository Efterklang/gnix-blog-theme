/**
 * 归档页分组 carousel：tab 点击平滑滚动到对应分组，
 * 轨道滚动（含手势滑动）时把 aria-current 回写到对应 tab 并保证其可见。
 * tab 本身是锚链接，无此脚本时浏览器原生跳转仍可用，这里只做增强。
 */
const carousel = document.querySelector(".archive-carousel");

if (carousel) {
  const track = carousel.querySelector(".archive-carousel__track");
  const tabs = Array.from(carousel.querySelectorAll(".archive-carousel__tab"));
  const slides = Array.from(track.children);

  let activeIndex = 0;
  const setActive = (index) => {
    if (index === activeIndex) return;
    activeIndex = index;
    tabs.forEach((tab, i) => {
      if (i === index) {
        tab.setAttribute("aria-current", "true");
        tab.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      } else {
        tab.removeAttribute("aria-current");
      }
    });
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", (event) => {
      event.preventDefault();
      // 原生锚点跳转会同时把整页垂直滚到分组处；这里只横向滚轨道，页面不动
      track.scrollTo({ left: slides[index].offsetLeft - slides[0].offsetLeft, behavior: "smooth" });
      setActive(index);
      history.replaceState(null, "", `#${slides[index].id}`);
    });
  });

  // 滚动同步：取轨道视口中点落在哪个 slide 上（slide 等宽 + gap，逐个比对最稳）
  let raf = 0;
  track.addEventListener(
    "scroll",
    () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const center = track.scrollLeft + track.clientWidth / 2;
        const base = slides[0].offsetLeft;
        let index = slides.length - 1;
        for (let i = 0; i < slides.length; i++) {
          if (center < slides[i].offsetLeft - base + slides[i].offsetWidth) {
            index = i;
            break;
          }
        }
        setActive(index);
      });
    },
    { passive: true },
  );

  // 初始定位：非 bfcache 的返回/刷新时浏览器不会对内层滚动容器重放 hash 定位，
  // URL 带着 #archive-xxx 轨道却停在第一组；载入时按 hash 把轨道跳到对应分组
  // （bfcache 恢复自带滚动位置，此时 hash 与位置本就一致，重跳是无操作）。
  // pageshow 而非仅模块执行时：浏览器的 scroll restoration 可能晚于模块运行，
  // 会把刚跳好的位置又拉回 0
  const jumpToHash = () => {
    const index = slides.findIndex((slide) => `#${slide.id}` === location.hash);
    if (index > 0) {
      track.scrollTo({ left: slides[index].offsetLeft - slides[0].offsetLeft, behavior: "instant" });
      setActive(index);
    }
  };
  jumpToHash();
  window.addEventListener("pageshow", jumpToHash);
}
