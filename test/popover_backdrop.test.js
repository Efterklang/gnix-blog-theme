const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const stylesheet = fs.readFileSync(path.join(__dirname, "../source/css/default.css"), "utf8");

// 全局 popover 遮罩块（搜索框 / TOC / 文章弹层共用）：从顶层 ":popover-open {" 到其收尾的顶层 "}"
const blockStart = stylesheet.indexOf("\n:popover-open {");
assert.notEqual(blockStart, -1, "Global popover overlay styles must exist");
const blockEnd = stylesheet.indexOf("\n}\n", blockStart);
assert.notEqual(blockEnd, -1, "Global popover overlay block must be closed");
const block = stylesheet.slice(blockStart, blockEnd);

const beforeStart = block.indexOf("&::before {");
assert.notEqual(beforeStart, -1, "Global popover overlay must live on the ::before layer");
const beforeBlock = block.slice(beforeStart, block.indexOf("}", beforeStart));
assert.match(beforeBlock, /z-index:\s*-1;/, "Overlay ::before layer must sit beneath the popover content");
assert.match(beforeBlock, /\n\s*backdrop-filter:\s*blur\(/, "Overlay ::before layer must blur the page behind it");

// UA 给 [popover] 铺了不透明的 background-color: Canvas，z-index: -1 的伪层画在宿主背景之上，
// 宿主不透明时 backdrop-filter 模糊到的只是这块实色，页面完全看不见
const hostDeclarations = block.slice(0, beforeStart);
assert.match(hostDeclarations, /\n\s*background(?:-color)?:\s*transparent;/, "Popover host must be transparent so the ::before backdrop-filter sees the page instead of the UA Canvas fill");
