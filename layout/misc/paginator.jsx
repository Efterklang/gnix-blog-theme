const { Component } = require("inferno");

module.exports = class extends Component {
  render() {
    const { current, total, baseUrl, path, urlFor } = this.props;

    function getPageUrl(i) {
      return urlFor(i === 1 ? baseUrl : `${baseUrl + path}/${i}/`);
    }

    function pagination(c, m) {
      const current = c;
      const last = m;
      const delta = 2;
      const left = current - delta;
      const right = current + delta + 1;
      const range = [];
      const elements = [];
      let l;

      for (let i = 1; i <= last; i++) {
        if (i === 1 || i === last || (i >= left && i < right)) {
          range.push(i);
        }
      }

      for (const i of range) {
        if (l) {
          if (i - l === 2) {
            elements.push(
              <li>
                <a class="pagination-link" href={getPageUrl(l + 1)}>
                  {l + 1}
                </a>
              </li>,
            );
          } else if (i - l !== 1) {
            elements.push(
              <li>
                <span class="pagination-ellipsis" style="pointer-events: none;" dangerouslySetInnerHTML={{ __html: "&hellip;" }}></span>
              </li>,
            );
          }
        }
        elements.push(
          <li>
            <a class={`pagination-link${c === i ? " is-current" : ""}`} href={getPageUrl(i)}>
              {i}
            </a>
          </li>,
        );
        l = i;
      }
      return elements;
    }

    return (
      <nav class="pagination card" aria-label="pagination">
        <a href={getPageUrl(current - 1)} class={`pagination-previous`} style={current > 1 ? {} : { visibility: "hidden" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
            <title>go to previous page</title>
            <path fill="currentColor" d="m4 10l9 9l1.4-1.5L7 10l7.4-7.5L13 1z" />
          </svg>
        </a>
        <a href={getPageUrl(current + 1)} class={`pagination-next`} style={current < total ? {} : { visibility: "hidden" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
            <title>go to next page</title>
            <path fill="currentColor" d="M7 1L5.6 2.5L13 10l-7.4 7.5L7 19l9-9z" />
          </svg>
        </a>
        <ul class="pagination-list is-hidden-mobile">{pagination(current, total)}</ul>
      </nav>
    );
  }
};
