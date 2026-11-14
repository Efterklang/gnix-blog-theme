## Installation

```shell
bun add hexo-theme-gnix
hexo config theme gnix
```

## Features

### Multiple-Theme Support

Support multiple light and dark themes:

- **System Theme**: Follow system theme automatically, use `Mono Light` for light mode and `Mono Dark` for dark mode by default
- **Light Themes**: `Nord Light`, `Catppuccin Latte`, `Song Porcelain`, `Mono Light`
- **Dark Themes**: `Catppuccin Mocha`, `Nord Night`, `Rosé Pine`, `Tokyo Night`, `Mono Dark`

`Mono Dark` uses a pure black background with white text; `Mono Light` uses a pure white background with black text. Each has a matching Shiki palette. Shiki's built-in `nord` theme is dark-only, so `Nord Night` uses `nord` and `Nord Light` uses `github-light` for code highlighting.

<table border="1">
  <tr>
    <td><img width="3074" height="2060" alt="image" src="https://github.com/user-attachments/assets/80f772e7-2d91-4bd2-bfbe-bf73753721dc" /></td>
    <td><img width="3074" height="2060" alt="image" src="https://github.com/user-attachments/assets/0ae6a569-5e88-41a2-92f3-e08b9d3e5531" /></td>
    <td><img width="1758" height="2060" alt="image" src="https://github.com/user-attachments/assets/673a89fa-0ab0-43bb-a9e8-8dfd8eebaa90" /></td>
  </tr>
</table>

## Components

### Mermaid diagrams

Mermaid fences render at build time as inline SVG using
[agentic-mermaid](https://github.com/adewale/agentic-mermaid), requiring Node.js
22 or later. Diagrams inherit the site's colors and fonts and retain the
pan, zoom and copy controls. The fullscreen-preview button opens a viewport-sized
dialog with the same controls. Escape or the close button returns to the article
and restores its previous zoom and pan; inside the preview, arrow keys pan,
`+` / `-` zoom and `0` resets the view. Gantt, pie, mindmap and Git graphs can now render
at build time alongside flowcharts, sequence diagrams, class diagrams and ER
diagrams.

`markdown_exit.mermaid_options.render` passes options through to
`agentic-mermaid` (for example `style`, `padding` or `font`). The defaults use a
transparent background, theme CSS variables and no external font imports.
Unsupported syntax or renderer errors produce a warning and fall back to
browser-side Mermaid; set `markdown_exit.mermaid_options.fallback: false` to
display the source as a code block instead.

Cached SVGs from the previous renderer remain styled. Regenerate cached
Markdown in Hexo's database to render existing posts with agentic-mermaid.

### Responsive images and metadata cache

Bitiful Markdown images and article covers share a metadata cache at
`thumbcache.json` in the Hexo project root. Caching is enabled by default and
reuses the existing file. Identical in-flight requests are combined, and at most
four images request metadata concurrently. The cache is saved after generation
and on Hexo exit.

Metadata failures only produce warnings and do not stop the build. If dimensions
are unavailable, the image uses standard markup and its original URL. If only
ThumbHash generation fails, responsive sizing remains available without a
placeholder.

Optional overrides belong in the site's `_config.yml`:

```yaml
markdown_exit:
  image_options:
    cache_path: thumbcache.json # Relative to the Hexo project root; false disables disk caching.
    concurrency: 4
    request_timeout: 10000 # Per metadata request, in milliseconds.
```

Lazy Markdown images use `sizes="auto, …"` with explicit dimensions and an
aspect-ratio wrapper. Supporting browsers select candidates from the actual
layout, including reading-width preferences; older browsers use a responsive
fallback based on the default article column. An explicit `progressive.sizes`
option still overrides this default. Covers use their real dimensions, a
layout-specific `sizes` value and a cached ThumbHash or 32px placeholder.
Other image hosts keep their original URLs without Bitiful resize parameters.

Existing rendered Markdown in Hexo's database must be regenerated for the new
image markup to appear; the metadata cache can be retained across that rebuild.

### Table, Math, Quote, Callout & Tabs, Highlight

<table>
  <tr>
    <td><img width="1806" height="378" alt="image" src="https://github.com/user-attachments/assets/63712c7c-4c4c-4a9e-89cb-1b558769e438" /></td>
    <td><img width="1754" height="394" alt="image" src="https://github.com/user-attachments/assets/4055601f-da4f-4643-8eaf-7965afe3836f" /></td>
  </tr>
  <tr>
    <td><img width="1314" height="508" alt="image" src="https://github.com/user-attachments/assets/26c31f7d-55dd-4e3f-994f-99492bb801f0" /></td>
    <td><img width="1798" height="372" alt="image" src="https://github.com/user-attachments/assets/13251a06-444b-4aaf-aed4-c9f436f10393" /></td>
  </tr>
</table>

---

<table>
  <tr>
    <td><img width="1750" height="330" alt="image" src="https://github.com/user-attachments/assets/976531e7-6988-476f-a24b-d3aa40b53cab" /></td>
    <td><img width="976" height="330" alt="image" src="https://github.com/user-attachments/assets/8ee76260-8054-41a2-8d89-2b982d4ef2bc" /></td>
  </tr>
</table>

## Links

- Change log: http://vluv.space/change
- Live Preview for Markdown: http://vluv.space/test_markdown/
- Live Preview for Components: https://vluv.space/test_components/
- Live Preview for Flavoured Markdown & HTML Element: https://vluv.space/test_flavored_md/


## Credit

- [ppoffice/hexo-theme-icarus: A simple, delicate, and modern theme for the static site generator Hexo.](https://github.com/ppoffice/hexo-theme-icarus)
- [D0n9X1n/hexo-blog-encrypt: Yet, just another hexo plugin for security.](https://github.com/D0n9X1n/hexo-blog-encrypt)
- [hexojs/hexo-generator-feed: Feed generator for Hexo.](https://github.com/hexojs/hexo-generator-feed)
- [hexojs/hexo-generator-sitemap: Sitemap generator for Hexo.](https://github.com/hexojs/hexo-generator-sitemap)
- [hexojs/hexo-generator-tag: Tag generator for Hexo.](https://github.com/hexojs/hexo-generator-tag)
- [hexojs/hexo-generator-archive: Archive generator for Hexo.](https://github.com/hexojs/hexo-generator-archive)
- [ebullient/markdown-it-obsidian-callouts: markdown-it plugin for GitHub and Obsidian callouts.](https://github.com/ebullient/markdown-it-obsidian-callouts?tab=Apache-2.0-1-ov-file)
