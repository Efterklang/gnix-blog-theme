!(() => {
  const TYPES = ["site_pv", "site_uv", "page_pv", "page_uv"];
  const PAGE_TYPES = ["page_pv", "page_uv"];
  const STORAGE_KEY = "bsz-id";
  const API = "https://bsz.dusays.com:9001/api";
  const BASE = { site_pv: 12801, site_uv: 2450 };

  const getPagePathVariants = () => {
    const path = location.pathname || "/";
    let base = path;

    if (path.endsWith("/index.html")) {
      base = path.slice(0, -"/index.html".length) || "/";
    } else if (path !== "/" && path.endsWith("/")) {
      base = path.slice(0, -1);
    } else if (/\/[^/]+\.[^/]+$/.test(path)) {
      return [path];
    }

    if (base === "/") return ["/", "/index.html"];
    return [base, `${base}/`, `${base}/index.html`];
  };

  const toReferer = (path) => `${location.origin}${path}`;

  const unique = (values) => [...new Set(values)];

  const request = (method, referer) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, API, true);

      const token = localStorage.getItem(STORAGE_KEY);
      token && xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.setRequestHeader("x-bsz-referer", referer);

      xhr.onload = () => {
        if (xhr.status !== 200) {
          reject(new Error(`Busuanzi responded with ${xhr.status}`));
          return;
        }

        let response;
        try {
          response = JSON.parse(xhr.responseText);
        } catch (error) {
          reject(error);
          return;
        }

        const { success, data } = response;
        if (!success) {
          reject(new Error("Busuanzi request failed"));
          return;
        }

        const newToken = xhr.getResponseHeader("Set-Bsz-Identity");
        if (newToken) localStorage.setItem(STORAGE_KEY, newToken);

        resolve(data || {});
      };
      xhr.onerror = () => reject(new Error("Busuanzi request failed"));
      xhr.send();
    });

  const render = (data) => {
    TYPES.forEach((type) => {
      const el = document.getElementById(`busuanzi_${type}`);
      if (el) el.innerHTML = (BASE[type] || 0) + (data[type] || 0);

      const container = document.getElementById(`busuanzi_container_${type}`);
      if (container) container.style.display = "inline";
    });
  };

  const update = () => {
    request("POST", location.href)
      .then((data) => {
        const currentPath = location.pathname || "/";
        const referers = unique(getPagePathVariants().map(toReferer)).filter((referer) => new URL(referer).pathname !== currentPath);
        if (!referers.length) return data;

        return Promise.all(referers.map((referer) => request("GET", referer).catch(() => null))).then((results) => {
          const merged = { ...data };

          results.forEach((result) => {
            if (!result) return;
            PAGE_TYPES.forEach((type) => {
              merged[type] = (merged[type] || 0) + (result[type] || 0);
            });
          });

          return merged;
        });
      })
      .then(render)
      .catch(() => {});
  };

  update();
})();
