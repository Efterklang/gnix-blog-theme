let styleSheetInjected = false;

const I18N = {
  cn: {
    allYears: '全部年份',
    allCategories: '全部分类',
    noResults: '没有找到匹配的记录',
  },
  en: {
    allYears: 'All Years',
    allCategories: 'All Categories',
    noResults: 'No matching records found',
  },
};

const CATEGORY_LABELS = {
  Feat: 'Feat',
  Perf: 'Perf',
  fix: 'Fix',
  refactor: 'Refactor',
  other: 'Other',
  uiux: 'UIUX',
};

class Changelog extends HTMLElement {
  static get observedAttributes() {
    return ['lang'];
  }

  connectedCallback() {
    this.injectStyles();
    this.render();
    if (!this.hasAttribute('data-initialized')) {
      this.setupListeners();
      this.setAttribute('data-initialized', 'true');
    }
  }

  attributeChangedCallback(_name, _oldVal, _newVal) {
    if (this.isConnected) this.render();
  }

  get lang() {
    return this.getAttribute('lang') || 'cn';
  }

  injectStyles() {
    if (styleSheetInjected) return;

    const style = document.createElement('style');
    style.textContent = `
      x-changelog {
        display: block;
      }

      .x-changelog-filters {
        display: flex;
        gap: 0.8rem;
        margin-bottom: 4rem;
        flex-wrap: wrap;
        justify-content: flex-start;
      }

      .x-changelog-filter-group {
        position: relative;
      }

      .x-changelog-filter-group::after {
        content: '\\2193';
        font-family: var(--font-mono);
        font-size: 0.8rem;
        color: var(--subtext0);
        position: absolute;
        right: 0.8rem;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
      }

      .x-changelog-select {
        appearance: none;
        -webkit-appearance: none;
        padding: 0.5rem 2rem 0.5rem 0.8rem;
        border: 1px solid var(--surface1);
        border-radius: 6px;
        background: transparent;
        color: var(--text);
        font-size: 0.85rem;
        font-family: var(--font-mono);
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .x-changelog-select:hover {
        border-color: var(--subtext0);
        background: var(--surface0);
      }

      .x-changelog-select:focus {
        outline: none;
        border-color: var(--text);
      }

      .x-changelog-year {
        font-size: 1.5rem;
        font-weight: 700;
        margin: 3rem 0 1.5rem 0;
        color: var(--text);
        letter-spacing: -0.02em;
        border-bottom: 1px solid var(--surface1);
        padding-bottom: 0.5rem;
        display: flex;
        align-items: baseline;
      }

      .x-changelog-items {
        position: relative;
        padding-left: 0;
        margin-left: 1rem;
        border-left: 1px solid var(--surface1);
      }

      .x-changelog-item {
        display: grid;
        grid-template-columns: 3em 1fr;
        align-items: baseline;
        position: relative;
        margin-bottom: 2rem;
        padding-left: 1.5rem;
      }

      .x-changelog-item::before {
        content: '';
        position: absolute;
        left: -0.35em;
        top: 0.4rem;
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: var(--base);
        border: 1px solid var(--subtext0);
        z-index: 1;
        transition: all 0.5s ease;
      }

      .x-changelog-item:hover::before {
        background: var(--text);
        border-color: var(--text);
        transform: scale(1.1);
      }

      .x-changelog-item:hover .x-changelog-date {
        opacity: 1;
        color: var(--text);
      }

      .x-changelog-date {
        font-family: var(--font-mono);
        color: var(--subtext0);
        font-size: 0.85rem;
        padding-top: 0;
        opacity: 0.6;
        transition: opacity 0.2s ease;
      }

      .x-changelog-content {
        background: transparent;
        border: none;
        border-radius: 0;
        padding: 0;
        box-shadow: none;
        line-height: 1.6;
        color: var(--text);
        font-size: 0.95rem;
      }

      .x-changelog-category-tag {
        display: inline-block;
        font-size: 0.7rem;
        font-weight: 500;
        font-family: var(--font-mono, monospace);
        padding: 0.1rem 0.4rem;
        border-radius: 4px;
        margin-right: 0.6rem;
        vertical-align: middle;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        background: transparent;
        border: 1px solid var(--surface1);
        opacity: 0.9;
      }

      .x-changelog-category-tag.Feat { color: var(--green); }
      .x-changelog-category-tag.Perf { color: var(--yellow); }
      .x-changelog-category-tag.fix { color: var(--red); }
      .x-changelog-category-tag.refactor { color: var(--lavender); }
      .x-changelog-category-tag.other { color: var(--subtext0); }
      .x-changelog-category-tag.uiux { color: var(--pink); }

      .x-changelog-sub-item {
        margin-top: 0.4rem;
        padding-left: 0;
        list-style: none;
        color: var(--subtext0);
        font-size: 0.9rem;
        display: flex;
        align-items: flex-start;
        line-height: 1.5;
      }

      .x-changelog-sub-item::before {
        content: '-';
        margin-right: 0.6rem;
        color: var(--subtext1);
        display: inline-block;
      }

      .x-changelog-sub-item:hover {
        color: var(--text);
      }

      .x-changelog-no-results {
        text-align: left;
        padding: 2rem 0;
        color: var(--subtext0);
        font-family: var(--font-mono, monospace);
        font-size: 0.9rem;
        border-bottom: 1px solid var(--surface1);
      }

      .x-changelog-separator {
        height: 1rem;
      }

      @media (max-width: 768px) {
        .x-changelog-item {
          grid-template-columns: 1fr;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          padding-left: 1.2rem;
        }
      }
    `;
    document.head.appendChild(style);
    styleSheetInjected = true;
  }

  getData() {
    const raw = window.__CHANGELOG_DATA__;
    if (!raw) return [];
    const lang = this.lang;
    return raw.map((yearData) => ({
      year: yearData.year,
      items: yearData.items.map((item) => ({
        date: item.date,
        content: lang === 'en' ? item.en : item.cn,
        category: item.category,
      })),
    }));
  }

  render() {
    const data = this.getData();
    const lang = this.lang;
    const i18n = I18N[lang] || I18N.cn;
    const years = [...new Set(data.map((d) => d.year))].sort((a, b) => b - a);
    const categories = ['Feat', 'Perf', 'fix', 'refactor', 'other', 'uiux'];

    const yearOptions = years
      .map((y) => `<option value="${y}">${y}</option>`)
      .join('');

    const categoryOptions = categories
      .map((c) => `<option value="${c}">${CATEGORY_LABELS[c]}</option>`)
      .join('');

    this.innerHTML = `
      <div class="x-changelog-filters">
        <div class="x-changelog-filter-group">
          <select class="x-changelog-select" data-filter="year">
            <option value="all">${i18n.allYears}</option>
            ${yearOptions}
          </select>
        </div>
        <div class="x-changelog-filter-group">
          <select class="x-changelog-select" data-filter="category">
            <option value="all">${i18n.allCategories}</option>
            ${categoryOptions}
          </select>
        </div>
      </div>
      <div class="x-changelog-timeline"></div>
    `;

    this._data = data;
    this._i18n = i18n;
    this.renderTimeline(data);
  }

  renderTimeline(data) {
    const container = this.querySelector('.x-changelog-timeline');
    if (!container) return;

    if (data.length === 0) {
      container.innerHTML = `<div class="x-changelog-no-results">${this._i18n.noResults}</div>`;
      return;
    }

    let html = '';
    data.forEach((yearData, yearIndex) => {
      html += `<div class="x-changelog-year">${yearData.year}</div>`;
      html += '<div class="x-changelog-items">';

      for (const item of yearData.items) {
        html += `<div class="x-changelog-item" data-category="${item.category}">`;
        html += `<span class="x-changelog-date">${item.date}</span>`;
        html += '<div class="x-changelog-content">';

        for (let i = 0; i < item.content.length; i++) {
          if (i === 0) {
            html += `<span><span class="x-changelog-category-tag ${item.category}">${CATEGORY_LABELS[item.category] || item.category}</span>${item.content[i]}</span>`;
          } else {
            html += `<div class="x-changelog-sub-item">${item.content[i]}</div>`;
          }
        }

        html += '</div></div>';
      }

      html += '</div>';
      if (yearIndex < data.length - 1) {
        html += '<div class="x-changelog-separator"></div>';
      }
    });

    container.innerHTML = html;
  }

  setupListeners() {
    this.addEventListener('change', (event) => {
      const select = event.target;
      if (!select.classList.contains('x-changelog-select')) return;

      const yearFilter = this.querySelector('[data-filter="year"]');
      const categoryFilter = this.querySelector('[data-filter="category"]');

      const yearVal = yearFilter ? yearFilter.value : 'all';
      const catVal = categoryFilter ? categoryFilter.value : 'all';

      let filtered = this._data;

      if (yearVal !== 'all') {
        filtered = filtered.filter((d) => d.year === parseInt(yearVal, 10));
      }

      if (catVal !== 'all') {
        filtered = filtered
          .map((yearData) => ({
            ...yearData,
            items: yearData.items.filter((item) => item.category === catVal),
          }))
          .filter((yearData) => yearData.items.length > 0);
      }

      this.renderTimeline(filtered);
    });
  }
}

if (!customElements.get('x-changelog')) {
  customElements.define('x-changelog', Changelog);
}

export { Changelog };