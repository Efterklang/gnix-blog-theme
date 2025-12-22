const { isDate, parseISO, isValid } = require("date-fns");
const { Component } = require("inferno");
const { stripHTML, escapeHTML } = require("hexo-util");

module.exports = class extends Component {
  render() {
    const { title, url, author, publisher } = this.props;
    let { description, images, date, updated, publisherLogo } = this.props;

    if (description) {
      description = escapeHTML(
        stripHTML(description).substring(0, 200).trim(),
      ).replace(/\n/g, " ");
    }

    if (!Array.isArray(images)) {
      images = [images];
    }
    images = images
      .map((path) => {
        const parsed = new URL(path, url);
        return parsed.toString();
      })
      .filter(
        (url) =>
          url.endsWith(".jpg") ||
          url.endsWith(".png") ||
          url.endsWith(".gif") ||
          url.endsWith(".webp"),
      );

    if (typeof publisherLogo === "string") {
      const parsedLogo = new URL(publisherLogo, url);
      publisherLogo = parsedLogo.toString();
    }

    if (date) {
      const d = typeof date === "string" ? parseISO(date) : date;
      if ((isDate(d) || d instanceof Date) && isValid(d)) {
        date = d.toISOString();
      }
    }

    if (updated) {
      const u = typeof updated === "string" ? parseISO(updated) : updated;
      if ((isDate(u) || u instanceof Date) && isValid(u)) {
        updated = u.toISOString();
      }
    }

    const data = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": url,
      },
      headline: title,
      image: images,
      datePublished: date,
      dateModified: updated,
      author: {
        "@type": "Person",
        name: author,
      },
      publisher: {
        "@type": "Organization",
        name: publisher,
        logo: {
          "@type": "ImageObject",
          url: publisherLogo,
        },
      },
      description: description,
    };

    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      ></script>
    );
  }
};
