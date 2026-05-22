const { extname } = require("node:path");
const { generateAtomFeed } = require("feedsmith");
const { gravatar, full_url_for, encodeURL, url_for } = require("hexo-util");

const EXISTING_FEED_LINK_RE = /type=['|"]?application\/atom\+xml['|"]?/i;
const HEAD_RE = /<head>(?!<\/head>).+?<\/head>/s;

module.exports = (hexo) => {
  hexo.config.feed = Object.assign(
    {
      enable: true,
      limit: 0,
      hub: "",
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

  let path = config.path;
  if (!path || typeof path !== "string") path = "atom.xml";
  if (!extname(path)) path += ".xml";
  config.path = path;

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
      title: context.config.title,
      description: context.config.subtitle || context.config.description,
      url,
      feedUrl,
      icon,
      hub,
      language: context.config.language,
      author: { name: context.config.author, email: context.config.email },
      copyright: context.config.author && `All rights reserved ${currentYear}, ${context.config.author}`,
      updated: latestPost.updated ? latestPost.updated.toDate() : latestPost.date.toDate(),
    };
  }

  function composeFeedLinks(feedUrl, hub) {
    const links = [{ href: encodeURL(feedUrl), rel: "self" }];
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
      author: post.author,
      description: composeItemDescription(post, feedConfig),
      published,
      updated: post.updated ? post.updated.toDate() : published,
      enclosures: post.image && [{ url: full_url_for.call(context, post.image) }],
      categories: composeItemCategories(post),
    };
  }

  function composeAtomEntry(feed, item) {
    const entryLinks = [{ href: item.link, rel: "alternate" }, ...(item.enclosures || []).map((enclosure) => ({ href: enclosure.url, rel: "enclosure" }))];
    const entryAuthor = item.author && item.author !== feed.author.name ? [{ name: item.author }] : undefined;
    return {
      title: item.title,
      id: item.link,
      links: entryLinks,
      summary: item.description,
      published: item.published,
      updated: item.updated || item.published,
      authors: entryAuthor,
      categories: item.categories.map((cat) => ({ term: cat.name, scheme: cat.domain })),
    };
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

  hexo.extend.generator.register("atom", function (locals) {
    const { config } = this;
    const { feed: feedConfig } = config;
    const posts = composePosts(locals.posts, feedConfig);

    if (posts.length <= 0) {
      return;
    }

    const feed = composeFeed(feedConfig, config.url, config.email, feedConfig.path, this, posts);
    const items = posts.toArray().map((post) => composeItem(post, feedConfig, this));

    return {
      path: feedConfig.path,
      data: generateAtom(feed, items),
    };
  });

  if (typeof config.autodiscovery !== "boolean") config.autodiscovery = true;

  if (config.autodiscovery === true) {
    hexo.extend.filter.register("after_render:html", function (data) {
      if (EXISTING_FEED_LINK_RE.test(data) || hexo.config.feed.autodiscovery === false) {
        return data;
      }

      const autodiscoveryTag = `<link rel="alternate" href="${url_for.call(this, config.path)}" title="${hexo.config.title}" type="application/atom+xml">\n`;

      return data.replace(HEAD_RE, (str) => str.replace("</head>", `${autodiscoveryTag}</head>`));
    });
  }
};
