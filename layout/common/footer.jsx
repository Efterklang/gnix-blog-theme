const { Component, cacheComponent } = require("../../include/util/common");

class Footer extends Component {
  render() {
    const { copyright, showVisitorCounter, visitorCounterTitle, ICPRecord } = this.props;

    return (
      <footer class="footer">
        <div class="footer-brand">
          <p class="footer-credit">
            2022&ndash;PRESENT&ensp;<span class="footer-author">© GnixAij Oag</span>&ensp;
            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="license noopener noreferrer">
              CC BY-NC-SA 4.0
            </a>
          </p>
          {showVisitorCounter ? (
            <p class="footer-meta">
              <span id="busuanzi_container_site_uv" dangerouslySetInnerHTML={{ __html: visitorCounterTitle }}></span>
            </p>
          ) : null}
          {ICPRecord ? (
            <p class="footer-meta">
              <a href="https://beian.miit.gov.cn/" class="footer-icp" target="_blank" rel="noopener" dangerouslySetInnerHTML={{ __html: ICPRecord }}></a>
            </p>
          ) : null}
          {copyright ? <p class="footer-meta" dangerouslySetInnerHTML={{ __html: copyright }}></p> : null}
        </div>
      </footer>
    );
  }
}

module.exports = cacheComponent(Footer, "common.footer", (props) => {
  const { config, helper, page, site } = props;
  const { _p, date } = helper;
  const { title, author, footer, plugins } = config;
  const langKey = helper.language_key(page);

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
      .map((year) => ({ year, url: helper.localized_url_for(`${archiveDir}/${year}/`, langKey) }));
  }

  return {
    siteUrl: helper.localized_url_for("/", langKey),
    siteTitle: title,
    siteYear: date(new Date(), "YYYY"),
    author,
    archives,
    copyright: footer?.copyright ?? "",
    showVisitorCounter: plugins && plugins.busuanzi === true,
    visitorCounterTitle: _p("plugin.visitor_count", '<span id="busuanzi_value_site_uv">0</span>'),
    ICPRecord: footer?.ICPRecord || "",
  };
});
