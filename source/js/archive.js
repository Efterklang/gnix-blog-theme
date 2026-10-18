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

// 季节标签书写动画：触屏没有悬浮，点按重播一次完整书写（桌面端点击同样生效）。
// 悬浮也走同一条路径（见下面的 pointerover）：一笔落笔就画完。
// 只靠 CSS 的 :hover 的话，鼠标快速划过时动画会在半途被掐断、直接跳成完整态——
// 看起来像写了一半被擦掉。与预览浮层无关，不放进 initArchivePreview
// （那里在锚点定位不可用时整体退出）。
function initArchiveLabelReplay() {
  const page = document.querySelector(".archive-page");
  if (!page) return;

  // 指针移进标签行时就开始写；写完由下面的 animationend 摘掉标记。
  // 中途移开指针不影响：动画照旧跑完，不会留下半幅字
  page.addEventListener(
    "pointerover",
    (event) => {
      if (event.pointerType === "touch") return;
      const header = event.target.closest?.(".archive-group__header");
      if (!header || header.classList.contains("is-writing")) return;
      header.classList.add("is-writing");
    },
    { passive: true },
  );

  page.addEventListener("click", (event) => {
    const header = event.target.closest?.(".archive-group__header");
    const strokes = header?.querySelectorAll(".archive-label__stroke");
    if (!strokes?.length) return;
    header.classList.remove("is-writing");
    void header.offsetWidth; // 强制重排，让动画从头重放
    header.classList.add("is-writing");
  });

  page.addEventListener("animationend", (event) => {
    if (event.animationName !== "archive-label-write") return;
    const header = event.target.closest?.(".archive-group__header");
    if (!header) return;
    // 标签与图标的书写都结束才摘掉标记（两者先后不定：长标签比图标画得久）；
    // 中途摘掉会让后续悬浮不再触发、未画完的笔画跳成完整态
    const writing = header.getAnimations({ subtree: true }).some((animation) => animation.animationName === "archive-label-write" && animation.playState === "running");
    if (!writing) header.classList.remove("is-writing");
  });
}

// 吸附检测：标签贴到它的吸顶位（导航条下沿）时加 is-stuck，驱动渐进模糊层。
// 标签自身 rect.top 在吸附时恒等于 sticky top、未吸附时等于自然位置，无需哨兵元素即可判定
function initArchiveLabelStuck() {
  const page = document.querySelector(".archive-page");
  if (!page) return;
  const headers = [...page.querySelectorAll(".archive-group__header")];
  if (!headers.length) return;

  // 标签吸在视口顶端，和导航链接同处一条带。列宽随阅读宽度偏好变化，媒体查询读不到这个条件，
  // 只能按实际位置判断：吸住的标签与链接的水平范围相交时，让链接让位（html.has-stuck-label）
  const navbarLinks = document.querySelector(".navbar-desktop .navbar-start");
  let scheduled = false;
  const update = () => {
    scheduled = false;
    const stickyTop = Number.parseFloat(getComputedStyle(headers[0]).top) || 0;
    const navRect = navbarLinks?.getBoundingClientRect();
    let collides = false;

    for (const header of headers) {
      // 吸附中且仍可见：被本节末尾顶出视口的标签不再算吸附（模糊层随之关闭）
      const rect = header.getBoundingClientRect();
      const stuck = rect.top <= stickyTop + 0.5 && rect.bottom > stickyTop;
      header.classList.toggle("is-stuck", stuck);
      if (stuck && navRect?.height && rect.left < navRect.right && rect.right > navRect.left) collides = true;
    }

    document.documentElement.classList.toggle("has-stuck-label", collides);
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(update);
  };

  update();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
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
  initArchiveLabelReplay();
  initArchiveLabelStuck();
  initArchiveTitleFit();
  initArchiveColumns();
  initArchiveGarden();
  initPopoverTriggers();
});
