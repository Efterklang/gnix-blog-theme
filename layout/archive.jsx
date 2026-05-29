const { Component, Fragment, isValidDate, parseISO, dateFormatters } = require("../include/util/common");
const ArticleMedia = require("./common/article_media");

function collectPosts(collection) {
  const posts = [];
  if (collection?.each) {
    collection.each((post) => posts.push(post));
  } else if (Array.isArray(collection)) {
    posts.push(...collection);
  }
  return posts;
}

function estimateReadMinutes(content) {
  if (typeof content !== "string" || !content) return 0;
  const stripped = content.replace(/<\/?[a-z][^>]*>/gi, "").trim();
  if (!stripped) return 0;
  const tokens = stripped.match(/[ÿ-￿]|[a-zA-Z]+/g);
  return tokens ? Math.max(1, Math.ceil(tokens.length / 200)) : 0;
}

function getSeason(month) {
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Autumn";
  return "Winter";
}

function getArchiveRangeLabel(year, month = null, season = null) {
  if (!year) return "All Posts";
  if (month) {
    const time = parseISO(`${year}-${String(month).padStart(2, "0")}-01T00:00:00.000Z`);
    return isValidDate(time) ? `${dateFormatters.longMonth.format(time)} ${year}` : String(year);
  }
  return season ? `${season} ${year}` : String(year);
}

function groupPostsBySeason(posts) {
  return posts.reduce((groups, post) => {
    const year = post.date.year();
    const season = getSeason(post.date.month());
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.year === year && lastGroup.season === season) {
      lastGroup.posts.push(post);
    } else {
      groups.push({ year, season, posts: [post] });
    }

    return groups;
  }, []);
}

function groupSeasonGroupsByYear(seasonGroups) {
  const years = [];
  for (const group of seasonGroups) {
    const last = years[years.length - 1];
    if (last && last.year === group.year) {
      last.groups.push(group);
      last.total += group.posts.length;
    } else {
      years.push({ year: group.year, total: group.posts.length, groups: [group] });
    }
  }
  return years;
}

function toRoman(num) {
  const map = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let n = num;
  let out = "";
  for (const [value, sym] of map) {
    while (n >= value) {
      out += sym;
      n -= value;
    }
  }
  return out;
}

function collectArchiveYears(posts) {
  return Array.from(new Set(posts.map((post) => post.date.year()))).sort((a, b) => b - a);
}

function getPostDateParts(postDate, dateXml, date) {
  const xml = dateXml(postDate);
  const parsed = parseISO(xml);

  return {
    label: isValidDate(parsed) ? dateFormatters.shortDay.format(parsed) : date(postDate),
    xml,
  };
}

function renderSeasonGroup({ posts, year, season, month, sectionTitle, url_for, date_xml, date }) {
  const title = sectionTitle || getArchiveRangeLabel(year, month, season);
  const kicker = year ? String(year) : "Archive";
  const marker = season ? season.toLowerCase() : "all";
  const sectionId = `archive-${kicker}-${marker}-${month || "all"}`;

  return (
    <section class={["archive-group", marker].filter(Boolean).join(" ")} aria-labelledby={sectionId}>
      <header class="archive-group__header">
        <h2 id={sectionId} class="archive-group__title">
          {title}
        </h2>
        <span class="archive-group__count">{String(posts.length).padStart(2, "0")}</span>
      </header>
      <div class="timeline">
        {posts.map((post) => {
          const postDate = getPostDateParts(post.date, date_xml, date);
          const readMinutes = estimateReadMinutes(post._content);
          return (
            <ArticleMedia
              key={post.path}
              url={url_for(post.link || post.path)}
              title={post.title}
              date={postDate.label}
              dateXml={postDate.xml}
              excerpt={post.excerpt || null}
              readTime={readMinutes ? `${readMinutes} min` : null}
            />
          );
        })}
      </div>
    </section>
  );
}

module.exports = class extends Component {
  render() {
    const { page, helper } = this.props;
    const { url_for, date_xml, date } = helper;

    const visiblePosts = collectPosts(page.posts);
    const totalVisiblePosts = visiblePosts.length;

    const years = collectArchiveYears(visiblePosts);

    const currentYear = page.year ? Number(page.year) : null;
    const currentMonth = page.month ? Number(page.month) : null;
    const isTagPage = Boolean(page.tag);
    const entriesLabel = `${totalVisiblePosts} ${totalVisiblePosts === 1 ? "entry" : "entries"}`;

    let articleList;
    if (!page.year) {
      const seasonGroups = groupPostsBySeason(visiblePosts);
      const yearBlocks = groupSeasonGroupsByYear(seasonGroups);
      articleList = yearBlocks.map((block) => (
        <Fragment key={block.year}>
          <div class="archive-era" id={`archive-year-${block.year}`}>
            <span class="archive-era__roman">{toRoman(block.year)}</span>
            <span class="archive-era__year" aria-hidden="true">
              {" "}
              {block.year}{" "}
            </span>
          </div>
          {block.groups.map((group) => (
            <Fragment key={`${group.year}-${group.season}`}>
              {renderSeasonGroup({
                posts: group.posts,
                year: group.year,
                season: group.season,
                sectionTitle: group.season,
                url_for,
                date_xml,
                date,
              })}
            </Fragment>
          ))}
        </Fragment>
      ));
    } else {
      const season = page.month ? getSeason(page.month - 1) : null;
      articleList = renderSeasonGroup({
        posts: visiblePosts,
        year: page.year,
        season,
        month: page.month,
        url_for,
        date_xml,
        date,
      });
    }

    const heroTitle = isTagPage ? page.tag : currentYear ? getArchiveRangeLabel(currentYear, currentMonth) : "Posts";
    const heroKind = isTagPage ? "Tag" : "Archive";

    return (
      <main class="archive-page">
        <header class="archive-hero">
          <p class="archive-hero__eyebrow">
            <span>{heroKind}</span>
            <span class="archive-hero__sep" aria-hidden="true">
              ·
            </span>
            <span class="archive-hero__count">{entriesLabel}</span>
          </p>
          <h1 class="archive-hero__title">{heroTitle}</h1>
          {years.length > 0 && (
            <span class="archive-hero__roman" aria-hidden="true">
              {years.length === 1 ? toRoman(years[0]) : `${toRoman(years[years.length - 1])}–${toRoman(years[0])}`}
            </span>
          )}
        </header>

        {!page.year && years.length > 1 && (
          <aside class="archive-rail" aria-label="Jump to year">
            <ol class="archive-rail__list">
              {years.map((year) => (
                <li key={year} class="archive-rail__item">
                  <a href={`#archive-year-${year}`} class="archive-rail__link">
                    <span class="archive-rail__year">{year}</span>
                  </a>
                </li>
              ))}
            </ol>
          </aside>
        )}

        <div class="archive-stack">{articleList}</div>
      </main>
    );
  }
};
