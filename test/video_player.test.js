const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const modulePath = path.join(__dirname, "../source/js/components/video-player.js");
const source = fs
  .readFileSync(modulePath, "utf8")
  .replace(/^export \{ VideoPlayer \};\s*$/m, "")
  .replace(/^export (function|const|let|class) /gm, "$1 ");

function load(lang = "en") {
  const escape = (value) => String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const defined = new Map();
  const context = {
    URL,
    URLSearchParams,
    document: {
      documentElement: { lang },
      createElement: () => ({
        set textContent(value) {
          this.text = value;
        },
        get innerHTML() {
          return escape(this.text);
        },
      }),
    },
    HTMLElement: class {},
    customElements: { get: (name) => defined.get(name), define: (name, element) => defined.set(name, element) },
  };
  const api = vm.runInNewContext(`${source}\n({ formatTime, parseTime, parseYouTube, parseBilibili, resolveEmbed, getUiText, VideoPlayer });`, context, { filename: modulePath });
  return { ...api, defined };
}

const api = load();

test("registers the custom element exactly once", () => {
  assert.equal(api.defined.get("video-player"), api.VideoPlayer);
});

test("time parsing accepts seconds, clock and unit notations", () => {
  assert.equal(api.parseTime("90"), 90);
  assert.equal(api.parseTime("90s"), 90);
  assert.equal(api.parseTime("1m30s"), 90);
  assert.equal(api.parseTime("1h2m3s"), 3723);
  assert.equal(api.parseTime("1:30"), 90);
  assert.equal(api.parseTime("1:02:03"), 3723);
  assert.equal(api.parseTime(""), 0);
  assert.equal(api.parseTime("soon"), 0);
  assert.equal(api.formatTime(65), "1:05");
  assert.equal(api.formatTime(3725), "1:02:05");
  assert.equal(api.formatTime(Number.NaN), "0:00");
});

test("YouTube ids come from bare ids and every common link shape", () => {
  assert.deepEqual({ ...api.parseYouTube("0MS8mGdsLoI") }, { id: "0MS8mGdsLoI", start: 0 });
  assert.equal(api.parseYouTube("https://www.youtube.com/embed/0MS8mGdsLoI?si=M4BHLP8msSaeUoue").id, "0MS8mGdsLoI");
  assert.deepEqual({ ...api.parseYouTube("https://youtu.be/0MS8mGdsLoI?t=90") }, { id: "0MS8mGdsLoI", start: 90 });
  assert.deepEqual({ ...api.parseYouTube("https://www.youtube.com/watch?v=gXNaHYEOoQ8&t=1m30s") }, { id: "gXNaHYEOoQ8", start: 90 });
  assert.equal(api.parseYouTube("https://www.youtube.com/shorts/abcdEFGH123").id, "abcdEFGH123");
  assert.equal(api.parseYouTube("//www.youtube-nocookie.com/embed/0MS8mGdsLoI").id, "0MS8mGdsLoI");
  assert.equal(api.parseYouTube("https://example.com/watch?v=0MS8mGdsLoI"), null);
  assert.equal(api.parseYouTube(""), null);
});

test("Bilibili ids come from BV / av numbers, video pages and the outside player", () => {
  assert.deepEqual({ ...api.parseBilibili("BV1GJ411x7h7") }, { bvid: "BV1GJ411x7h7", page: 1, start: 0 });
  assert.deepEqual({ ...api.parseBilibili("av170001") }, { aid: "170001", page: 1, start: 0 });
  assert.deepEqual({ ...api.parseBilibili("//player.bilibili.com/player.html?isOutside=true&aid=12&bvid=BV1GJ411x7h7&cid=34&p=2") }, { bvid: "BV1GJ411x7h7", page: 2, start: 0 });
  assert.deepEqual({ ...api.parseBilibili("https://www.bilibili.com/video/BV1GJ411x7h7/?p=3&t=42") }, { bvid: "BV1GJ411x7h7", page: 3, start: 42 });
  assert.deepEqual({ ...api.parseBilibili("https://www.bilibili.com/video/av170001?t=12") }, { aid: "170001", page: 1, start: 12 });
  assert.equal(api.parseBilibili("https://b23.tv/abc"), null);
  assert.equal(api.parseBilibili("BV123"), null);
});

test("embed targets keep start time and page, and the facade never needs third-party script", () => {
  const youtube = api.resolveEmbed("youtube", { id: "0MS8mGdsLoI", start: 0 }, 90);
  assert.equal(youtube.embedUrl, "https://www.youtube-nocookie.com/embed/0MS8mGdsLoI?autoplay=1&playsinline=1&rel=0&start=90");
  assert.equal(youtube.watchUrl, "https://www.youtube.com/watch?v=0MS8mGdsLoI&t=90s");
  assert.equal(youtube.posters[0], "https://i.ytimg.com/vi/0MS8mGdsLoI/maxresdefault.jpg");
  assert.equal(youtube.posters.at(-1), "https://i.ytimg.com/vi/0MS8mGdsLoI/hqdefault.jpg");

  const bilibili = api.resolveEmbed("bilibili", { bvid: "BV1GJ411x7h7", page: 2, start: 0 });
  const embed = new URL(bilibili.embedUrl);
  assert.equal(embed.origin, "https://player.bilibili.com");
  assert.equal(embed.searchParams.get("bvid"), "BV1GJ411x7h7");
  assert.equal(embed.searchParams.get("p"), "2");
  assert.equal(embed.searchParams.get("autoplay"), "1");
  assert.equal(embed.searchParams.has("t"), false);
  assert.equal(bilibili.watchUrl, "https://www.bilibili.com/video/BV1GJ411x7h7/?p=2");
  assert.equal(api.resolveEmbed("bilibili", { aid: "170001", page: 1, start: 12 }).watchUrl, "https://www.bilibili.com/video/av170001/?t=12");
  assert.deepEqual([...bilibili.posters], []);
});

test("UI strings are localized and never throw for keys without a value", () => {
  const zh = load("zh-CN");
  assert.equal(api.getUiText("play"), "Play");
  assert.equal(zh.getUiText("play"), "播放");
  assert.equal(api.getUiText("timeOf", ["0:10", "3:52"]), "0:10 of 3:52");
  assert.equal(zh.getUiText("watchOnBilibili"), "在哔哩哔哩观看");
  assert.equal(api.getUiText("back"), "Back 10 seconds");
});
