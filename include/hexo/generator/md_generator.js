const fs = require("node:fs");
const { PassThrough } = require("node:stream");
const { getMarkdownOutputPath } = require("../../util/markdown_source");

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

function getPosts(posts) {
  if (typeof posts?.toArray === "function") return posts.toArray();
  if (Array.isArray(posts?.data)) return posts.data;
  if (Array.isArray(posts)) return posts;

  return [];
}

function hasUtf8Bom(sourcePath) {
  const fd = fs.openSync(sourcePath, "r");

  try {
    const buffer = Buffer.alloc(UTF8_BOM.length);
    const bytesRead = fs.readSync(fd, buffer, 0, UTF8_BOM.length, 0);

    return bytesRead === UTF8_BOM.length && buffer.equals(UTF8_BOM);
  } finally {
    fs.closeSync(fd);
  }
}

function createMarkdownSourceStream(sourcePath) {
  const sourceStream = fs.createReadStream(sourcePath);
  if (hasUtf8Bom(sourcePath)) return sourceStream;

  const output = new PassThrough();
  output.write(UTF8_BOM);
  sourceStream.on("error", (error) => output.destroy(error));
  sourceStream.pipe(output);

  return output;
}

module.exports = (hexo) => {
  hexo.extend.generator.register("md_generator", (locals) =>
    getPosts(locals.posts)
      .map((post) => {
        const markdownPath = getMarkdownOutputPath(post);
        const sourcePath = post?.full_source;

        if (!markdownPath || typeof sourcePath !== "string" || !fs.existsSync(sourcePath)) {
          delete post.markdown_path;
          return null;
        }

        post.markdown_path = markdownPath;

        return {
          path: markdownPath,
          data: {
            data: () => createMarkdownSourceStream(sourcePath),
            modified: true,
          },
        };
      })
      .filter(Boolean),
  );
};
