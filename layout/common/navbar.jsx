const { Component, Fragment } = require("../../include/util/common");
const { cacheComponent } = require("../../util/cache");

function isSameLink(a, b) {
  function santize(url) {
    let paths = url
      .replace(/(^\w+:|^)\/\//, "")
      .split("#")[0]
      .split("/")
      .filter((p) => p.trim() !== "");
    if (paths.length > 0 && paths[paths.length - 1].trim() === "index.html") {
      paths = paths.slice(0, paths.length - 1);
    }
    return paths.join("/");
  }
  return santize(a) === santize(b);
}

const renderLinkIcon = (link) => {
  if (!link.icon) return null;
  // start with '<' means svg icon
  if (link.icon === "travellings") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 448 512"
        role="img"
        aria-label="Travellings Icon"
      >
        <path
          fill="var(--text)"
          d="M96 0C43 0 0 43 0 96v256c0 48 35.2 87.7 81.1 94.9l-46 46c-7 7-2 19.1 7.9 19.1h39.7c8.5 0 16.6-3.4 22.6-9.4L160 448h128l54.6 54.6c6 6 14.1 9.4 22.6 9.4h39.7c10 0 15-12.1 7.9-19.1l-46-46c46-7.1 81.1-46.9 81.1-94.9V96c0-53-43-96-96-96zM64 128c0-17.7 14.3-32 32-32h80c17.7 0 32 14.3 32 32v96c0 17.7-14.3 32-32 32H96c-17.7 0-32-14.3-32-32zm208-32h80c17.7 0 32 14.3 32 32v96c0 17.7-14.3 32-32 32h-80c-17.7 0-32-14.3-32-32v-96c0-17.7 14.3-32 32-32M64 352a32 32 0 1 1 64 0a32 32 0 1 1-64 0m288-32a32 32 0 1 1 0 64a32 32 0 1 1 0-64"
        ></path>
      </svg>
    );
  }
  return <iconify-icon icon={link.icon}></iconify-icon>;
};

class Navbar extends Component {
  render() {
    const { siteUrl, menu, links, showSearch, searchTitle } = this.props;

    return (
      <nav class="navbar navbar-main" onclick="handleNavbarClick(event);">
        <div class="navbar-container">
          <a href={siteUrl} class="navbar-brand">
            <svg
              version="1.0"
              xmlns="http://www.w3.org/2000/svg"
              fill="var(--flamingo)"
              viewBox="0 0 1182.000000 930.000000"
              width="5em"
              role="img"
              aria-label="Blog Logo"
            >
              <g
                transform="translate(0.000000,930.000000) scale(0.100000,-0.100000)"
                stroke="none"
              >
                <path d="M4915 7175 c-238 -39 -533 -139 -794 -270 -549 -275 -1067 -758 -1291 -1205 -73 -145 -95 -225 -94 -345 0 -120 23 -188 86 -260 203 -231 774 -132 1521 262 185 97 298 161 372 209 l30 19 -19 -30 c-11 -16 -50 -74 -88 -130 l-69 -100 -102 -46 c-564 -253 -1269 -905 -1508 -1394 -118 -241 -121 -414 -9 -525 149 -150 390 -86 629 165 150 158 405 524 664 951 80 132 212 348 294 480 l148 239 70 24 c84 28 203 38 262 22 57 -16 100 -54 115 -102 20 -69 78 -90 123 -45 l24 24 15 -22 c9 -15 11 -28 5 -37 -16 -26 -9 -34 10 -11 12 13 31 22 48 22 39 0 46 6 88 78 73 125 268 348 406 464 115 98 227 147 230 101 3 -48 -7 -88 -58 -232 -91 -257 -76 -348 63 -374 88 -17 295 69 544 226 l135 85 5 -92 c10 -163 74 -226 232 -226 155 0 283 58 523 235 61 45 141 107 179 138 38 32 72 57 76 57 4 0 18 -31 30 -69 l22 -70 -79 -93 c-139 -162 -240 -309 -300 -433 -48 -101 -43 -157 17 -170 44 -10 77 15 91 67 18 70 161 276 292 423 l44 50 41 -37 c102 -92 323 -101 573 -22 97 30 292 121 394 184 98 60 293 207 306 231 17 33 7 80 -22 102 -35 25 -52 19 -136 -50 -232 -191 -517 -330 -761 -370 -130 -21 -200 -13 -248 29 -18 16 -34 36 -34 44 0 7 55 63 123 125 304 277 553 444 736 495 61 17 62 17 77 -4 10 -14 26 -22 45 -22 45 0 67 16 75 56 5 29 2 40 -17 61 -41 43 -92 63 -162 63 -174 0 -434 -158 -805 -491 -68 -61 -125 -109 -126 -107 -1 1 -17 34 -35 71 -34 70 -76 108 -133 122 -22 6 -36 -3 -99 -60 -97 -89 -338 -270 -433 -324 -144 -82 -255 -110 -304 -75 -44 30 -24 141 53 294 24 47 52 94 64 104 29 26 26 52 -8 87 -22 21 -39 29 -66 29 -49 0 -69 -12 -104 -63 -33 -48 -307 -240 -486 -340 -108 -60 -241 -117 -274 -117 -27 0 -26 12 5 85 99 233 127 382 85 462 -33 66 -73 88 -156 88 -106 -1 -183 -45 -337 -194 -43 -41 -78 -71 -78 -68 0 10 60 118 82 146 63 82 -57 168 -131 94 -33 -34 -137 -260 -241 -522 l-77 -194 -17 49 c-22 68 -63 115 -134 152 -70 37 -173 54 -266 45 l-60 -6 79 114 c143 210 249 343 339 429 229 217 236 225 242 257 5 26 1 37 -19 57 -16 16 -37 26 -54 26 -39 0 -142 -80 -250 -193 -99 -104 -201 -187 -378 -305 -429 -286 -1057 -565 -1435 -636 -95 -18 -257 -21 -315 -5 -51 14 -110 73 -124 124 -47 168 80 462 316 736 425 490 995 840 1638 1004 235 60 436 71 493 27 23 -17 27 -26 24 -61 -3 -52 9 -76 47 -89 60 -21 101 26 101 116 0 85 -34 132 -125 174 -45 20 -68 23 -215 25 -107 1 -197 -3 -255 -12z m-536 -2152 c-13 -21 -54 -87 -93 -148 -38 -60 -130 -211 -204 -335 -156 -261 -360 -571 -492 -750 -203 -275 -393 -411 -497 -356 -117 60 -104 230 34 458 176 292 619 737 985 990 88 61 271 177 281 177 5 1 -2 -16 -14 -36z" />{" "}
                <path d="M7073 6016 c-60 -27 -83 -120 -42 -165 49 -53 119 -51 168 5 82 93 -11 212 -126 160z" />{" "}
              </g>
            </svg>
          </a>
          <div class="navbar-menu">
            {Object.keys(menu).length ? (
              <div class="navbar-start">
                {Object.keys(menu).map((name) => {
                  const item = menu[name];
                  const navbar_item_class = `navbar-item ${item.active ? "is-active" : ""}`;
                  return (
                    <a class={navbar_item_class} href={item.url}>
                      {name}
                    </a>
                  );
                })}
              </div>
            ) : null}
            <div class="navbar-end">
              <button
                type="button"
                class="navbar-item theme-selector-trigger"
                title="Choose Theme"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 14 14"
                  role="img"
                  aria-label="Theme Selector"
                >
                  <g fill="none">
                    <path
                      fill="var(--red)"
                      d="M14 12.5v-3A1.5 1.5 0 0 0 12.5 8H3a3 3 0 1 0 0 6h9.5a1.5 1.5 0 0 0 1.5-1.5"
                    ></path>
                    <path
                      fill="var(--blue)"
                      d="M12.339 3.783L10.218 1.66a1.5 1.5 0 0 0-2.122 0L.88 8.88a3 3 0 0 0 4.24 4.24l7.218-7.217a1.5 1.5 0 0 0 0-2.121"
                    ></path>
                    <path
                      fill="var(--green)"
                      d="M4.5 0h-3A1.5 1.5 0 0 0 0 1.5V11a3 3 0 0 0 6 0V1.5A1.5 1.5 0 0 0 4.5 0"
                    ></path>
                    <path
                      fill="var(--base)"
                      fill-rule="evenodd"
                      d="M1.395 3.375a.625.625 0 1 0 0 1.25h3.21a.625.625 0 1 0 0-1.25zm0 4.5a.625.625 0 1 0 0 1.25h3.21a.625.625 0 1 0 0-1.25z"
                      clip-rule="evenodd"
                    ></path>
                  </g>
                </svg>
              </button>
              {Object.keys(links).length ? (
                <Fragment>
                  {Object.keys(links).map((name) => {
                    const link = links[name];
                    return (
                      <a
                        class="navbar-item"
                        target="_blank"
                        rel="noopener"
                        title={name}
                        href={link.url}
                      >
                        {renderLinkIcon(link)}
                      </a>
                    );
                  })}
                </Fragment>
              ) : null}
              {showSearch ? (
                <button
                  type="button"
                  class="navbar-item search"
                  title={searchTitle}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 14 14"
                    role="img"
                    aria-label="Search Icon"
                  >
                    <g fill="none" fill-rule="evenodd" clip-rule="evenodd">
                      <path
                        fill="var(--lavender)"
                        d="M.5.125a.5.5 0 0 0-.5.5v10a.5.5 0 0 0 .5.5h4.756A4.5 4.5 0 0 1 5 9.625c0-1.271.527-2.42 1.375-3.238v-4.96A2 2 0 0 0 4.5.126zm7.125 1.303v4.105a4.5 4.5 0 0 1 6.347 3.584H14V.625a.5.5 0 0 0-.5-.5h-4a2 2 0 0 0-1.875 1.303"
                      />
                      <path
                        fill="var(--blue)"
                        d="M7.75 9.625a1.75 1.75 0 1 1 3.5 0a1.75 1.75 0 0 1-3.5 0m1.75-3.25a3.25 3.25 0 1 0 1.706 6.017l1.263 1.263a.75.75 0 0 0 1.06-1.06l-1.262-1.264A3.25 3.25 0 0 0 9.5 6.375"
                      />
                    </g>
                  </svg>
                </button>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            class="navbar-burger"
            aria-label="menu"
            aria-expanded="false"
          >
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </button>
        </div>
      </nav>
    );
  }
}

module.exports = cacheComponent(Navbar, "common.navbar", (props) => {
  const { config, helper, page } = props;
  const { url_for, _p, __ } = helper;
  const { logo, title, navbar, widgets, search } = config;

  const hasTocWidget =
    Array.isArray(widgets) && widgets.find((widget) => widget.type === "toc");
  const showToc =
    (config.toc === true || page.toc) &&
    hasTocWidget &&
    ["page", "post"].includes(page.layout);

  const menu = {};
  if (navbar?.menu) {
    const pageUrl = typeof page.path !== "undefined" ? url_for(page.path) : "";
    Object.keys(navbar.menu).forEach((name) => {
      const url = url_for(navbar.menu[name]);
      const active = isSameLink(url, pageUrl);
      menu[name] = { url, active };
    });
  }

  const links = {};
  if (navbar?.links) {
    Object.keys(navbar.links).forEach((name) => {
      const link = navbar.links[name];
      links[name] = {
        url: url_for(typeof link === "string" ? link : link.url),
        icon: link.icon,
      };
    });
  }

  return {
    logo: url_for(logo),
    siteUrl: url_for("/"),
    siteTitle: title,
    menu,
    links,
    showToc,
    tocTitle: _p("widget.catalogue", Infinity),
    showSearch: search?.type,
    searchTitle: __("search.search"),
  };
});
