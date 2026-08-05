// Embeds each footnote's rendered content inside its <sup class="footnote-ref">
// so CSS alone can show it as a hover tooltip — no client-side JS.
// Must be .use()d after markdown-it-footnote.
module.exports = function footnoteTooltip(md) {
  // footnote_tail moves footnote bodies to the end of the token stream, keyed by
  // the footnote_open tokens' meta.id; env.footnotes.list itself carries no content
  // for labeled footnotes, so cache each footnote's inline tokens on its list entry.
  md.core.ruler.after("footnote_tail", "footnote_tooltip", (state) => {
    const list = state.env.footnotes?.list;
    if (!list) return;

    let current = null;
    for (const token of state.tokens) {
      if (token.type === "footnote_open") current = list[token.meta.id];
      else if (token.type === "footnote_close") current = null;
      else if (current && token.type === "inline") (current.tooltipTokens ??= []).push(token);
    }
  });

  const renderRef = md.renderer.rules.footnote_ref;
  md.renderer.rules.footnote_ref = (tokens, idx, options, env, self) => {
    const rendered = renderRef(tokens, idx, options, env, self);
    const footnote = env.footnotes?.list?.[tokens[idx].meta.id];
    // a ref inside another footnote's tooltip must not nest a tooltip of its own
    if (!footnote?.tooltipTokens?.length || env.footnoteTooltipNested) return rendered;

    // other rules (e.g. shiki's code_inline) may be async, so render through the
    // async path and return a Promise — markdown-it-ts's renderAsync awaits it
    env.footnoteTooltipNested = true;
    return Promise.all(footnote.tooltipTokens.map((t) => self.renderInlineAsync(t.children, options, env)))
      .then((parts) => rendered.replace(/<\/sup>$/, `<span class="footnote-tooltip" role="tooltip">${parts.join("<br>")}</span></sup>`))
      .finally(() => {
        env.footnoteTooltipNested = false;
      });
  };
};
