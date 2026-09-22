const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const stylesheet = fs.readFileSync(path.join(__dirname, "../source/css/default.css"), "utf8");

// 命令面板整段样式：选中态随方向键高频移动，指示条 / 底色 / 标签胶囊一律即时落位
const regionStart = stylesheet.indexOf("/* #region Command palette");
assert.notEqual(regionStart, -1, "Command palette styles must exist");

const regionEnd = stylesheet.indexOf("/* #endregion Command palette */", regionStart);
assert.notEqual(regionEnd, -1, "Command palette styles must have the expected section boundary");

const region = stylesheet.slice(regionStart, regionEnd);
assert.doesNotMatch(region, /\b(?:transition|animation)(?:-[\w-]+)?\s*:/i, "Command palette selection and hover must update immediately");

const tagsSectionStart = region.indexOf(".command-palette-section--tags {");
assert.notEqual(tagsSectionStart, -1, "Command palette tag styles must exist");
assert.match(
  region.slice(tagsSectionStart),
  /&:hover\s*,\s*&\.active\s*\{\s*background-color:\s*var\(--surface1\);\s*border-color:\s*var\(--mauve\);\s*\}/,
  "Command palette tags must retain their shared hover and active colors",
);
