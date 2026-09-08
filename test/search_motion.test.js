const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const stylesheet = fs.readFileSync(path.join(__dirname, "../source/css/default.css"), "utf8");
const tagsSectionStart = stylesheet.indexOf(".searchbox-result-section--tags {");
assert.notEqual(tagsSectionStart, -1, "Search tag styles must exist");

const tagsSectionEnd = stylesheet.indexOf("/* #endregion Search */", tagsSectionStart);
assert.notEqual(tagsSectionEnd, -1, "Search tag styles must have the expected section boundary");

const tagsSection = stylesheet.slice(tagsSectionStart, tagsSectionEnd);
assert.doesNotMatch(tagsSection, /\b(?:transition|animation)(?:-[\w-]+)?\s*:/i, "Search tag selection and hover must update immediately");
assert.match(
  tagsSection,
  /&:hover\s*,\s*&\.active\s*\{\s*background-color:\s*var\(--surface1\);\s*border-color:\s*var\(--mauve\);\s*\}/,
  "Search tags must retain their shared hover and active colors",
);
