/**
 * Renders TeX math to server-side SVG with RaTeX.
 * Inlined from https://github.com/Efterklang/markdown-exit-ratex (CJS port);
 * spawns the platform binary in ./vendor directly instead of going through
 * the package's node wrapper script.
 */
const { spawn } = require("node:child_process");
const { accessSync, constants } = require("node:fs");
const { mkdtemp, readFile, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join, resolve } = require("node:path");

function ratex(md, options = {}) {
  const opts = resolveOptions(options);
  const renderMath = createCachedRenderer(opts);

  md.inline.ruler.before("text", "ratex_math_inline", createInlineRule(opts.inlineDelimiters));
  md.block.ruler.after("blockquote", "ratex_math_block", createBlockRule(opts.blockDelimiters), {
    alt: ["paragraph", "reference", "blockquote", "list"],
  });

  md.renderer.rules.ratex_math_inline = async (tokens, idx) => {
    return renderToken(tokens[idx], false, opts, renderMath);
  };

  md.renderer.rules.ratex_math_block = async (tokens, idx) => {
    return renderToken(tokens[idx], true, opts, renderMath);
  };
}

function resolveOptions(options) {
  const cli = options.cli ?? {};
  return {
    inlineDelimiters: sortDelimiters(
      options.inlineDelimiters ?? [
        ["\\(", "\\)"],
        ["$", "$"],
      ],
    ),
    blockDelimiters: sortDelimiters(
      options.blockDelimiters ?? [
        ["$$", "$$"],
        ["\\[", "\\]"],
      ],
    ),
    render: options.render ?? createRatexCliRenderer(cli),
    fontSize: options.fontSize ?? 40,
    dpr: options.dpr ?? 1,
    color: options.color,
    cache: options.cache ?? true,
    cacheSize: options.cacheSize ?? 1000,
    concurrency: Math.max(1, options.concurrency ?? 4),
    throwOnError: options.throwOnError ?? false,
    normalizeLatex: options.normalizeLatex ?? normalizeLatexForCli,
    inlineClass: options.inlineClass ?? "ratex ratex-inline",
    blockClass: options.blockClass ?? "ratex ratex-display",
    errorClass: options.errorClass ?? "ratex ratex-error",
  };
}

function sortDelimiters(delimiters) {
  return [...delimiters].sort((a, b) => b[0].length - a[0].length);
}

function createInlineRule(delimiters) {
  return (state, silent) => {
    const matched = findDelimiterAt(state.src, state.pos, delimiters);
    if (!matched) return false;

    const [openDelim, closeDelim] = matched;
    let res = isValidInlineDelimiter(state, state.pos, openDelim);
    if (!res.canOpen) {
      if (!silent) state.pending += openDelim;
      state.pos += openDelim.length;
      return true;
    }

    const start = state.pos + openDelim.length;
    let match = start;
    while ((match = state.src.indexOf(closeDelim, match)) !== -1) {
      let pos = match - 1;
      while (state.src[pos] === "\\") pos -= 1;
      if ((match - pos) % 2 === 1) break;
      match += closeDelim.length;
    }

    if (match === -1) {
      if (!silent) state.pending += openDelim;
      state.pos = start;
      return true;
    }

    if (match === start) {
      if (!silent) state.pending += openDelim + closeDelim;
      state.pos = start + closeDelim.length;
      return true;
    }

    res = isValidInlineDelimiter(state, match, closeDelim);
    if (!res.canClose) {
      if (!silent) state.pending += openDelim;
      state.pos = start;
      return true;
    }

    if (!silent) {
      const token = state.push("ratex_math_inline", "math", 0);
      token.markup = openDelim;
      token.content = state.src.slice(start, match);
      token.meta = { displayMode: false };
    }

    state.pos = match + closeDelim.length;
    return true;
  };
}

function createBlockRule(delimiters) {
  return (state, startLine, endLine, silent) => {
    let pos = state.bMarks[startLine] + state.tShift[startLine];
    let max = state.eMarks[startLine];
    const matched = findDelimiterAt(state.src, pos, delimiters);
    if (!matched) return false;

    const [openDelim, closeDelim] = matched;
    if (pos + openDelim.length > max) return false;
    if (silent) return true;

    pos += openDelim.length;
    let firstLine = state.src.slice(pos, max);
    let lastLine = "";
    let nextLine = startLine;
    let found = false;

    if (firstLine.trim().endsWith(closeDelim)) {
      firstLine = trimClosingDelimiter(firstLine, closeDelim);
      found = true;
    }

    while (!found) {
      nextLine += 1;
      if (nextLine >= endLine) break;

      pos = state.bMarks[nextLine] + state.tShift[nextLine];
      max = state.eMarks[nextLine];
      if (pos < max && state.tShift[nextLine] < state.blkIndent) break;

      const line = state.src.slice(pos, max);
      if (line.trim().endsWith(closeDelim)) {
        const lastPos = state.src.slice(0, max).lastIndexOf(closeDelim);
        lastLine = state.src.slice(pos, lastPos);
        found = true;
      }
    }

    state.line = nextLine + 1;
    const token = state.push("ratex_math_block", "math", 0);
    token.block = true;
    token.content = (firstLine.trim() ? `${firstLine}\n` : "") + state.getLines(startLine + 1, nextLine, state.tShift[startLine], true) + (lastLine.trim() ? lastLine : "");
    token.map = [startLine, state.line];
    token.markup = openDelim;
    token.meta = { displayMode: true };
    return true;
  };
}

function findDelimiterAt(src, pos, delimiters) {
  return delimiters.find(([open]) => src.startsWith(open, pos));
}

function trimClosingDelimiter(line, closeDelim) {
  const trimmed = line.trim();
  return trimmed.slice(0, trimmed.length - closeDelim.length);
}

function isValidInlineDelimiter(state, pos, delimiter) {
  if (delimiter !== "$") {
    return { canOpen: true, canClose: true };
  }

  const max = state.posMax;
  const prevChar = pos > 0 ? state.src.charCodeAt(pos - 1) : -1;
  const nextChar = pos + delimiter.length <= max ? state.src.charCodeAt(pos + delimiter.length) : -1;

  let canOpen = true;
  let canClose = true;
  if (prevChar === 0x20 || prevChar === 0x09 || (nextChar >= 0x30 && nextChar <= 0x39)) {
    canClose = false;
  }
  if (nextChar === 0x20 || nextChar === 0x09) {
    canOpen = false;
  }

  return { canOpen, canClose };
}

function createCachedRenderer(opts) {
  const limit = createLimiter(opts.concurrency);
  const cache = new Map();

  return (input) => {
    const key = JSON.stringify(input);
    if (!opts.cache) return limit(() => opts.render(input));

    const existing = cache.get(key);
    if (existing) return existing;

    const promise = limit(() => opts.render(input)).catch((error) => {
      cache.delete(key);
      throw error;
    });
    cache.set(key, promise);
    if (cache.size > opts.cacheSize) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    return promise;
  };
}

function createLimiter(concurrency) {
  let active = 0;
  const queue = [];

  const runNext = () => {
    if (active >= concurrency) return;
    const job = queue.shift();
    if (!job) return;
    active += 1;
    job();
  };

  return async (task) => {
    await new Promise((resolve) => {
      queue.push(resolve);
      runNext();
    });

    try {
      return await task();
    } finally {
      active -= 1;
      runNext();
    }
  };
}

async function renderToken(token, displayMode, opts, renderMath) {
  const rawLatex = token.content;
  const latex = opts.normalizeLatex(rawLatex);

  try {
    const svg = await renderMath({
      latex,
      displayMode,
      fontSize: opts.fontSize,
      dpr: opts.dpr,
      color: opts.color,
    });
    return wrapRenderedSvg(svg, rawLatex, displayMode, opts);
  } catch (error) {
    if (opts.throwOnError) throw error;
    return renderError(rawLatex, error, opts);
  }
}

function createRatexCliRenderer(cli) {
  let bundledCommand;

  return async (input) => {
    const command = cli.command ?? (bundledCommand ??= bundledRatexBinaryPath());
    const args = [...(cli.args ?? [])];
    const outputDir = await mkdtemp(join(tmpdir(), "gnix-ratex-"));

    if (cli.appendRenderOptions ?? true) {
      args.push("--output-dir", outputDir);
      args.push("--font-size", String(input.fontSize));
      args.push("--dpr", String(input.dpr));
      if (input.color) args.push("--color", input.color);
      if (!input.displayMode) args.push("--inline");
    }

    try {
      await runCommand(command, args, `${input.latex}\n`, cli);
      return await readFile(join(outputDir, "0001.svg"), "utf8");
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  };
}

function bundledRatexBinaryPath() {
  const platform = process.platform === "win32" ? "windows" : process.platform;
  const extension = process.platform === "win32" ? ".exe" : "";
  const binaryPath = resolve(__dirname, "vendor", `ratex-render-svg-${platform}-${process.arch}${extension}`);

  try {
    accessSync(binaryPath, constants.X_OK);
  } catch {
    throw new Error(`ratex: no bundled RaTeX binary for ${process.platform}/${process.arch} (expected ${binaryPath}); pass ratex_options.cli.command instead.`);
  }
  return binaryPath;
}

async function runCommand(command, args, stdin, cli) {
  const maxBuffer = cli.maxBuffer ?? 20 * 1024 * 1024;
  const child = spawn(command, args, {
    cwd: cli.cwd,
    env: cli.env ? { ...process.env, ...cli.env } : process.env,
    stdio: ["pipe", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  let timedOut = false;

  const timer = cli.timeoutMs
    ? setTimeout(() => {
        timedOut = true;
        child.kill("SIGTERM");
      }, cli.timeoutMs)
    : undefined;

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    stdout += chunk;
    if (stdout.length > maxBuffer) child.kill("SIGTERM");
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
    if (stderr.length > maxBuffer) child.kill("SIGTERM");
  });

  child.stdin.end(stdin);

  const code = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
  if (timer) clearTimeout(timer);

  if (timedOut) {
    throw new Error(`RaTeX command timed out: ${command}`);
  }
  if (code !== 0) {
    const detail = stderr.trim() || stdout.trim() || `exit code ${code}`;
    throw new Error(`RaTeX command failed: ${detail}`);
  }
}

function normalizeLatexForCli(latex) {
  return latex.replace(/\r?\n/g, " ").trim();
}

function wrapRenderedSvg(svg, latex, displayMode, opts) {
  const className = displayMode ? opts.blockClass : opts.inlineClass;
  const tag = displayMode ? "div" : "span";
  const cleanSvg = svg.replace(/<\?xml[^>]*>\s*/i, "").replace(/<svg\b/i, '<svg aria-hidden="true" focusable="false"');
  return `<${tag} class="${escapeAttr(className)}" role="math" aria-label="${escapeAttr(latex)}">${cleanSvg}</${tag}>`;
}

function renderError(latex, error, opts) {
  const message = error instanceof Error ? error.message : String(error);
  return `<span class="${escapeAttr(opts.errorClass)}" role="math" aria-label="${escapeAttr(latex)}" title="${escapeAttr(message)}"><code>${escapeHtml(latex)}</code></span>`;
}

function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

module.exports = ratex;
