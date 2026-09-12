// 深浅 Mono 共用 TextMate scopes；浅色单独调暗语法色，保证白底上的对比度。
function createMonoTheme(type, { fg, bg, comment, keyword, string, number, title, builtin, meta }) {
  return {
    name: `mono-${type}`,
    displayName: type === "dark" ? "Mono Dark" : "Mono Light",
    type,
    colors: {
      "editor.background": bg,
      "editor.foreground": fg,
    },
    fg,
    bg,
    tokenColors: [
      { scope: ["comment", "punctuation.definition.comment"], settings: { foreground: comment, fontStyle: "italic" } },
      {
        scope: ["keyword", "storage", "storage.type", "storage.modifier", "keyword.operator.new", "keyword.operator.expression", "constant.language", "keyword.other.unit"],
        settings: { foreground: keyword },
      },
      { scope: ["entity.name.tag", "punctuation.definition.tag"], settings: { foreground: keyword } },
      {
        scope: ["string", "string.regexp", "punctuation.definition.string", "markup.inserted", "support.type.property-name.css", "meta.property-name"],
        settings: { foreground: string },
      },
      {
        scope: [
          "constant.numeric",
          "constant.character",
          "variable",
          "variable.parameter",
          "variable.other",
          "entity.other.attribute-name",
          "entity.other.attribute-name.class.css",
          "entity.other.attribute-name.pseudo-class.css",
          "entity.name.type",
          "support.type",
          "support.type.property-name.json",
          "meta.object-literal.key",
          "punctuation.definition.variable",
        ],
        settings: { foreground: number },
      },
      {
        scope: [
          "entity.name.function",
          "support.function",
          "meta.function-call entity.name.function",
          "markup.heading",
          "entity.other.attribute-name.id.css",
          "constant.other.symbol",
          "markup.list punctuation.definition.list.begin",
          "markup.underline.link",
        ],
        settings: { foreground: title },
      },
      {
        scope: ["support.class", "entity.name.class", "entity.name.type.class", "support.type.primitive", "support.type.builtin", "support.constant", "variable.language"],
        settings: { foreground: builtin },
      },
      { scope: ["meta.preprocessor", "keyword.control.directive", "punctuation.definition.directive", "meta.tag.metadata"], settings: { foreground: meta } },
      { scope: ["markup.bold"], settings: { fontStyle: "bold" } },
      { scope: ["markup.italic"], settings: { fontStyle: "italic" } },
      { scope: ["markup.deleted"], settings: { foreground: title } },
      { scope: ["invalid", "invalid.illegal"], settings: { foreground: title } },
    ],
  };
}

module.exports = {
  monoDark: createMonoTheme("dark", {
    fg: "#ffffff",
    bg: "#000000",
    comment: "#808080",
    keyword: "#2e95d3",
    string: "#00a67d",
    number: "#df3079",
    title: "#f22c3d",
    builtin: "#e9950c",
    meta: "#4e9ee0",
  }),
  monoLight: createMonoTheme("light", {
    fg: "#000000",
    bg: "#ffffff",
    comment: "#6b6b6b",
    keyword: "#0068b5",
    string: "#007a5a",
    number: "#b52362",
    title: "#c12332",
    builtin: "#996000",
    meta: "#235b78",
  }),
};
