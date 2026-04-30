const { Component } = require("../../include/util/common");
const MetaTags = require("../../layout/misc/meta");
const OpenGraph = require("../../layout/misc/open_graph");
const StructuredData = require("../../layout/misc/structured_data");
const Plugins = require("./plugins");
const { getThemeInitScript } = require("../../include/util/theme");

function getPageTitle(page, siteTitle, helper) {
  let title = page.title;

  if (helper.is_archive()) {
    title = helper._p("common.archive", Infinity);
    if (helper.is_month()) {
      title += `: ${page.year}/${page.month}`;
    } else if (helper.is_year()) {
      title += `: ${page.year}`;
    }
  } else if (helper.is_tag()) {
    title = `${helper._p("common.tag", 1)}: ${page.tag}`;
  } else if (helper.is_tags()) {
    title = helper._p("common.tag", Infinity);
  }

  return [title, siteTitle].filter((str) => typeof str !== "undefined" && str.trim() !== "").join(" - ");
}

module.exports = class extends Component {
  render() {
    const { site, config, helper, page } = this.props;
    const { url_for, is_post } = helper;
    const { url, head = {}, article } = config;
    const { meta = [], open_graph = {}, structured_data = {}, canonical_url = page.permalink, favicon } = head;

    const noIndex = helper.is_archive() || helper.is_tag();

    const language = page.lang || page.language || config.language;

    let images;
    if (typeof page.og_image === "string") {
      images = [page.og_image];
    } else if (typeof page.cover === "string") {
      images = [url_for(page.cover)];
    } else if (typeof page.thumbnail === "string") {
      images = [url_for(page.thumbnail)];
    } else if (article && typeof article.og_image === "string") {
      images = [article.og_image];
    } else if (page.content?.includes("<img")) {
      let img;
      images = [];
      const imgPattern = /<img [^>]*src=['"]([^'"]+)([^>]*>)/gi;
      while ((img = imgPattern.exec(page.content)) !== null) {
        images.push(img[1]);
      }
    } else {
      images = [url_for("/img/og_image.webp")];
    }

    let openGraphImages = images;
    if (typeof open_graph === "object" && open_graph !== null && ((Array.isArray(open_graph.image) && open_graph.image.length > 0) || typeof open_graph.image === "string")) {
      openGraphImages = open_graph.image;
    } else if ((Array.isArray(page.photos) && page.photos.length > 0) || typeof page.photos === "string") {
      openGraphImages = page.photos;
    }

    let structuredImages = images;
    if (typeof structured_data === "object" && structured_data !== null && ((Array.isArray(structured_data.image) && structured_data.image.length > 0) || typeof structured_data.image === "string")) {
      structuredImages = structured_data.image;
    } else if ((Array.isArray(page.photos) && page.photos.length > 0) || typeof page.photos === "string") {
      structuredImages = page.photos;
    }

    const themeInitScript = getThemeInitScript();

    return (
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }}></script>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {noIndex ? <meta name="robots" content="noindex" /> : null}
        {meta?.length ? <MetaTags meta={meta} /> : null}
        <title>{getPageTitle(page, config.title, helper)}</title>
        {typeof open_graph === "object" && open_graph !== null ? (
          <OpenGraph
            type={open_graph.type || (is_post(page) ? "article" : "website")}
            title={open_graph.title || page.title || config.title}
            date={page.date}
            updated={page.updated}
            author={open_graph.author || config.author}
            description={open_graph.description || page.description || page.excerpt || page.content || config.description}
            keywords={(page.tags?.length ? page.tags : undefined) || config.keywords}
            url={open_graph.url || page.permalink || url}
            images={openGraphImages}
            siteName={open_graph.site_name || config.title}
            language={language}
            twitterId={open_graph.twitter_id}
            twitterCard={open_graph.twitter_card}
            twitterSite={open_graph.twitter_site}
            googlePlus={open_graph.google_plus}
            facebookAdmins={open_graph.fb_admins}
            facebookAppId={open_graph.fb_app_id}
          />
        ) : null}
        {typeof structured_data === "object" && structured_data !== null ? (
          <StructuredData
            title={structured_data.title || page.title || config.title}
            description={structured_data.description || page.description || page.excerpt || page.content || config.description}
            url={structured_data.url || page.permalink || url}
            author={structured_data.author || config.author}
            publisher={structured_data.publisher || config.title}
            publisherLogo={structured_data.publisher_logo || config.logo}
            date={page.date}
            updated={page.updated}
            images={structuredImages}
          />
        ) : null}
        {canonical_url ? <link rel="canonical" href={canonical_url} /> : null}
        <link rel="icon" href="/img/favicon.svg" />
        <link rel="stylesheet" href={url_for("/css/default.css")} />
        <link rel="stylesheet" href={url_for("/css/responsive.css")} />
        <link rel="preload" as="style" href={url_for("/css/callout_blocks.css")} onload="this.onload=null;this.rel='stylesheet'" />
        <link rel="preload" href={url_for("/css/font/woff2/HomemadeApple.woff2")} as="font" type="font/woff2" crossorigin />
        <link rel="preconnect" href="https://fontsapi.zeoseven.com" />
        <link rel="preload" as="style" href="https://fontsapi.zeoseven.com/285/main/result.css" onload="this.onload=null;this.rel='stylesheet'" />
        <link rel="preload" as="style" href="https://fontsapi.zeoseven.com/442/main/result.css" onload="this.onload=null;this.rel='stylesheet'" />
        <link rel="preload" as="style" href="/css/shiki/shiki.css" onload="this.onload=null;this.rel='stylesheet'" />
        {page.encrypt ? <link rel="stylesheet" href={url_for("/css/encrypt.css")} /> : null}
        <Plugins site={site} config={config} helper={helper} page={page} head={true} />
      </head>
    );
  }
};
