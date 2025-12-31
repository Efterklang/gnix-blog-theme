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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="200"
            viewBox="0 0 24 24"
            role="img"
            aria-label="Licensing Icon"
          >
            <path
              fill="currentColor"
              d="m11.89 10.34l-1.34.7c-.14-.3-.31-.51-.52-.63s-.41-.18-.58-.18c-.9 0-1.34.59-1.34 1.77c0 .54.11.97.34 1.29c.22.32.55.48 1 .48c.58 0 .99-.27 1.23-.86l1.23.63c-.26.49-.62.87-1.09 1.15q-.69.42-1.53.42c-.9 0-1.62-.27-2.17-.82C6.58 13.74 6.3 13 6.3 12c0-.95.28-1.7.83-2.26q.84-.84 2.1-.84c1.24-.01 2.13.48 2.66 1.44m5.77 0l-1.32.7c-.14-.3-.34-.51-.53-.63q-.315-.18-.6-.18c-.89 0-1.34.59-1.34 1.77c0 .54.13.97.34 1.29c.23.32.56.48 1 .48c.59 0 1-.27 1.24-.86l1.25.63c-.28.49-.65.87-1.11 1.15c-.47.28-.97.42-1.52.42c-.9 0-1.63-.27-2.17-.82S12.09 13 12.09 12c0-.95.28-1.7.83-2.26S14.17 8.9 15 8.9c1.26-.01 2.14.48 2.66 1.44M12 3.5a8.5 8.5 0 0 1 8.5 8.5a8.5 8.5 0 0 1-8.5 8.5A8.5 8.5 0 0 1 3.5 12A8.5 8.5 0 0 1 12 3.5M12 2A10 10 0 0 0 2 12a10 10 0 0 0 10 10a10 10 0 0 0 10-10A10 10 0 0 0 12 2"
            />
          </svg>
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
              <div class="level-item">
                <div>
                  <p>{authorTitle}</p>
                  <p>{author}</p>
                </div>
              </div>
            ) : null}
            {createdAt ? (
              <div class="level-item">
                <div>
                  <p>{createdTitle}</p>
                  <p>{createdAt}</p>
                </div>
              </div>
            ) : null}
            {updatedAt ? (
              <div class="level-item">
                <div>
                  <p>{updatedTitle}</p>
                  <p>{updatedAt}</p>
                </div>
              </div>
            ) : null}
            {licenses && Object.keys(licenses).length ? (
              <div class="level-item">
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
