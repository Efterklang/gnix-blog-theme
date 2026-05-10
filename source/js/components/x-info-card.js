/**
 * Info card custom element.
 *
 * Usage:
 * <x-info-card
 *   name="GnixAij"
 *   description="Life Tracking & Tech Sharing"
 *   avatar="https://assets.vluv.space/avatar.webp"
 *   website="https://vluv.space"
 *   feed="/atom.xml"
 *   links='{"Github":{"icon":"mdi:github","url":"https://github.com/Efterklang"}}'
 *   quicklinks='{"Now":"now"}'
 * ></x-info-card>
 */

let infoCardStyleSheetInjected = false;

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value == null ? "" : String(value);
  return span.innerHTML;
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function parseJsonAttribute(element, name) {
  const value = element.getAttribute(name);
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function normalizeLinkEntry(entry) {
  if (typeof entry === "string") return { url: entry };
  if (entry && typeof entry === "object" && typeof entry.url === "string") return entry;
  return null;
}

class InfoCard extends HTMLElement {
  connectedCallback() {
    this.injectStyles();
    this.render();
  }

  injectStyles() {
    if (infoCardStyleSheetInjected) return;

    const style = `
      x-info-card {
        display: block;
        margin: 2rem 0;
      }

      .x-info-card {
        background: var(--base);
        border: 1px solid var(--surface0);
        border-radius: var(--radius);
        padding: clamp(1.25rem, 4vw, 2rem);
        position: relative;
        overflow: hidden;
      }

      .x-info-card::before {
        content: "";
        position: absolute;
        inset: auto -20% -45% 35%;
        height: 70%;
        background: radial-gradient(circle, hsl(from var(--lavender) h s l / 0.16), transparent 62%);
        pointer-events: none;
      }

      .x-info-header {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-bottom: 1.25rem;
        position: relative;
        z-index: 1;
      }

      .x-info-avatar {
        width: 3.5rem;
        height: 3.5rem;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid var(--surface0);
        flex: 0 0 auto;
      }

      .x-info-name {
        font-family: var(--font-serif);
        font-style: italic;
        font-size: 1.35rem;
        font-weight: 700;
        color: var(--rosewater);
        margin: 0;
        line-height: 1.2;
      }

      .x-info-desc {
        font-family: var(--font-sans-serif);
        font-size: 0.8rem;
        font-weight: 300;
        color: var(--subtext0);
        margin: 0.2rem 0 0;
      }

      .x-info-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
        gap: 0.75rem;
        padding-top: 1.25rem;
        border-top: 1px solid var(--surface0);
        position: relative;
        z-index: 1;
      }

      .x-info-item {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        min-width: 0;
      }

      .x-info-label {
        font-family: var(--font-mono);
        font-size: 0.65rem;
        font-weight: 500;
        color: var(--subtext0);
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }

      .x-info-value {
        font-family: var(--font-mono);
        font-size: 0.8125rem;
        color: var(--text);
        text-decoration: none;
        word-break: break-word;
        transition: color 0.2s ease;
      }

      .x-info-value:hover {
        color: var(--lavender);
      }

      .x-info-links {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.6rem 0.9rem;
        padding-top: 1.25rem;
        margin-top: 0.25rem;
        border-top: 1px solid var(--surface0);
        position: relative;
        z-index: 1;
      }

      .x-info-link {
        font-family: var(--font-mono);
        font-size: 0.8rem;
        color: var(--subtext0);
        text-decoration: none;
        transition: color 0.2s ease;
      }

      .x-info-link:hover {
        color: var(--lavender);
      }

      .x-info-link--icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.6rem;
        height: 1.6rem;
        border-radius: 50%;
        transition: color 0.2s ease, background 0.2s ease;
      }

      .x-info-link--icon:hover {
        color: var(--lavender);
        background: hsl(from var(--lavender) h s l / 0.08);
      }

      .x-info-link--icon iconify-icon {
        font-size: 1.1rem;
      }

      .x-info-sep {
        width: 1px;
        height: 1rem;
        background: var(--surface0);
        margin: 0 0.15rem;
      }

      @media (max-width: 520px) {
        .x-info-header {
          align-items: flex-start;
        }

        .x-info-details {
          grid-template-columns: 1fr;
        }
      }
    `;

    const styleEl = document.createElement("style");
    styleEl.textContent = style;
    document.head.appendChild(styleEl);
    infoCardStyleSheetInjected = true;
  }

  render() {
    const name = this.getAttribute("name") || "";
    const description = this.getAttribute("description") || "";
    const avatar = this.getAttribute("avatar") || "";
    const website = this.getAttribute("website") || "";
    const feed = this.getAttribute("feed") || "";
    const avatarLink = this.getAttribute("avatar-link") || avatar;
    const links = parseJsonAttribute(this, "links");
    const quicklinks = parseJsonAttribute(this, "quicklinks");

    const details = [
      website ? `<div class="x-info-item"><span class="x-info-label">Website</span><a href="${escapeAttribute(website)}" class="x-info-value" target="_blank" rel="noopener noreferrer">${escapeHtml(website.replace(/^https?:\/\//, ""))}</a></div>` : "",
      feed ? `<div class="x-info-item"><span class="x-info-label">Feed</span><a href="${escapeAttribute(feed)}" class="x-info-value" target="_blank" rel="noopener noreferrer">${escapeHtml(feed.replace(/^https?:\/\//, ""))}</a></div>` : "",
      avatarLink ? `<div class="x-info-item"><span class="x-info-label">Avatar</span><a href="${escapeAttribute(avatarLink)}" class="x-info-value" target="_blank" rel="noopener noreferrer">${escapeHtml(avatarLink.replace(/^https?:\/\//, ""))}</a></div>` : "",
    ]
      .filter(Boolean)
      .join("");

    const quicklinkItems = Object.keys(quicklinks)
      .map((label) => {
        const link = normalizeLinkEntry(quicklinks[label]);
        if (!link) return "";
        return `<a class="x-info-link" href="${escapeAttribute(link.url)}" target="_self" rel="noopener noreferrer">${escapeHtml(label)}</a>`;
      })
      .filter(Boolean);

    const socialItems = Object.keys(links)
      .map((label) => {
        const link = normalizeLinkEntry(links[label]);
        if (!link) return "";
        const icon = link.icon ? `<iconify-icon icon="${escapeAttribute(link.icon)}" aria-hidden="true"></iconify-icon>` : label;
        return `<a class="x-info-link x-info-link--icon" href="${escapeAttribute(link.url)}" target="_blank" rel="noopener noreferrer" title="${escapeAttribute(label)}">${icon}</a>`;
      })
      .filter(Boolean);

    const hasDivider = quicklinkItems.length > 0 && socialItems.length > 0;
    const linksHtml = [...quicklinkItems, hasDivider ? `<span class="x-info-sep" aria-hidden="true"></span>` : "", ...socialItems]
      .filter(Boolean)
      .join("");

    this.innerHTML = `
      <div class="x-info-card">
        <div class="x-info-header">
          ${avatar ? `<img src="${escapeAttribute(avatar)}" alt="${escapeAttribute(name)}" class="x-info-avatar" width="56" height="56" loading="lazy" decoding="async">` : ""}
          <div>
            ${name ? `<h3 class="x-info-name">${escapeHtml(name)}</h3>` : ""}
            ${description ? `<p class="x-info-desc">${escapeHtml(description)}</p>` : ""}
          </div>
        </div>
        ${details ? `<div class="x-info-details">${details}</div>` : ""}
        ${linksHtml ? `<div class="x-info-links">${linksHtml}</div>` : ""}
      </div>
    `;
  }
}

if (!customElements.get("x-info-card")) customElements.define("x-info-card", InfoCard);
