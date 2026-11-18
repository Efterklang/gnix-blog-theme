import { expect, test } from "bun:test";
import footnote from "markdown-it-footnote";
import MarkdownIt from "markdown-it-ts";
import progressiveImage from "../include/hexo/mdit/image";
import imageGroup from "../include/hexo/mdit/image-group";

function markdown() {
  return MarkdownIt({ html: true }).use(progressiveImage, {}, { options: {}, supports: () => false }).use(imageGroup);
}

const images = Array.from({ length: 6 }, (_, i) => `![Photo ${i + 1}](/photo-${i + 1}.jpg)`).join("\n");
const fence = (options = "", content = images) => `\`\`\`image-group ${options}\n${content}\n\`\`\`\n`;

test("renders a fixed row count for horizontal scrolling", async () => {
  const html = await markdown().renderAsync(fence('rows=2 mobile-rows=1 label="Travel photos" gap=12px height=240px'));
  expect(html).toContain('layout="rail"');
  expect(html).toContain('rows="2"');
  expect(html).toContain("--image-group-rows:2");
  expect(html).toContain("--image-group-mobile-rows:1");
  expect(html).toContain('aria-label="Travel photos"');
  expect(html).toContain("--image-group-gap:12px");
  expect(html).toContain("--image-group-grid-height:240px");
  expect(html.match(/<img\b/g)).toHaveLength(6);
  expect(html.match(/<figcaption>/g)).toHaveLength(6);
  const rows = html.match(/<div class="image-group-row">[\s\S]*?(?=<div class="image-group-row">|<\/image-group>)/g);
  expect(rows).toHaveLength(2);
  expect(rows[0]).toContain("Photo 1");
  expect(rows[0]).toContain("Photo 3");
  expect(rows[0]).not.toContain("Photo 4");
  expect(html).not.toContain("language-image-group");
});

test("rows take precedence and explicit cols still selects a grid", async () => {
  expect(await markdown().renderAsync(fence("cols=2 rows=1"))).toContain('layout="rail"');
  expect(await markdown().renderAsync(fence("cols=2"))).toContain('layout="grid" columns="2"');
  const defaultGroup = await markdown().renderAsync(fence());
  expect(defaultGroup).toContain('layout="rail" rows="1"');
  expect(defaultGroup).not.toContain('columns="');
});

test("row counts do not create empty rows and natural image ratios survive", async () => {
  const html = await markdown().renderAsync(fence("rows=3 mobile-rows=2", "![Portrait|600x900](/portrait.jpg)"));
  expect(html).toContain("--image-group-rows:1");
  expect(html).toContain("--image-group-mobile-rows:1");
  expect(html).toContain("--image-group-ratio:0.6666666666666666");
  expect(html).toContain('class="image-group-fallback" tabindex="0"');
});

test("uneven image counts keep the requested row count", async () => {
  const html = await markdown().renderAsync(fence("rows=3", images.split("\n").slice(0, 4).join("\n")));
  expect(html.match(/class="image-group-row"/g)).toHaveLength(3);
  expect(html.match(/<img\b/g)).toHaveLength(4);
});

test("reference images resolve against local and surrounding definitions", async () => {
  const md = markdown();
  const html = await md.renderAsync(`[outside]: /outside.jpg\n\n${fence("", "![Outside][outside]\n![Inside][inside]\n\n[inside]: /inside.jpg")}`);
  expect(html).toContain('src="/outside.jpg"');
  expect(html).toContain('src="/inside.jpg"');
  expect(await md.renderAsync("![Not leaked][inside]")).not.toContain("<img");
});

test("image fences do not inherit or mutate the article's footnote state", async () => {
  const md = MarkdownIt({ html: true })
    .use(footnote)
    .use(progressiveImage, {}, { options: {}, supports: () => false })
    .use(imageGroup);
  const text = `Text[^note]\n\n[photo]: /photo.jpg\n\n${fence("columns=1", "![Photo][photo]")}\nMore text[^note]\n\n${fence("columns=1", "![Other](/other.jpg)")}\n[^note]: The article's footnote.`;
  const html = await md.renderAsync(text, { path: "/posts/with-footnotes.md" });
  expect(html.match(/<image-group\b/g)).toHaveLength(2);
  expect(html.match(/<img\b/g)).toHaveLength(2);
  expect(html).toContain('src="/photo.jpg"');
  expect(html.match(/class="footnotes"/g)).toHaveLength(1);
  expect(html).toContain("The article's footnote.");
  expect(html.match(/class="footnote-backref"/g)).toHaveLength(2);
  for (const group of html.match(/<image-group\b[\s\S]*?<\/image-group>/g)) expect(group).not.toContain("footnote");
});

test("reuses asynchronous image rendering and preserves image metadata", async () => {
  const md = markdown();
  const image = md.renderer.rules.image;
  md.renderer.rules.image = async (...args) => {
    await Promise.resolve();
    return (await image(...args)).replace("<img ", '<img srcset="/small.jpg 320w, /large.jpg 1280w" ');
  };
  const html = await md.renderAsync(fence("columns=1", "![Caption|800x600](/photo.jpg)"));
  expect(html).toContain('width="800"');
  expect(html).toContain('height="600"');
  expect(html).toContain('srcset="/small.jpg 320w, /large.jpg 1280w"');
  expect(html).toContain("<figcaption>Caption</figcaption>");
  expect(html).not.toContain("<figcaption>Caption|800x600");
});

test("escapes labels and image captions without interpreting HTML", async () => {
  const html = await markdown().renderAsync(fence('label=\'<Travel & "photos">\'', '![<caption & text>](/photo.jpg)'));
  expect(html).toContain('aria-label="&lt;Travel &amp; &quot;photos&quot;&gt;"');
  expect(html).toContain("<figcaption>&lt;caption &amp; text&gt;</figcaption>");
});

test("rejects malformed options and non-image content with source context", async () => {
  for (const options of ["columns=0", "rows=-2", "columns=1.5", "columns=101", "mobile-columns=0", "mobile-rows=0", "unknown=1", "columns=2 cols=3", "gap=var(--gap)", "height=10px;position:fixed", "columns: 3"]) {
    await expect(markdown().renderAsync(fence(options), { path: "/posts/gallery.md" })).rejects.toThrow("[image-group]");
  }
  for (const content of ["", "plain text", "- ![List](/image.jpg)", "<img src='/image.jpg'>", "[![Linked](/image.jpg)](/link)", "![Unsafe](javascript:alert(1))", "![Image](/image.jpg)\n\n# Heading"]) {
    await expect(markdown().renderAsync(fence("", content), { path: "/posts/gallery.md" })).rejects.toThrow("/posts/gallery.md");
  }
});

test("delegates unrelated code fences to the previous renderer", async () => {
  const md = MarkdownIt();
  md.renderer.rules.fence = async () => "<pre>existing renderer</pre>";
  md.use(imageGroup);
  expect(await md.renderAsync("```js\nconsole.log('hello')\n```" )).toBe("<pre>existing renderer</pre>");
});
