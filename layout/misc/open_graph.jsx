const { isDate, parseISO, isValid } = require("date-fns");
const { Component } = require("inferno");
const { encodeURL, stripHTML, escapeHTML } = require("hexo-util");
const localeMap = {
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
const localeRegex = new RegExp(Object.keys(localeMap).join("|"), "i");

module.exports = class extends Component {
  render() {
    const {
      type,
      title,
      date,
      updated,
      author,
      url,
      siteName,
      twitterCard,
      twitterSite,
      googlePlus,
      facebookAdmins,
      facebookAppId,
    } = this.props;
    let { description, language, images, keywords, twitterId } = this.props;

    const htmlTags = [];

    if (description) {
      description = escapeHTML(
        stripHTML(description).substring(0, 200).trim(),
      ).replace(/\n/g, " ");
      htmlTags.push(<meta name="description" content={description} />);
      htmlTags.push(<meta property="og:description" content={description} />);
    }

    htmlTags.push(<meta property="og:type" content={type || "website"} />);
    htmlTags.push(<meta property="og:title" content={title} />);
    htmlTags.push(<meta property="og:url" content={encodeURL(url)} />);
    htmlTags.push(<meta property="og:site_name" content={siteName} />);

    if (language) {
      if (language.length === 2) {
        language = language.replace(localeRegex, (str) => localeMap[str]);
        htmlTags.push(<meta property="og:locale" content={language} />);
      } else if (language.length === 5) {
        const territory = language.slice(-2);
        const territoryRegex = new RegExp(territory.concat("$"));
        language = language
          .replace("-", "_")
          .replace(territoryRegex, territory.toUpperCase());
        htmlTags.push(<meta property="og:locale" content={language} />);
      }
    }

    if (!Array.isArray(images)) {
      images = [images];
    }
    images
      .map((path) => {
        const parsed = new URL(path, url);
        return parsed.toString();
      })
      .forEach((path) => {
        htmlTags.push(<meta property="og:image" content={path} />);
      });

    if (date) {
      const d = typeof date === "string" ? parseISO(date) : date;
      if ((isDate(d) || d instanceof Date) && isValid(d)) {
        htmlTags.push(
          <meta property="article:published_time" content={d.toISOString()} />,
        );
      }
    }

    if (updated) {
      const u = typeof updated === "string" ? parseISO(updated) : updated;
      if ((isDate(u) || u instanceof Date) && isValid(u)) {
        htmlTags.push(
          <meta property="article:modified_time" content={u.toISOString()} />,
        );
      }
    }

    if (author)
      htmlTags.push(<meta property="article:author" content={author} />);

    if (keywords) {
      if (typeof keywords === "string") {
        keywords = [keywords];
      }

      keywords
        .map((tag) => {
          return tag.name ? tag.name : tag;
        })
        .filter(Boolean)
        .forEach((keyword) => {
          htmlTags.push(<meta property="article:tag" content={keyword} />);
        });
    }

    htmlTags.push(
      <meta property="twitter:card" content={twitterCard || "summary"} />,
    );

    if (twitterId)
      htmlTags.push(<meta property="twitter:creator" content={twitterId} />);

    if (twitterSite)
      htmlTags.push(<meta property="twitter:site" content={twitterSite} />);

    if (googlePlus) htmlTags.push(<link rel="publisher" href={googlePlus} />);

    if (facebookAdmins)
      htmlTags.push(<meta property="fb:admins" content={facebookAdmins} />);

    if (facebookAppId)
      htmlTags.push(<meta property="fb:app_id" content={facebookAppId} />);

    return <>{htmlTags}</>;
  }
};
