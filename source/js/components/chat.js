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
    color: var(--text, #cdd6f4);
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
    scrollbar-color: hsl(from var(--text, #cdd6f4) h s l / 0.18) transparent;
  }

  .chat-container::-webkit-scrollbar { width: 6px; }
  .chat-container::-webkit-scrollbar-thumb {
    background: hsl(from var(--text, #cdd6f4) h s l / 0.18);
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
    font-weight: 600;
    color: var(--text, #cdd6f4);
    background: var(--surface1, #45475a);
  }

  .message-header {
    grid-area: header;
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 2px 4px 0;
    font-size: 12px;
    line-height: 1;
    min-width: 0;
  }

  .chat-message.is-me .message-header {
    flex-direction: row-reverse;
  }

  .sender-name {
    font-weight: 600;
    color: var(--subtext1, #bac2de);
    letter-spacing: 0.01em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .timestamp {
    color: var(--subtext0, #a6adc8);
    font-size: 11px;
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
    font-size: 14px;
    line-height: 1.65;
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

  .message-bubble > :first-child { margin-top: 0; }
  .message-bubble > :last-child { margin-bottom: 0; }

  .message-bubble p { margin: 0 0 8px; }

  .message-bubble ul,
  .message-bubble ol {
    margin: 6px 0;
    padding-left: 22px;
  }

  .message-bubble li { margin: 4px 0; }
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
    margin: 12px 0;
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

  .message-bubble strong { font-weight: 600; }

  .message-bubble .chat-heading {
    display: block;
    margin: 14px 0 6px;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.01em;
    line-height: 1.4;
  }

  .message-bubble .chat-heading:first-child { margin-top: 0; }

  .message-bubble .chat-heading code {
    font-size: 13px;
    padding: 1px 5px;
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: var(--subtext0, #a6adc8);
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

    .avatar-placeholder { font-size: 11px; }

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
