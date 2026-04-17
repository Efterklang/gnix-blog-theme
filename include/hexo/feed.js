const { extname } = require("node:path");
const { generateRssFeed, generateAtomFeed } = require("feedsmith");
const { gravatar, full_url_for, encodeURL, url_for } = require("hexo-util");

const VALID_FEED_TYPES = new Set(["atom", "rss2"]);
const EXISTING_FEED_LINK_RE = /type=['|"]?application\/(atom|rss)\+xml['|"]?/i;
const HEAD_RE = /<head>(?!<\/head>).+?<\/head>/s;

function stripControlChars(value) {
  let sanitizedParts;
  let start = 0;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) {
      sanitizedParts ||= [];
      if (start < index) {
        sanitizedParts.push(value.slice(start, index));
      }
      start = index + 1;
    }
  }

  if (!sanitizedParts) {
    return value;
  }

  if (start < value.length) {
    sanitizedParts.push(value.slice(start));
  }

  return sanitizedParts.join("");
}

module.exports = (hexo) => {
  hexo.config.feed = Object.assign(
    {
      enable: true,
      type: "atom",
      limit: 20,
      hub: "",
      content: true,
      content_limit: 140,
      content_limit_delim: "",
      order_by: "-date",
      autodiscovery: true,
    },
    hexo.config.feed,
  );

  const config = hexo.config.feed;

  if (!config.enable) {
    return;
  }

  let type = config.type;
  let path = config.path;

  if (!type || (typeof type !== "string" && !Array.isArray(type))) {
    type = "atom";
  }

  if (Array.isArray(type)) {
    type = [...new Set(type.filter((item) => VALID_FEED_TYPES.has(item)))];
    if (type.length === 0) {
      type = "atom";
    }
  }

  if (typeof type === "string") {
    if (!VALID_FEED_TYPES.has(type)) type = "atom";
  }

  if (!path || typeof path !== typeof type) {
    if (typeof type === "string") path = type.concat(".xml");
    else path = type.map((str) => str.concat(".xml"));
  }

  if (Array.isArray(path)) {
    if (path.length !== type.length) {
      if (path.length > type.length) path = path.slice(0, type.length);
      else if (path.length === 0) path = type.map((str) => str.concat(".xml"));
      else path.push(type[1].concat(".xml"));
    }
    path = path.map((str) => {
      if (!extname(str)) return str.concat(".xml");
      return str;
    });
  }

  if (typeof path === "string") {
    if (!extname(path)) path += ".xml";
  }

  config.type = type;
  config.path = path;
  const feedEntries = typeof type === "string" ? [{ type, path }] : type.map((feedType, index) => ({ type: feedType, path: path[index] }));

  function composePosts(posts, feedConfig) {
    const { limit, order_by } = feedConfig;
    let processedPosts = posts.sort(order_by || "-date");
    processedPosts = processedPosts.filter((post) => post.draft !== true);
    processedPosts = processedPosts.filter((post) => !post.password);
    if (limit) processedPosts = processedPosts.limit(limit);
    return processedPosts;
  }

  function composeFeed(feedConfig, urlConfig, email, feedPath, context, posts) {
    const { icon: iconConfig, hub } = feedConfig;
    const latestPost = posts.first();
    let url = urlConfig;
    if (url[url.length - 1] !== "/") url += "/";

    let icon = "";
    if (iconConfig) icon = full_url_for.call(context, iconConfig);
    else if (email) icon = gravatar(email);

    const feedUrl = full_url_for.call(context, feedPath);
    const currentYear = new Date().getFullYear();

    return {
      title: context.title,
      description: context.subtitle || context.description,
      url,
      feedUrl,
      icon,
      hub,
      language: context.language,
      author: { name: context.author, email: context.email },
      copyright: context.author && `All rights reserved ${currentYear}, ${context.author}`,
      updated: latestPost.updated ? latestPost.updated.toDate() : latestPost.date.toDate(),
    };
  }

  function composeFeedLinks(feedUrl, hub, feedType) {
    const links = [{ href: encodeURL(feedUrl), rel: "self", type: feedType }];
    if (hub) links.push({ href: encodeURL(hub), rel: "hub" });
    return links;
  }

  function composeItemDescription(post, feedConfig) {
    const { content_limit, content_limit_delim } = feedConfig;
    if (post.description) return post.description;
    if (post.intro) return post.intro;
    if (post.excerpt) return post.excerpt;
    if (post.content) {
      const shortContent = post.content.substring(0, content_limit || 140);
      if (content_limit_delim) {
        const delimPos = shortContent.lastIndexOf(content_limit_delim);
        if (delimPos > -1) {
          return shortContent.substring(0, delimPos);
        }
      }
      return shortContent;
    }

    return "";
  }

  function composeItemContent(post, feedConfig) {
    const { content } = feedConfig;
    if (content && post.content) {
      return stripControlChars(post.content);
    }
    return "";
  }

  function composeItemCategories(post) {
    const categories = [];

    if (post.categories) {
      for (const item of post.categories.toArray()) {
        categories.push({ name: item.name, domain: item.permalink });
      }
    }

    if (post.tags) {
      for (const item of post.tags.toArray()) {
        categories.push({ name: item.name, domain: item.permalink });
      }
    }

    return categories;
  }

  function composeItem(post, feedConfig, context) {
    const published = post.date.toDate();

    return {
      title: post.title,
      link: encodeURL(full_url_for.call(context, post.permalink)),
      description: composeItemDescription(post, feedConfig),
      published,
      updated: post.updated ? post.updated.toDate() : published,
      content: composeItemContent(post, feedConfig),
      enclosures: post.image && [{ url: full_url_for.call(context, post.image) }],
      categories: composeItemCategories(post),
    };
  }

  function composeRssItem(feed, item) {
    return {
      title: item.title,
      link: item.link,
      guid: item.link,
      description: item.description,
      pubDate: item.published,
      authors: [feed.author],
      content: { encoded: item.content },
      enclosures: item.enclosures,
      categories: item.categories,
    };
  }

  function composeAtomEntry(feed, item) {
    const entryLinks = [{ href: item.link }, ...(item.enclosures || []).map((enclosure) => ({ href: enclosure.url, rel: "enclosure" }))];
    return {
      title: item.title,
      id: item.link,
      links: entryLinks,
      summary: item.description,
      content: item.content,
      published: item.published,
      updated: item.updated || item.published,
      authors: feed.author.name && [feed.author],
      categories: item.categories.map((cat) => ({ term: cat.name, scheme: cat.domain })),
    };
  }

  function generateRss(feed, items) {
    const links = composeFeedLinks(feed.feedUrl, feed.hub, "application/rss+xml");
    const siteUrl = encodeURL(feed.url);

    return generateRssFeed(
      {
        title: feed.title,
        description: feed.description,
        link: siteUrl,
        language: feed.language,
        copyright: feed.copyright,
        generator: "Hexo",
        lastBuildDate: feed.updated,
        image: feed.icon && {
          url: feed.icon,
          title: feed.title,
          link: siteUrl,
        },
        atom: { links },
        items: items.map((item) => composeRssItem(feed, item)),
      },
      { lenient: true },
    );
  }

  function generateAtom(feed, items) {
    const siteUrl = encodeURL(feed.url);
    const links = [{ href: siteUrl, rel: "alternate" }, ...composeFeedLinks(feed.feedUrl, feed.hub)];

    return generateAtomFeed(
      {
        title: feed.title,
        id: siteUrl,
        subtitle: feed.description,
        updated: feed.updated,
        links,
        generator: { text: "Hexo", uri: "https://hexo.io/" },
        icon: feed.icon,
        rights: feed.copyright,
        authors: feed.author.name && [feed.author],
        entries: items.map((item) => composeAtomEntry(feed, item)),
        language: feed.language,
      },
      { lenient: true },
    );
  }

  function createFeedGenerator(feedType, feedPath) {
    return function (locals) {
      const { config } = this;
      const { feed: feedConfig } = config;
      const posts = composePosts(locals.posts, feedConfig);

      if (posts.length <= 0) {
        return;
      }

      const feed = composeFeed(feedConfig, config.url, config.email, feedPath, this, posts);
      const items = posts.toArray().map((post) => composeItem(post, feedConfig, this));

      let data;
      switch (feedType) {
        case "rss2":
          data = generateRss(feed, items);
          break;
        default:
          data = generateAtom(feed, items);
      }

      return {
        path: feedPath,
        data,
      };
    };
  }

  if (typeof type === "string") {
    hexo.extend.generator.register(type, createFeedGenerator(type, path));
  } else {
    for (const entry of feedEntries) {
      hexo.extend.generator.register(entry.type, createFeedGenerator(entry.type, entry.path));
    }
  }

  if (typeof config.autodiscovery !== "boolean") config.autodiscovery = true;

  if (config.autodiscovery === true) {
    hexo.extend.filter.register("after_render:html", function (data) {
      if (EXISTING_FEED_LINK_RE.test(data) || hexo.config.feed.autodiscovery === false) {
        return data;
      }

      const autodiscoveryTag = feedEntries
        .map((entry) => `<link rel="alternate" href="${url_for.call(this, entry.path)}" title="${hexo.config.title}" type="application/${entry.type.replace(/2$/, "")}+xml">\n`)
        .join("");

      return data.replace(HEAD_RE, (str) => str.replace("</head>", `${autodiscoveryTag}</head>`));
    });
  }
};
