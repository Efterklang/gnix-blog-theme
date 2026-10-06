// Markdown tables share a scrollable frame. An adjacent, single-line paragraph
// after a blank line supplies an optional caption: Table: **Caption** [link](url)
// Escape the colon (Table\:) to keep that paragraph as ordinary prose.
const CAPTION_RE = /^Table:[\t ]+(\S.*)$/i;
const EMPTY_CONTAINER_LINE_RE = /^(?:[\t ]*>)*[\t ]*$/;

function findCaption(tokens, closeIndex, table, lines) {
  const open = tokens[closeIndex + 1];
  const inline = tokens[closeIndex + 2];
  const close = tokens[closeIndex + 3];
  if (open?.type !== "paragraph_open" || inline?.type !== "inline" || close?.type !== "paragraph_close") return null;
  if (open.level !== table.level || close.level !== table.level) return null;
  if (!table.map || !open.map || open.map[1] !== open.map[0] + 1) return null;

  const match = CAPTION_RE.exec(inline.content);
  if (!match) return null;

  // Token adjacency alone is insufficient: reference definitions disappear
  // during block parsing. Check the source gap, allowing blank quote/list lines.
  const gapStart = table.map[1];
  const gapEnd = open.map[0];
  if (gapEnd <= gapStart) return null;
  for (let line = gapStart; line < gapEnd; line++) {
    if (!EMPTY_CONTAINER_LINE_RE.test(lines[line])) return null;
  }

  return { inline, content: match[1].trim(), map: open.map };
}

function blockToken(state, type, tag, nesting, level) {
  const token = new state.Token(type, tag, nesting);
  token.block = true;
  token.level = level;
  return token;
}

module.exports = function tablePlugin(md, { figureClass = "table-wrapper", tableClass = "" } = {}) {
  md.core.ruler.before("inline", "gnix_tables", (state) => {
    if (state.inlineMode || !state.tokens.some((token) => token.type === "table_open")) return;

    const tokens = state.tokens;
    const lines = state.src.split("\n");
    const tables = [];
    const captions = new Map();
    const consumed = new Set();
    let captionNumber = 0;

    for (let index = 0; index < tokens.length; index++) {
      const token = tokens[index];
      if (token.type === "table_open") tables.push(token);
      if (token.type !== "table_close") continue;
      const table = tables.pop();
      if (!table) continue;
      const caption = findCaption(tokens, index, table, lines);
      if (!caption) continue;
      caption.id = `gnix-table-caption-${++captionNumber}`;
      captions.set(table, caption);
      consumed.add(tokens[index + 1]);
      consumed.add(tokens[index + 2]);
      consumed.add(tokens[index + 3]);
    }

    const output = [];
    let tableDepth = 0;
    for (const token of tokens) {
      if (consumed.has(token)) continue;

      if (token.type === "table_open") {
        const level = token.level + tableDepth * 2;
        const caption = captions.get(token);
        const figure = blockToken(state, "table_wrapper_open", "figure", 1, level);
        figure.attrSet("class", figureClass);
        figure.map = token.map ? [token.map[0], caption?.map[1] ?? token.map[1]] : null;
        output.push(figure);

        if (caption) {
          const open = blockToken(state, "table_caption_open", "figcaption", 1, level + 1);
          open.attrSet("class", "table-caption");
          open.attrSet("id", caption.id);
          open.map = caption.map;
          caption.inline.content = caption.content;
          caption.inline.level = level + 2;
          // Keep an ordinary inline token in the main stream: links, footnotes,
          // typography and async renderers run through the existing pipeline.
          output.push(open, caption.inline, blockToken(state, "table_caption_close", "figcaption", -1, level + 1));
          token.attrJoin("aria-labelledby", caption.id);
        }

        const scroll = blockToken(state, "table_scroll_open", "div", 1, level + 1);
        scroll.attrSet("class", "table-scroll");
        scroll.attrSet("tabindex", "0");
        if (caption) {
          scroll.attrSet("role", "region");
          scroll.attrSet("aria-labelledby", caption.id);
        }
        output.push(scroll);
        if (tableClass) token.attrJoin("class", tableClass);
        tableDepth++;
      }

      token.level += tableDepth * 2;
      output.push(token);

      if (token.type === "table_close") {
        output.push(
          blockToken(state, "table_scroll_close", "div", -1, token.level - 1),
          blockToken(state, "table_wrapper_close", "figure", -1, token.level - 2),
        );
        tableDepth--;
      }
    }
    state.tokens = output;
  });
};
