/**
 * Chat Component Custom Element
 * Displays group chat conversations with avatars, names, timestamps, and messages
 *
 * Usage:
 * <x-chat>
 *   <chat-message
 *     name="User Name"
 *     avatar="/path/to/avatar.png"
 *     timestamp="2024-01-15 10:30"
 *     is-me
 *   >
 *     Message content here...
 *   </chat-message>
 *   <chat-message name="Other User" avatar="/path/to/avatar.png" timestamp="2024-01-15 10:32">
 *     Another message...
 *   </chat-message>
 * </x-chat>
 *
 * Or with data attribute:
 * <x-chat messages='[{"name": "User", "content": "Hello", "timestamp": "10:30"}]'></x-chat>
 */

function escapeHtml(value) {
  const span = document.createElement("span");
  span.textContent = value == null ? "" : String(value);
  return span.innerHTML;
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

const CHAT_STYLES = `
  :host {
    display: block;
    font-family: var(--article-font-family, var(--font-sans-serif, system-ui, sans-serif));
    color: var(--sub-text-color, #bac4de);
  }

  .chat-container {
    display: flex;
    flex-direction: column;
    gap: 22px;
    padding: 4px 0;
    max-height: 640px;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: hsl(from var(--title-text-color, #e1e7f6) h s l / 0.18) transparent;
  }

  .chat-container::-webkit-scrollbar { width: 6px; }
  .chat-container::-webkit-scrollbar-thumb {
    background: hsl(from var(--title-text-color, #e1e7f6) h s l / 0.18);
    border-radius: 3px;
  }
  .chat-container::-webkit-scrollbar-track { background: transparent; }

  .chat-message {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-areas:
      "avatar header"
      "avatar bubble";
    column-gap: 12px;
    row-gap: 6px;
    align-items: start;
  }

  .chat-message.is-me {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "header avatar"
      "bubble avatar";
  }

  .avatar,
  .avatar-placeholder {
    grid-area: avatar;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    align-self: start;
  }

  .avatar { object-fit: cover; }

  .avatar-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: var(--font-weight-semibold, 550);
    color: var(--title-text-color, #e1e7f6);
    background: var(--surface1, #45475a);
  }

  .message-header {
    grid-area: header;
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 2px 4px 0;
    font-size: var(--type-caption-size, 14px);
    line-height: 1;
    min-width: 0;
  }

  .chat-message.is-me .message-header {
    flex-direction: row-reverse;
  }

  .sender-name {
    font-weight: var(--font-weight-semibold, 550);
    color: var(--title-text-color, #e1e7f6);
    letter-spacing: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .timestamp {
    color: var(--sub-text-color, #8e99b2);
    font-size: var(--type-caption-size, 14px);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .message-bubble {
    grid-area: bubble;
    max-width: min(620px, 100%);
    justify-self: start;
    padding: 10px 14px;
    border-radius: 14px;
    border-top-left-radius: 4px;
    background: var(--surface0, #313244);
    color: inherit;
    font-size: var(--type-body-size, 16px);
    line-height: var(--type-body-leading, 1.538462);
    font-weight: var(--article-font-weight, 400);
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .chat-message.is-me .message-bubble {
    justify-self: end;
    background: var(--blue, #89b4fa);
    color: var(--base, #1e1e2e);
    border-radius: 14px;
    border-top-right-radius: 4px;
  }

  .message-bubble p { margin: var(--prose-gap, calc(16em / 14)) 0 0; }

  .message-bubble ul,
  .message-bubble ol {
    margin: var(--prose-gap, calc(16em / 14)) 0 0;
    padding-left: 22px;
  }

  .message-bubble li { margin: 0; }
  .message-bubble li + li,
  .message-bubble li > :is(ul, ol) { margin-top: var(--prose-list-gap, calc(8em / 14)); }
  .message-bubble li::marker { color: hsl(from currentColor h s l / 0.55); }

  .message-bubble a {
    color: var(--blue, #89b4fa);
    text-decoration: underline;
    text-underline-offset: 2px;
    text-decoration-thickness: 1px;
  }

  .chat-message.is-me .message-bubble a {
    color: inherit;
    text-decoration-color: hsl(from currentColor h s l / 0.4);
  }

  .message-bubble code {
    font-family: var(--font-mono, 'Maple Mono', 'Fira Code', monospace);
    font-size: 0.875em;
    padding: 1px 6px;
    border-radius: 4px;
    background: hsl(from var(--mantle, #181825) h s l / 0.55);
  }

  .chat-message.is-me .message-bubble code {
    background: hsl(from var(--base, #1e1e2e) h s l / 0.18);
  }

  .message-bubble hr {
    margin: var(--prose-divider-gap, calc(32em / 14)) 0 0;
    border: 0;
    height: 1px;
    background: hsl(from currentColor h s l / 0.12);
  }

  .message-bubble kbd {
    display: inline-block;
    padding: 1px 6px;
    font-family: var(--font-mono, monospace);
    font-size: 0.78em;
    border: 1px solid hsl(from currentColor h s l / 0.3);
    border-radius: 4px;
    background: hsl(from currentColor h s l / 0.05);
    vertical-align: baseline;
  }

  .message-bubble strong { font-weight: var(--font-weight-semibold, 550); }

  .message-bubble .chat-heading {
    display: block;
    margin: var(--prose-subheading-gap, calc(24em / 14)) 0 0;
    font-size: var(--type-subtitle-size, 17px);
    font-weight: var(--font-weight-semibold, 550);
    letter-spacing: normal;
    line-height: var(--type-subtitle-leading, 25px);
  }

  .chat-message:not(.is-me) .chat-heading {
    color: var(--title-text-color, #e1e7f6);
  }

  .message-bubble .chat-heading + * { margin-top: var(--prose-heading-after, calc(12em / 14)); }
  .message-bubble hr + * { margin-top: var(--prose-divider-gap, calc(32em / 14)); }
  .message-bubble > :first-child,
  .message-bubble li > :first-child { margin-top: 0; }

  .message-bubble .chat-heading code {
    font-size: 13px;
    padding: 1px 5px;
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: var(--sub-text-color, #8e99b2);
  }

  @media (max-width: 640px) {
    .chat-container {
      gap: 16px;
      max-height: 75vh;
    }

    .chat-message {
      grid-template-areas:
        "avatar header"
        "bubble bubble";
      column-gap: 8px;
      row-gap: 4px;
    }

    .chat-message.is-me {
      grid-template-areas:
        "header avatar"
        "bubble bubble";
    }

    .avatar,
    .avatar-placeholder {
      width: 26px;
      height: 26px;
      align-self: center;
    }

    .avatar-placeholder { font-size: var(--type-caption-size, 14px); }

    .message-header {
      align-items: center;
      padding-top: 0;
    }

    .message-bubble,
    .chat-message.is-me .message-bubble {
      max-width: 100%;
      justify-self: stretch;
      border-radius: 12px;
      padding: 9px 12px;
    }
  }
`;

class Chat extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
  }

  getMessagesFromSlots() {
    const messages = this.querySelectorAll("chat-message");
    return Array.from(messages).map((msg) => ({
      name: msg.getAttribute("name") || "Anonymous",
      avatar: msg.getAttribute("avatar") || "",
      timestamp: msg.getAttribute("timestamp") || "",
      isMe: msg.hasAttribute("is-me"),
      content: msg.innerHTML.trim(),
      html: true,
    }));
  }

  getMessagesFromAttribute() {
    const data = this.getAttribute("messages");
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed.map((message) => ({ ...message, html: false })) : [];
    } catch (e) {
      console.warn("Invalid messages JSON:", e);
      return [];
    }
  }

  render() {
    const messages = this.getMessagesFromSlots();
    const attributeMessages = messages.length ? [] : this.getMessagesFromAttribute();
    const renderedMessages = messages.length ? messages : attributeMessages;

    const messagesHTML = renderedMessages.map((msg) => this.renderMessage(msg)).join("");

    this.shadowRoot.innerHTML = `
      <style>${CHAT_STYLES}</style>
      <div class="chat-container">
        ${messagesHTML}
      </div>
    `;
  }

  renderMessage(msg) {
    const name = String(msg.name || "Anonymous");
    const initial = escapeHtml(name.charAt(0).toUpperCase());
    const avatar = String(msg.avatar || "");
    const timestamp = String(msg.timestamp || "");
    const content = msg.html ? String(msg.content || "") : escapeHtml(msg.content || "");
    const avatarHTML = avatar ? `<img src="${escapeAttribute(avatar)}" alt="${escapeAttribute(name)}" class="avatar" loading="lazy"/>` : `<div class="avatar-placeholder">${initial}</div>`;

    return `
      <div class="chat-message ${msg.isMe ? "is-me" : ""}">
        ${avatarHTML}
        <div class="message-header">
          <span class="sender-name">${escapeHtml(name)}</span>
          <span class="timestamp">${escapeHtml(timestamp)}</span>
        </div>
        <div class="message-bubble">${content}</div>
      </div>
    `;
  }

  static get observedAttributes() {
    return ["messages"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "messages" && oldValue !== newValue) {
      this.render();
    }
  }

  // Public API
  addMessage(msg) {
    const messages = this.getMessagesFromAttribute();
    messages.push(msg);
    this.setAttribute("messages", JSON.stringify(messages));
  }

  clear() {
    this.innerHTML = "";
    this.render();
  }
}

// Placeholder for slot content
class ChatMessage extends HTMLElement {}

// Register custom elements
customElements.define("x-chat", Chat);
customElements.define("chat-message", ChatMessage);

export { Chat, ChatMessage };
