!(() => {
  const TYPES = ["site_pv", "site_uv", "page_pv", "page_uv"];
  const script = document.currentScript;
  const api =
    script.getAttribute("data-api") || "https://bsz.dusays.com:9001/api";
  const STORAGE_KEY = "bsz-id";
  const BASE = { site_pv: 12801, site_uv: 2450 };

  const update = () => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", api, true);

    const token = localStorage.getItem(STORAGE_KEY);
    token && xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("x-bsz-referer", location.href);

    xhr.onload = () => {
      if (xhr.status !== 200) return;
      const { success, data } = JSON.parse(xhr.responseText);
      if (!success) return;

      TYPES.forEach((type) => {
        const el = document.getElementById(`busuanzi_${type}`);
        if (el) el.innerHTML = (BASE[type] || 0) + (data[type] || 0);

        const container = document.getElementById(`busuanzi_container_${type}`);
        if (container) container.style.display = "inline";
      });

      const newToken = xhr.getResponseHeader("Set-Bsz-Identity");
      if (newToken) localStorage.setItem(STORAGE_KEY, newToken);
    };
    xhr.send();
  };

  update();

  if (script.hasAttribute("pjax")) {
    const pushState = history.pushState;
    history.pushState = function (...args) {
      pushState.apply(this, ...args);
      update();
    };
    addEventListener("popstate", update);
  }
})();
