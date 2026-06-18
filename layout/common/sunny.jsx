const { Component } = require("../../include/util/common");

function escapeHtmlAttribute(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getSunnyInlineScript(url_for) {
  const mp4Url = typeof url_for === "function" ? url_for("/media/leaves.mp4") : "/media/leaves.mp4";
  const markup = `<div class="gnix-sunny-atmosphere" aria-hidden="true"><div class="gnix-sunny-glow"></div><video class="gnix-sunny-leaves" autoplay loop muted playsinline preload="auto"><source src="${escapeHtmlAttribute(mp4Url)}" type="video/mp4"></video></div>`;

  return `
(function() {
  var html = document.documentElement;
  if (!html) return;
  if (html.dataset.theme !== "sunny") {
    var activateWhenSunny = function() {
      if (html.dataset.theme !== "sunny") return;
      window.removeEventListener("gnix:theme-change", activateWhenSunny);
      startSunny();
    };
    window.addEventListener("gnix:theme-change", activateWhenSunny);
    return;
  }
  startSunny();

  function startSunny() {
    var boot = window.__gnixSunnyBoot || {};
    var markup = ${JSON.stringify(markup)};
    var video = null;

    function isSunny() {
      return html && html.dataset.theme === "sunny";
    }

    function prefersReducedMotion() {
      return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }

    function clearBoot() {
      if (boot && typeof boot.clear === "function") {
        boot.clear();
        return;
      }
      html.classList.remove("gnix-sunny-booting");
    }

    function markReady() {
      if (!video) return;
      video.classList.add("is-ready");
      clearBoot();
    }

    function clearWhenReady() {
      if (!video) return;
      if (!isSunny() || prefersReducedMotion()) {
        clearBoot();
        return;
      }
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        markReady();
        return;
      }
      video.addEventListener("loadeddata", markReady, { once: true });
      video.addEventListener("canplay", markReady, { once: true });
    }

    function syncVideo() {
      if (!video) return;
      if (isSunny() && !prefersReducedMotion()) {
        var playback = video.play && video.play();
        if (playback && typeof playback.catch === "function") playback.catch(function() {});
        clearWhenReady();
      } else {
        if (video.pause) video.pause();
        clearBoot();
      }
    }

    function bindVideo() {
      video = document.querySelector(".gnix-sunny-leaves");
      if (!video || video.dataset.sunnyBound === "true") return;
      video.dataset.sunnyBound = "true";
      video.addEventListener("loadeddata", markReady, { once: true });
      video.addEventListener("canplay", markReady, { once: true });
      syncVideo();
    }

    function insertAtmosphere() {
      if (document.querySelector(".gnix-sunny-atmosphere")) return;
      if (document.currentScript && document.readyState === "loading") {
        document.write(markup);
        return;
      }
      if (!document.body) return;
      document.body.insertAdjacentHTML("afterbegin", markup);
    }

    function ensureSunny() {
      if (!isSunny()) {
        syncVideo();
        return;
      }
      insertAtmosphere();
      if (document.readyState === "loading") {
        setTimeout(bindVideo, 0);
        document.addEventListener("DOMContentLoaded", bindVideo, { once: true });
      } else {
        bindVideo();
      }
    }

    ensureSunny();
    window.addEventListener("gnix:theme-change", ensureSunny);
    document.addEventListener("gnix:content-ready", ensureSunny);
  }
})();`;
}

// Sunny mirrors dany.works with a multiply-blended full-screen movie, but the
// video DOM is created only when the resolved theme is Sunny.
module.exports = class extends Component {
  render() {
    const { helper } = this.props;
    const url_for = typeof helper.url_for === "function" ? helper.url_for : (value) => value;

    return <script dangerouslySetInnerHTML={{ __html: getSunnyInlineScript(url_for) }}></script>;
  }
};
