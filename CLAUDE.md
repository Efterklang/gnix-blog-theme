# CLAUDE.md

## Rules

1. 完成工作之后，除非明确说明，否则不必运行`bunx hexo gen`等命令进行测试，我会自己验证结果。

## 外部项目

- `~/Projects/vluv` — 使用本主题的 Hexo 项目，含 `_config.yml` 和 `_config.gnix.yml`。

### 文章

`source/_posts` 是指向 `~/OneDrive/Documents/posts/blog/_posts/` 的软链接，**必须编辑原文件**：

多语言约定：`foo.md`（中文）/ `foo__en.md`（英文）

- 其中`~/OneDrive/Documents/posts/blog/_posts/test_components__en.md` 是组件文档，介绍`./source/js/components/`中各组件的用法

### 关键数据文件

- `source/js/data/changelog-data.js` — 更新日志双语数据，由 `x-changelog` 组件渲染。**有重大更新时可在该文件中记录**
