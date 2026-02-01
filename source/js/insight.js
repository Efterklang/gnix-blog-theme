// biome-ignore lint/correctness/noUnusedVariables: Called in other files
function loadInsight(config, translation) {
  const main = document.querySelector(".searchbox");
  if (!main) return;

  const input = main.querySelector(".searchbox-input");
  const container = main.querySelector(".searchbox-body");

  // 状态管理
  let dataset = null; // 缓存 JSON 数据
  let isLoading = false; // 加载锁
  let searchTimer = null; // 防抖定时器

  // 辅助：创建 DOM
  function createElement(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }

  function section(title) {
    const sectionEl = createElement("section", "searchbox-result-section");
    const header = createElement("header", "", title);
    sectionEl.appendChild(header);
    return sectionEl;
  }

  // --- 核心逻辑优化区 ---

  // HTML 转义函数，防止 XSS 攻击和标签渲染异常
  function escapeHTML(str) {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return str.replace(/[&<>"']/g, (m) => map[m]);
  }

  // 优化点：合并 ranges 的逻辑保持不变，这是高亮的核心算法
  function merge(ranges) {
    let last;
    const result = [];
    ranges.forEach((r) => {
      if (!last || r[0] > last[1]) {
        result.push((last = r));
      } else if (r[1] > last[1]) {
        last[1] = r[1];
      }
    });
    return result;
  }

  function findAndHighlight(text, matches, maxlen) {
    if (!Array.isArray(matches) || !matches.length || !text) {
      return maxlen ? escapeHTML(text.slice(0, maxlen)) : escapeHTML(text);
    }
    const testText = text.toLowerCase();

    // 性能优化：直接搜索索引，不再 map 后 filter
    const indices = [];
    for (const match of matches) {
      const index = testText.indexOf(match.toLowerCase());
      if (match && index !== -1) {
        indices.push([index, index + match.length]);
      }
    }

    // 排序
    indices.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

    if (!indices.length) return maxlen ? escapeHTML(text.slice(0, maxlen)) : escapeHTML(text);

    let result = "";
    let last = 0;
    const ranges = merge(indices);
    const sumRange = [ranges[0][0], ranges[ranges.length - 1][1]];

    if (maxlen && maxlen < sumRange[1]) {
      last = sumRange[0];
    }

    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      result += escapeHTML(text.slice(last, Math.min(range[0], sumRange[0] + maxlen)));
      if (maxlen && range[0] >= sumRange[0] + maxlen) break;

      result += `<span style="color: var(--mauve)">${escapeHTML(text.slice(range[0], range[1]))}</span>`;
      last = range[1];

      if (i === ranges.length - 1) {
        if (maxlen) {
          result += escapeHTML(text.slice(range[1], Math.min(text.length, sumRange[0] + maxlen + 1)));
        } else {
          result += escapeHTML(text.slice(range[1]));
        }
      }
    }
    return result;
  }

  function searchItem(title, preview, url) {
    title = title || translation.untitled;
    return `<a class="searchbox-result-item" href="${url}">
            <span class="searchbox-result-content">
                <span class="searchbox-result-title">${title}</span>
                ${preview ? `<span class="searchbox-result-preview">${preview}</span>` : ""}
            </span>
        </a>`;
  }

  function sectionFactory(keywords, type, array) {
    if (array.length === 0) return null;
    const sectionTitle = translation[type.toLowerCase()];

    // 优化点：使用 DocumentFragment 并不完全适用这里因为我们返回的是 element
    // 但我们可以用 map + join 一次性生成 HTML 字符串
    const isPostOrPage = type === "POSTS" || type === "PAGES";

    const itemsHTML = array
      .map((item) => {
        if (isPostOrPage) {
          const text = findAndHighlight(item.text, keywords, 100);
          return searchItem(item.title, text, item.link);
        } else {
          // Tags
          const name = findAndHighlight(item.name, keywords);
          return searchItem(name, null, item.link);
        }
      })
      .join("");

    const sectionEl = section(sectionTitle);
    sectionEl.classList.add(`searchbox-result-section--${type.toLowerCase()}`);
    sectionEl.insertAdjacentHTML("beforeend", itemsHTML);
    return sectionEl;
  }

  function parseKeywords(keywords) {
    return keywords
      .split(" ")
      .filter((k) => !!k)
      .map((k) => k.toLowerCase());
  }

  /**
   *
   * @param {{posts: Array, tags: Array}} json: dataset generatored from content.json
   * @param {string} keywordsStr: user input keywords string
   * @returns
   */
  function search(json, keywordsStr) {
    const keywords = parseKeywords(keywordsStr);
    if (keywords.length === 0) return {};

    // 把keywords中的特殊字符转义, 将转移后的关键词编译为正则表达式(忽略大小写，全局，多行)
    // 后续在文章内容匹配时使用
    const keywordRegexes = keywords.map((k) => new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "img"));

    const calculateWeight = (obj, fields, weights) => {
      let value = 0;

      // 检查所有关键词
      for (let i = 0; i < keywords.length; i++) {
        const keyword = keywords[i];
        const regex = keywordRegexes[i];
        let keywordInFields = false;

        for (let j = 0; j < fields.length; j++) {
          const field = fields[j];
          if (!obj[field]) continue;

          // 1. 快速检查：如果都不包含这个词，直接跳过正则
          if (obj[field].toLowerCase().indexOf(keyword) === -1) continue;

          // 2. 权重计算
          const matches = obj[field].match(regex);
          if (matches) {
            value += matches.length * weights[j];
            keywordInFields = true;
          }
        }

        // 如果这个关键词在任何字段都没出现，那这个对象就不符合“包含所有关键词”的逻辑
        // 原逻辑是 filter 必须包含所有关键词，这里保持一致
        if (!keywordInFields) return 0;
      }
      return value;
    };

    // 通用搜索器
    const executeSearch = (list, fields, weights) => {
      const results = [];
      for (const item of list) {
        const w = calculateWeight(item, fields, weights);
        if (w > 0) {
          results.push({ item, weight: w });
        }
      }
      // 排序返回全部结果（由 CSS 控制显示高度和滚动）
      return results.sort((a, b) => b.weight - a.weight).map((r) => r.item);
    };

    return {
      posts: executeSearch(json.posts, ["title", "text"], [3, 1]),
      tags: executeSearch(json.tags, ["name", "slug"], [1, 1]),
    };
  }

  function searchResultToDOM(keywords, searchResult) {
    container.innerHTML = "";
    const fragment = document.createDocumentFragment(); // 使用 Fragment 减少重排

    for (const key in searchResult) {
      const sectionNode = sectionFactory(parseKeywords(keywords), key.toUpperCase(), searchResult[key]);
      if (sectionNode) {
        fragment.appendChild(sectionNode);
      }
    }
    container.appendChild(fragment);
  }

  function scrollTo(item) {
    if (!item) return;
    // 找到item所在的可滚动section
    const section = item.closest(".searchbox-result-section");
    if (!section) return;

    const sectionHeight = section.clientHeight;
    const itemTop = item.offsetTop - section.offsetTop;
    const itemHeight = item.clientHeight;
    const scrollTop = section.scrollTop;

    if (itemTop + itemHeight > scrollTop + sectionHeight) {
      section.scrollTop = itemTop + itemHeight - sectionHeight;
    }
    if (itemTop < scrollTop) {
      section.scrollTop = itemTop;
    }
  }

  function selectItemByDiff(value) {
    const items = Array.from(container.querySelectorAll(".searchbox-result-item"));
    if (items.length === 0) return;

    // 查找 active 索引
    const prevPosition = items.findIndex((item) => item.classList.contains("active"));

    const nextPosition = (items.length + prevPosition + value) % items.length;
    const finalPosition = nextPosition < 0 ? nextPosition + items.length : nextPosition;

    if (prevPosition !== -1) items[prevPosition].classList.remove("active");

    const nextItem = items[finalPosition];
    nextItem.classList.add("active");
    scrollTo(nextItem);
  }

  // --- 数据加载与事件 ---

  // 优化点：提取 Fetch 逻辑，支持 Lazy Load
  function fetchData() {
    if (dataset || isLoading) return;
    isLoading = true;

    fetch(config.contentUrl)
      .then((response) => response.json())
      .then((json) => {
        dataset = json;
        isLoading = false;
        // 如果加载完之后输入框里有字，立即触发一次搜索
        if (input.value.trim()) {
          input.dispatchEvent(new Event("input"));
        }
      })
      .catch((err) => {
        console.error("Insight Search: Failed to load content.json", err);
        isLoading = false;
      });
  }

  // 监听输入
  input.addEventListener("input", function () {
    const keywords = this.value;

    // 清除上一次的定时器
    if (searchTimer) clearTimeout(searchTimer);

    if (!dataset) {
      fetchData(); // 兜底，防止万一没加载
      return;
    }

    // 优化点：防抖 (Debounce) 300ms
    searchTimer = setTimeout(() => {
      searchResultToDOM(keywords, search(dataset, keywords));
    }, 200);
  });

  main.addEventListener("focusout", (e) => {
    if (main.contains(e.relatedTarget)) {
      return;
    }
    main.classList.remove("show");
  });

  main.addEventListener("click", (e) => {
    const resultItem = e.target.closest(".searchbox-result-item");
    if (resultItem) {
      main.classList.remove("show");
    }
  });

  document.addEventListener("click", (e) => {
    if (e.target.closest(".navbar-main .search")) {
      main.classList.add("show");
      const inp = main.querySelector(".searchbox-input");
      inp.focus();

      // Lazy Load - 打开时再请求数据
      fetchData();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (!main.classList.contains("show")) return;
    switch (e.key) {
      case "ArrowUp":
        selectItemByDiff(-1);
        break;
      case "ArrowDown":
        selectItemByDiff(1);
        break;
      case "Enter": {
        const activeItem = container.querySelector(".searchbox-result-item.active");
        if (activeItem) location.href = activeItem.getAttribute("href");
        break;
      }
    }
  });

  document.addEventListener("touchstart", () => {
    touch = true;
  });
  document.addEventListener("touchmove", () => {
    touch = false;
  });

  // 处理 location.hash 自动打开的情况
  if (location.hash.trim() === "#insight-search") {
    main.classList.add("show");
    fetchData();
  }
}
