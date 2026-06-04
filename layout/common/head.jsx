const { Component } = require("../../include/util/common");
const MetaTags = require("../../layout/misc/meta");
const OpenGraph = require("../../layout/misc/open_graph");
const StructuredData = require("../../layout/misc/structured_data");
const Plugins = require("./plugins");
const { getArticleFontInitScript } = require("../../include/util/article_font");
const { getThemeInitScript } = require("../../include/util/theme");
const { getDefaultLanguageKey, getLanguage, getPageLanguageKey, getPageLocale, isI18nEnabled, normalizeLocale } = require("../../include/util/i18n");
const fs = require("node:fs");
const path = require("node:path");

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

function getTermName(term) {
  if (!term) return undefined;
  if (typeof term === "string") return term;

  return term.name || term.slug || term.path;
}

function getArticleSection(page) {
  if (page.category) return getTermName(page.category);

  const categories = page.categories;
  if (!categories) return undefined;
  if (typeof categories.first === "function") return getTermName(categories.first());
  if (Array.isArray(categories.data)) return getTermName(categories.data[0]);
  if (Array.isArray(categories)) return getTermName(categories[0]);

  return undefined;
}

function normalizeTrailingSlash(url, config) {
  if (!url || typeof url !== "string") return url;
  if (config.pretty_urls && config.pretty_urls.trailing_index === false) return url;

  const match = url.match(/^([a-z][a-z0-9+\-.]*:\/\/[^/?#]+)?([^?#]*)(\?[^#]*)?(#.*)?$/i);
  if (!match) return url;
  const [, origin = "", path = "", query = "", hash = ""] = match;
  if (!path || path.endsWith("/")) return url;

  const lastSegment = path.slice(path.lastIndexOf("/") + 1);
  if (/\.[a-z0-9]+$/i.test(lastSegment)) return url;

  return `${origin}${path}/${query}${hash}`;
}

function toAbsoluteUrl(href, helper, config) {
  if (!href || typeof href !== "string") return null;
  if (/^https?:\/\//i.test(href)) return href;

  let absolute;
  if (typeof helper.full_url_for === "function") {
    absolute = helper.full_url_for(href);
  } else {
    const localUrl = typeof helper.url_for === "function" ? helper.url_for(href) : href;
    if (/^https?:\/\//i.test(localUrl)) {
      absolute = localUrl;
    } else {
      const siteUrl = String(config.url || "").replace(/\/+$/, "");
      const path = localUrl.startsWith("/") ? localUrl : `/${localUrl}`;
      absolute = `${siteUrl}${path}`;
    }
  }
  return normalizeTrailingSlash(absolute, config);
}

function addAlternateLink(links, hreflang, href, helper, config) {
  const normalizedHreflang = hreflang === "x-default" ? "x-default" : normalizeLocale(hreflang);
  const absoluteHref = toAbsoluteUrl(href, helper, config);
  if (!normalizedHreflang || !absoluteHref) return;
  links.set(normalizedHreflang.toLowerCase(), {
    hreflang: normalizedHreflang,
    href: absoluteHref,
  });
}

function addExplicitAlternates(links, alternates, helper, config) {
  if (!alternates || typeof alternates !== "object") return;

  Object.keys(alternates).forEach((key) => {
    const value = alternates[key];
    const href = typeof value === "string" ? value : value?.href || value?.url;
    const language = getLanguage(config, key);
    const hreflang = key === "x-default" ? "x-default" : language?.key === key ? language.locale : key;
    addAlternateLink(links, hreflang, href, helper, config);
  });
}

function getHreflangLinks(_site, page, config, helper) {
  if (!isI18nEnabled(config)) return [];

  const links = new Map();
  const langKey = getPageLanguageKey(page, config);
  const locale = getPageLocale(page, config);

  addAlternateLink(links, locale, page.permalink || page.path, helper, config);
  addExplicitAlternates(links, page.i18n, helper, config);

  if (links.size > 1 && !links.has("x-default")) {
    const defaultLanguage = getLanguage(config, getDefaultLanguageKey(config));
    const defaultLink = Array.from(links.values()).find((link) => link.hreflang.toLowerCase() === defaultLanguage.locale.toLowerCase());
    if (defaultLink) addAlternateLink(links, "x-default", defaultLink.href, helper, config);
  }

  return Array.from(links.values()).sort((a, b) => {
    if (a.hreflang === "x-default") return 1;
    if (b.hreflang === "x-default") return -1;
    if (a.hreflang === getLanguage(config, langKey).locale) return -1;
    if (b.hreflang === getLanguage(config, langKey).locale) return 1;
    return a.hreflang.localeCompare(b.hreflang);
  });
}

module.exports = class extends Component {
  render() {
    const { site, config, helper, page } = this.props;
    const { url_for, is_post, is_page, is_archive, is_tag } = helper;
    const { url, head = {}, article } = config;
    const { meta = [], open_graph = {}, structured_data = {}, canonical_url: headCanonicalUrl = page.permalink, favicon } = head;
    const markdownSourceUrl = page.markdown_path ? url_for(page.markdown_path) : null;
    const markdownSourceType = "text/markdown; charset=utf-8";

    const isArticleLike = is_post() || is_page();
    const isArchiveLike = is_archive() || is_tag();
    const isStatusPage = page.status === true;

    const language = getPageLocale(page, config) || page.lang || page.language || config.language;
    const canonicalUrl = toAbsoluteUrl(page.canonical_url || page.canonical || page.i18n?.canonical || headCanonicalUrl, helper, config);
    const hreflangLinks = getHreflangLinks(site, page, config, helper);

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
    const articleFontInitScript = getArticleFontInitScript();
    const articleFontUtilsScript = fs.readFileSync(path.join(__dirname, "../../source/js/article-font-utils.js"), "utf8");

    return (
      <head>
        <meta charset="utf-8" />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }}></script>
        <script dangerouslySetInnerHTML={{ __html: articleFontUtilsScript }}></script>
        <script dangerouslySetInnerHTML={{ __html: articleFontInitScript }}></script>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
            imageAlt={open_graph.image_alt || page.og_image_alt || page.cover_alt || page.title || config.title}
            imageWidth={open_graph.image_width}
            imageHeight={open_graph.image_height}
            siteName={open_graph.site_name || config.title}
            section={open_graph.section || getArticleSection(page)}
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
        {canonicalUrl ? <link rel="canonical" href={canonicalUrl} /> : null}
        {hreflangLinks.map((link) => (
          <link rel="alternate" hreflang={link.hreflang} href={link.href} />
        ))}
        {is_post(page) && markdownSourceUrl ? <link rel="alternate" type={markdownSourceType} title={helper.__("article.markdown_source")} href={markdownSourceUrl} /> : null}
        <link rel="icon" href={url_for(favicon || "/img/favicon.svg")} />
        <link rel="stylesheet" href={url_for("/css/default.css")} />
        {isArticleLike && <link rel="stylesheet" href={url_for("/css/article.css")} />}
        {isArticleLike && <link rel="stylesheet" href={url_for("/css/callout_blocks.css")} media="print" onload="this.media='all'" />}
        {isArchiveLike && <link rel="stylesheet" href={url_for("/css/archive.css")} />}
        {isStatusPage && <link rel="stylesheet" href={url_for("/css/status.css")} />}
        <link rel="stylesheet" href={url_for("/css/responsive.css")} />
        <link rel="preload" href={url_for("/css/font/woff2/HomemadeApple.woff2")} as="font" type="font/woff2" crossorigin />
        <link rel="preconnect" href="https://fontsapi.zeoseven.com" />
        <link rel="stylesheet" href="https://fontsapi.zeoseven.com/5/main/result.css" media="print" onload="this.media='all'" />
        <link rel="stylesheet" href="https://fontsapi.zeoseven.com/442/main/result.css" media="print" onload="this.media='all'" />
        {isArticleLike && <link rel="preload" as="style" href="/css/shiki/shiki.css" onload="this.onload=null;this.rel='stylesheet'" />}
        {page.encrypt ? <link rel="stylesheet" href={url_for("/css/encrypt.css")} /> : null}
        <Plugins site={site} config={config} helper={helper} page={page} head={true} />
      </head>
    );
  }
};
