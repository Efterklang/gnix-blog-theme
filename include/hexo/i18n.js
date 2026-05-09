const { extname } = require("node:path");
const createPostProcessor = require("hexo/dist/plugins/processor/post");
const { isHiddenFile, isMatch, isTmpFile } = require("hexo/dist/plugins/processor/common");
const { createProfiler } = require("../util/profiler");
const {
  getI18nKey,
  getLanguageBasePath,
  getLanguage,
  getLanguageKeys,
  getPageLanguageKey,
  inferI18nKeyFromSource,
  isI18nEnabled,
  localizePath,
  trimSlashes,
} = require("../util/i18n");

const profile = createProfiler("i18n");

function getConfig(hexo, locals = {}) {
  return Object.assign({}, hexo.config, hexo.config.theme_config, hexo.theme.config, locals.theme);
}

function getLocalizedPostParams(hexo, sourcePath) {
  const stop = profile.start("getLocalizedPostParams");
  try {
    const config = getConfig(hexo);
    if (!isI18nEnabled(config) || isTmpFile(sourcePath)) return null;

    const match = sourcePath.replace(/\\/g, "/").match(/^([^/]+)\/(_posts|_drafts)\/(.+)$/);
    if (!match) return null;

    const langKey = match[1];
    if (!getLanguageKeys(config).includes(langKey)) return null;

    const postPath = match[3];
    if (isHiddenFile(postPath)) return null;

    let renderable = hexo.render.isRenderable(sourcePath) && !isMatch(sourcePath, hexo.config.skip_render);
    if (renderable && hexo.config.post_asset_folder) {
      renderable = extname(hexo.config.new_post_name) === extname(sourcePath);
    }

    return {
      i18n_lang: langKey,
      path: postPath,
      published: match[2] === "_posts",
      renderable,
    };
  } finally {
    stop();
  }
}

function getLocalizedPageParams(hexo, sourcePath) {
  const stop = profile.start("getLocalizedPageParams");
  try {
    const config = getConfig(hexo);
    if (!isI18nEnabled(config) || isTmpFile(sourcePath)) return null;

    const normalized = sourcePath.replace(/\\/g, "/");
    const match = normalized.match(/^([^/]+)\/(.+)$/);
    if (!match) return null;

    const langKey = match[1];
    if (!getLanguageKeys(config).includes(langKey)) return null;

    const pagePath = match[2];
    if (pagePath.startsWith("_posts/") || pagePath.startsWith("_drafts/") || isHiddenFile(pagePath)) return null;

    const renderable = hexo.render.isRenderable(sourcePath) && !isMatch(sourcePath, hexo.config.skip_render);
    if (!renderable) return null;

    return {
      i18n_lang: langKey,
    };
  } finally {
    stop();
  }
}

function buildPostI18nUpdate(post, langKey, config) {
  const language = getLanguage(config, langKey);
  const update = {
    i18n_path: getLanguageBasePath(config, langKey),
    i18n_lang: langKey,
    lang: language.locale,
    language: language.locale,
  };

  if (!post.i18n_key) {
    update.i18n_key = getI18nKey(post) || inferI18nKeyFromSource(post.source);
  }

  return { $set: update };
}

function getLocalizedPagePath(page, langKey, config) {
  const sourcePrefix = `${trimSlashes(langKey)}/`;
  let route = page.path || "";

  if (route.startsWith(sourcePrefix)) {
    route = route.slice(sourcePrefix.length);
  }

  return trimSlashes(localizePath(`/${route}`, langKey, config));
}

function buildPageI18nUpdate(page, langKey, config) {
  const language = getLanguage(config, langKey);
  const update = {
    i18n_path: getLanguageBasePath(config, langKey),
    i18n_lang: langKey,
    lang: language.locale,
    language: language.locale,
    path: getLocalizedPagePath(page, langKey, config),
  };

  if (!page.i18n_key) {
    update.i18n_key = getI18nKey(page) || inferI18nKeyFromSource(page.source);
  }

  return { $set: update };
}

module.exports = (hexo) => {
  const defaultPostProcessor = createPostProcessor(hexo);

  hexo.extend.processor.register(
    (sourcePath) => getLocalizedPostParams(hexo, sourcePath),
    (file) => {
      const stop = profile.start("postProcessor");
      const renderStop = profile.start("postProcessor.render");
      return Promise.resolve(defaultPostProcessor.process(file))
        .finally(() => renderStop())
        .then(() => {
          if (!isI18nEnabled(getConfig(hexo))) return null;
          if (!file.params.renderable) return null;

          const post = hexo.model("Post").findOne({ source: file.path });
          if (!post) return null;

          const updateStop = profile.start("postProcessor.i18nUpdate");
          try {
            return post.update(buildPostI18nUpdate(post, file.params.i18n_lang, getConfig(hexo)));
          } finally {
            updateStop();
          }
        })
        .finally(() => stop());
    },
  );

  hexo.extend.processor.register(
    (sourcePath) => getLocalizedPageParams(hexo, sourcePath),
    (file) => {
      const stop = profile.start("pageProcessor");
      try {
        if (!isI18nEnabled(getConfig(hexo))) return null;
        if (file.type === "delete") return null;

        const page = hexo.model("Page").findOne({ source: file.path });
        if (!page) return null;

        return page.update(buildPageI18nUpdate(page, file.params.i18n_lang, getConfig(hexo)));
      } finally {
        stop();
      }
    },
  );

  hexo.extend.filter.register(
    "post_permalink",
    (post) => {
      const stop = profile.start("post_permalink");
      try {
        if (!post || typeof post !== "object") return post;
        const activeConfig = getConfig(hexo);
        if (!isI18nEnabled(activeConfig)) return post;

        const langKey = getPageLanguageKey(post, activeConfig);
        const language = getLanguage(activeConfig, langKey);

        post.i18n_lang = post.i18n_lang || langKey;
        post.i18n_path = getLanguageBasePath(activeConfig, langKey);
        post.lang = language.locale;
        post.language = language.locale;
        post.i18n_key = post.i18n_key || getI18nKey(post) || inferI18nKeyFromSource(post.source);

        return post;
      } finally {
        stop();
      }
    },
    5,
  );

  hexo.extend.filter.register(
    "template_locals",
    (locals) => {
      const stop = profile.start("template_locals");
      try {
        const page = locals.page;
        const activeConfig = getConfig(hexo, locals);
        if (!page || !isI18nEnabled(activeConfig)) return locals;

        const langKey = getPageLanguageKey(page, activeConfig);
        const language = getLanguage(activeConfig, langKey);

        page.i18n_lang = page.i18n_lang || langKey;
        page.i18n_path = getLanguageBasePath(activeConfig, langKey);
        page.lang = language.locale;
        page.language = language.locale;
        page.i18n_key = page.i18n_key || getI18nKey(page) || inferI18nKeyFromSource(page.source);

        return locals;
      } finally {
        stop();
      }
    },
    5,
  );
};
