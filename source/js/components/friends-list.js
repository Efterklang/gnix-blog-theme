/**
 * Friends list custom elements.
 *
 * Usage:
 * <friends-list id="friends">
 *   <friend-card
 *     name="Example"
 *     href="https://example.com"
 *     display-url="example.com"
 *     avatar="https://example.com/avatar.png"
 *     description="Personal site"
 *     feed="https://example.com/atom.xml"
 *     open-label="Open"
 *   ></friend-card>
 * </friends-list>
 */

let friendsListStyleSheetInjected = false;

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value == null ? "" : String(value);
  return span.innerHTML;
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function displayUrlFromHref(href) {
  try {
    const url = new URL(href);
    return url.hostname.replace(/^www\./, "www.");
  } catch {
    return href.replace(/^https?:\/\//, "").replace(/\/$/, "");
  }
}

function injectFriendsListStyles() {
  if (friendsListStyleSheetInjected) return;

  const style = `
    friends-list {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      padding: 0;
    }

    friend-card {
      position: relative;
      grid-column: span 2;
      padding: 1.5rem;
      background: var(--base);
      border: .5px solid var(--surface0);
      cursor: pointer;
      overflow: hidden;
      min-height: 5.25rem;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    friend-card:focus-within,
    friend-card:hover {
      border-color: var(--lavender);
      box-shadow: 0 0.75rem 2.5rem -0.75rem hsl(from var(--text) h s l / 0.1);
    }

    friend-card:nth-last-child(1):nth-child(3n+1) {
      grid-column: span 6;
    }

    friend-card:nth-last-child(1):nth-child(3n+2),
    friend-card:nth-last-child(2):nth-child(3n+1) {
      grid-column: span 3;
    }

    friend-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 100% 100%, hsl(from var(--lavender) h s l / 0.14), transparent 55%);
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 0;
    }

    friend-card:focus-within::before,
    friend-card:hover::before {
      opacity: 1;
    }

    .friend-hit {
      position: absolute;
      inset: 0;
      z-index: 2;
      border-radius: inherit;
    }

    .friend-avatar {
      position: absolute;
      bottom: -0.5rem;
      right: -0.5rem;
      width: 6rem;
      height: 6rem;
      border-radius: 50%;
      background-color: var(--surface0);
      object-fit: cover;
      opacity: 0.08;
      filter: grayscale(0.5);
      transform: rotate(-8deg);
      transition: all 0.3s ease;
      z-index: 0;
      pointer-events: none;
      border: none;
    }

    friend-card:focus-within .friend-avatar,
    friend-card:hover .friend-avatar {
      opacity: 0.15;
      filter: grayscale(0);
      transform: scale(1.1) rotate(-8deg);
    }

    .friend-detail {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      margin: 0;
    }

    h3.friend-name {
      font-family: var(--font-serif);
      font-style: italic;
      font-synthesis: none;
      font-size: 0.92rem;
      font-weight: bolder;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 0.5rem;
      line-height: 1.3;
      margin: 0;
    }

    .friend-name .rss-link {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.25rem;
      height: 1.25rem;
      color: var(--subtext0);
      text-decoration: none;
      transition: all 0.2s ease;
      border: 1px solid var(--surface0);
      border-radius: 50%;
      font-size: 0.75rem;
      position: relative;
      z-index: 3;
      flex: 0 0 auto;
    }

    .friend-name .rss-link:hover {
      color: var(--lavender);
      border-color: var(--lavender);
    }

    .friend-url {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      font-weight: 400;
      color: var(--subtext0);
      opacity: 0.7;
      transition: all 0.2s ease;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin: 0;
    }

    friend-card:hover .friend-url {
      opacity: 1;
      color: var(--lavender);
    }

    .friend-desc {
      font-family: var(--font-sans-serif);
      font-size: 0.8rem;
      color: var(--subtext1);
      margin: 0.5rem 0 0;
      padding: 0;
      overflow: hidden;
    }

    @media (max-width: 768px) {
      friends-list {
        grid-template-columns: 1fr;
      }

      friend-card,
      friend-card:nth-last-child(1):nth-child(3n+1),
      friend-card:nth-last-child(1):nth-child(3n+2),
      friend-card:nth-last-child(2):nth-child(3n+1) {
        grid-column: span 1;
      }

      friend-card:nth-child(1) {
        min-height: 6.25rem;
      }
    }

    @media (max-width: 480px) {
      friend-card {
        padding: 1.1rem;
      }
    }
  `;

  const styleEl = document.createElement("style");
  styleEl.textContent = style;
  document.head.appendChild(styleEl);
  friendsListStyleSheetInjected = true;
}

class FriendsList extends HTMLElement {
  connectedCallback() {
    injectFriendsListStyles();
    if (!this.hasAttribute("role")) this.setAttribute("role", "list");
  }
}

class FriendCard extends HTMLElement {
  connectedCallback() {
    injectFriendsListStyles();
    this.render();
  }

  render() {
    const name = this.getAttribute("name") || "";
    const href = this.getAttribute("href") || "";
    const displayUrl = this.getAttribute("display-url") || displayUrlFromHref(href);
    const avatar = this.getAttribute("avatar") || "";
    const description = this.getAttribute("description") || "";
    const feed = this.getAttribute("feed") || "";
    const openLabel = this.getAttribute("open-label") || "Open";
    const ariaLabel = href && name ? `${openLabel} ${name}` : "";

    this.setAttribute("role", "listitem");
    this.innerHTML = `
      ${href ? `<a class="friend-hit" href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeAttribute(ariaLabel)}"></a>` : ""}
      ${avatar ? `<img class="friend-avatar" src="${escapeAttribute(avatar)}" alt="" width="96" height="96" loading="lazy" decoding="async">` : ""}
      <article class="friend-detail">
        <h3 class="friend-name">
          ${escapeHtml(name)}
          ${feed ? `<a class="rss-link" target="_blank" rel="noopener noreferrer" href="${escapeAttribute(feed)}" title="RSS Feed">◎</a>` : ""}
        </h3>
        ${displayUrl ? `<div class="friend-url">${escapeHtml(displayUrl)}</div>` : ""}
        ${description ? `<div class="friend-desc">${escapeHtml(description)}</div>` : ""}
      </article>
    `;
  }
}

if (!customElements.get("friends-list")) customElements.define("friends-list", FriendsList);
if (!customElements.get("friend-card")) customElements.define("friend-card", FriendCard);

export { FriendCard, FriendsList };
