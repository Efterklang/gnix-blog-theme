const { Component, isValidDate, parseISO } = require("../../include/util/common");
const { encodeURL, stripHTML } = require("hexo-util");

const DESCRIPTION_LENGTH = 160;
const IMAGE_TYPES = {
  avif: "image/avif",
  gif: "image/gif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const localeMap = {
  zh: "zh_CN",
  en: "en_US",
  de: "de_DE",
  es: "es_ES",
  fr: "fr_FR",
  hu: "hu_HU",
  id: "id_ID",
  it: "it_IT",
  ja: "ja_JP",
  ko: "ko_KR",
  nl: "nl_NL",
  ru: "ru_RU",
  th: "th_TH",
  tr: "tr_TR",
  vi: "vi_VN",
};

function normalizeText(value, maxLength) {
  if (typeof value !== "string") return "";

  const text = stripHTML(value).replace(/\s+/g, " ").trim();
  if (!maxLength || text.length <= maxLength) return text;

  return (
    text
      .slice(0, maxLength)
      .replace(/\s+\S*$/, "")
      .trim() || text.slice(0, maxLength).trim()
  );
}

function normalizeUrl(value, base) {
  if (!value) return "";

  try {
    return encodeURL(new URL(value, base).toString());
  } catch (_) {
    return "";
  }
}

function normalizeLocale(language) {
  if (typeof language !== "string") return "";

  const normalized = language.replace("_", "-").trim();
  if (normalized.length === 2) {
    return localeMap[normalized.toLowerCase()] || "";
  }

  if (/^[a-z]{2}-[a-z]{2}$/i.test(normalized)) {
    const [lang, territory] = normalized.split("-");
    return `${lang.toLowerCase()}_${territory.toUpperCase()}`;
  }

  return "";
}

function normalizeImageUrls(images, base) {
  const values = Array.isArray(images) ? images : [images];

  return [
    ...new Set(
      values
        .filter(Boolean)
        .map((path) => normalizeUrl(path, base))
        .filter(Boolean)
        .filter((url) => {
          try {
            const { protocol } = new URL(url);
            return protocol === "http:" || protocol === "https:";
          } catch (_) {
            return false;
          }
        }),
    ),
  ];
}

function getImageType(url) {
  try {
    const ext = new URL(url).pathname.split(".").pop().toLowerCase();
    return IMAGE_TYPES[ext] || "";
  } catch (_) {
    return "";
  }
}

function normalizeKeywords(keywords) {
  const values = Array.isArray(keywords) ? keywords : [keywords];
  const names = values.flatMap((keyword) => {
    const value = keyword && typeof keyword === "object" ? keyword.name : keyword;
    if (typeof value !== "string") return [];
    return value.split(",");
  });

  return [...new Set(names.map((keyword) => normalizeText(keyword)).filter(Boolean))];
}

function normalizeTwitterHandle(value) {
  const handle = normalizeText(value);
  if (!handle) return "";

  return handle.startsWith("@") ? handle : `@${handle}`;
}

function normalizeDate(value) {
  if (!value) return "";

  const date = typeof value === "string" ? parseISO(value) : value;
  return isValidDate(date) ? date.toISOString() : "";
}

module.exports = class extends Component {
  render() {
    const { type, title, date, updated, author, url, siteName, twitterCard, twitterSite, googlePlus, facebookAdmins, facebookAppId, section, imageWidth, imageHeight } = this.props;

    let { description, language, images, keywords, twitterId, imageAlt } = this.props;

    const htmlTags = [];
    const ogType = type || "website";
    const isArticle = ogType === "article";
    const pageUrl = normalizeUrl(url, url);
    const normalizedTitle = normalizeText(title || siteName);
    const normalizedSiteName = normalizeText(siteName);
    const normalizedAuthor = normalizeText(author);
    const publishedTime = normalizeDate(date);
    const modifiedTime = normalizeDate(updated);
    const normalizedKeywords = normalizeKeywords(keywords);

    description = normalizeText(description, DESCRIPTION_LENGTH);
    if (description) {
      htmlTags.push(<meta name="description" content={description} />);
      htmlTags.push(<meta property="og:description" content={description} />);
    }

    htmlTags.push(<meta property="og:type" content={ogType} />);
    if (normalizedTitle) htmlTags.push(<meta property="og:title" content={normalizedTitle} />);
    if (pageUrl) htmlTags.push(<meta property="og:url" content={pageUrl} />);
    if (normalizedSiteName) htmlTags.push(<meta property="og:site_name" content={normalizedSiteName} />);

    language = normalizeLocale(language);
    if (language) htmlTags.push(<meta property="og:locale" content={language} />);

    const imageUrls = normalizeImageUrls(images, pageUrl || url);
    imageAlt = normalizeText(imageAlt || title);

    imageUrls.forEach((path) => {
      htmlTags.push(<meta property="og:image" content={path} />);
      if (path.startsWith("https://")) htmlTags.push(<meta property="og:image:secure_url" content={path} />);

      const imageType = getImageType(path);
      if (imageType) htmlTags.push(<meta property="og:image:type" content={imageType} />);
      if (imageWidth) htmlTags.push(<meta property="og:image:width" content={imageWidth} />);
      if (imageHeight) htmlTags.push(<meta property="og:image:height" content={imageHeight} />);
      if (imageAlt) htmlTags.push(<meta property="og:image:alt" content={imageAlt} />);
    });

    if (isArticle) {
      if (publishedTime) htmlTags.push(<meta property="article:published_time" content={publishedTime} />);
      if (modifiedTime) htmlTags.push(<meta property="article:modified_time" content={modifiedTime} />);
      if (normalizedAuthor) htmlTags.push(<meta property="article:author" content={normalizedAuthor} />);

      const normalizedSection = normalizeText(section);
      if (normalizedSection) htmlTags.push(<meta property="article:section" content={normalizedSection} />);

      normalizedKeywords.forEach((keyword) => {
        htmlTags.push(<meta property="article:tag" content={keyword} />);
      });
    } else if (modifiedTime) {
      htmlTags.push(<meta property="og:updated_time" content={modifiedTime} />);
    }

    htmlTags.push(<meta name="twitter:card" content={twitterCard || (imageUrls.length > 0 ? "summary_large_image" : "summary")} />);
    if (normalizedTitle) htmlTags.push(<meta name="twitter:title" content={normalizedTitle} />);
    if (description) htmlTags.push(<meta name="twitter:description" content={description} />);
    if (pageUrl) htmlTags.push(<meta name="twitter:url" content={pageUrl} />);
    if (imageUrls.length > 0) {
      htmlTags.push(<meta name="twitter:image" content={imageUrls[0]} />);
      if (imageAlt) htmlTags.push(<meta name="twitter:image:alt" content={imageAlt} />);
    }
    const normalizedTwitterId = normalizeTwitterHandle(twitterId);
    const normalizedTwitterSite = normalizeTwitterHandle(twitterSite);
    if (normalizedTwitterId) htmlTags.push(<meta name="twitter:creator" content={normalizedTwitterId} />);
    if (normalizedTwitterSite) htmlTags.push(<meta name="twitter:site" content={normalizedTwitterSite} />);
    if (googlePlus) htmlTags.push(<link rel="publisher" href={googlePlus} />);
    if (facebookAdmins) htmlTags.push(<meta property="fb:admins" content={facebookAdmins} />);
    if (facebookAppId) htmlTags.push(<meta property="fb:app_id" content={facebookAppId} />);

    return <>{htmlTags}</>;
  }
};
