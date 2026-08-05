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

function isZhLocale() {
  return (document.documentElement.lang || "").toLowerCase().startsWith("zh");
}

function getUiText(key) {
  const zh = isZhLocale();
  const messages = {
    avatar: zh ? "头像" : "Avatar",
    feed: zh ? "订阅" : "Feed",
    website: zh ? "网站" : "Website",
  };
  return messages[key] || key;
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
      }

      .x-info-link--icon svg {
        width: 1.1rem;
        height: 1.1rem;
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

  brandIconSVG(label) {
    const svg = (d) => `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`;

    const ICONS = {
      Bluesky:
        "M12 11.388c-.906-1.761-3.372-5.044-5.665-6.662c-2.197-1.55-3.034-1.283-3.583-1.033C2.116 3.978 2 4.955 2 5.528c0 .575.315 4.709.52 5.4c.68 2.28 3.094 3.05 5.32 2.803c-3.26.483-6.157 1.67-2.36 5.898c4.178 4.325 5.726-.927 6.52-3.59c.794 2.663 1.708 7.726 6.444 3.59c3.556-3.59.977-5.415-2.283-5.898c2.225.247 4.64-.523 5.319-2.803c.205-.69.52-4.825.52-5.399c0-.575-.116-1.55-.752-1.838c-.549-.248-1.386-.517-3.583 1.033c-2.293 1.621-4.76 4.904-5.665 6.664",
      Github:
        "M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34c-.46-1.16-1.11-1.47-1.11-1.47c-.91-.62.07-.6.07-.6c1 .07 1.53 1.03 1.53 1.03c.87 1.52 2.34 1.07 2.91.83c.09-.65.35-1.09.63-1.34c-2.22-.25-4.55-1.11-4.55-4.92c0-1.11.38-2 1.03-2.71c-.1-.25-.45-1.29.1-2.64c0 0 .84-.27 2.75 1.02c.79-.22 1.65-.33 2.5-.33s1.71.11 2.5.33c1.91-1.29 2.75-1.02 2.75-1.02c.55 1.35.2 2.39.1 2.64c.65.71 1.03 1.6 1.03 2.71c0 3.82-2.34 4.66-4.57 4.91c.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2",
      Youtube:
        "M12 4c.855 0 1.732.022 2.582.058l1.004.048l.961.057l.9.061l.822.064a3.8 3.8 0 0 1 3.494 3.423l.04.425l.075.91c.07.943.122 1.971.122 2.954s-.052 2.011-.122 2.954l-.075.91l-.04.425a3.8 3.8 0 0 1-3.495 3.423l-.82.063l-.9.062l-.962.057l-1.004.048A62 62 0 0 1 12 20a62 62 0 0 1-2.582-.058l-1.004-.048l-.961-.057l-.9-.062l-.822-.063a3.8 3.8 0 0 1-3.494-3.423l-.04-.425l-.075-.91A41 41 0 0 1 2 12c0-.983.052-2.011.122-2.954l.075-.91l.04-.425A3.8 3.8 0 0 1 5.73 4.288l.821-.064l.9-.061l.962-.057l1.004-.048A62 62 0 0 1 12 4m-2 5.575v4.85c0 .462.5.75.9.52l4.2-2.425a.6.6 0 0 0 0-1.04l-4.2-2.424a.6.6 0 0 0-.9.52Z",
      Bilibili:
        "M17.555 3.168a1 1 0 0 1 .277 1.387L16.87 6H18a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4v-7a4 4 0 0 1 4-4h1.131l-.963-1.445a1 1 0 0 1 1.664-1.11L9.535 6h4.93l1.703-2.555a1 1 0 0 1 1.387-.277M9 11a1 1 0 0 0-.993.883L8 12v2a1 1 0 0 0 1.993.117L10 14v-2a1 1 0 0 0-1-1m6 0a1 1 0 0 0-1 1v2a1 1 0 1 0 2 0v-2a1 1 0 0 0-1-1",
      Threads:
        "M5.086 4.28c1.65-1.76 4.031-2.78 6.93-2.78c4.792 0 8.017 2.784 9.033 6.65a1.5 1.5 0 0 1-2.902.762C17.48 6.37 15.45 4.5 12.017 4.5c-2.164 0-3.72.742-4.742 1.832C6.239 7.438 5.64 9.02 5.64 10.875v2.25c0 1.855.598 3.437 1.634 4.543c1.022 1.09 2.578 1.832 4.741 1.832c1.576 0 2.795-.365 3.714-.93c.92-.568 1.42-1.285 1.56-2.068c.173-.972-.044-1.579-.364-2.001a2 2 0 0 0-.116-.14a5.3 5.3 0 0 1-.623 1.382c-1.514 2.3-4.369 2.46-6.203 1.728c-1.091-.435-1.972-1.583-2.247-2.788a3.5 3.5 0 0 1 .168-2.147c.312-.75.884-1.37 1.662-1.828c.8-.472 1.927-.665 2.979-.694a11 11 0 0 1 1.254.04c-.09-.2-.187-.343-.274-.425c-.384-.357-1.06-.632-1.746-.628c-.647.005-1.126.247-1.41.7a1.5 1.5 0 1 1-2.544-1.59c.948-1.515 2.507-2.1 3.933-2.11c1.388-.01 2.821.512 3.81 1.432c.954.888 1.373 2.254 1.513 3.485c.836.403 1.63.974 2.234 1.77c.874 1.15 1.233 2.624.927 4.34c-.32 1.793-1.45 3.178-2.94 4.096c-1.457.898-3.239 1.376-5.287 1.376c-2.899 0-5.28-1.02-6.93-2.78c-1.636-1.746-2.445-4.1-2.445-6.595v-2.25c0-2.494.81-4.85 2.445-6.594Zm8.947 8.823a8 8 0 0 0-1.405-.09c-.86.024-1.384.188-1.537.279c-.305.18-.39.333-.417.398a.53.53 0 0 0-.011.327c.036.16.121.333.238.48a.8.8 0 0 0 .194.186q.008.006 0 .002c.985.393 2.105.14 2.586-.592c.137-.207.265-.553.352-.99",
      X: "M19.753 4.659a1 1 0 0 0-1.506-1.317l-5.11 5.84L8.8 3.4A1 1 0 0 0 8 3H4a1 1 0 0 0-.8 1.6l6.437 8.582l-5.39 6.16a1 1 0 0 0 1.506 1.317l5.11-5.841L15.2 20.6a1 1 0 0 0 .8.4h4a1 1 0 0 0 .8-1.6l-6.437-8.582l5.39-6.16ZM16.5 19L6 5h1.5L18 19",
      Steam:
        "M12 2a10 10 0 0 1 10 10a10 10 0 0 1-10 10c-4.6 0-8.45-3.08-9.64-7.27l3.83 1.58a2.84 2.84 0 0 0 2.78 2.27c1.56 0 2.83-1.27 2.83-2.83v-.13l3.4-2.43h.08c2.08 0 3.77-1.69 3.77-3.77s-1.69-3.77-3.77-3.77s-3.78 1.69-3.78 3.77v.05l-2.37 3.46l-.16-.01c-.59 0-1.14.18-1.59.49L2 11.2C2.43 6.05 6.73 2 12 2M8.28 17.17c.8.33 1.72-.04 2.05-.84s-.05-1.71-.83-2.04l-1.28-.53c.49-.18 1.04-.19 1.56.03c.53.21.94.62 1.15 1.15c.22.52.22 1.1 0 1.62c-.43 1.08-1.7 1.6-2.78 1.15c-.5-.21-.88-.59-1.09-1.04zm9.52-7.75c0 1.39-1.13 2.52-2.52 2.52a2.52 2.52 0 0 1-2.51-2.52a2.5 2.5 0 0 1 2.51-2.51a2.52 2.52 0 0 1 2.52 2.51m-4.4 0c0 1.04.84 1.89 1.89 1.89c1.04 0 1.88-.85 1.88-1.89s-.84-1.89-1.88-1.89c-1.05 0-1.89.85-1.89 1.89",
      RSS: "M5 17a2 2 0 1 1 0 4a2 2 0 0 1 0-4M5 3c8.837 0 16 7.163 16 16q0 .277-.01.55a1.5 1.5 0 1 1-2.997-.1A13 13 0 0 0 18 19c0-7.18-5.82-13-13-13q-.225 0-.45.008a1.5 1.5 0 0 1-.1-2.999Q4.722 3 5 3m0 7a9 9 0 0 1 8.98 9.599a1.5 1.5 0 1 1-2.993-.198a6 6 0 0 0-6.388-6.388a1.5 1.5 0 0 1-.197-2.993Q4.699 10 5 10",
    };

    return ICONS[label] ? svg(ICONS[label]) : svg("M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14l11-11");
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
      website
        ? `<div class="x-info-item"><span class="x-info-label">${escapeHtml(getUiText("website"))}</span><a href="${escapeAttribute(website)}" class="x-info-value" target="_blank" rel="noopener noreferrer">${escapeHtml(website.replace(/^https?:\/\//, ""))}</a></div>`
        : "",
      feed
        ? `<div class="x-info-item"><span class="x-info-label">${escapeHtml(getUiText("feed"))}</span><a href="${escapeAttribute(feed)}" class="x-info-value" target="_blank" rel="noopener noreferrer">${escapeHtml(feed.replace(/^https?:\/\//, ""))}</a></div>`
        : "",
      avatarLink
        ? `<div class="x-info-item"><span class="x-info-label">${escapeHtml(getUiText("avatar"))}</span><a href="${escapeAttribute(avatarLink)}" class="x-info-value" target="_blank" rel="noopener noreferrer">${escapeHtml(avatarLink.replace(/^https?:\/\//, ""))}</a></div>`
        : "",
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
        const iconSvg = this.brandIconSVG(label);
        return `<a class="x-info-link x-info-link--icon" href="${escapeAttribute(link.url)}" target="_blank" rel="noopener noreferrer" title="${escapeAttribute(label)}">${iconSvg}</a>`;
      })
      .filter(Boolean);

    const hasDivider = quicklinkItems.length > 0 && socialItems.length > 0;
    const linksHtml = [...quicklinkItems, hasDivider ? `<span class="x-info-sep" aria-hidden="true"></span>` : "", ...socialItems].filter(Boolean).join("");

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
