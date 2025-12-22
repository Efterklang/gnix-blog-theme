const { Component, cacheComponent } = require("../../include/util/common");
class ArticleLicensing extends Component {
  render() {
    const {
      title,
      link,
      author,
      authorTitle,
      createdAt,
      createdTitle,
      updatedAt,
      updatedTitle,
      licenses,
      licensedTitle,
    } = this.props;
    return (
      <div class="article-licensing">
        <div class="article-licensing-bg-icon">
          <iconify-icon icon="mdi:creative-commons" />
        </div>
        <div class="licensing-title">
          {title ? <p>{title}</p> : null}
          <p>
            <a href={link}>{link}</a>
          </p>
        </div>
        <div class="licensing-meta level is-mobile">
          <div style="display: flex">
            {author ? (
              <div class="level-item is-narrow">
                <div>
                  <p>{authorTitle}</p>
                  <p>{author}</p>
                </div>
              </div>
            ) : null}
            {createdAt ? (
              <div class="level-item is-narrow">
                <div>
                  <p>{createdTitle}</p>
                  <p>{createdAt}</p>
                </div>
              </div>
            ) : null}
            {updatedAt ? (
              <div class="level-item is-narrow">
                <div>
                  <p>{updatedTitle}</p>
                  <p>{updatedAt}</p>
                </div>
              </div>
            ) : null}
            {licenses && Object.keys(licenses).length ? (
              <div class="level-item is-narrow">
                <div>
                  <p>{licensedTitle}</p>
                  <p>
                    {Object.keys(licenses).map((name) => (
                      <a
                        rel="noopener"
                        target="_blank"
                        title={name}
                        href={licenses[name].url}
                      >
                        <iconify-icon icon={licenses[name].icon} />
                      </a>
                    ))}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  }
}

ArticleLicensing.Cacheable = cacheComponent(
  ArticleLicensing,
  "misc.articlelicensing",
  (props) => {
    const { config, page, helper } = props;
    const { licenses } = config.article || {};

    const links = {};
    if (licenses) {
      Object.keys(licenses).forEach((name) => {
        const license = licenses[name];
        links[name] = {
          url: helper.url_for(
            typeof license === "string" ? license : license.url,
          ),
          icon: license.icon,
        };
      });
    }

    return {
      title: page.title,
      link: decodeURI(page.permalink),
      author: page.author || config.author,
      authorTitle: helper.__("article.licensing.author"),
      createdAt: page.date ? helper.date(page.date) : null,
      createdTitle: helper.__("article.licensing.created_at"),
      updatedAt: page.updated ? helper.date(page.updated) : null,
      updatedTitle: helper.__("article.licensing.updated_at"),
      licenses: links,
      licensedTitle: helper.__("article.licensing.licensed_under"),
    };
  },
);

module.exports = ArticleLicensing;
