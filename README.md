# Hexo Theme Icarus

## Demo & Preview

[vluv's space](https://vluv.space/)

### Multiple Theme Support

Support multiple light and dark themes:

- **System Theme**: Follow system theme automatically, use `Nord` for light mode and `Mocha` for dark mode by default
- **Light Themes**: `Nord`, `Cattpuccin Latte`
- **Dark Themes**: `Catppuccin Mocha`, `Catppuccin Macchiato`, `Tokyo Night`

| ![](assets/README/nord.png) | ![](assets/README/mocha.png) |
| --------------------------- | ---------------------------- |

### Components

#### Table

| ![1763371106238](assets/README/table_nord.png) | ![1763371131768](assets/README/table_tokyo.png) |
| ---------------------------------------------- | ----------------------------------------------- |

#### Quote

| ![1763371059037](assets/README/quote_light.png) |
| ----------------------------------------------- |
| ![1763371021736](assets/README/quote_dark.png)  |

#### Footer

| ![1763371250167](assets/README/footer_nord.png) |
| ----------------------------------------------- |
| ![1763371215054](assets/README/footer_dark.png) |

## Installation

```shell
$ bun add hexo-theme-gnix
$ hexo config theme gnix
```

## Setup

<details>
<summary>Math Rendering Setup</summary>

To enable math rendering with optimized performance, use [markdown-it-mathjax3-pro](https://github.com/NeoNexusX/markdown-it-mathjax3-pro), which supports both SSR and CSR modes

</details>

<details>
<summary>Code Highlight Setup</summary>

Use [hexo-shiki-highlight](https://github.com/Efterklang/hexo-shiki-highlight) plugin for code block highlighting, support multiple themes as well;

Set `syntax_highlighter` to `shiki` in your hexo `_config.yml`:

```yaml _config.yml
# Syntax Highlighter
syntax_highlighter: shiki
```

| <img width="1386" height="720" alt="image" src="https://github.com/user-attachments/assets/f0435c12-5140-4ca4-86bb-e5237039cc2d" /> | <img width="1394" height="736" alt="image" src="https://github.com/user-attachments/assets/406a656f-9e99-4fb7-bb34-a2e1078451e4" /> |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |

</details>
