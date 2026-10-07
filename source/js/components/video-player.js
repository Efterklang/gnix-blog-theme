/**
 * Video Player Custom Element — <video-player>
 * loomix 风格的视频块：自托管视频用全套自定义控件（中央液态玻璃按钮簇 + 底部控制条），
 * YouTube / 哔哩哔哩用同一套外观的封面门面，点击后才换上官方播放器。
 *
 * Usage:
 * <video-player src="https://assets.vluv.space/clip.mp4" poster="…" title="…">
 *   <track kind="subtitles" src="/clip.vtt" srclang="zh" label="中文" default>
 * </video-player>
 * <video-player youtube="0MS8mGdsLoI" title="Eastward Bound"></video-player>
 * <video-player bilibili="BV1GJ411x7h7" p="2" start="30" poster="…"></video-player>
 *
 * Attributes:
 * - src: 视频地址（mp4 / webm）；设置后走原生播放器，同时给了 youtube / bilibili 时右上角出「在 … 观看」
 * - youtube: 视频 ID 或任意 YouTube 链接（watch / youtu.be / embed / shorts，支持 t= / start=）
 * - bilibili: BV 号、av 号或视频 / 外链播放器链接（支持 p= / t=）
 * - title: 标题（左上角显示，并作为无障碍名称；读取后从宿主移除，避免整块出现原生 tooltip）
 * - poster: 封面；YouTube 缺省取 i.ytimg.com 缩略图，哔哩哔哩封面需手动填写
 * - duration: 门面右下角的时长标签，如 "3:52"
 * - start: 起播秒数（也接受 1m30s / 1:30）
 * - ratio: 宽高比，默认 16 / 9
 * - autoplay / muted / loop / crossorigin: 透传给 <video>；crossorigin 需视频服务器返回
 *   CORS 头，此时中央按钮升级为 WebGL 折射玻璃（见 video-lens.js），否则保持 CSS 玻璃
 * - disable-skip / disable-volume / disable-speed / disable-pip / disable-fullscreen:
 *   隐藏对应控件；全部隐藏时底栏收成「播放 · 进度 · 时间」一行
 *
 * 门面模式遵循官方播放器的规则：激活前页面上没有 iframe（不加载第三方脚本、不设 Cookie），
 * 激活后浮层全部移除，控件交还平台自己的播放器——不在第三方播放器上叠加自定义控件。
 */

let _sheet = null;

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SKIP_SECONDS = 10;
const HIDE_DELAY = 2200;
const VOLUME_CLOSE_DELAY = 160;

function isZhLocale() {
  return (document.documentElement.lang || "").toLowerCase().startsWith("zh");
}

function getUiText(key, value) {
  const zh = isZhLocale();
  const messages = {
    back: zh ? `后退 ${SKIP_SECONDS} 秒` : `Back ${SKIP_SECONDS} seconds`,
    captionsOff: zh ? "关闭字幕" : "Turn captions off",
    captionsOn: zh ? "开启字幕" : "Turn captions on",
    exitFullscreen: zh ? "退出全屏" : "Exit fullscreen",
    exitPip: zh ? "退出画中画" : "Exit picture in picture",
    forward: zh ? `前进 ${SKIP_SECONDS} 秒` : `Forward ${SKIP_SECONDS} seconds`,
    fullscreen: zh ? "全屏" : "Fullscreen",
    loadError: zh ? "视频暂时无法播放" : "This video can't be played right now",
    mute: zh ? "静音" : "Mute",
    openSource: zh ? "打开视频文件" : "Open video file",
    pause: zh ? "暂停" : "Pause",
    pip: zh ? "画中画" : "Picture in picture",
    play: zh ? "播放" : "Play",
    playVideo: zh ? `播放视频：${value}` : `Play video: ${value}`,
    seek: zh ? "播放进度" : "Seek",
    speed: zh ? "播放速度" : "Playback speed",
    timeOf: zh ? `${value?.[0]}，共 ${value?.[1]}` : `${value?.[0]} of ${value?.[1]}`,
    unmute: zh ? "取消静音" : "Unmute",
    videoPlayer: zh ? "视频播放器" : "Video player",
    volume: zh ? "音量" : "Volume",
    watchOnBilibili: zh ? "在哔哩哔哩观看" : "Watch on Bilibili",
    watchOnYouTube: zh ? "在 YouTube 观看" : "Watch on YouTube",
  };
  return messages[key] || key;
}

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value == null ? "" : String(value);
  return span.innerHTML;
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

/** 秒数格式化为 m:ss / h:mm:ss */
export function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** 解析 90 / 90s / 1m30s / 1h2m3s / 1:30 为秒数，无法解析返回 0 */
export function parseTime(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw);
  if (/^\d+(:\d{1,2}){1,2}$/.test(raw)) return raw.split(":").reduce((total, part) => total * 60 + Number(part), 0);
  const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match?.[0]) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

function toUrl(raw, base) {
  try {
    return new URL(raw, base);
  } catch {
    return null;
  }
}

/** YouTube：ID 或 watch / youtu.be / embed / shorts / live 链接 → { id, start } */
export function parseYouTube(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (/^[\w-]{6,20}$/.test(raw)) return { id: raw, start: 0 };
  const url = toUrl(raw.startsWith("//") ? `https:${raw}` : raw);
  if (!url || !/(^|\.)(youtube\.com|youtube-nocookie\.com|youtu\.be)$/i.test(url.hostname)) return null;
  let id = "";
  if (/youtu\.be$/i.test(url.hostname)) id = url.pathname.slice(1).split("/")[0];
  else if (url.searchParams.has("v")) id = url.searchParams.get("v");
  else id = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]+)/)?.[1] || "";
  if (!/^[\w-]{6,20}$/.test(id)) return null;
  return { id, start: parseTime(url.searchParams.get("t") || url.searchParams.get("start")) };
}

/** 哔哩哔哩：BV / av 号或视频页 / 外链播放器链接 → { bvid | aid, page, start } */
export function parseBilibili(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const bv = raw.match(/^(BV[0-9A-Za-z]{10})$/);
  if (bv) return { bvid: bv[1], page: 1, start: 0 };
  const av = raw.match(/^av(\d+)$/i);
  if (av) return { aid: av[1], page: 1, start: 0 };
  const url = toUrl(raw.startsWith("//") ? `https:${raw}` : raw);
  if (!url || !/(^|\.)bilibili\.com$/i.test(url.hostname)) return null;
  const page = Math.max(1, Number.parseInt(url.searchParams.get("p") || url.searchParams.get("page") || "1", 10) || 1);
  const start = parseTime(url.searchParams.get("t"));
  const bvid = url.searchParams.get("bvid") || url.pathname.match(/\/video\/(BV[0-9A-Za-z]{10})/)?.[1];
  if (bvid && /^BV[0-9A-Za-z]{10}$/.test(bvid)) return { bvid, page, start };
  const aid = url.searchParams.get("aid") || url.pathname.match(/\/video\/av(\d+)/i)?.[1];
  if (aid && /^\d+$/.test(aid)) return { aid, page, start };
  return null;
}

/** 平台信息：外链播放器地址、原站地址、默认封面、品牌名 */
export function resolveEmbed(provider, info, start = 0) {
  if (provider === "youtube") {
    const at = Math.floor(start || info.start || 0);
    const params = new URLSearchParams({ autoplay: "1", playsinline: "1", rel: "0" });
    if (at) params.set("start", String(at));
    return {
      provider,
      embedUrl: `https://www.youtube-nocookie.com/embed/${info.id}?${params}`,
      watchUrl: `https://www.youtube.com/watch?v=${info.id}${at ? `&t=${at}s` : ""}`,
      posters: ["maxresdefault", "sddefault", "hqdefault"].map((name) => `https://i.ytimg.com/vi/${info.id}/${name}.jpg`),
      origins: ["https://www.youtube-nocookie.com", "https://www.google.com", "https://i.ytimg.com"],
    };
  }
  const at = Math.floor(start || info.start || 0);
  const params = new URLSearchParams({ isOutside: "true", p: String(info.page || 1), autoplay: "1", high_quality: "1", danmaku: "0" });
  if (info.bvid) params.set("bvid", info.bvid);
  else params.set("aid", info.aid);
  if (at) params.set("t", String(at));
  const path = info.bvid || `av${info.aid}`;
  const watch = new URLSearchParams();
  if ((info.page || 1) > 1) watch.set("p", String(info.page));
  if (at) watch.set("t", String(at));
  const query = watch.toString();
  return {
    provider,
    embedUrl: `https://player.bilibili.com/player.html?${params}`,
    watchUrl: `https://www.bilibili.com/video/${path}/${query ? `?${query}` : ""}`,
    posters: [],
    origins: ["https://player.bilibili.com", "https://s1.hdslb.com"],
  };
}

// #region icons
// 24×24、1.8px 描边 / 实心，currentColor 着色；状态切换靠两枚图标交叉淡入（scale 0.25 ↔ 1 + blur）

const svg = (body, attrs = "") => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"${attrs}>${body}</svg>`;
const STROKE = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

const ICONS = {
  play: svg('<path fill="currentColor" d="M8 5.6v12.8a1.2 1.2 0 0 0 1.84 1.02l10.1-6.4a1.2 1.2 0 0 0 0-2.04l-10.1-6.4A1.2 1.2 0 0 0 8 5.6z"/>'),
  pause: svg('<rect fill="currentColor" x="6" y="4.5" width="4.2" height="15" rx="1.4"/><rect fill="currentColor" x="13.8" y="4.5" width="4.2" height="15" rx="1.4"/>'),
  back: svg(
    `<g ${STROKE}><path d="M12 4.6a7.6 7.6 0 1 1-7.4 9.2"/></g><path fill="currentColor" d="M12.4 1.9 8.6 4.6l3.8 2.7z"/><text x="12.6" y="15.6" text-anchor="middle" font-size="7.4" font-weight="700" font-family="system-ui, sans-serif" fill="currentColor">${SKIP_SECONDS}</text>`,
  ),
  forward: svg(
    `<g ${STROKE}><path d="M12 4.6a7.6 7.6 0 1 0 7.4 9.2"/></g><path fill="currentColor" d="M11.6 1.9l3.8 2.7-3.8 2.7z"/><text x="11.4" y="15.6" text-anchor="middle" font-size="7.4" font-weight="700" font-family="system-ui, sans-serif" fill="currentColor">${SKIP_SECONDS}</text>`,
  ),
  volumeHigh: svg(`<path fill="currentColor" d="M4.8 9.3h2.7L11.4 6a.6.6 0 0 1 1 .46v11.08a.6.6 0 0 1-1 .46l-3.9-3.3H4.8a1 1 0 0 1-1-1V10.3a1 1 0 0 1 1-1z"/><path ${STROKE} d="M15.6 9.3a3.8 3.8 0 0 1 0 5.4M18.3 6.7a7.5 7.5 0 0 1 0 10.6"/>`),
  volumeLow: svg(`<path fill="currentColor" d="M4.8 9.3h2.7L11.4 6a.6.6 0 0 1 1 .46v11.08a.6.6 0 0 1-1 .46l-3.9-3.3H4.8a1 1 0 0 1-1-1V10.3a1 1 0 0 1 1-1z"/><path ${STROKE} d="M15.6 9.3a3.8 3.8 0 0 1 0 5.4"/>`),
  volumeMuted: svg(`<path fill="currentColor" d="M4.8 9.3h2.7L11.4 6a.6.6 0 0 1 1 .46v11.08a.6.6 0 0 1-1 .46l-3.9-3.3H4.8a1 1 0 0 1-1-1V10.3a1 1 0 0 1 1-1z"/><path ${STROKE} d="m15.8 9.6 4.8 4.8m0-4.8-4.8 4.8"/>`),
  captions: svg(`<rect ${STROKE} x="3" y="5.5" width="18" height="13" rx="3.2"/><path ${STROKE} d="M10.6 10.3a2.1 2.1 0 1 0 0 3.4M16.6 10.3a2.1 2.1 0 1 0 0 3.4"/>`),
  pip: svg(`<rect ${STROKE} x="3" y="5" width="18" height="14" rx="2.6"/><rect fill="currentColor" x="12" y="11.4" width="6.6" height="5" rx="1.2"/>`),
  pipExit: svg(`<rect ${STROKE} x="3" y="5" width="18" height="14" rx="2.6"/><path ${STROKE} d="m8 9 4 4m0-3.4V13H8.6"/>`),
  fullscreen: svg(`<path ${STROKE} d="M4 9V6.4A2.4 2.4 0 0 1 6.4 4H9M15 4h2.6A2.4 2.4 0 0 1 20 6.4V9M20 15v2.6a2.4 2.4 0 0 1-2.4 2.4H15M9 20H6.4A2.4 2.4 0 0 1 4 17.6V15"/>`),
  fullscreenExit: svg(`<path ${STROKE} d="M9 4v2.6A2.4 2.4 0 0 1 6.6 9H4M20 9h-2.6A2.4 2.4 0 0 1 15 6.6V4M15 20v-2.6a2.4 2.4 0 0 1 2.4-2.4H20M4 15h2.6A2.4 2.4 0 0 1 9 17.4V20"/>`),
  check: svg(`<path ${STROKE} d="m5.5 12.5 4.2 4.2 8.8-9.4"/>`),
  youtube: svg(
    '<path fill="currentColor" d="M21.6 7.2a2.5 2.5 0 0 0-1.77-1.77C18.27 5 12 5 12 5s-6.27 0-7.83.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.77 1.77C5.73 19 12 19 12 19s6.27 0 7.83-.43a2.5 2.5 0 0 0 1.77-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10 15V9l5.2 3z"/>',
  ),
  bilibili: svg(
    '<path fill="currentColor" d="M7.2 3.3a.9.9 0 0 1 1.27 0L10.9 5.7h2.2l2.43-2.4a.9.9 0 1 1 1.27 1.27L15.66 5.7H18a3 3 0 0 1 3 3v8.1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V8.7a3 3 0 0 1 3-3h2.34L7.2 4.57a.9.9 0 0 1 0-1.27zM6 7.6a1.1 1.1 0 0 0-1.1 1.1v8.1A1.1 1.1 0 0 0 6 17.9h12a1.1 1.1 0 0 0 1.1-1.1V8.7A1.1 1.1 0 0 0 18 7.6zm2.6 3.1a1 1 0 0 1 1 1v1.1a1 1 0 1 1-2 0v-1.1a1 1 0 0 1 1-1zm6.8 0a1 1 0 0 1 1 1v1.1a1 1 0 1 1-2 0v-1.1a1 1 0 0 1 1-1z"/>',
  ),
};

/** 多枚图标叠放交叉淡入：带 data-active 的一枚可见，切换见 setIcon */
const swap = (names, active) =>
  `<span class="swap">${names.map((name) => `<span class="swap-icon" data-icon="${name}"${name === active ? " data-active" : ""}>${ICONS[name]}</span>`).join("")}</span>`;

function setIcon(container, name) {
  if (!container) return;
  for (const icon of container.children) icon.toggleAttribute("data-active", icon.dataset.icon === name);
}

// #endregion

// #region styles

const STYLES = `
  :host {
    display: block;
    /* 竖屏视频（ratio="9 / 16"）不超过视口高度的 80%：按宽高比反推最大宽度并居中 */
    max-width: calc((var(--vp-ratio)) * var(--vp-max-height, 80vh));
    margin-inline: auto;
    --vp-radius: 14px;
    --vp-ratio: 16 / 9;
    --vp-ease: cubic-bezier(0.23, 1, 0.32, 1);
    --vp-spring: var(--glass-spring, cubic-bezier(0.23, 1, 0.32, 1));
    --vp-accent: #0a84ff;
    --vp-glass: rgb(0 0 0 / 0.2);
    --vp-glass-strong: rgb(24 24 28 / 0.56);
    --vp-rim: inset 0 1px 0 rgb(255 255 255 / 0.42), inset 0 0 0 1px rgb(255 255 255 / 0.14);
    --vp-rim-soft: inset 0 1px 0 rgb(255 255 255 / 0.2), inset 0 0 0 1px rgb(255 255 255 / 0.1);
    --vp-blur: blur(8px) saturate(1.8) brightness(1.08);
    --vp-blur-strong: blur(24px) saturate(1.8);
  }

  :host([hidden]) {
    display: none;
  }

  * {
    box-sizing: border-box;
  }

  /* 描边按页面明暗取纯黑 / 纯白 10%：视频边缘与浅色页面之间留一线深度 */
  .player {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    width: 100%;
    aspect-ratio: var(--vp-ratio);
    border-radius: var(--vp-radius);
    background: #000;
    color: #fff;
    outline: 1px solid light-dark(oklch(0 0 0 / 0.1), oklch(1 0 0 / 0.1));
    outline-offset: -1px;
    font-family: var(--font-sans-serif, system-ui, sans-serif);
    line-height: 1.4;
    user-select: none;
    -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent;
    container-type: inline-size;
  }

  .player:focus-visible {
    outline: 2px solid var(--mauve, #cba6f7);
    outline-offset: 2px;
  }

  .player:fullscreen {
    width: 100%;
    height: 100%;
    aspect-ratio: auto;
    border-radius: 0;
    outline: none;
  }

  .player[data-ui="hidden"][data-state="playing"] {
    cursor: none;
  }

  .media,
  .frame,
  .poster {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    border: 0;
  }

  .media {
    object-fit: contain;
    background: #000;
  }

  .media::cue {
    background: rgb(0 0 0 / 0.6);
    color: #fff;
    font: 500 0.95em / 1.4 var(--font-sans-serif, system-ui, sans-serif);
  }

  .poster {
    object-fit: cover;
    background: radial-gradient(120% 90% at 50% 20%, #2c2c34, #0b0b0e 70%);
  }

  .frame {
    background: #000;
  }

  /* ---------- 中央玻璃按钮簇 ---------- */

  .center {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    pointer-events: none;
    color-scheme: dark;
  }

  /* CSS 玻璃（WebGL 透镜未就绪 / 不可用时的材质）：显隐走按钮自身的 opacity——
     挂在容器上会让容器成为 Backdrop Root，模糊要等淡入结束才出现 */
  .orb {
    position: relative;
    display: grid;
    place-items: center;
    flex: none;
    width: var(--orb, 64px);
    height: var(--orb, 64px);
    padding: 0;
    border: none;
    border-radius: 50%;
    color: #fff;
    background: var(--vp-glass);
    box-shadow:
      var(--vp-rim),
      0 10px 28px -10px rgb(0 0 0 / 0.55);
    -webkit-backdrop-filter: var(--vp-blur);
    backdrop-filter: var(--glass-lens,) var(--vp-blur);
    cursor: pointer;
    pointer-events: auto;
    opacity: 1;
    transition:
      opacity 220ms var(--vp-ease),
      background-color 160ms ease;
    -webkit-tap-highlight-color: transparent;
  }

  .orb svg {
    width: 44%;
    height: 44%;
    filter: drop-shadow(0 1px 6px rgb(0 0 0 / 0.35));
  }

  .orb--skip svg {
    width: 50%;
    height: 50%;
  }

  /* 播放三角的形心已落在 viewBox 正中（路径本身做了光学居中），这里不再额外平移 */

  .orb:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 3px;
  }

  .orb--play {
    --orb: 64px;
  }

  .orb--skip {
    --orb: 48px;
  }

  @container (min-width: 520px) {
    .orb--play {
      --orb: 84px;
    }

    .orb--skip {
      --orb: 62px;
    }

    .center {
      gap: 12px;
    }
  }

  .player[data-center="hidden"] .orb {
    opacity: 0;
    pointer-events: none;
  }

  /* WebGL 透镜接管材质：按钮只剩图标与命中区，玻璃由底下的画布画出 */
  .player[data-lens="webgl"] .orb {
    background: transparent;
    box-shadow: none;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }

  .lens {
    position: absolute;
    z-index: 1;
    pointer-events: none;
    opacity: 0;
    transition: opacity 220ms var(--vp-ease);
  }

  .player[data-lens="webgl"]:not([data-center="hidden"]) .lens {
    opacity: 1;
  }

  /* ---------- 图标交叉淡入 ---------- */

  .swap {
    display: inline-grid;
    width: 100%;
    height: 100%;
    place-items: center;
  }

  .swap-icon {
    display: grid;
    grid-area: 1 / 1;
    place-items: center;
    width: 100%;
    height: 100%;
    transition:
      opacity 300ms cubic-bezier(0.2, 0, 0, 1),
      scale 300ms cubic-bezier(0.2, 0, 0, 1),
      filter 300ms cubic-bezier(0.2, 0, 0, 1);
  }

  .swap-icon:not([data-active]) {
    opacity: 0;
    scale: 0.25;
    filter: blur(4px);
  }

  /* ---------- 顶栏：标题 + 「在 … 观看」玻璃胶囊 ---------- */

  .top {
    position: absolute;
    inset: 0 0 auto;
    z-index: 3;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 10px 0;
    pointer-events: none;
    color-scheme: dark;
  }

  .top-scrim,
  .bottom-scrim {
    position: absolute;
    inset-inline: 0;
    z-index: -1;
    pointer-events: none;
    transition: opacity 220ms var(--vp-ease);
  }

  .top-scrim {
    top: 0;
    height: 96px;
    background: linear-gradient(180deg, rgb(0 0 0 / 0.55), rgb(0 0 0 / 0.22) 55%, transparent);
  }

  .title {
    min-width: 0;
    max-width: 62%;
    padding: 6px 0 0 4px;
    overflow: hidden;
    color: rgb(255 255 255 / 0.95);
    font-size: 15px;
    font-weight: 500;
    text-overflow: ellipsis;
    text-shadow: 0 1px 12px rgb(0 0 0 / 0.55);
    white-space: nowrap;
    transition:
      opacity 220ms var(--vp-ease),
      translate 220ms var(--vp-ease);
  }

  .pill {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 6px;
    height: 32px;
    margin-left: auto;
    padding: 0 12px 0 10px;
    border-radius: 999px;
    background: var(--vp-glass);
    box-shadow:
      var(--vp-rim),
      0 6px 18px -8px rgb(0 0 0 / 0.5);
    -webkit-backdrop-filter: var(--vp-blur);
    backdrop-filter: var(--glass-lens,) var(--vp-blur);
    color: rgb(255 255 255 / 0.94);
    font-size: 12.5px;
    font-weight: 500;
    text-decoration: none;
    white-space: nowrap;
    pointer-events: auto;
    transition:
      background-color 160ms ease,
      opacity 220ms var(--vp-ease),
      translate 220ms var(--vp-ease),
      scale 150ms ease-out;
  }

  .pill:hover {
    background: rgb(0 0 0 / 0.34);
  }

  .pill:active {
    scale: 0.96;
  }

  .pill:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }

  .pill svg {
    width: 16px;
    height: 16px;
  }

  .player[data-ui="hidden"] :is(.title, .pill) {
    opacity: 0;
    translate: 0 -6px;
    pointer-events: none;
  }

  .player[data-ui="hidden"] :is(.top-scrim, .bottom-scrim) {
    opacity: 0;
  }

  /* ---------- 底栏：进度条 + 控制按钮（圆角 8 + 边距 6 = 播放器圆角 14） ---------- */

  .bottom {
    position: absolute;
    inset: auto 0 0;
    z-index: 3;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 0 6px 6px;
    color-scheme: dark;
    transition:
      opacity 220ms var(--vp-ease),
      translate 220ms var(--vp-ease);
  }

  .bottom-scrim {
    bottom: 0;
    height: 128px;
    background: linear-gradient(180deg, transparent, rgb(0 0 0 / 0.5) 60%, rgb(0 0 0 / 0.75));
  }

  .player[data-ui="hidden"] .bottom {
    opacity: 0;
    translate: 0 8px;
    pointer-events: none;
  }

  .bar {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .bar-end {
    display: flex;
    align-items: center;
    gap: 2px;
    margin-left: auto;
  }

  .ctl {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 32px;
    height: 32px;
    padding: 0 7px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: rgb(255 255 255 / 0.86);
    font: inherit;
    cursor: pointer;
    transition:
      background-color 150ms ease,
      color 150ms ease,
      scale 150ms ease-out;
  }

  .ctl:hover,
  .ctl[aria-expanded="true"],
  .ctl[aria-pressed="true"] {
    background: rgb(255 255 255 / 0.12);
    color: #fff;
  }

  .ctl:active {
    scale: 0.96;
  }

  .ctl:focus-visible {
    outline: 2px solid #fff;
    outline-offset: -2px;
  }

  .ctl[hidden] {
    display: none;
  }

  .ctl > .swap,
  .ctl > svg {
    width: 18px;
    height: 18px;
  }

  .ctl--text {
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  .ctl[data-action="captions"][aria-pressed="true"] rect {
    fill: currentColor;
  }

  .ctl[data-action="captions"][aria-pressed="true"] path {
    stroke: #000;
  }

  .time {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
    margin-left: 4px;
    color: rgb(255 255 255 / 0.86);
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .time .sep {
    color: rgb(255 255 255 / 0.4);
  }

  .time .dur {
    color: rgb(255 255 255 / 0.56);
  }

  /* 所有可选控件都关掉时收成一行：播放 · 进度 · 时间 */
  .player[data-inline] .bottom {
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }

  .player[data-inline] .seek {
    flex: 1;
  }

  /* ---------- 进度条 ---------- */

  .seek {
    position: relative;
    display: flex;
    align-items: center;
    height: 20px;
    margin: 0 8px;
    cursor: pointer;
    touch-action: none;
    outline: none;
  }

  .track {
    position: relative;
    width: 100%;
    height: 3px;
    border-radius: 3px;
    background: rgb(255 255 255 / 0.22);
    transition: height 150ms var(--vp-ease);
  }

  .seek:hover .track,
  .seek:focus-visible .track,
  .player[data-scrubbing] .track {
    height: 5px;
  }

  .buffered,
  .progress {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    transform-origin: left center;
  }

  .buffered {
    background: rgb(255 255 255 / 0.35);
    scale: var(--buffered, 0) 1;
  }

  .progress {
    background: #fff;
    scale: var(--progress, 0) 1;
  }

  .knob-rail {
    position: absolute;
    inset: 0;
    translate: calc(var(--progress, 0) * 100%) 0;
    pointer-events: none;
  }

  .knob {
    position: absolute;
    top: 50%;
    left: 0;
    width: 12px;
    height: 12px;
    margin: -6px 0 0 -6px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.4);
    scale: 0;
    transition: scale 150ms var(--vp-ease);
  }

  .seek:hover .knob,
  .seek:focus-visible .knob,
  .player[data-scrubbing] .knob {
    scale: 1;
  }

  .seek:focus-visible .track {
    box-shadow: 0 0 0 2px rgb(255 255 255 / 0.5);
  }

  .hover-line {
    position: absolute;
    top: 50%;
    left: calc(var(--hover, 0) * 100%);
    width: 1px;
    height: 14px;
    translate: -50% -50%;
    background: #fff;
    opacity: 0;
    pointer-events: none;
  }

  .hover-time {
    position: absolute;
    bottom: calc(100% + 8px);
    left: var(--hover-x, 0px);
    translate: -50% 0;
    padding: 3px 8px;
    border-radius: 8px;
    background: var(--vp-glass-strong);
    box-shadow: var(--vp-rim-soft);
    -webkit-backdrop-filter: var(--vp-blur-strong);
    backdrop-filter: var(--vp-blur-strong);
    color: #fff;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity 120ms ease;
  }

  .hover-time .total {
    color: rgb(255 255 255 / 0.5);
  }

  .seek[data-hovering] :is(.hover-line, .hover-time) {
    opacity: 1;
  }

  /* ---------- 弹层：速度菜单 / 音量 / 提示（深色玻璃） ---------- */

  .menu,
  .volume,
  .tip {
    color: #fff;
    color-scheme: dark;
    background: var(--vp-glass-strong);
    box-shadow:
      var(--vp-rim-soft),
      0 18px 40px -12px rgb(0 0 0 / 0.6);
    -webkit-backdrop-filter: var(--vp-blur-strong);
    backdrop-filter: var(--vp-blur-strong);
  }

  .menu,
  .volume {
    position: fixed;
    inset: auto;
    z-index: 60;
    margin: 0;
    border: none;
    opacity: 0;
    translate: 0 6px;
    scale: 0.98;
    transition:
      opacity 140ms ease,
      translate 160ms var(--vp-ease),
      scale 160ms var(--vp-ease),
      display 160ms allow-discrete,
      overlay 160ms allow-discrete;
  }

  .menu:popover-open,
  .volume:popover-open,
  .menu[data-open],
  .volume[data-open] {
    opacity: 1;
    translate: 0 0;
    scale: 1;
  }

  @starting-style {
    .menu:popover-open,
    .volume:popover-open {
      opacity: 0;
      translate: 0 6px;
      scale: 0.98;
    }
  }

  .menu:not(:popover-open):not([data-open]),
  .volume:not(:popover-open):not([data-open]) {
    pointer-events: none;
  }

  /* 圆角 16 = 选项圆角 10 + 内边距 6 */
  .menu {
    width: 128px;
    padding: 6px;
    border-radius: 16px;
    font-size: 13px;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    height: 30px;
    padding: 0 10px 0 8px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: rgb(255 255 255 / 0.86);
    font: inherit;
    font-variant-numeric: tabular-nums;
    text-align: left;
    cursor: pointer;
  }

  .menu-item svg {
    width: 14px;
    height: 14px;
    visibility: hidden;
  }

  .menu-item:hover,
  .menu-item[data-highlighted] {
    background: rgb(255 255 255 / 0.12);
    color: #fff;
  }

  .menu-item[aria-checked="true"] {
    background: var(--vp-accent);
    color: #fff;
  }

  .menu-item[aria-checked="true"] svg {
    visibility: visible;
  }

  .menu-item:focus-visible {
    outline: 2px solid #fff;
    outline-offset: -2px;
  }

  .volume {
    width: 36px;
    padding: 12px 0;
    border-radius: 999px;
  }

  .vol-track {
    position: relative;
    width: 18px;
    height: 88px;
    margin: 0 auto;
    --vol: 1;
  }

  .vol-rail {
    position: absolute;
    inset-block: 0;
    left: 50%;
    width: 4px;
    translate: -50% 0;
    overflow: hidden;
    border-radius: 4px;
    background: rgb(255 255 255 / 0.18);
  }

  .vol-fill {
    position: absolute;
    inset: 0;
    background: #fff;
    transform-origin: bottom center;
    scale: 1 var(--vol);
  }

  .vol-knob {
    position: absolute;
    bottom: calc(var(--vol) * 100%);
    left: 50%;
    width: 12px;
    height: 12px;
    translate: -50% 50%;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 2px 6px rgb(0 0 0 / 0.4);
    pointer-events: none;
  }

  .vol-input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: pointer;
    writing-mode: vertical-lr;
    direction: rtl;
  }

  .tip {
    position: absolute;
    top: 0;
    left: 0;
    z-index: 5;
    padding: 4px 8px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    translate: var(--tip-x, 0px) calc(var(--tip-y, 0px) + 2px);
    transition:
      opacity 140ms ease,
      translate 140ms ease;
  }

  .tip[data-show] {
    opacity: 1;
    translate: var(--tip-x, 0px) var(--tip-y, 0px);
  }

  /* ---------- 门面（YouTube / 哔哩哔哩） ---------- */

  .player[data-mode="embed"] {
    cursor: pointer;
  }

  .player[data-mode="embed"] .poster {
    transition: opacity 260ms var(--vp-ease);
  }

  .badge {
    position: absolute;
    right: 10px;
    bottom: 10px;
    z-index: 3;
    padding: 3px 8px;
    border-radius: 8px;
    background: var(--vp-glass-strong);
    box-shadow: var(--vp-rim-soft);
    -webkit-backdrop-filter: var(--vp-blur-strong);
    backdrop-filter: var(--vp-blur-strong);
    color: #fff;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    transition: opacity 260ms var(--vp-ease);
  }

  .shade {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: radial-gradient(90% 70% at 50% 50%, transparent 40%, rgb(0 0 0 / 0.28));
    pointer-events: none;
    transition: opacity 260ms var(--vp-ease);
  }

  /* 官方播放器就绪：浮层淡出后整块移除，不在第三方播放器上方叠任何元素。
     淡出落在各玻璃元素自身，容器不变透明（否则容器成为 Backdrop Root，玻璃先失去模糊再淡出） */
  .player[data-embed="live"] :is(.poster, .shade, .orb, .title, .pill, .top-scrim, .badge) {
    opacity: 0;
    pointer-events: none;
  }

  .player[data-embed="loading"] .orb {
    animation: vp-breathe 1.2s ease-in-out infinite;
  }

  @keyframes vp-breathe {
    50% {
      opacity: 0.6;
    }
  }

  .notice {
    position: absolute;
    inset: 0;
    z-index: 4;
    display: grid;
    place-content: center;
    gap: 10px;
    justify-items: center;
    padding: 1rem;
    color: rgb(255 255 255 / 0.9);
    font-size: 14px;
    text-align: center;
    background: rgb(0 0 0 / 0.55);
  }

  .notice[hidden] {
    display: none;
  }

  .notice a {
    color: #fff;
  }
`;

// #endregion

// #region element

/** 把玻璃按钮交给 glass-lens.js 补边缘折射（是否支持由它判断；模块未就绪时先排队，由它加载后统一补挂） */
function registerGlassLens(elements) {
  globalThis.__gnixGlassLensQueue ||= [];
  for (const element of elements) globalThis.__gnixGlassLensQueue.push(element);
}

const clamp01 = (value) => Math.min(1, Math.max(0, value));

/** 欠阻尼弹簧（ζ≈0.66，约 6% 过冲）：驱动玻璃按钮的悬停 / 按压，缩放与透镜读同一个值 */
function stepSpring(spring, dt) {
  const force = (spring.target - spring.value) * 520 - spring.velocity * 30;
  spring.velocity += force * dt;
  spring.value += spring.velocity * dt;
  if (Math.abs(spring.target - spring.value) < 0.001 && Math.abs(spring.velocity) < 0.01) {
    spring.value = spring.target;
    spring.velocity = 0;
    return false;
  }
  return true;
}

class VideoPlayer extends HTMLElement {
  static get observedAttributes() {
    return ["src", "youtube", "bilibili", "poster", "ratio", "title"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._label = "";
    this._mode = "";
    this._cleanups = [];
  }

  connectedCallback() {
    this._takeTitle();
    this._render();
  }

  disconnectedCallback() {
    this._teardown();
    this._mode = "";
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this._mode) return;
    if (name === "title") {
      if (newValue === null) return;
      this._takeTitle();
    }
    if (name === "ratio") {
      this._applyRatio();
      return;
    }
    this._render();
  }

  /** title 挪到 label：否则整块播放器悬停都会冒出浏览器原生 tooltip；
      留在 label 上而非丢弃，x-tabs 等组件重新序列化内容时标题不会丢 */
  _takeTitle() {
    const title = this.getAttribute("title");
    if (title !== null) {
      this.setAttribute("label", title);
      this.removeAttribute("title");
    }
    this._label = this.getAttribute("label") || "";
  }

  _applyRatio() {
    const ratio = this.getAttribute("ratio");
    if (ratio) this.style.setProperty("--vp-ratio", ratio.replace(/\s*[:/]\s*/, " / "));
    else this.style.removeProperty("--vp-ratio");
  }

  _listen(target, type, listener, options) {
    if (!target) return;
    target.addEventListener(type, listener, options);
    this._cleanups.push(() => target.removeEventListener(type, listener, options));
  }

  _teardown() {
    for (const cleanup of this._cleanups.splice(0)) cleanup();
  }

  _render() {
    this._teardown();
    if (!_sheet && typeof CSSStyleSheet === "function" && "adoptedStyleSheets" in ShadowRoot.prototype) {
      try {
        _sheet = new CSSStyleSheet();
        _sheet.replaceSync(STYLES);
      } catch {
        _sheet = null;
      }
    }
    if (_sheet) this.shadowRoot.adoptedStyleSheets = [_sheet];
    const inlineStyle = _sheet ? "" : `<style>${STYLES}</style>`;
    this._applyRatio();

    const start = parseTime(this.getAttribute("start"));
    const youtube = parseYouTube(this.getAttribute("youtube"));
    const bilibili = youtube ? null : parseBilibili(this.getAttribute("bilibili"));
    const page = Number.parseInt(this.getAttribute("p") || "", 10);
    if (bilibili && page > 0) bilibili.page = page;
    const platform = youtube ? resolveEmbed("youtube", youtube, start) : bilibili ? resolveEmbed("bilibili", bilibili, start) : null;
    const src = this.getAttribute("src");

    if (src) {
      this._mode = "native";
      this.shadowRoot.innerHTML = inlineStyle + this._nativeMarkup(src, platform);
      this._setupNative(start);
    } else if (platform) {
      this._mode = "embed";
      this.shadowRoot.innerHTML = inlineStyle + this._embedMarkup(platform);
      this._setupEmbed(platform);
    } else {
      this._mode = "empty";
      this.shadowRoot.innerHTML = "";
    }
  }

  _pillMarkup(platform) {
    if (!platform) return "";
    const youtube = platform.provider === "youtube";
    return `<a class="pill" href="${escapeAttribute(platform.watchUrl)}" target="_blank" rel="noopener noreferrer">${youtube ? ICONS.youtube : ICONS.bilibili}<span>${getUiText(youtube ? "watchOnYouTube" : "watchOnBilibili")}</span></a>`;
  }

  _topMarkup(platform) {
    const title = this._label ? `<div class="title">${escapeHtml(this._label)}</div>` : "";
    return `<div class="top"><div class="top-scrim"></div>${title}${this._pillMarkup(platform)}</div>`;
  }

  // #region embed facade

  _embedMarkup(platform) {
    const brand = platform.provider === "youtube" ? "YouTube" : "Bilibili";
    const poster = this.getAttribute("poster") || platform.posters[0] || "";
    const duration = this.getAttribute("duration");
    const posterMarkup = poster ? `<img class="poster" src="${escapeAttribute(poster)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : '<div class="poster"></div>';
    return `
      <div class="player" data-mode="embed" data-provider="${platform.provider}" data-embed="idle" role="region" aria-label="${escapeAttribute(this._label || `${brand} · ${getUiText("videoPlayer")}`)}">
        ${posterMarkup}
        <div class="shade"></div>
        <div class="center">
          <button class="orb orb--play" type="button" data-action="activate" aria-label="${escapeAttribute(getUiText("playVideo", this._label || brand))}">${swap(["play"], "play")}</button>
        </div>
        ${this._topMarkup(platform)}
        ${duration ? `<span class="badge">${escapeHtml(duration)}</span>` : ""}
      </div>`;
  }

  _setupEmbed(platform) {
    const player = this.shadowRoot.querySelector(".player");
    const poster = player.querySelector("img.poster");

    // YouTube 缺 maxresdefault 时返回 120×90 的灰色占位图，逐级退到 sd / hq 缩略图
    if (poster && !this.getAttribute("poster") && platform.posters.length > 1) {
      let index = 0;
      const next = () => {
        index += 1;
        if (index < platform.posters.length) poster.src = platform.posters[index];
      };
      this._listen(poster, "load", () => {
        if (poster.naturalWidth > 0 && poster.naturalWidth <= 120) next();
      });
      this._listen(poster, "error", next);
    }

    // 悬停 / 聚焦时预连接平台域名，点击后的首帧更快
    let warmed = false;
    const warm = () => {
      if (warmed) return;
      warmed = true;
      for (const origin of platform.origins) {
        if (document.head.querySelector(`link[rel="preconnect"][href="${origin}"]`)) continue;
        const link = document.createElement("link");
        link.rel = "preconnect";
        link.href = origin;
        document.head.append(link);
      }
    };
    this._listen(player, "pointerenter", warm);
    this._listen(player, "focusin", warm);
    this._listen(player, "click", (event) => {
      if (event.target.closest?.(".pill")) return;
      this._activateEmbed(player, platform);
    });

    registerGlassLens(player.querySelectorAll(".orb, .pill"));
  }

  /** 换上官方播放器；iframe 就绪后门面浮层淡出并移除，之后播放器上方不留任何自定义元素 */
  _activateEmbed(player, platform) {
    if (player.dataset.embed !== "idle") return;
    player.dataset.embed = "loading";

    const iframe = document.createElement("iframe");
    iframe.className = "frame";
    iframe.src = platform.embedUrl;
    iframe.title = this._label || `${platform.provider === "youtube" ? "YouTube" : "Bilibili"} video player`;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen";
    iframe.allowFullscreen = true;
    // YouTube 要求带 Referer 的 embed 请求（否则报 153 错误），不能用 no-referrer
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    if (platform.provider === "bilibili") iframe.setAttribute("scrolling", "no");

    let revealed = false;
    const reveal = () => {
      if (revealed || !iframe.isConnected) return;
      revealed = true;
      player.dataset.embed = "live";
      player.style.cursor = "auto";
      iframe.focus({ preventScroll: true });
      window.setTimeout(() => {
        for (const node of player.querySelectorAll(".poster, .shade, .center, .top, .badge")) node.remove();
      }, 320);
    };
    iframe.addEventListener("load", reveal, { once: true });
    window.setTimeout(reveal, 6000);
    player.prepend(iframe);
  }

  // #endregion

  // #region native player

  _nativeMarkup(src, platform) {
    const enabled = (name) => !this.hasAttribute(`disable-${name}`);
    const skip = enabled("skip");
    const volume = enabled("volume");
    const speed = enabled("speed");
    const pip = enabled("pip");
    const fullscreen = enabled("fullscreen");
    const captions = !!this.querySelector("track");
    const inline = !skip && !volume && !speed && !pip && !fullscreen && !captions;
    const toggle = (className) => `<button class="${className}" type="button" data-action="toggle" aria-label="${getUiText("play")}">${swap(["play", "pause"], "play")}</button>`;
    const time = '<div class="time"><span class="cur">0:00</span><span class="sep">/</span><span class="dur">0:00</span></div>';

    const bar = inline
      ? time
      : `<div class="bar">
          ${toggle("ctl")}
          ${volume ? `<button class="ctl" type="button" data-action="mute" aria-label="${getUiText("mute")}">${swap(["volumeHigh", "volumeLow", "volumeMuted"], "volumeHigh")}</button>` : ""}
          ${time}
          <div class="bar-end">
            ${captions ? `<button class="ctl" type="button" data-action="captions" aria-pressed="false" aria-label="${getUiText("captionsOn")}">${ICONS.captions}</button>` : ""}
            ${speed ? `<button class="ctl ctl--text" type="button" data-action="speed" aria-haspopup="menu" aria-expanded="false" aria-label="${getUiText("speed")}">1×</button>` : ""}
            ${pip ? `<button class="ctl" type="button" data-action="pip" aria-pressed="false" aria-label="${getUiText("pip")}" hidden>${swap(["pip", "pipExit"], "pip")}</button>` : ""}
            ${fullscreen ? `<button class="ctl" type="button" data-action="fullscreen" aria-label="${getUiText("fullscreen")}">${swap(["fullscreen", "fullscreenExit"], "fullscreen")}</button>` : ""}
          </div>
        </div>`;

    const menu = speed
      ? `<div class="menu" role="menu" aria-label="${getUiText("speed")}" popover="manual">${SPEEDS.map(
          (value) => `<button class="menu-item" type="button" role="menuitemradio" aria-checked="${value === 1}" data-speed="${value}" tabindex="-1">${ICONS.check}<span>${value}×</span></button>`,
        ).join("")}</div>`
      : "";
    const volumePopover = volume
      ? `<div class="volume" role="group" aria-label="${getUiText("volume")}" popover="manual"><div class="vol-track"><div class="vol-rail"><div class="vol-fill"></div></div><div class="vol-knob"></div><input class="vol-input" type="range" min="0" max="1" step="0.01" value="1" aria-label="${getUiText("volume")}"></div></div>`
      : "";

    return `
      <div class="player" data-mode="native" data-state="paused" data-ui="shown" data-center="shown"${inline ? " data-inline" : ""} tabindex="0" role="region" aria-label="${escapeAttribute(this._label || getUiText("videoPlayer"))}">
        <video class="media" playsinline preload="metadata"></video>
        <canvas class="lens" aria-hidden="true"></canvas>
        <div class="center">
          ${skip ? `<button class="orb orb--skip" type="button" data-action="back" aria-label="${getUiText("back")}">${ICONS.back}</button>` : ""}
          ${toggle("orb orb--play")}
          ${skip ? `<button class="orb orb--skip" type="button" data-action="forward" aria-label="${getUiText("forward")}">${ICONS.forward}</button>` : ""}
        </div>
        ${this._topMarkup(platform)}
        <div class="bottom">
          <div class="bottom-scrim"></div>
          ${inline ? toggle("ctl") : ""}
          <div class="seek" role="slider" tabindex="0" aria-label="${getUiText("seek")}" aria-valuemin="0" aria-valuemax="0" aria-valuenow="0" aria-valuetext="0:00">
            <div class="track"><div class="buffered"></div><div class="progress"></div><div class="knob-rail"><div class="knob"></div></div></div>
            <div class="hover-line"></div>
            <div class="hover-time"><span class="now">0:00</span><span class="total"> / 0:00</span></div>
          </div>
          ${bar}
        </div>
        ${menu}
        ${volumePopover}
        <div class="tip" aria-hidden="true"></div>
        <div class="notice" hidden><span>${getUiText("loadError")}</span><a href="${escapeAttribute(src)}" target="_blank" rel="noopener">${getUiText("openSource")}</a></div>
      </div>`;
  }

  _setupNative(start) {
    const root = this.shadowRoot;
    const player = root.querySelector(".player");
    const video = player.querySelector("video");
    const $ = (selector) => player.querySelector(selector);
    const $$ = (selector) => Array.from(player.querySelectorAll(selector));
    const listen = this._listen.bind(this);
    const timers = new Set();
    const frames = new Set();
    const later = (callback, delay) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        callback();
      }, delay);
      timers.add(id);
      return id;
    };
    const cancel = (id) => {
      window.clearTimeout(id);
      timers.delete(id);
    };
    const nextFrame = (callback) => {
      const id = requestAnimationFrame((time) => {
        frames.delete(id);
        callback(time);
      });
      frames.add(id);
      return id;
    };

    // ---------- 媒体属性 ----------
    const crossorigin = this.getAttribute("crossorigin");
    if (crossorigin !== null) video.crossOrigin = crossorigin || "anonymous";
    for (const flag of ["loop", "autoplay"]) video[flag] = this.hasAttribute(flag);
    if (this.hasAttribute("muted")) {
      video.muted = true;
      video.defaultMuted = true;
    }
    const poster = this.getAttribute("poster");
    if (poster) video.poster = poster;
    for (const track of this.querySelectorAll("track")) video.append(track.cloneNode(true));
    video.src = this.getAttribute("src");
    if (start) listen(video, "loadedmetadata", () => video.currentTime < 0.1 && (video.currentTime = start), { once: true });

    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    // iOS 上 video.volume 只读（音量归系统管），此时音量按钮只做静音开关、不弹滑块
    const volumeSettable = (() => {
      const before = video.volume;
      video.volume = before === 0.5 ? 0.4 : 0.5;
      const settable = video.volume !== before;
      video.volume = before;
      return settable;
    })();

    // ---------- 控件显隐：播放中 2.2s 无操作隐藏，暂停 / 菜单打开 / 拖动 / 键盘聚焦时常显 ----------
    const ui = { visible: true, hideTimer: 0, menu: false, volume: false, scrubbing: false };
    const onUiChange = [];
    const focusVisibleInside = () => {
      const active = root.activeElement;
      return !!active && active !== player && active.matches(":focus-visible");
    };
    const locked = () => video.paused || video.ended || ui.menu || ui.volume || ui.scrubbing || focusVisibleInside();
    const applyUi = (visible) => {
      if (ui.visible === visible) return;
      ui.visible = visible;
      player.dataset.ui = visible ? "shown" : "hidden";
      player.dataset.center = visible ? "shown" : "hidden";
      for (const orb of $$(".orb")) orb.tabIndex = visible ? 0 : -1;
      for (const callback of onUiChange) callback(visible);
    };
    const scheduleHide = () => {
      cancel(ui.hideTimer);
      if (locked()) return;
      ui.hideTimer = later(() => !locked() && applyUi(false), HIDE_DELAY);
    };
    const reveal = () => {
      applyUi(true);
      scheduleHide();
    };

    // ---------- 播放 / 跳转 ----------
    const togglePlay = () => {
      if (video.paused || video.ended) video.play()?.catch?.(() => {});
      else video.pause();
    };
    const duration = () => (Number.isFinite(video.duration) ? video.duration : 0);
    const seekTo = (ratio) => {
      if (!duration()) return;
      video.currentTime = clamp01(ratio) * duration();
      renderProgress();
    };
    const seekBy = (delta) => {
      const end = duration() || Number.POSITIVE_INFINITY;
      video.currentTime = Math.min(end, Math.max(0, video.currentTime + delta));
      renderProgress();
    };

    // ---------- 进度 ----------
    const seek = $(".seek");
    const hoverTime = $(".hover-time");
    let lastSecond = -1;
    const renderProgress = () => {
      const total = duration();
      player.style.setProperty("--progress", (total ? clamp01(video.currentTime / total) : 0).toFixed(4));
      const second = Math.floor(video.currentTime);
      if (second === lastSecond) return;
      lastSecond = second;
      for (const node of $$(".cur")) node.textContent = formatTime(video.currentTime);
      seek.setAttribute("aria-valuenow", String(second));
      seek.setAttribute("aria-valuetext", getUiText("timeOf", [formatTime(video.currentTime), formatTime(total)]));
    };
    const renderDuration = () => {
      const total = duration();
      for (const node of $$(".dur")) node.textContent = formatTime(total);
      hoverTime.querySelector(".total").textContent = ` / ${formatTime(total)}`;
      seek.setAttribute("aria-valuemax", String(Math.floor(total)));
      lastSecond = -1;
      renderProgress();
    };
    const renderBuffered = () => {
      const total = duration();
      if (!total || !video.buffered.length) return;
      let end = 0;
      for (let index = 0; index < video.buffered.length; index += 1) {
        if (video.buffered.start(index) <= video.currentTime + 0.5) end = Math.max(end, video.buffered.end(index));
      }
      player.style.setProperty("--buffered", clamp01(end / total).toFixed(4));
    };
    // timeupdate 只有约 4Hz，控件可见时改由 rAF 逐帧推进度条（只写一个 CSS 变量，走合成器）
    let progressFrame = 0;
    const progressLoop = () => {
      progressFrame = 0;
      renderProgress();
      if (!video.paused && ui.visible && !document.hidden) progressFrame = nextFrame(progressLoop);
    };
    const kickProgress = () => {
      if (!progressFrame && !video.paused && ui.visible) progressFrame = nextFrame(progressLoop);
    };

    const ratioAt = (clientX) => {
      const rect = seek.getBoundingClientRect();
      return rect.width ? clamp01((clientX - rect.left) / rect.width) : 0;
    };
    const showHover = (ratio) => {
      seek.dataset.hovering = "";
      player.style.setProperty("--hover", ratio.toFixed(4));
      hoverTime.querySelector(".now").textContent = formatTime(ratio * duration());
      const width = seek.clientWidth;
      const half = hoverTime.offsetWidth / 2;
      hoverTime.style.setProperty("--hover-x", `${Math.min(Math.max(ratio * width, half), width - half)}px`);
    };
    listen(seek, "pointerdown", (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      seek.setPointerCapture?.(event.pointerId);
      ui.scrubbing = true;
      player.dataset.scrubbing = "";
      const ratio = ratioAt(event.clientX);
      showHover(ratio);
      seekTo(ratio);
      reveal();
    });
    listen(seek, "pointermove", (event) => {
      if (event.pointerType !== "mouse" && !ui.scrubbing) return;
      const ratio = ratioAt(event.clientX);
      showHover(ratio);
      if (ui.scrubbing) seekTo(ratio);
    });
    const endScrub = (event) => {
      if (!ui.scrubbing) return;
      ui.scrubbing = false;
      delete player.dataset.scrubbing;
      try {
        seek.releasePointerCapture?.(event.pointerId);
      } catch {
        // 指针可能已被释放
      }
      if (event.pointerType !== "mouse") delete seek.dataset.hovering;
      scheduleHide();
    };
    listen(seek, "pointerup", endScrub);
    listen(seek, "pointercancel", endScrub);
    listen(seek, "pointerleave", () => !ui.scrubbing && delete seek.dataset.hovering);

    // ---------- 弹层（速度菜单 / 音量）：Popover API 进顶层，逃出播放器的 overflow 裁剪 ----------
    const supportsPopover = typeof HTMLElement.prototype.showPopover === "function";
    const place = (popover, trigger, align) => {
      if (!popover || !trigger) return;
      const rect = trigger.getBoundingClientRect();
      // 顶层里 fixed 相对视口；无 Popover API 时 fixed 落在播放器（container-type 的布局包含块）里
      const base = supportsPopover ? { left: 0, top: 0 } : player.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      const width = popover.offsetWidth;
      const height = popover.offsetHeight;
      let left = align === "center" ? rect.left + rect.width / 2 - width / 2 : rect.right - width;
      left = Math.max(8, Math.min(left, viewportWidth - width - 8));
      let top = rect.top - 8 - height;
      if (top < 8) top = rect.bottom + 8;
      popover.style.left = `${left - base.left}px`;
      popover.style.top = `${top - base.top}px`;
    };
    const showPopover = (popover, trigger, align) => {
      if (supportsPopover) {
        try {
          popover.showPopover();
        } catch {
          // 已打开或元素不在文档中
        }
      } else {
        popover.dataset.open = "";
      }
      place(popover, trigger, align);
    };
    const hidePopover = (popover) => {
      if (!popover) return;
      if (supportsPopover) {
        try {
          popover.hidePopover();
        } catch {
          // 已关闭
        }
      }
      delete popover.dataset.open;
    };

    // ---------- 提示（悬停控制条按钮时浮在上方，在按钮间移动时平滑滑过去） ----------
    const tip = $(".tip");
    const hideTip = () => delete tip.dataset.show;
    const showTip = (button) => {
      const label = button.getAttribute("aria-label");
      if (!canHover || !label || ui.menu || (ui.volume && button.dataset.action === "mute")) return;
      tip.textContent = label;
      const playerRect = player.getBoundingClientRect();
      const rect = button.getBoundingClientRect();
      const width = tip.offsetWidth;
      const x = Math.max(6, Math.min(rect.left - playerRect.left + rect.width / 2 - width / 2, playerRect.width - width - 6));
      tip.style.setProperty("--tip-x", `${x}px`);
      tip.style.setProperty("--tip-y", `${rect.top - playerRect.top - tip.offsetHeight - 8}px`);
      tip.dataset.show = "";
    };
    for (const button of $$(".bottom .ctl")) {
      listen(button, "pointerenter", (event) => event.pointerType === "mouse" && showTip(button));
      listen(button, "pointerleave", hideTip);
    }

    // ---------- 音量 ----------
    const volumeButton = $('[data-action="mute"]');
    const volumePopover = $(".volume");
    const volumeInput = volumePopover?.querySelector(".vol-input");
    let volumeTimer = 0;
    const renderVolume = () => {
      const level = video.muted ? 0 : video.volume;
      volumePopover?.querySelector(".vol-track").style.setProperty("--vol", level.toFixed(3));
      if (volumeInput) volumeInput.value = String(level);
      if (!volumeButton) return;
      volumeButton.setAttribute("aria-label", getUiText(level === 0 ? "unmute" : "mute"));
      setIcon(volumeButton.querySelector(".swap"), level === 0 ? "volumeMuted" : level < 0.5 ? "volumeLow" : "volumeHigh");
    };
    const toggleMute = () => {
      if (video.muted || video.volume === 0) {
        video.muted = false;
        if (video.volume === 0) video.volume = 0.5;
      } else {
        video.muted = true;
      }
    };
    const openVolume = () => {
      cancel(volumeTimer);
      if (!volumePopover || !volumeSettable || ui.volume) return;
      ui.volume = true;
      hideTip();
      showPopover(volumePopover, volumeButton, "center");
    };
    const closeVolume = () => {
      cancel(volumeTimer);
      if (!ui.volume) return;
      ui.volume = false;
      hidePopover(volumePopover);
      scheduleHide();
    };
    // 离开按钮后留一小段宽限，指针才来得及移进上方的滑块
    const deferCloseVolume = () => {
      cancel(volumeTimer);
      volumeTimer = later(closeVolume, VOLUME_CLOSE_DELAY);
    };
    if (canHover) {
      for (const target of [volumeButton, volumePopover]) {
        listen(target, "pointerenter", openVolume);
        listen(target, "pointerleave", deferCloseVolume);
      }
    }
    listen(volumeInput, "input", () => {
      const level = Number(volumeInput.value);
      video.volume = level;
      video.muted = level === 0;
    });
    listen(video, "volumechange", renderVolume);

    // ---------- 速度菜单 ----------
    const speedButton = $('[data-action="speed"]');
    const menu = $(".menu");
    const items = menu ? Array.from(menu.querySelectorAll(".menu-item")) : [];
    let highlighted = -1;
    const highlight = (index) => {
      highlighted = Math.max(0, Math.min(items.length - 1, index));
      items.forEach((item, position) => item.toggleAttribute("data-highlighted", position === highlighted));
      items[highlighted]?.focus({ preventScroll: true });
    };
    const openMenu = () => {
      if (!menu || ui.menu) return;
      closeVolume();
      hideTip();
      ui.menu = true;
      speedButton.setAttribute("aria-expanded", "true");
      showPopover(menu, speedButton, "end");
      highlight(Math.max(0, SPEEDS.indexOf(video.playbackRate)));
    };
    const closeMenu = (restoreFocus) => {
      if (!ui.menu) return;
      ui.menu = false;
      speedButton.setAttribute("aria-expanded", "false");
      hidePopover(menu);
      for (const item of items) item.removeAttribute("data-highlighted");
      if (restoreFocus) speedButton.focus({ preventScroll: true });
      scheduleHide();
    };
    const renderSpeed = () => {
      const rate = video.playbackRate;
      if (speedButton) speedButton.textContent = `${rate}×`;
      for (const item of items) item.setAttribute("aria-checked", String(Number(item.dataset.speed) === rate));
    };
    listen(menu, "click", (event) => {
      const item = event.target.closest?.("[data-speed]");
      if (!item) return;
      video.playbackRate = Number(item.dataset.speed);
      closeMenu(true);
    });
    listen(menu, "pointermove", (event) => {
      const item = event.target.closest?.("[data-speed]");
      if (item && items.indexOf(item) !== highlighted) highlight(items.indexOf(item));
    });
    listen(video, "ratechange", renderSpeed);

    // 点击弹层与触发按钮以外的地方关闭；滚动时直接收起，不追着触发按钮跑
    listen(
      document,
      "pointerdown",
      (event) => {
        const path = event.composedPath();
        if (ui.menu && !path.includes(menu) && !path.includes(speedButton)) closeMenu(false);
        if (ui.volume && !path.includes(volumePopover) && !path.includes(volumeButton)) closeVolume();
      },
      true,
    );
    listen(window, "resize", () => {
      if (ui.menu) place(menu, speedButton, "end");
      if (ui.volume) place(volumePopover, volumeButton, "center");
    });
    listen(
      window,
      "scroll",
      () => {
        if (ui.menu) closeMenu(false);
        if (ui.volume) closeVolume();
      },
      { capture: true, passive: true },
    );

    // ---------- 字幕 / 画中画 / 全屏 ----------
    const captionsButton = $('[data-action="captions"]');
    let captionsOn = !!this.querySelector("track[default]");
    const renderCaptions = () => {
      const tracks = video.textTracks;
      for (let index = 0; index < tracks.length; index += 1) tracks[index].mode = captionsOn && index === 0 ? "showing" : "hidden";
      captionsButton?.setAttribute("aria-pressed", String(captionsOn));
      captionsButton?.setAttribute("aria-label", getUiText(captionsOn ? "captionsOff" : "captionsOn"));
    };
    const toggleCaptions = () => {
      captionsOn = !captionsOn;
      renderCaptions();
    };

    const pipButton = $('[data-action="pip"]');
    if (pipButton && document.pictureInPictureEnabled && !video.disablePictureInPicture) pipButton.hidden = false;
    const renderPip = (active) => {
      if (!pipButton) return;
      pipButton.setAttribute("aria-pressed", String(active));
      pipButton.setAttribute("aria-label", getUiText(active ? "exitPip" : "pip"));
      setIcon(pipButton.querySelector(".swap"), active ? "pipExit" : "pip");
    };
    const togglePip = async () => {
      try {
        if (document.pictureInPictureElement === video) await document.exitPictureInPicture();
        else await video.requestPictureInPicture();
      } catch {
        // 浏览器可能拒绝（例如尚无画面）
      }
    };
    listen(video, "enterpictureinpicture", () => renderPip(true));
    listen(video, "leavepictureinpicture", () => renderPip(false));

    const fullscreenButton = $('[data-action="fullscreen"]');
    const isFullscreen = () => document.fullscreenElement === this || document.webkitFullscreenElement === this;
    const toggleFullscreen = async () => {
      if (isFullscreen()) {
        (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
        return;
      }
      const request = player.requestFullscreen || player.webkitRequestFullscreen;
      if (request) {
        try {
          await request.call(player);
          return;
        } catch {
          // 退回 iPhone Safari 的 video 原生全屏
        }
      }
      try {
        video.webkitEnterFullscreen?.();
      } catch {
        // 浏览器拒绝全屏
      }
    };
    const renderFullscreen = () => {
      const active = isFullscreen();
      fullscreenButton?.setAttribute("aria-label", getUiText(active ? "exitFullscreen" : "fullscreen"));
      setIcon(fullscreenButton?.querySelector(".swap"), active ? "fullscreenExit" : "fullscreen");
    };
    listen(document, "fullscreenchange", renderFullscreen);
    listen(document, "webkitfullscreenchange", renderFullscreen);

    // ---------- 按钮 / 键盘 ----------
    listen(player, "click", (event) => {
      const button = event.target.closest?.("[data-action]");
      if (!button) return;
      switch (button.dataset.action) {
        case "toggle":
          togglePlay();
          break;
        case "back":
          seekBy(-SKIP_SECONDS);
          break;
        case "forward":
          seekBy(SKIP_SECONDS);
          break;
        case "mute":
          if (canHover || !volumeSettable) toggleMute();
          else if (ui.volume) closeVolume();
          else openVolume();
          break;
        case "captions":
          toggleCaptions();
          break;
        case "speed":
          if (ui.menu) closeMenu(false);
          else openMenu();
          break;
        case "pip":
          togglePip();
          break;
        case "fullscreen":
          toggleFullscreen();
          break;
        default:
          return;
      }
      if (tip.dataset.show !== undefined) showTip(button);
      reveal();
    });

    // 鼠标点画面切换播放、双击全屏；触屏点画面只切换控件显隐（与系统播放器一致）
    let pointerType = "mouse";
    listen(player, "pointerdown", (event) => (pointerType = event.pointerType), true);
    listen(video, "click", () => {
      if (pointerType === "mouse") {
        togglePlay();
        reveal();
      } else if (ui.visible && !video.paused) {
        cancel(ui.hideTimer);
        applyUi(false);
      } else {
        reveal();
      }
    });
    listen(video, "dblclick", () => pointerType === "mouse" && toggleFullscreen());
    listen(player, "pointermove", (event) => event.pointerType === "mouse" && reveal());
    listen(player, "pointerleave", (event) => {
      if (event.pointerType === "mouse" && !locked()) {
        cancel(ui.hideTimer);
        applyUi(false);
      }
    });
    listen(player, "focusin", reveal);

    const onMenuKey = (event) => {
      switch (event.key) {
        case "ArrowDown":
          highlight(highlighted + 1);
          break;
        case "ArrowUp":
          highlight(highlighted - 1);
          break;
        case "Home":
          highlight(0);
          break;
        case "End":
          highlight(items.length - 1);
          break;
        case "Enter":
        case " ":
          if (items[highlighted]) video.playbackRate = Number(items[highlighted].dataset.speed);
          closeMenu(true);
          break;
        case "Escape":
        case "Tab":
          closeMenu(true);
          break;
        default:
          return false;
      }
      return true;
    };
    listen(player, "keydown", (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.composedPath()[0];
      if (target?.classList?.contains("vol-input")) return;
      if (ui.menu) {
        if (onMenuKey(event)) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }
      const onControl = !!target?.closest?.("button, a");
      switch (event.key) {
        case " ":
          if (onControl) return;
          togglePlay();
          break;
        case "k":
        case "K":
          togglePlay();
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        case "f":
        case "F":
          toggleFullscreen();
          break;
        case "c":
        case "C":
          if (!captionsButton) return;
          toggleCaptions();
          break;
        case "ArrowLeft":
          seekBy(-5);
          break;
        case "ArrowRight":
          seekBy(5);
          break;
        case "j":
        case "J":
          seekBy(-SKIP_SECONDS);
          break;
        case "l":
        case "L":
          seekBy(SKIP_SECONDS);
          break;
        case "ArrowUp":
        case "ArrowDown":
          if (!volumeSettable) return;
          video.muted = false;
          video.volume = clamp01(video.volume + (event.key === "ArrowUp" ? 0.05 : -0.05));
          break;
        case "Home":
          seekTo(0);
          break;
        case "End":
          seekTo(1);
          break;
        case "Escape":
          if (!ui.volume) return;
          closeVolume();
          break;
        default:
          if (!/^[0-9]$/.test(event.key)) return;
          seekTo(Number(event.key) / 10);
      }
      event.preventDefault();
      event.stopPropagation();
      reveal();
    });

    // ---------- 玻璃按钮：弹簧驱动悬停 / 按压，缩放与 WebGL 透镜读同一组数值 ----------
    const canvas = $(".lens");
    const orbs = $$(".orb").map((element) => ({
      element,
      hover: { value: 0, velocity: 0, target: 0 },
      press: { value: 0, velocity: 0, target: 0 },
      cx: 0,
      cy: 0,
      radius: 0,
      px: 0,
      py: 0,
    }));
    const box = { left: 0, top: 0, width: 0, height: 0 };
    const orbScale = (orb) => 1 + orb.hover.value * 0.03 + orb.press.value * 0.08;

    let lens = null;
    let lensState = "idle";
    let frameDirty = true;
    let hasPlayed = false;
    let frameWatch = null;
    let springFrame = 0;
    let lastSpringTime = 0;

    const scene = () => {
      const width = player.clientWidth;
      const height = player.clientHeight;
      const videoWidth = video.videoWidth || 16;
      const videoHeight = video.videoHeight || 9;
      const scale = Math.min(width / videoWidth, height / videoHeight);
      const contentWidth = videoWidth * scale;
      const contentHeight = videoHeight * scale;
      return {
        width: box.width,
        height: box.height,
        dpr: Math.min(2, window.devicePixelRatio || 1),
        origin: [box.left, box.top],
        video: [(width - contentWidth) / 2, (height - contentHeight) / 2, contentWidth, contentHeight],
        orbs: orbs.map((orb) => ({
          x: orb.cx - box.left,
          y: orb.cy - box.top,
          r: orb.radius * orbScale(orb),
          press: clamp01(orb.press.value),
          hover: clamp01(orb.hover.value),
          px: orb.px - box.left,
          py: orb.py - box.top,
        })),
      };
    };

    const renderLens = () => {
      if (lensState !== "live" || !ui.visible) return;
      if (frameDirty) {
        if (!lens.upload(video)) {
          stopLens();
          return;
        }
        frameDirty = false;
      }
      lens.draw(scene());
    };

    // 画布只盖住按钮簇（外扩一圈留给投影与按压胀大），不铺满整个播放器
    const measureLens = () => {
      if (!orbs.length) return;
      let minX = Number.POSITIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      for (const orb of orbs) {
        const { element } = orb;
        orb.radius = element.offsetWidth / 2;
        orb.cx = element.offsetLeft + orb.radius;
        orb.cy = element.offsetTop + element.offsetHeight / 2;
        minX = Math.min(minX, orb.cx - orb.radius);
        minY = Math.min(minY, orb.cy - orb.radius);
        maxX = Math.max(maxX, orb.cx + orb.radius);
        maxY = Math.max(maxY, orb.cy + orb.radius);
      }
      const pad = 28;
      box.left = Math.floor(minX - pad);
      box.top = Math.floor(minY - pad);
      box.width = Math.ceil(maxX - minX + pad * 2);
      box.height = Math.ceil(maxY - minY + pad * 2);
      Object.assign(canvas.style, { left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` });
      renderLens();
    };

    const stopWatchingFrames = () => {
      if (!frameWatch) return;
      if (frameWatch.kind === "video") video.cancelVideoFrameCallback?.(frameWatch.id);
      else cancelAnimationFrame(frameWatch.id);
      frames.delete(frameWatch.id);
      frameWatch = null;
    };
    // 播放中且按钮可见时，逐个新视频帧重绘（requestVideoFrameCallback 只在真有新帧时回调）
    const watchFrames = () => {
      if (frameWatch || lensState !== "live" || video.paused || !ui.visible) return;
      const onFrame = () => {
        frameWatch = null;
        frameDirty = true;
        renderLens();
        watchFrames();
      };
      if (typeof video.requestVideoFrameCallback === "function") frameWatch = { kind: "video", id: video.requestVideoFrameCallback(onFrame) };
      else frameWatch = { kind: "frame", id: nextFrame(onFrame) };
    };

    const stopLens = () => {
      lensState = "off";
      stopWatchingFrames();
      lens?.destroy();
      lens = null;
      delete player.dataset.lens;
    };

    // 透镜只在「画面上真有这一帧」时启用：有 poster 的视频播放前显示的是封面，
    // 着色器拿到的却是第一帧，两者对不上，这段时间保留 CSS 玻璃
    const startLens = async () => {
      if (lensState !== "idle" || !orbs.length) return;
      if (typeof WebGL2RenderingContext === "undefined" || window.matchMedia("(prefers-reduced-transparency: reduce)").matches) {
        lensState = "off";
        return;
      }
      if ((video.poster && !hasPlayed) || video.readyState < 2) return;
      lensState = "pending";
      try {
        const { createVideoLens } = await import("./video-lens.js");
        if (lensState !== "pending" || !this.isConnected) return;
        lens = createVideoLens(canvas, { onLost: stopLens });
        if (!lens?.upload(video)) throw new Error("video-lens unavailable");
        frameDirty = false;
        lensState = "live";
        player.dataset.lens = "webgl";
        measureLens();
        watchFrames();
      } catch {
        stopLens();
      }
    };

    const animateSprings = (time) => {
      const dt = lastSpringTime ? Math.min(0.032, (time - lastSpringTime) / 1000) : 1 / 60;
      lastSpringTime = time;
      let moving = false;
      for (const orb of orbs) {
        moving = stepSpring(orb.hover, dt) || moving;
        moving = stepSpring(orb.press, dt) || moving;
        orb.element.style.scale = orbScale(orb).toFixed(4);
      }
      renderLens();
      springFrame = moving ? nextFrame(animateSprings) : 0;
      if (!moving) lastSpringTime = 0;
    };
    const kickSprings = () => {
      if (!springFrame) springFrame = nextFrame(animateSprings);
    };
    for (const orb of orbs) {
      const { element } = orb;
      const track = (event) => {
        const rect = player.getBoundingClientRect();
        orb.px = event.clientX - rect.left;
        orb.py = event.clientY - rect.top;
      };
      listen(element, "pointerenter", (event) => {
        track(event);
        if (event.pointerType !== "mouse") return;
        orb.hover.target = 1;
        kickSprings();
      });
      listen(element, "pointermove", (event) => {
        track(event);
        if (lensState === "live" && orb.press.value > 0.01) kickSprings();
      });
      listen(element, "pointerdown", (event) => {
        track(event);
        orb.press.target = 1;
        kickSprings();
      });
      for (const type of ["pointerup", "pointercancel", "pointerleave"]) {
        listen(element, type, () => {
          orb.press.target = 0;
          if (type === "pointerleave") orb.hover.target = 0;
          kickSprings();
        });
      }
    }

    onUiChange.push((visible) => {
      if (visible) {
        frameDirty = true;
        renderLens();
        watchFrames();
        kickProgress();
      } else {
        stopWatchingFrames();
        hideTip();
      }
    });

    // ---------- 媒体事件 ----------
    const renderState = () => {
      const playing = !video.paused && !video.ended;
      player.dataset.state = playing ? "playing" : "paused";
      for (const button of $$('[data-action="toggle"]')) {
        button.setAttribute("aria-label", getUiText(playing ? "pause" : "play"));
        setIcon(button.querySelector(".swap"), playing ? "pause" : "play");
      }
      if (playing) {
        scheduleHide();
        kickProgress();
        watchFrames();
      } else {
        cancel(ui.hideTimer);
        applyUi(true);
        stopWatchingFrames();
        frameDirty = true;
        renderLens();
      }
    };
    for (const type of ["play", "pause", "ended"]) listen(video, type, renderState);
    listen(video, "playing", () => {
      hasPlayed = true;
      startLens();
    });
    listen(video, "loadeddata", startLens);
    listen(video, "loadedmetadata", () => {
      renderDuration();
      renderCaptions();
      measureLens();
    });
    listen(video, "durationchange", renderDuration);
    listen(video, "timeupdate", () => !progressFrame && renderProgress());
    listen(video, "progress", renderBuffered);
    listen(video, "seeked", () => {
      renderBuffered();
      frameDirty = true;
      renderLens();
    });
    listen(video, "error", () => {
      $(".notice").hidden = false;
      applyUi(false);
    });

    const resizeObserver = new ResizeObserver(() => measureLens());
    resizeObserver.observe(player);
    registerGlassLens($$(".orb, .pill"));

    renderState();
    renderVolume();
    renderSpeed();
    renderDuration();
    renderCaptions();

    this._cleanups.push(() => {
      resizeObserver.disconnect();
      for (const id of timers) window.clearTimeout(id);
      for (const id of frames) cancelAnimationFrame(id);
      stopWatchingFrames();
      lens?.destroy();
      lens = null;
      lensState = "off";
      hidePopover(menu);
      hidePopover(volumePopover);
      // 移出文档时释放解码器与网络连接
      video.pause();
      video.removeAttribute("src");
      video.load();
    });
  }

  // #endregion
}

if (!customElements.get("video-player")) {
  customElements.define("video-player", VideoPlayer);
}

export { VideoPlayer };

// #endregion
