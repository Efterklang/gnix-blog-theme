const { Component, cacheComponent } = require("../../include/util/common");

class Footer extends Component {
  render() {
    const { siteTitle, siteYear, author, links, subdomains, copyright, showVisitorCounter, visitorCounterTitle, ICPRecord } = this.props;

    const svg_line = (
      <svg aria-hidden="true" width="100%" height="8" fill="none" xmlns="http://www.w3.org/2000/svg">
        <pattern id="a" width="91" height="8" patternUnits="userSpaceOnUse">
          <g clip-path="url(#clip0_2426_11367)">
            <path
              d="M114 4c-5.067 4.667-10.133 4.667-15.2 0S88.667-.667 83.6 4 73.467 8.667 68.4 4 58.267-.667 53.2 4 43.067 8.667 38 4 27.867-.667 22.8 4 12.667 8.667 7.6 4-2.533-.667-7.6 4s-10.133 4.667-15.2 0S-32.933-.667-38 4s-10.133 4.667-15.2 0-10.133-4.667-15.2 0-10.133 4.667-15.2 0-10.133-4.667-15.2 0-10.133 4.667-15.2 0-10.133-4.667-15.2 0-10.133 4.667-15.2 0-10.133-4.667-15.2 0-10.133 4.667-15.2 0-10.133-4.667-15.2 0-10.133 4.667-15.2 0-10.133-4.667-15.2 0-10.133 4.667-15.2 0-10.133-4.667-15.2 0-10.133 4.667-15.2 0-10.133-4.667-15.2 0-10.133 4.667-15.2 0-10.133-4.667-15.2 0-10.133 4.667-15.2 0-10.133-4.667-15.2 0-10.133 4.667-15.2 0-10.133-4.667-15.2 0-10.133 4.667-15.2 0-10.133-4.667-15.2 0-10.133 4.667-15.2 0"
              stroke="var(--lavender)"
              stroke-linecap="square"
            ></path>
          </g>
        </pattern>
        <rect width="100%" height="100%" fill="url(#a)"></rect>
      </svg>
    );

    const footer_brand = (
      <div class="footer-column footer-brand">
        <p class="footer-title">{author || siteTitle}</p>
        <p class="footer-meta">
          <span
            dangerouslySetInnerHTML={{
              __html: `&copy; ${siteYear} ${author || siteTitle}`,
            }}
          ></span>
          &nbsp;Powered by Hexo&nbsp;& Icarus
          {showVisitorCounter ? (
            <>
              <br />
              <span id="busuanzi_container_site_uv" dangerouslySetInnerHTML={{ __html: visitorCounterTitle }}></span>
            </>
          ) : null}
          {ICPRecord ? (
            <>
              <br />
              <a href="https://beian.miit.gov.cn/" style={"color: inherit"} target="_blank" rel="noopener" dangerouslySetInnerHTML={{ __html: ICPRecord }}></a>
            </>
          ) : null}
        </p>
        {copyright ? <p class="footer-meta" dangerouslySetInnerHTML={{ __html: copyright }}></p> : null}
      </div>
    );

    const footer_social = (
      <div class="footer-column footer-social">
        <p class="footer-heading">Social Media</p>
        <div class="footer-links">
          {Object.keys(links).length
            ? Object.keys(links).map((name) => {
                const link = links[name];
                return (
                  <a class="footer-link" target="_blank" rel="noopener" title={name} href={link.url}>
                    {link.icon ? <iconify-icon icon={link.icon}></iconify-icon> : name}
                  </a>
                );
              })
            : null}
        </div>
      </div>
    );

    const footer_subdomains = (
      <div class="footer-column footer-subdomains">
        <p class="footer-heading">Sub Domains</p>
        <div class="footer-links">
          {Object.keys(subdomains).length
            ? Object.keys(subdomains).map((name) => {
                const link = subdomains[name];
                return (
                  <a class="footer-link" target="_self" rel="noopener" title={name} href={link.url}>
                    {name}
                  </a>
                );
              })
            : null}
        </div>
      </div>
    );

    return (
      <>
        {" "}
        {svg_line}
        <footer class="footer">
          <div class="footer-grid">
            {footer_brand}
            {footer_subdomains}
            {footer_social}
          </div>
        </footer>
      </>
    );
  }
}

module.exports = cacheComponent(Footer, "common.footer", (props) => {
  const { config, helper, site } = props;
  const { url_for, _p, date } = helper;
  const { title, author, footer, plugins } = config;

  const links = {};
  if (footer?.links) {
    Object.keys(footer.links).forEach((name) => {
      const link = footer.links[name];
      links[name] = {
        url: url_for(typeof link === "string" ? link : link.url),
        icon: link.icon,
      };
    });
  }

  const subdomains = {};
  if (footer?.subdomains) {
    Object.keys(footer.subdomains).forEach((name) => {
      const link = footer.subdomains[name];
      const targetUrl = typeof link === "string" ? link : link.url;
      subdomains[name] = {
        url: url_for(targetUrl),
      };
    });
  }

  // Build archives grouped by year from site posts
  let archives = [];
  if (site?.posts?.length) {
    const archiveDir = config.archive_dir || "archives";
    const byYear = {};
    const posts = site.posts.sort("date", -1);

    posts.forEach((post) => {
      let d = post.date.clone();
      if (config.timezone) {
        d = d.tz(config.timezone);
      }
      const year = d.year();
      byYear[year] = (byYear[year] || 0) + 1;
    });

    archives = Object.keys(byYear)
      .sort((a, b) => Number(b) - Number(a))
      .map((year) => ({ year, url: url_for(`${archiveDir}/${year}/`) }));
  }

  return {
    siteUrl: url_for("/"),
    siteTitle: title,
    siteYear: date(new Date(), "YYYY"),
    author,
    links,
    subdomains,
    archives,
    copyright: footer?.copyright ?? "",
    showVisitorCounter: plugins && plugins.busuanzi === true,
    visitorCounterTitle: _p("plugin.visitor_count", '<span id="busuanzi_value_site_uv">0</span>'),
    ICPRecord: footer?.ICPRecord || "",
  };
});
