const { Component, cacheComponent } = require("../../include/util/common");

function getStatusUrl(page, helper) {
  const langKey = typeof helper.language_key === "function" ? helper.language_key(page) : null;
  if (typeof helper.localized_url_for === "function") return helper.localized_url_for("status.html", langKey);
  if (typeof helper.url_for === "function") return helper.url_for("/status.html");
  return "/status.html";
}

class Footer extends Component {
  render() {
    const { copyright, ICPRecord, statusUrl } = this.props;

    return (
      <footer class="footer">
        <div class="footer-brand">
          <p class="footer-credit">
            2022&ndash;PRESENT&ensp;
            <a class="footer-author" href={statusUrl}>
              © GnixAij Oag
            </a>
            &ensp;
            <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="license noopener noreferrer">
              CC BY-NC-SA 4.0
            </a>
          </p>
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

const CacheableFooter = cacheComponent(Footer, "common.footer", (props) => {
  const { config, helper, page } = props;
  const { footer } = config;

  return {
    copyright: footer?.copyright ?? "",
    ICPRecord: footer?.ICPRecord || "",
    statusUrl: getStatusUrl(page, helper),
  };
});

CacheableFooter.getStatusUrl = getStatusUrl;

module.exports = CacheableFooter;
