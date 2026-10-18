import { decryptJson, forgetPasswords, GARDEN_PASSWORD_KEY, readStoredPassword, storePassword } from "./crypto.js";
import { runWhenActivated } from "./main.js";

// 秘密花园的入口：在归档页（含标签页）的页名上连点三次（见 initArchiveGarden）
const GARDEN_CLICKS = 3;
// 栏数偏好存在本地；窄屏放不下两栏，那以下一律按单栏渲染
const ARCHIVE_COLUMNS_KEY = "gnix-archive-columns";
const COLUMNS_WIDE = "(min-width: 820px)";

function initArchivePreview() {
  const page = document.querySelector(".archive-page");
  if (!page || !CSS.supports("anchor-name: --archive-anchor") || !CSS.supports("anchor-scope: --archive-anchor")) return;

  const media = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 721px)");
  // 预览在话题幕帘打开、或页面切到秘密花园视图时都要让位
  const picker = page.querySelector(".archive-topic-picker");
  const openDelay = Number.parseFloat(getComputedStyle(page).getPropertyValue("--archive-popup-open-delay")) || 140;
  let activeItem = null;
  let pendingItem = null;
  let dismissedItem = null;
  let pointer = null;
  let input = "pointer";
  let openTimer = 0;
  let closeTimer = 0;
  let scrollTimer = 0;
  let lastClosedAt = -Infinity;

  page.dataset.previewState = "idle";

  function getItem(target) {
    const surface = target?.closest?.(".archive-title");
    const item = surface?.closest(".archive-item");
    return item && page.contains(item) && item.querySelector(".archive-popup") ? item : null;
  }

  function getFocusedItem() {
    const focus = document.activeElement;
    if (!focus?.matches(":focus-visible")) return null;
    const item = getItem(focus);
    const rect = focus.getBoundingClientRect();
    return item && rect.bottom > 0 && rect.top < window.innerHeight ? item : null;
  }

  function cancelOpen() {
    clearTimeout(openTimer);
    openTimer = 0;
    pendingItem = null;
  }

  function close(state = "idle") {
    cancelOpen();
    clearTimeout(closeTimer);
    closeTimer = 0;
    if (activeItem) {
      delete activeItem.dataset.previewActive;
      activeItem = null;
      lastClosedAt = performance.now();
    }
    page.dataset.previewState = state;
    delete page.dataset.previewSwitching;
  }

  function available() {
    return (
      media.matches &&
      !document.hidden &&
      page.dataset.previewState !== "scrolling" &&
      page.dataset.view !== "garden" &&
      !picker?.matches(":popover-open")
    );
  }

  function open(item, source) {
    cancelOpen();
    if (!available()) return;
    const switching = activeItem !== null || performance.now() - lastClosedAt < 250;
    if (activeItem) delete activeItem.dataset.previewActive;
    page.toggleAttribute("data-preview-switching", switching);
    page.dataset.previewInput = source;
    page.dataset.previewState = "open";
    item.dataset.previewActive = "";
    activeItem = item;
  }

  function request(item, source, settled = false) {
    input = source;
    if (item !== dismissedItem) dismissedItem = null;
    if (!available() || (item && item === dismissedItem)) return;

    if (!item) {
      cancelOpen();
      if (!activeItem || closeTimer) return;
      // Bridge small gaps between neighboring titles without restarting intent.
      if (source === "keyboard") close();
      else closeTimer = setTimeout(close, 80);
      return;
    }

    clearTimeout(closeTimer);
    closeTimer = 0;
    if (item === activeItem) {
      page.dataset.previewInput = source;
      return;
    }
    if (item === pendingItem && source === "pointer" && !settled) return;
    cancelOpen();
    if (source === "keyboard" || settled || activeItem || performance.now() - lastClosedAt < 250) {
      open(item, source);
    } else {
      pendingItem = item;
      openTimer = setTimeout(() => open(item, source), openDelay);
    }
  }

  function trackPointer(event) {
    if (event.pointerType === "touch") return;
    pointer = { x: event.clientX, y: event.clientY };
    request(getItem(event.target), "pointer");
  }

  function reset() {
    clearTimeout(scrollTimer);
    scrollTimer = 0;
    close();
    lastClosedAt = -Infinity;
    dismissedItem = null;
    pointer = null;
  }

  document.addEventListener("pointermove", trackPointer, { passive: true });
  document.addEventListener("pointerdown", trackPointer, { passive: true });
  document.addEventListener(
    "pointerout",
    (event) => {
      if (event.relatedTarget) return;
      pointer = null;
      request(null, "pointer");
    },
    { passive: true },
  );

  page.addEventListener("focusin", () => {
    if (document.activeElement?.matches(":focus-visible")) request(getFocusedItem(), "keyboard");
  });
  page.addEventListener("focusout", () => {
    queueMicrotask(() => {
      if (input === "keyboard") request(getFocusedItem(), "keyboard");
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || (!activeItem && !pendingItem)) return;
    dismissedItem = activeItem || pendingItem;
    close();
  });

  // Listen to document scrolling, not capture-phase scrolls inside an excerpt.
  // A quiet period also covers inertial scrolling in browsers without scrollend.
  window.addEventListener(
    "scroll",
    () => {
      if (page.dataset.previewState !== "scrolling") {
        close("scrolling");
        lastClosedAt = -Infinity;
      }
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        scrollTimer = 0;
        page.dataset.previewState = "idle";
        // The page moved beneath a stationary pointer: never reopen the old row.
        const item = input === "keyboard" ? getFocusedItem() : pointer ? getItem(document.elementFromPoint(pointer.x, pointer.y)) : null;
        request(item, input, true);
      }, 160);
    },
    { passive: true },
  );

  picker?.addEventListener("beforetoggle", (event) => {
    if (event.newState === "open") reset();
  });
  media.addEventListener("change", reset);
  window.addEventListener("pagehide", reset);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) reset();
  });
}

// 季节牌：每一季的像素字是一枚印记——进入视口时从下方浮现，完全离场后复位，
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

// 年份切片：一枚可以按的年份——点一下滚到上一年（到头绕回最新的一年），数字像翻表一样
// 逐位滚动，只有变动的位在动；?year= 由脚本写进地址栏，可分享、可后退
function initArchiveYears() {
  const page = document.querySelector(".archive-page");
  const button = page ? page.querySelector(".archive-year") : null;
  const groups = page ? [...page.querySelectorAll(".archive-group[data-years]")] : [];
  if (!button || !groups.length) return;
  const reels = [...button.querySelectorAll(".archive-year__reel")];
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
    // 页码只报两位数（26、25），世纪不进翻表
    const digits = String(year).slice(-2).split("");
    reels.forEach((reel, index) => {
      if (digits[index] != null) reel.style.setProperty("--digit", digits[index]);
    });
    button.setAttribute("aria-label", `${year} ${button.dataset.switchLabel || ""}`.trim());
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
  // 栏宽随阅读宽度偏好、窗口尺寸与栏数切换变化
  if (box && "ResizeObserver" in window) new ResizeObserver(fit).observe(box);
  // 字体换过之后字宽也会变；正文字体是用户可选的
  document.fonts?.ready.then(fit).catch(() => {});
  window.addEventListener("gnix:article-font-settings-change", fit);
}

// 栏数切换：pc 上单栏顺着时间读、双栏把索引摊开扫；选择记在本地。
// 窄屏放不下两栏——按它只给一句提醒，布局不动（见 languages 的 archive.columns_narrow）
function initArchiveColumns() {
  const page = document.querySelector(".archive-page");
  if (!page) return;

  const options = [...page.querySelectorAll("[data-archive-columns]")];
  const note = page.querySelector(".archive-masthead__note");
  const wide = window.matchMedia(COLUMNS_WIDE);
  let noteTimer = 0;
  let preferred = "1";
  try {
    preferred = localStorage.getItem(ARCHIVE_COLUMNS_KEY) === "2" ? "2" : "1";
  } catch {
    // 隐私模式下读不到：这次会话按单栏走
  }

  function apply() {
    const columns = wide.matches ? preferred : "1";
    page.dataset.columns = columns;
    for (const option of options) {
      option.setAttribute("aria-pressed", option.dataset.archiveColumns === columns ? "true" : "false");
    }
  }

  function warn() {
    if (!note) return;
    note.hidden = false;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => {
      note.hidden = true;
    }, 4000);
  }

  for (const option of options) {
    option.addEventListener("click", () => {
      const columns = option.dataset.archiveColumns;
      if (columns === "2" && !wide.matches) {
        warn();
        return;
      }
      preferred = columns;
      try {
        localStorage.setItem(ARCHIVE_COLUMNS_KEY, columns);
      } catch {
        // 写不进去也不影响这次切换，只是下次打开回到单栏
      }
      apply();
    });
  }

  wide.addEventListener("change", apply);
  apply();
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
  title?.addEventListener("click", () => {
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

runWhenActivated(() => {
  initArchivePreview();
  initArchiveFolio();
  initArchiveYears();
  initArchiveTitleFit();
  initArchiveColumns();
  initArchiveGarden();
  initPopoverTriggers();
});
