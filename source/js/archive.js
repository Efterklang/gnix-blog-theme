import { decryptJson, forgetPasswords, GARDEN_PASSWORD_KEY, readStoredPassword, storePassword } from "./crypto.js";
import { runWhenActivated } from "./main.js";

function initArchivePreview() {
  const page = document.querySelector(".archive-page");
  if (!page || !CSS.supports("anchor-name: --archive-anchor") || !CSS.supports("anchor-scope: --archive-anchor")) return;

  const media = window.matchMedia("(hover: hover) and (pointer: fine) and (min-width: 721px)");
  // 预览在话题幕帘与秘密花园任一打开时都要让位
  const overlays = [page.querySelector(".archive-topic-picker"), document.getElementById("archive-garden")].filter(Boolean);
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
    return media.matches && !document.hidden && page.dataset.previewState !== "scrolling" && !overlays.some((overlay) => overlay.matches(":popover-open"));
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

  overlays.forEach((overlay) => {
    overlay.addEventListener("beforetoggle", (event) => {
      if (event.newState === "open") reset();
    });
  });
  media.addEventListener("change", reset);
  window.addEventListener("pagehide", reset);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) reset();
  });
}

// 季节标签书写动画：触屏没有悬浮，点按重播一次完整书写（桌面端点击同样生效）。
// 与预览浮层无关，不放进 initArchivePreview（那里在锚点定位不可用时整体退出）。
function initArchiveLabelReplay() {
  const page = document.querySelector(".archive-page");
  if (!page) return;

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

// 秘密花园：门禁解锁后把构建期加密的清单渲染成列表。密码记在本地，之后点进任何一篇
// 加密文章都由 decrypt.js 自动解开（两者共用 crypto.js 的同一个存储键）。
// 与预览浮层无关，也不依赖锚点定位，所以不放进 initArchivePreview
function initArchiveGarden() {
  const panel = document.getElementById("archive-garden");
  if (!panel) return;

  const blob = panel.querySelector(".encrypted-data")?.textContent.trim();
  const form = panel.querySelector(".archive-garden__gate");
  const input = form?.querySelector("input");
  const list = panel.querySelector(".archive-garden__list");
  const lock = panel.querySelector(".archive-garden__lock");
  if (!blob || !form || !input || !list) return;

  let unlocked = false;

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
    // 锁定要连文章页记住的密码一起清掉，否则「锁定」之后已读过的文章仍是开的
    forgetPasswords();
    list.textContent = "";
    input.value = "";
    unlocked = false;
    panel.dataset.state = "locked";
    input.focus();
  });

  panel.addEventListener("toggle", (event) => {
    if (event.newState !== "open") return;
    // 触屏不自动聚焦密码框：一聚焦就弹键盘，读者还没决定要不要进
    if (!window.matchMedia("(hover: hover)").matches) return;
    (unlocked ? lock : input)?.focus();
  });

  // 进过一次花园就自动开着；密码改过则静默退回门禁，不弹错误
  const remembered = readStoredPassword(GARDEN_PASSWORD_KEY);
  if (remembered) unlock(remembered).catch(() => storePassword(GARDEN_PASSWORD_KEY, null));
}

// 秘密花园的彩蛋：在归档页敲 garden（不分大小写）就开门。刊头末尾那枚记号是给好奇的人看的，
// 这条键盘路径是给「知道的人」留的
function initArchiveGardenEgg() {
  const panel = document.getElementById("archive-garden");
  if (!panel) return;

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
    if (typed === word && !panel.matches(":popover-open")) panel.showPopover();
  });
}

runWhenActivated(() => {
  initArchivePreview();
  initArchiveLabelReplay();
  initArchiveLabelStuck();
  initArchiveGarden();
  initArchiveGardenEgg();
  initPopoverTriggers();
});
