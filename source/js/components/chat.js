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

const CHAT_STYLES = `
  :host {
    display: block;
    font-family: var(--font-sans, sans-serif);
  }

  .chat-container {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    background: var(--base, #1e1e2e);
    border-radius: 12px;
    max-height: 500px;
    overflow-y: auto;
  }

  .chat-message {
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }

  .chat-message.is-me {
    flex-direction: row-reverse;
  }

  .avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    background: var(--surface1, #45475a);
  }

  .avatar-placeholder {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 600;
    color: var(--text, #cdd6f4);
    flex-shrink: 0;
    background: var(--surface1, #45475a);
  }

  .message-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 70%;
  }

  .chat-message.is-me .message-content {
    align-items: flex-end;
  }

  .message-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }

  .chat-message.is-me .message-header {
    flex-direction: row-reverse;
  }

  .sender-name {
    font-weight: 600;
    color: var(--subtext1, #bac2de);
  }

  .timestamp {
    color: var(--subtext0, #a6adc8);
    font-size: 11px;
  }

  .message-bubble {
    padding: 10px 14px;
    border-radius: 16px;
    background: var(--surface1, #45475a);
    color: var(--text, #cdd6f4);
    line-height: 1.5;
    font-size: 14px;
    word-wrap: break-word;
  }

  .chat-message.is-me .message-bubble {
    background: var(--blue, #89b4fa);
    color: var(--base, #1e1e2e);
  }

  .message-bubble a {
    color: var(--blue, #89b4fa);
    text-decoration: underline;
  }

  .message-bubble code {
    font-family: var(--font-mono, 'Maple Mono', 'Fira Code', monospace);
    font-size: 13px;
    background: var(--mantle, #181825);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: var(--subtext0, #a6adc8);
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
    }));
  }

  getMessagesFromAttribute() {
    const data = this.getAttribute("messages");
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch (e) {
      console.warn("Invalid messages JSON:", e);
      return [];
    }
  }

  render() {
    const messages = this.getMessagesFromSlots();

    const messagesHTML = messages.map((msg) => this.renderMessage(msg)).join("");

    this.shadowRoot.innerHTML = `
      <style>${CHAT_STYLES}</style>
      <div class="chat-container">
        ${messagesHTML}
      </div>
    `;
  }

  renderMessage(msg) {
    const initial = msg.name.charAt(0).toUpperCase();
    const avatarHTML = msg.avatar ? `<img src="${msg.avatar}" alt="${msg.name}" class="avatar" loading="lazy"/>` : `<div class="avatar-placeholder">${initial}</div>`;

    return `
      <div class="chat-message ${msg.isMe ? "is-me" : ""}">
        ${avatarHTML}
        <div class="message-content">
          <div class="message-header">
            <span class="sender-name">${msg.name}</span>
            <span class="timestamp">${msg.timestamp}</span>
          </div>
          <div class="message-bubble">${msg.content}</div>
        </div>
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
