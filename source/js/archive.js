import { decryptJson, forgetPasswords, GARDEN_PASSWORD_KEY, readStoredPassword, storePassword } from "./crypto.js";
import { runWhenActivated } from "./main.js";

// 秘密花园的入口：在归档页（含标签页）的页名上连点三次（见 initArchiveGarden）
const GARDEN_CLICKS = 3;
// 季节牌：每一季的标签进入视口时从下方浮现，完全离场后复位，
// 来回滚动都会重放（.is-armed / .is-emerging 见 archive.css）
function initArchiveFolio() {
  const page = document.querySelector(".archive-page");
  const folios = page ? [...page.querySelectorAll(".archive-folio")] : [];
  if (!folios.length || !("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const folio = entry.target;
        if (entry.isIntersecting) {
          folio.classList.remove("is-armed", "is-emerging");
          void folio.getBoundingClientRect(); // 重排一次，让动画从头重放
          folio.classList.add("is-emerging");
          continue;
        }
        // 完全离场（沉到下缘之下或升到上缘之上）才复位，免得复位那一帧被看见
        const rect = entry.boundingClientRect;
        if (rect.top >= window.innerHeight || rect.bottom <= 0) {
          folio.classList.remove("is-emerging");
          folio.classList.add("is-armed");
        }
      }
    },
    { rootMargin: "0px 0px -10% 0px" },
  );
  for (const folio of folios) observer.observe(folio);
}

// 年份切片：一枚可以按的年份——点一下滚到上一年（到头绕回最新的一年）；?year= 由脚本写进地址栏，可分享、可后退
function initArchiveYears() {
  const page = document.querySelector(".archive-page");
  const button = page ? page.querySelector(".archive-year") : null;
  const groups = page ? [...page.querySelectorAll(".archive-group[data-years]")] : [];
  if (!button || !groups.length) return;
  const value = button.querySelector(".archive-year__value");
  const yearButtons = [...page.querySelectorAll("[data-archive-year]")];
  const countEl = page.querySelector("[data-archive-count]");
  const wordEl = page.querySelector("[data-archive-count-word]");
  const groupsBox = page.querySelector(".archive-groups");
  const counts = new Map(
    (button.dataset.yearCounts || "")
      .split(" ")
      .filter(Boolean)
      .map((pair) => pair.split(":")),
  );
  const years = [...counts.keys()].sort((a, b) => Number(b) - Number(a));
  // 默认当年；当年还没有文章就退到最近的一年
  const thisYear = String(new Date().getFullYear());
  const defaultYear = years.includes(thisYear) ? thisYear : years[0];
  let active = null;

  function roll(year) {
    // 页码只报两位数（26、25）；换数字时淡一下
    if (value) {
      value.classList.add("is-rolling");
      value.textContent = String(year).slice(-2);
      requestAnimationFrame(() => value.classList.remove("is-rolling"));
    }
    button.setAttribute("aria-label", `${year} ${button.dataset.switchLabel || ""}`.trim());
    for (const item of yearButtons) item.setAttribute("aria-current", item.dataset.archiveYear === String(year) ? "true" : "false");
  }

  function slice(year, { animate = false, push = false } = {}) {
    if (year === active) return;
    active = year;
    const swap = () => {
      for (const group of groups) {
        // 用类而不是 hidden 属性：hidden 被页面样式压住了，类由自己的样式表说了算
        group.classList.toggle("is-sliced-out", !group.dataset.years.split(" ").includes(year));
      }
      roll(year);
      if (countEl) countEl.textContent = counts.get(year) ?? "";
      if (wordEl) wordEl.textContent = counts.get(year) === "1" ? "writing" : "writings";
      // 检视面板跟着换到新切片的第一篇
      page.dispatchEvent(new CustomEvent("gnix:archive-sliced"));
    };
    if (animate && groupsBox) {
      groupsBox.classList.add("is-slicing");
      window.setTimeout(() => {
        swap();
        requestAnimationFrame(() => groupsBox.classList.remove("is-slicing"));
      }, 240);
    } else {
      swap();
    }
    if (push) {
      const url = new URL(window.location.href);
      url.searchParams.set("year", year);
      history.pushState({ year }, "", url);
    }
  }

  button.addEventListener("click", () => {
    const index = years.indexOf(active);
    slice(years[(index + 1) % years.length], { animate: true, push: true });
  });
  for (const item of yearButtons) {
    item.addEventListener("click", () => {
      if (years.includes(item.dataset.archiveYear)) slice(item.dataset.archiveYear, { animate: true, push: true });
    });
  }

  window.addEventListener("popstate", () => {
    const year = new URLSearchParams(window.location.search).get("year");
    slice(years.includes(year) ? year : defaultYear, { animate: true });
  });

  // 初始：URL 里合法的年份，否则当年
  const requested = new URLSearchParams(window.location.search).get("year");
  slice(years.includes(requested) ? requested : defaultYear);
}

// 页名的字号由 layout/archive.jsx 里那段内联脚本在首帧之前算好（它必须早于第一次绘制，
// 否则宽字体下会先溢出再纠正）；这里只负责在栏宽与字体变化时重算
function initArchiveTitleFit() {
  const fit = window.__gnixFitArchiveTitle;
  if (typeof fit !== "function") return;

  fit();
  const box = document.querySelector(".archive-watermark");
  // 栏宽随阅读宽度偏好与窗口尺寸变化
  if (box && "ResizeObserver" in window) new ResizeObserver(fit).observe(box);
  // 字体换过之后字宽也会变；正文字体是用户可选的
  document.fonts?.ready.then(fit).catch(() => {});
  window.addEventListener("gnix:article-font-settings-change", fit);
}

// popover 不自动维护 aria-expanded（popovertarget 只负责开合），由这里跟随开合状态同步
function initPopoverTriggers() {
  document.querySelectorAll("[popovertarget]").forEach((trigger) => {
    const target = document.getElementById(trigger.getAttribute("popovertarget"));
    if (!target) return;
    target.addEventListener("toggle", (event) => {
      trigger.setAttribute("aria-expanded", event.newState === "open" ? "true" : "false");
    });
  });
}

// 秘密花园：页面的第二种视图，不是浮层。在页名上连点五次进入——页面上没有任何提示，
// 知道的人自然知道；键盘上敲 garden 也能进。进入后公开清单换成加密清单，
// 密码解锁后才把构建期加密的条目渲染成列表（见 include/hexo/encrypt.js 的 encrypt_payload），
// 未解锁前页面源码里只有密文。密码记在本地，之后点进任何一篇加密文章都由 decrypt.js
// 自动解开（两者共用 crypto.js 的同一个存储键）
function initArchiveGarden() {
  const page = document.querySelector(".archive-page");
  const panel = document.getElementById("archive-garden");
  if (!page || !panel) return;

  const title = document.getElementById("archive-title");
  const titleWord = title?.querySelector(".archive-watermark__word");
  // 公开视图的页名：进花园时换成 data-garden-title，回来时还原
  const publicTitle = titleWord?.textContent || "";
  const blob = panel.querySelector(".encrypted-data")?.textContent.trim();
  const form = panel.querySelector(".archive-garden__gate");
  const input = form?.querySelector("input");
  const list = panel.querySelector(".archive-garden__list");
  const lock = panel.querySelector(".archive-garden__lock");
  if (!blob || !form || !input || !list) return;

  let unlocked = false;

  function setView(view) {
    if (page.dataset.view === view) return;
    page.dataset.view = view;
    // 花园里页名换成它的真名；文案长度变了，字号要按新文案重算（fit 挂在 window 上）
    if (titleWord) {
      titleWord.textContent = view === "garden" ? title.dataset.gardenTitle || publicTitle : publicTitle;
      window.__gnixFitArchiveTitle?.();
    }
    if (view !== "garden") return;
    // 幕帘可能正开着：进花园前先合上，否则它盖在花园上面
    document.getElementById("archive-topic-picker")?.hidePopover?.();
    // 触屏不自动聚焦密码框：一聚焦就弹键盘，读者还没决定要不要进
    if (!window.matchMedia("(hover: hover)").matches) return;
    (unlocked ? lock : input)?.focus();
  }

  function renderPosts(posts) {
    const items = document.createElement("ol");
    items.className = "archive-garden__items";
    posts.forEach((post, index) => {
      const li = document.createElement("li");
      li.className = "archive-garden__item";
      li.style.setProperty("--i", index);
      const link = document.createElement("a");
      link.className = "archive-title";
      link.href = post.url;
      // 与归档列表同一排法：标题在左列、日期在右列
      const text = document.createElement("span");
      text.className = "archive-title__text";
      // textContent：标题来自解密后的数据，一律当文本插入
      text.textContent = post.title;
      const time = document.createElement("time");
      time.className = "archive-title__date";
      if (post.dateXml) time.dateTime = post.dateXml;
      time.textContent = post.date;
      link.append(text, time);
      li.appendChild(link);
      items.appendChild(li);
    });
    list.textContent = "";
    list.appendChild(items);
  }

  async function unlock(password) {
    const posts = await decryptJson(password, blob);
    if (!Array.isArray(posts)) throw new Error("unexpected garden payload");
    storePassword(GARDEN_PASSWORD_KEY, password);
    renderPosts(posts);
    unlocked = true;
    panel.dataset.state = "unlocked";
  }

  // 入口一：页名连点三次。两次点击间隔超过 900ms 就重新计数，
  // 免得「偶尔点一下页名」被慢慢攒成一次进入
  let clicks = 0;
  let clickTimer = 0;
  title?.addEventListener("click", (event) => {
    // 年份上标也在 h1 里：点它是翻年，不算入口的连点
    if (event.target.closest?.(".archive-year")) return;
    clearTimeout(clickTimer);
    clicks += 1;
    if (clicks < GARDEN_CLICKS) {
      clickTimer = setTimeout(() => {
        clicks = 0;
      }, 900);
      return;
    }
    clicks = 0;
    setView(page.dataset.view === "garden" ? "archive" : "garden");
  });

  // 入口二：敲 garden（不分大小写）。连点三次是给鼠标的，这条是给键盘的
  const word = "garden";
  let typed = "";
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      typed = "";
      return;
    }
    // 只认不带修饰键的单字符，且焦点不在输入框里——否则读者在搜索框里打 garden 也会开门
    if (event.metaKey || event.ctrlKey || event.altKey || event.key.length !== 1) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || /^(?:INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;

    typed = (typed + event.key.toLowerCase()).slice(-word.length);
    if (typed !== word) return;
    typed = "";
    setView("garden");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const password = input.value.trim();
    if (!password) return;
    try {
      await unlock(password);
    } catch {
      panel.dataset.state = "error";
      input.value = "";
      input.focus();
    }
  });

  lock?.addEventListener("click", () => {
    // 锁定要连文章页记住的密码一起清掉，否则「锁定」之后已读过的文章仍是开的；
    // 锁上就退出花园，回到公开清单
    forgetPasswords();
    list.textContent = "";
    input.value = "";
    unlocked = false;
    panel.dataset.state = "locked";
    setView("archive");
  });

  // 进过一次花园就自动开着；密码改过则静默退回门禁，不弹错误
  const remembered = readStoredPassword(GARDEN_PASSWORD_KEY);
  if (remembered) unlock(remembered).catch(() => storePassword(GARDEN_PASSWORD_KEY, null));
}

// 检视面板：清单右侧常驻的一块，显示悬停（或键盘聚焦）到的那一篇的封面、摘要与标签；
// 指针离开不清空，停在最后看过的一篇上。载入时不自动挑第一篇（首篇被高亮会像是当前页），
// 面板先显示占位框（data-empty）；年份切片把当前这一篇切走时也回到占位态。
// 数据来自每条目里隐藏的 .archive-item__data（构建期渲染）与 data-cover
function initArchiveInspector() {
  const page = document.querySelector(".archive-page");
  const panel = page?.querySelector(".archive-inspector");
  if (!page || !panel) return;
  const figure = panel.querySelector(".archive-inspector__cover");
  const img = panel.querySelector(".archive-inspector__img");
  const title = panel.querySelector(".archive-inspector__title");
  const excerpt = panel.querySelector(".archive-inspector__excerpt");
  const meta = panel.querySelector(".archive-inspector__meta");
  const groups = page.querySelector(".archive-groups");
  let current = null;

  // 蓝点：只有一枚，钉在清单容器上，换条目时滑到新条目标题首行的中线
  const dot = document.createElement("span");
  dot.className = "archive-inspect-dot";
  dot.setAttribute("aria-hidden", "true");
  dot.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>';
  groups?.append(dot);

  function placeDot() {
    if (!groups || !current?.isConnected || current.closest(".is-sliced-out")) {
      dot.classList.remove("is-placed");
      return;
    }
    const title = current.querySelector(".archive-title");
    if (!title) return;
    const styles = getComputedStyle(title);
    const lineHeight = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.45;
    const y = title.getBoundingClientRect().top - groups.getBoundingClientRect().top + (parseFloat(styles.paddingTop) || 0) + lineHeight / 2 - 7;
    dot.style.translate = `0 ${Math.round(y)}px`;
    dot.classList.add("is-placed");
  }

  function show(item) {
    if (!item || item === current) return;
    current = item;
    delete panel.dataset.empty;
    for (const other of page.querySelectorAll(".archive-item[data-inspected]")) delete other.dataset.inspected;
    item.dataset.inspected = "";
    placeDot();

    const cover = item.dataset.cover;
    if (cover && img) {
      if (img.getAttribute("src") !== cover) {
        figure.classList.add("is-loading");
        img.onload = () => figure.classList.remove("is-loading");
        img.onerror = () => {
          figure.hidden = true;
        };
        img.src = cover;
      }
      figure.hidden = false;
    } else {
      figure.hidden = true;
    }

    title.textContent = item.querySelector(".archive-title__text")?.textContent || "";
    const data = item.querySelector(".archive-item__data");
    const body = data?.querySelector(".archive-item__excerpt");
    excerpt.replaceChildren(...(body ? [body.cloneNode(true)] : []));

    // 元信息：一张没有线的小表——Date / Reading / Tags
    const rows = [];
    const time = item.querySelector(".archive-title__date");
    const stamp = time?.getAttribute("datetime");
    const parsed = stamp ? new Date(stamp) : null;
    if (parsed && !Number.isNaN(parsed.getTime())) {
      rows.push(["Date", `${parsed.toLocaleDateString("en", { month: "short" })} ${String(parsed.getDate()).padStart(2, "0")}, ${parsed.getFullYear()}`]);
    } else if (time?.textContent) rows.push(["Date", time.textContent]);
    const read = data?.querySelector(".archive-item__read")?.textContent;
    if (read) rows.push(["Reading", read]);
    const tags = data ? [...data.querySelectorAll(".archive-item__tag")].map((node) => node.textContent) : [];
    if (tags.length) rows.push(["Tags", tags.join(" · ")]);
    meta.replaceChildren(
      ...rows.flatMap(([label, text]) => {
        const dt = document.createElement("dt");
        dt.textContent = label;
        const dd = document.createElement("dd");
        dd.textContent = text;
        return [dt, dd];
      }),
    );
    meta.hidden = !rows.length;
  }

  // 回到占位态：没有被检视的条目，面板只剩占位框，箭头收起
  function reset() {
    current = null;
    panel.dataset.empty = "";
    for (const other of page.querySelectorAll(".archive-item[data-inspected]")) delete other.dataset.inspected;
    placeDot();
  }

  page.addEventListener("pointerover", (event) => {
    if (event.pointerType === "touch") return;
    const item = event.target.closest?.(".archive-item");
    if (item && page.contains(item)) show(item);
  });
  page.addEventListener("focusin", (event) => {
    const item = event.target.closest?.(".archive-item");
    if (item) show(item);
  });
  page.addEventListener("gnix:archive-sliced", () => {
    if (current?.closest(".is-sliced-out")) reset();
    // 切片换了，行的位置也换了：下一帧再量
    requestAnimationFrame(placeDot);
  });
  window.addEventListener("resize", placeDot, { passive: true });
  window.addEventListener("gnix:article-font-settings-change", placeDot);
  document.fonts?.ready.then(placeDot).catch(() => {});
}

runWhenActivated(() => {
  initArchiveFolio();
  initArchiveYears();
  initArchiveTitleFit();
  initArchiveInspector();
  initArchiveGarden();
  initPopoverTriggers();
});
