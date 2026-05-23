## 外部项目

`~/Projects/vluv` — 使用本主题的 Hexo 项目，含 `_config.yml` 和 `_config.gnix.yml`。

### 文章

`source/_posts` 是指向 `~/OneDrive/Documents/posts/blog/_posts/` 的软链接，**必须编辑原文件**：
- 其中`~/OneDrive/Documents/posts/blog/_posts/test_components.md` & `~/OneDrive/Documents/posts/blog/_posts/test_components__en.md` 是组件文档，介绍`./source/js/components/`中各组件的用法

多语言约定：`foo.md`（中文）/ `foo__en.md`（英文）

### 关键数据文件

- `source/js/data/changelog-data.js` — 更新日志双语数据，由 `x-changelog` 组件渲染
