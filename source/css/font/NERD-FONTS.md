# Symbols Nerd Font Mono

The default font stacks use system fonts for text and Symbols Nerd Font Mono
for missing icons. Maple Mono NF CN is an optional download in Recommended Fonts.

These files are Unicode subsets of the upstream **Nerd Fonts v3.4.0** font:

- Source: https://github.com/ryanoasis/nerd-fonts/blob/v3.4.0/patched-fonts/NerdFontsSymbolsOnly/SymbolsNerdFontMono-Regular.ttf
- Upstream license: https://github.com/ryanoasis/nerd-fonts/blob/v3.4.0/patched-fonts/NerdFontsSymbolsOnly/LICENSE
- Bundled license: `NERD-FONTS-LICENSE.txt`
- `woff2/SymbolsNerdFontMono-common.*.woff2`: 48 common characters used by the
  file tree and existing articles, **9,352 bytes**.
- The other 52 `woff2/SymbolsNerdFontMono-u*.*.woff2` files cover the remaining
  characters in disjoint Unicode ranges. Each starts as a 256-codepoint block;
  blocks exceeding 64 KiB are split further. The largest current file is
  **50,024 bytes**.

The complete upstream coverage of **10,410 characters** is retained. The shards
contain symbols, with no Latin alphabet or Chinese text. Apple's SF Symbols
are a separate font and are not supplied by Nerd Fonts.

Splitting adds some repeated font metadata: all files together total 1,249,444
bytes (previously 1,112,232). A page using only common icons now needs the 9.4 KB
common file instead of a 612 KB BMP file and possibly a 501 KB supplementary
file. CSS contains exact ranges that exclude common glyphs from other shards,
so a common icon does not also request its Unicode block. File names include a
content hash for HTTP caching.

To regenerate, install fontTools (generated with 4.65.0) and `woff2_compress`,
download the pinned upstream TTF above, then run from the theme directory:

```sh
python3 tools/subset-nerd-font.py /path/to/SymbolsNerdFontMono-Regular.ttf
```

The script verifies the source SHA-256, reads `nerd-font-common.txt`, retains
every mapped character exactly once, creates the WOFF2 files and updates the
marked section of `default.css`. It retains all name IDs and languages and
preserves the family name `Symbols Nerd Font Mono`. Edit the common character
list when new frequently used icons should move into that file; full Unicode
coverage remains available independently of the list.

`default.css` declares the subsets using `unicode-range`. Do not preload them:
the browser should request only the subset needed by rendered characters. This
is character-based loading, not viewport-based lazy loading. The short
`font-display: block` period hides an icon while its font loads without delaying
ordinary text. Custom font stacks retain the same fallback at application time;
the reader's saved family names are kept as entered.
