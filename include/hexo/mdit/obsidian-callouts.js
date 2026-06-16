// Adapted from markdown-it-obsidian-callouts (Apache-2.0, (c) Erin Schnabel)
// https://github.com/ebullient/markdown-it-obsidian-callouts

const DEFAULT_ICONS = {
  abstract:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-list"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>',
  bug: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bug"><path d="m8 2 1.88 1.88"/><path d="M14.12 3.88 16 2"/><path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/><path d="M12 20v-9"/><path d="M6.53 9C4.6 8.8 3 7.1 3 5"/><path d="M6 13H2"/><path d="M3 21c0-2.1 1.7-3.9 3.8-4"/><path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/><path d="M22 13h-4"/><path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/></svg>',
  danger:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-zap"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  example:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>',
  failure:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  info: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  note: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>',
  question:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-help-circle"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>',
  quote:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-quote"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>',
  success:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>',
  tip: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flame"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
  todo: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle-2"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
  warning:
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
};

DEFAULT_ICONS.attention = DEFAULT_ICONS.warning;
DEFAULT_ICONS.caution = DEFAULT_ICONS.warning;
DEFAULT_ICONS.check = DEFAULT_ICONS.success;
DEFAULT_ICONS.cite = DEFAULT_ICONS.quote;
DEFAULT_ICONS.done = DEFAULT_ICONS.success;
DEFAULT_ICONS.error = DEFAULT_ICONS.danger;
DEFAULT_ICONS.fail = DEFAULT_ICONS.failure;
DEFAULT_ICONS.faq = DEFAULT_ICONS.question;
DEFAULT_ICONS.help = DEFAULT_ICONS.question;
DEFAULT_ICONS.hint = DEFAULT_ICONS.tip;
DEFAULT_ICONS.important = DEFAULT_ICONS.tip;
DEFAULT_ICONS.missing = DEFAULT_ICONS.failure;
DEFAULT_ICONS.summary = DEFAULT_ICONS.abstract;
DEFAULT_ICONS.tldr = DEFAULT_ICONS.abstract;

const CALLOUT_RE = /^\[!([^\]]+)\](\+|-|) *(.*)? */;
const ADMONITION_RE = /^ad-([^\s]+) */;
const ADMONITION_HEADER_RE = /^(title|collapse|icon|color):(.*)/;
const HEADER_TO_ATTR = {
  title: "data-callout-title",
  icon: "data-callout-icon",
  color: "data-callout-color",
};

function resolveIcon(token, options) {
  const explicit = token.attrGet("data-callout-icon");
  if (explicit) return explicit.trim();
  const type = token.attrGet("data-callout");
  if (!type) return "";
  return options.icons?.[type] || DEFAULT_ICONS[type] || DEFAULT_ICONS.note;
}

function toTitleCase(str) {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

async function resolveTitle(token, md) {
  const title = token.attrGet("data-callout-title");
  if (title) return md.renderInlineAsync(title.trim());
  const type = token.attrGet("data-callout");
  return type ? toTitleCase(type) : "";
}

function escapeAttr(str) {
  return String(str).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function colorStyle(token) {
  const color = token.attrGet("data-callout-color");
  return color ? ` style="--callout-color: ${escapeAttr(color)}"` : "";
}

async function renderCalloutPrefix(token, md, options) {
  const type = token.attrGet("data-callout");
  if (!type) return "";
  const fold = token.attrGet("data-callout-fold");
  const icon = resolveIcon(token, options);
  const title = await resolveTitle(token, md);
  const style = colorStyle(token);

  if (fold) {
    return `
<details class="callout" data-callout="${type}" data-callout-fold="${fold}"${fold === "+" ? " open" : ""}${style}>
<summary class="callout-title">
<div class="callout-title-icon">
${icon}
</div>
<div class="callout-title-inner">${title}</div>
<div class="callout-fold"></div>
</summary>
<div class="callout-content">`;
  }

  return `
<div class="callout" data-callout="${type}"${style}>
<div class="callout-title">
<div class="callout-title-icon">
${icon}
</div>
<div class="callout-title-inner">${title}</div>
</div>
<div class="callout-content">`;
}

function renderCalloutPostfix(token) {
  const type = token.attrGet("data-callout");
  if (!type) return "";
  const fold = token.attrGet("data-callout-fold");
  return fold ? "</div></details>" : "</div></div>";
}

function inspectBlockquote(tokens, startIdx) {
  let content = "";
  let depth = 0;
  let endIdx = startIdx;
  let contentIdx = startIdx;

  for (let i = startIdx; i < tokens.length; i++) {
    const token = tokens[i];

    if (token.type === "blockquote_open") depth++;
    else if (token.type === "blockquote_close") {
      endIdx = i;
      depth--;
    }

    if (depth === 0) break;
    if (depth > 1) continue;

    if (token.type === "inline") {
      if (contentIdx === startIdx && token.content.match(CALLOUT_RE)) {
        contentIdx = i;
      }
      content += token.content;
    } else if (token.type === "paragraph_close") {
      content += "\n";
    }
  }

  const match = content.match(CALLOUT_RE);
  if (!match || startIdx === endIdx) return;

  const type = match[1].toLowerCase();
  const fold = match[2];
  const title = match[3];

  tokens[startIdx].type = "callout_open";
  tokens[startIdx].attrPush(["class", "callout"]);
  tokens[startIdx].attrPush(["data-callout", type]);
  tokens[startIdx].attrPush(["data-callout-fold", fold]);
  if (title) tokens[startIdx].attrPush(["data-callout-title", title]);

  tokens[endIdx].type = "callout_close";
  tokens[endIdx].attrPush(["data-callout", type]);
  tokens[endIdx].attrPush(["data-callout-fold", fold]);

  if (contentIdx !== startIdx && tokens[contentIdx]?.children) {
    tokens[contentIdx].content = tokens[contentIdx].content.replace(CALLOUT_RE, "").trim();
  }
}

function inspectFence(tokens, startIdx, options) {
  const token = tokens[startIdx];
  if (!token.info) return;

  const match = token.info.replace(options.langPrefix || "", "").match(ADMONITION_RE);
  if (!match) return;

  token.type = "admonition_block";
  token.attrPush(["class", "callout"]);
  token.attrPush(["data-callout", match[1].toLowerCase()]);

  let lines = token.content.split("\n");
  while (lines.length > 0 && ADMONITION_HEADER_RE.test(lines[0])) {
    const headerMatch = lines[0].match(ADMONITION_HEADER_RE);
    if (!headerMatch) break;
    const attrName = HEADER_TO_ATTR[headerMatch[1].trim().toLowerCase()];
    if (attrName) token.attrPush([attrName, headerMatch[2].trim()]);
    lines = lines.slice(1);
  }

  token.content = lines.join("\n");
}

function obsidianCallouts(md, options = {}) {
  md.core.ruler.after("block", "obsidian-callouts", (state) => {
    const tokens = state.tokens;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.type === "blockquote_open") inspectBlockquote(tokens, i);
      if (token.type === "fence") inspectFence(tokens, i, options);
    }
  });

  md.renderer.rules.callout_open = async (tokens, idx) => renderCalloutPrefix(tokens[idx], md, options);

  md.renderer.rules.admonition_block = async (tokens, idx) => {
    const token = tokens[idx];
    const prefix = await renderCalloutPrefix(token, md, options);
    const body = await md.renderAsync(token.content);
    return `${prefix}${body}\n</div>\n</div>`;
  };

  md.renderer.rules.callout_close = (tokens, idx) => renderCalloutPostfix(tokens[idx]);
}

module.exports = obsidianCallouts;
module.exports.DEFAULT_ICONS = DEFAULT_ICONS;
