window.__CHANGELOG_DATA__ = [
  {
    year: 2026,
    items: [
      {
        date: '5.25',
        cn: [
          '废弃归档与标签页的分页功能：archive_generator 与 tag_generator 现在为每种语言各生成一份完整列表，移除 hexo-pagination 依赖以及 per_page / pagination_dir 相关配置',
          '不再生成 /archives/ 页面（与首页内容完全一致），首页即归档列表；旧的 /archives/ 链接将 404',
          '移除 archive_generator 的 yearly / monthly / daily 按时间分组聚合页生成逻辑，对应配置项已废弃可从站点 _config 中删除'
        ],
        en: [
          'Drop pagination from archive and tag pages: archive_generator and tag_generator now emit a single full listing per language; hexo-pagination dependency and per_page / pagination_dir options are gone',
          'Stop emitting /archives/ (it duplicated the home page); the home page itself is the archive listing — existing /archives/ links will 404',
          'Remove archive_generator yearly / monthly / daily time-bucketed pages; the corresponding config keys are deprecated and can be removed from site _config'
        ],
        category: 'refactor'
      },
      {
        date: '5.24',
        cn: ['修复 x-tree 嵌套在非活动 x-tab 中时子项不可见的问题：移除初始 max-height 测量（在 display:none 的父级中 scrollHeight 恒为 0，导致树永久折叠），改由 toggleNode 在展开/折叠时按需测量'],
        en: ['Fix x-tree children being invisible when nested inside an inactive x-tab: drop the initial max-height measurement (scrollHeight is 0 under a display:none ancestor, leaving the tree permanently collapsed) and rely on toggleNode to measure on demand'],
        category: 'fix'
      },
      {
        date: '5.24',
        cn: [
          '搜索框整体视觉重设计：玻璃质感容器（backdrop-blur）+ 统一圆角；section header 极简化；post item 用 surface 背景代替文字色跳变作为 hover/active 反馈，active 增加左侧高亮条；tag 结果改为内联 pill 排列',
          '修复搜索高亮：搜索 he 在 apache 中现在显示完整 apache 并高亮 he（原本只显示 he）；文章/页面标题也参与高亮；解码 content.json 中的 HTML 实体，例如 UI&#x2F;UX 正确显示为 UI/UX'
        ],
        en: [
          'Redesign searchbox: glass container with backdrop-blur and unified border-radius; minimal section labels; surface-based hover/active feedback on post items with a left accent bar for the active item; tag results render as inline pills',
          'Fix search highlight: searching `he` against `apache` now shows the full `apache` with `he` highlighted (previously only `he` was shown); post/page titles are also highlighted; HTML entities pre-encoded in content.json are decoded so e.g. UI&#x2F;UX renders correctly as UI/UX'
        ],
        category: 'uiux'
      },
      {
        date: '5.24',
        cn: ['合并 layout/search/insight.jsx 到 layout/common/search.jsx：insight 是唯一搜索插件，移除多余的 dispatcher 层'],
        en: ['Merge layout/search/insight.jsx into layout/common/search.jsx: insight is the only search plugin; remove the dispatcher indirection'],
        category: 'refactor'
      },
      {
        date: '5.23',
        cn: ['将变更日志提取为 x-changelog 自定义组件，数据与渲染逻辑单一来源，支持中英双语 lang 属性切换'],
        en: ['Extract changelog into an x-changelog custom component with single-source data and bilingual lang attribute switching'],
        category: 'refactor'
      },
      {
        date: '5.23',
        cn: ['移除文章弹窗（字体设置、文章信息、评论）的标题栏'],
        en: ['Remove popover headers from article font settings, article info, and comment popovers'],
        category: 'uiux'
      },
      {
        date: '5.22',
        cn: ['重构 i18n：改用 `__{lang}.md` 文件后缀作为多语言文章约定，简化目录结构与查找逻辑'],
        en: ['Refactor i18n: switch to `__{lang}.md` filename suffix convention for multi-language posts, simplifying directory layout and lookup logic'],
        category: 'refactor'
      },
      {
        date: '5.20 - 5.22',
        cn: ['将首页合并进归档页，归档列表支持 hover 预览弹窗；清理重复样式与残留代码'],
        en: ['Merge home page into archive; archive list now supports a hover preview popup; clean up duplicate styles and stale code'],
        category: 'Feat'
      },
      {
        date: '5.18',
        cn: ['将 hexo-generator-sitemap 移植到主题内部（include/hexo/sitemap.js），用模板字符串和内置简易 glob 匹配替换 nunjucks 和 micromatch 依赖；保留原插件的 hexo.config.sitemap 配置 schema，可直接卸载外部插件'],
        en: ['Port hexo-generator-sitemap into the theme (include/hexo/sitemap.js), replacing nunjucks and micromatch with template literals and an inline glob matcher; preserves the upstream hexo.config.sitemap schema so the external plugin can be removed without site config changes'],
        category: 'refactor'
      },
      {
        date: '5.18',
        cn: ['将 markdown-it-obsidian-callouts 移植到主题作为默认插件（位于 include/hexo/obsidian-callouts.js），支持 [!note] 等 Obsidian/GitHub 风格 callouts 与 ad-* admonitions 语法', '修复 callout 标题中包含 inline code 时因 shiki 异步渲染而输出 [object Promise] 的问题；admonition body 同步改为 render 阶段异步渲染，使内嵌的代码块也能正常高亮', '优化 callout_blocks.css：清理无用 CSS 变量、修正 details[close] 错误选择器、仅对可折叠 callout 启用 cursor:pointer 与 hover、隐藏原生 summary marker；支持通过 admonition color: header 自定义单个 callout 颜色'],
        en: ['Port markdown-it-obsidian-callouts into the theme as a default plugin (at include/hexo/obsidian-callouts.js), supporting [!note]-style Obsidian/GitHub callouts and ad-* admonition syntax', 'Fix [object Promise] output when callout titles contain inline code (shiki async rendering); admonition bodies now also render asynchronously at render-time so nested fenced code blocks highlight correctly', 'Optimize callout_blocks.css: drop dead CSS variables, fix the bogus details[close] selector, gate cursor:pointer and hover behind <details>, hide the native summary marker; support per-callout color override via admonition color: header'],
        category: 'Feat'
      },
      {
        date: '5.8',
        cn: ['支持中英文切换，集成markdown-exit作为md渲染器，在构建时为表格包裹figure.wrapper', '移除 @mdit/tabs，改用 x-tabs 自定义组件'],
        en: ['Add Chinese/English language switching, integrate markdown-exit as the Markdown renderer, wrap tables with figure.wrapper during build', 'Remove @mdit/tabs, replace with x-tabs custom component'],
        category: 'Feat'
      },
      {
        date: '5.7',
        cn: ['将 article-info-popover 从 article.jsx 提取为独立的 article_info.jsx 组件', '替换 Markdown 源文件和评论图标为新的 SVG', '当评论弹窗存在时通过 requestIdleCallback 预加载 Twikoo JS，使评论点击时渲染更快'],
        en: ['Extract article-info-popover from article.jsx into a standalone article_info.jsx component', 'Replace markdown source and comment icons with new SVGs', 'Preload Twikoo JS via requestIdleCallback when comment popover exists so comments render faster on click'],
        category: 'refactor'
      },
      {
        date: '5.7',
        cn: ['新增 md_generator：对于无密码文章，读取源 .md 文件，前置 UTF-8 BOM 以便浏览器原生渲染，并通过 Readable.from(buffer) 将其与生成的 HTML 一起输出；在文章头部暴露 rel=alternate text/markdown 链接，并在文章信息弹窗中提供 Markdown 源文件链接'],
        en: ['Add md_generator: for non-password posts, read the source .md file, prepend UTF-8 BOM so browsers render it natively, and emit it alongside the generated HTML via Readable.from(buffer). Expose rel=alternate text/markdown in article head and a Markdown source link in the article info popover'],
        category: 'Feat'
      },
      {
        date: '5.6',
        cn: ['添加边注样式：.content 内的 &lt;aside&gt; 元素渲染为次文本颜色的注释，带细左边框；在 ≥1280px 屏幕上通过负 margin-right 浮动到右页边，与 .content 并列且不占用其宽度，边注顶部与相邻段落顶部对齐；在较小屏幕上回退为段落下方的流式块', '集成 hexo-generator-tag/archive/home 索引'],
        en: ['Add side note style: <aside> elements inside .content render as subtext-colored notes with a thin left rule; on screens >= 1280px they float into the right margin via negative margin-right so they sit beside .content without taking width from it, and the aside top aligns with the adjacent paragraph top; on smaller screens they fall back to an in-flow block below the paragraph', 'Integrate hexo-generator-tag/archive/home index'],
        category: 'Feat'
      },
      {
        date: '5.5',
        cn: ['重构 image-carousel：从第一张图片自动推导宽高比（通过缓存的 light-DOM &lt;img&gt; 就绪时获取，否则使用分离的 Image() 探测），替代硬编码 3/2——显式 ratio 属性仍优先；将 next/prev/dot/keyboard/touch 入口统一为单个 _userNav 辅助函数以重置自动播放时钟；将 chevron SVG 和魔数（默认间隔、滑动阈值、回退比例）提取为模块级常量；监听 ratio 属性变化', '重写 text-image-section：放弃包装 div，改用 &lt;figure&gt; 作为宿主元素的直接子元素，使用 display:flow-root 包含浮动并隔离父块级格式化上下文布局（例如避免引用块左边框在移动端渗入图片区域），保留用户内容为直接子元素而非重新序列化 innerHTML'],
        en: ['Refactor image-carousel: auto-derive aspect ratio from the first image (via cached light-DOM <img> when ready, otherwise a detached Image() probe) instead of hardcoding 3/2 — explicit ratio attribute still wins; consolidate next/prev/dot/keyboard/touch entry points through a single _userNav helper that resets the autoplay clock; extract chevron SVGs and magic numbers (default interval, swipe threshold, fallback ratio) to module-scope constants; observe ratio attribute changes', 'Rewrite text-image-section: drop wrapper divs in favor of <figure> as a direct child of the host element, use display:flow-root to contain floats and isolate the layout from parent block formatting (e.g. blockquote left borders bleeding into the image area on mobile), preserve user content as direct children instead of re-serializing innerHTML'],
        category: 'refactor'
      },
      {
        date: '5.5',
        cn: ['字体设置重置按钮现在能从 default.css 读取原始 --font-* 值，即使用户已通过内联样式覆盖，方法是临时剥离内联覆盖再读取计算样式', '放弃字体设置弹窗内的 i18n（显示设置、自定义字体、应用/重置等）——UI 固定为英文；从 languages/en.yml 和 zh-CN.yml 中移除未使用的键', '字体设置重置按钮现在用默认 CSS 变量值（如 --font-serif）填充输入框，使用户可以从默认值查看和编辑，而非空字段', '将 --article-font-family 应用于浮动目录并在移动端缩小目录字体，使标题在小屏幕上舒适显示', '在 x-chat shadow DOM 内添加 .chat-heading 样式，使聊天消息可使用非 h2/h3 标题而不污染文章目录', '重新设计 x-chat：极简网格布局，头像+标题在第 1 行，气泡在第 2 行；移动端气泡下移至标题下方的全宽行，避免头像占用水平空间；优化气泡内的排版、滚动条、代码/键盘/列表样式'],
        en: ['Font settings reset button now reads the original --font-* values from default.css even after the user has overridden them inline, by temporarily stripping the inline overrides while reading the computed style', 'Drop i18n inside the font settings popover (Display Settings, Custom Fonts, Apply/Reset, etc.) — UI is fixed in English; remove unused keys from languages/en.yml and zh-CN.yml', 'Font settings reset button now fills inputs with the default CSS variable values (e.g. --font-serif) so users can see and edit from the defaults instead of empty fields', 'Apply --article-font-family to floating TOC and shrink TOC font sizes on mobile so headings fit comfortably on small screens', 'Add .chat-heading style inside x-chat shadow DOM so chat messages can use a non-h2/h3 heading that does not pollute the article TOC', 'Redesign x-chat: minimalist grid layout with avatar+header on row 1 and bubble on row 2; on mobile the bubble drops to a full-width row below the header so avatar no longer eats horizontal space; refined typography, scrollbar, code/kbd/list styles inside bubbles'],
        category: 'uiux'
      },
      {
        date: '5.4',
        cn: ['对非关键 CSS（标注、zeoseven 字体）使用 media="print" 技巧替代 preload+swap，消除浏览器"preload 未使用"警告'],
        en: ['Replace preload+swap with media="print" trick for non-critical CSS (callouts, zeoseven fonts) to eliminate "preload not used" browser warnings'],
        category: 'Perf'
      },
      {
        date: '5.4',
        cn: ['通过读取 hexo.config 修复 Atom 订阅源缺失 title、subtitle 和 author 字段'],
        en: ['Fix Atom feed missing title, subtitle, and author fields by reading from hexo.config'],
        category: 'fix'
      },
      {
        date: '5.3',
        cn: ['在自定义字体设置中添加等宽字体输入框', '允许自定义 CSS URL 文本框垂直调整大小', '为自定义字体表单字段添加 name 属性'],
        en: ['Add monospace font input to custom font settings', 'Allow vertical resizing of custom CSS URL textarea', 'Add name attributes to custom font form fields'],
        category: 'fix'
      },
      {
        date: '5.2',
        cn: ['在每次页面加载时初始化文章排版属性并在 html 元素上设置默认值', '为桌面端粘性导航栏添加半透明模糊效果'],
        en: ['Initialize article typography attributes on every page load and seed defaults on the html element', 'Add translucent blur treatment to the desktop sticky navbar'],
        category: 'fix'
      },
      {
        date: '5.1',
        cn: ['聚合 Busuanzi 页面 PV/UV，覆盖干净 URL、尾部斜杠和 index.html 变体', '改进 Open Graph 和 Twitter Card 元数据，使用规范化描述、绝对去重图片、区域设置、文章标签以及图片 alt/type 字段'],
        en: ['Aggregate Busuanzi page PV/UV across clean URL, trailing slash, and index.html variants', 'Improve Open Graph and Twitter Card metadata with normalized descriptions, absolute deduped images, locale, article tags, and image alt/type fields'],
        category: 'Feat'
      },
      {
        date: '4.28',
        cn: ['重新设计标签和归档页面，使用新衬线字体'],
        en: ['Redesign tags and archive page, use new serif font'],
        category: 'uiux'
      },
      {
        date: '4.26 4.27',
        cn: ['添加文章操作弹窗（字体设置、信息和评论）', '将许可详情移入文章信息', '使用 CSS 变量作为文章排版预设', '优化弹窗样式、焦点状态和操作图标', '调整移动端卡片和评论弹窗布局'],
        en: ['Add article action popovers for font settings, info, and comments', 'Move license details into article info', 'Use CSS variables for article typography presets', 'Polish popover styling, focus states, and action icons', 'Tune mobile card and comment popover layout'],
        category: 'uiux'
      },
      {
        date: '4.24',
        cn: ['重新设计文章布局：标题移至元数据下方，标签移至页脚，添加"阅读更多"链接，支持摘要'],
        en: ['Redesign article layout: move title below metadata, move tags to footer, add Read More link, support excerpts'],
        category: 'uiux'
      },
      {
        date: '4.22',
        cn: ['重新排序字体栈并调整排版'],
        en: ['Reorder font stack and adjust typography'],
        category: 'refactor'
      },
      {
        date: '4.17',
        cn: ['在订阅源中移除加密文章', '为图片显示 figcaption'],
        en: ['Remove encrypted post in feed', 'Display figcaption for images'],
        category: 'Feat'
      },
      {
        date: '4.16',
        cn: ['移除部分边框'],
        en: ['Remove some border'],
        category: 'uiux'
      },
      {
        date: '4.12',
        cn: ['使用 feedsmith 添加 RSS/Atom 订阅源生成和自动发现'],
        en: ['Add RSS/Atom feed generation with autodiscovery using feedsmith'],
        category: 'Feat'
      },
      {
        date: '4.8',
        cn: ['在聊天组件中隐藏滚动条，支持跨浏览器兼容'],
        en: ['Hide scrollbar in chat component with cross-browser compatibility'],
        category: 'fix'
      },
      {
        date: '4.8',
        cn: ['为 hexo 服务器添加热重载脚本，任何源文件变更时自动重载'],
        en: ['Add hot reload script for hexo server, auto reload on any source file change'],
        category: 'Feat'
      },
      {
        date: '4.8',
        cn: ['修复鼠标悬停在 owo-body 上时背景色意外变为透明的问题'],
        en: ['The background color unexpectedly becomes transparent when hovering over owo-body'],
        category: 'fix'
      },
      {
        date: '3.14',
        cn: ['将 CDN 托管的 Swup UMD 脚本替换为 bun 打包的模块，单个 27KB 包'],
        en: ['Replace CDN-hosted Swup UMD scripts with bun-bundled module, single 27KB bundle'],
        category: 'refactor'
      },
      {
        date: '3.7',
        cn: ['修复 Twikoo 评论在 SPA 导航中不加载的问题，通过 loadScriptOnce/loadCSSOnce 按需加载 JS/CSS 资源'],
        en: ['Fix Twikoo comment not loading on SPA navigation, load JS/CSS assets on demand via loadScriptOnce/loadCSSOnce'],
        category: 'fix'
      },
      {
        date: '3.7',
        cn: ['提取 loadCSSOnce 辅助函数，在 mermaid 和 twikoo 中复用'],
        en: ['Extract loadCSSOnce helper, reuse across mermaid and twikoo'],
        category: 'refactor'
      },
      {
        date: '3.6',
        cn: ['在加载时预计算小写搜索字段，提升转义常量以消除每次调用分配'],
        en: ['Precompute lowercase search fields at load time, hoist escape constants to eliminate per-call allocations'],
        category: 'Perf'
      },
      {
        date: '3.6',
        cn: ['将手动 Swup page:view 钩子替换为 data-swup-reload-script 属性'],
        en: ['Replace manual Swup page:view hooks with data-swup-reload-script attribute'],
        category: 'refactor'
      },
      {
        date: '3.6',
        cn: ['将覆盖层（主题选择器、搜索框、目录）迁移到原生 Popover API', '改进无障碍性：为搜索和主题选择器添加 ARIA 属性，Tab 导航和焦点恢复'],
        en: ['Migrate overlays (theme selector, searchbox, TOC) to native Popover API', 'Improve a11y: add ARIA attributes to search and theme selector, Tab nav & focus restoration'],
        category: 'refactor'
      },
      {
        date: '3.4',
        cn: ['Swup：避免不必要的脚本重载'],
        en: ['Swup: Avoid unnecessary script reloading'],
        category: 'fix'
      },
      {
        date: '3.4',
        cn: ['移除 JS 属性，使 minify-html 能将 HTML 压缩为单行'],
        en: ['Remove the JS attribute so minify-html could compress HTML into a single line'],
        category: 'refactor'
      },
      {
        date: '3.4',
        cn: ['在 oklch 颜色空间中使用 color-mix 生成颜色'],
        en: ['Use color-mix in oklch color space to generate colors'],
        category: 'refactor'
      },
      {
        date: '2.25',
        cn: ['添加 image-carousel 自定义元素，支持导航、自动播放和触摸滑动'],
        en: ['Add image-carousel custom element with navigation, autoplay and touch swipe support'],
        category: 'Feat'
      },
      {
        date: '2.25',
        cn: ['添加切换目录的快捷键，提升键盘可访问性'],
        en: ['Add shortcut to toggle TOC for keyboard accessibility'],
        category: 'Feat'
      },
      {
        date: '2.25',
        cn: ['将 text-image-section 迁移到浮动布局，将 image-width 重命名为 width，reverse 重命名为 left'],
        en: ['Migrate text-image-section to float layout, rename image-width to width, reverse to left'],
        category: 'refactor'
      },
      {
        date: '2.19',
        cn: ['添加 text-image-section 自定义元素组件'],
        en: ['Add text-image-section custom element component'],
        category: 'Feat'
      },
      {
        date: '2.19',
        cn: ['统一目录样式，将 SVG 替换为汉堡菜单按钮'],
        en: ['Unified TOC styling, replace SVG with hamburger menu button'],
        category: 'refactor'
      },
      {
        date: '2.14',
        cn: ['在归档页面添加面包屑组件'],
        en: ['Add Breadcrumb components in archive page'],
        category: 'uiux'
      },
      {
        date: '2.8',
        cn: ['Twikoo 初始化错误'],
        en: ['Twikoo init bug'],
        category: 'fix'
      },
      {
        date: '2.7',
        cn: ['添加堆叠卡片展示主题', '调整任务列表内边距'],
        en: ['Add stacked-card to display themes', 'tweak task-list padding'],
        category: 'uiux'
      },
      {
        date: '2.2',
        cn: ['改进链接样式，添加正文文本颜色，更新元数据分隔符'],
        en: ['Improve link styling, add body text color, update meta separators'],
        category: 'uiux'
      },
      {
        date: '2.1',
        cn: ['使用新 Marquee 卡片重写 ABOUT 页面，删除 now 页面'],
        en: ['Rewrite ABOUT page with new Marquee card, delete now page'],
        category: 'Feat'
      },
      {
        date: '1.29',
        cn: ['添加 rose pine 主题'],
        en: ['Add rose pine theme'],
        category: 'Feat'
      },
      {
        date: '1.16',
        cn: ['导航栏使用 mingcute 图标', 'Logo 使用 homemade-apple 字体'],
        en: ['Use mingcute icons for navbar', 'Use homemade-apple font for logo'],
        category: 'uiux'
      },
      {
        date: '1.12',
        cn: ['使用 Swup 替换 Pjax 进行页面过渡'],
        en: ['Replace Pjax with Swup for page transitions'],
        category: 'refactor'
      },
      {
        date: '1.1',
        cn: ['为文章所有标题级别添加锚点', '重构归档页面，按年份和季节组织'],
        en: ['Add anchors to all heading levels in articles', 'Refactor archive page, organize by year and season'],
        category: 'refactor'
      }
    ]
  },
  {
    year: 2025,
    items: [
      {
        date: '1.31',
        cn: ['为 Hexo 博客适配 Obsidian 语法，添加 Obsidian 语法支持'],
        en: ['Adapt Obsidian syntax for Hexo blog, add Obsidian syntax support'],
        category: 'Feat'
      },
      {
        date: '2.12',
        cn: ['复制 hexo-shiki 插件代码并发布到 npm，默认使用 Maple Mono 字体 + Catppuccin Mocha 主题'],
        en: ['Copy hexo-shiki plugin code and publish to npm, default to Maple Mono font + Catppuccin Mocha theme'],
        category: 'Feat'
      },
      {
        date: '2.17',
        cn: ['基于 Catppuccino Mocha 主题调整深色模式颜色'],
        en: ['Adjust Dark Mode colors based on Catppuccino Mocha theme'],
        category: 'refactor'
      },
      {
        date: '2.22',
        cn: ['切换到 Medium Zoom 进行页内图片预览'],
        en: ['Switch to Medium Zoom for in-page image preview'],
        category: 'Feat'
      },
      {
        date: '5.24',
        cn: ['为 Live2D 模型添加深色模式切换；调整标注样式'],
        en: ['Add dark mode switching for live2d model; tweak callout styles'],
        category: 'Feat'
      },
      {
        date: '6.1',
        cn: ['重构 hexo-shiki-highlight，添加交通灯装饰'],
        en: ['Refactor hexo-shiki-highlight, add Traffic Light decoration'],
        category: 'refactor'
      },
      {
        date: '6.2',
        cn: ['优化表格和引用样式'],
        en: ['Optimize table and quote styles'],
        category: 'uiux'
      },
      {
        date: '6.20',
        cn: ['为更多组件适配 Catppuccin 浅色/深色主题，更改浅色主题背景，更新标签样式，添加悬停效果'],
        en: ['Adapt more components to Catppuccin light/dark theme, change light theme background, update tag styles, add hover effects'],
        category: 'uiux'
      },
      {
        date: '6.21',
        cn: ['通过 git 子模块分离主题和博客文章，实现独立源码控制'],
        en: ['Separate theme and blog posts via git submodule for independent source control'],
        category: 'other'
      },
      {
        date: '6.28',
        cn: ['添加 hexo-shiki-highlight 功能，支持浅色/深色主题', '重构 obsidian-callout，支持浅色/深色主题'],
        en: ['Add hexo-shiki-highlight Feat, support light/dark theme', 'Refactor obsidian-callout, support light/dark theme'],
        category: 'Feat'
      },
      {
        date: '6.29',
        cn: ['开发 hexo-mermaid-diagram 插件，在右下角添加 GitHub 式控制面板，仅在使用 mermaid 时嵌入 iframe', '优化字体大小，使用 FontTools 进行字体子集化，移除繁体中文，保留拉丁文和常用简体中文', '尝试 EdgeOne CDN（认证要求过多，短暂试用后切回 Cloudflare）'],
        en: ['Develop hexo-mermaid-diagram plugin, add GitHub-like control panel in bottom right, only embed iframe when mermaid is used', 'Optimize font size, use FontTools for font subsetting, remove Traditional Chinese, keep Latin and common Simplified Chinese', 'Try EdgeOne CDN (too many authentication requirements, switched back to Cloudflare after brief trial)'],
        category: 'Feat'
      },
      {
        date: '7.2',
        cn: ['将对象存储从 Cloudflare R2 迁移到 Bitiful S4'],
        en: ['Migrate object storage from Cloudflare R2 to Bitiful S4'],
        category: 'Perf'
      },
      {
        date: '8.9',
        cn: ['从导航栏移除 /GALLERY，通过 Vercel 部署 exif-photo-blog 到 photos.vluv.space', '整理 /ABOUT 和 NOW 内容'],
        en: ['Remove /GALLERY from Navigation Bar, deploy exif-photo-blog to photos.vluv.space via Vercel', 'Organize /ABOUT and NOW content'],
        category: 'uiux'
      },
      {
        date: '8.10',
        cn: ['使用 Google 字体 Noto Sans，中文字体项目 Maple Mono NF CN'],
        en: ['Use Google Font for Noto Sans, Chinese Webfont Project for Maple Mono NF CN'],
        category: 'Feat'
      },
      {
        date: '9.2',
        cn: ['添加 ICP 备案，为国内图片设置 CDN'],
        en: ['Add ICP filing, set up domestic CDN for images'],
        category: 'Feat'
      },
      {
        date: '9.6',
        cn: ['博客封面和文章图片支持渐进加载'],
        en: ['Blog cover and post images support progressive loading'],
        category: 'Perf'
      },
      {
        date: '9.8',
        cn: ['设置国内和国际 CDN 分流（EdgeOne CDN + Bitiful）'],
        en: ['Set up domestic and international CDN splitting (EdgeOne CDN + Bitiful)'],
        category: 'Perf'
      },
      {
        date: '9.9',
        cn: ['为 CDN 分流自托管部分 npm 包，优化国内加载速度'],
        en: ['Self-host some npm packages for CDN splitting, optimize domestic loading speed'],
        category: 'Perf'
      },
      {
        date: '9.11',
        cn: ['使用 Busuanzi 替代 vercount 进行访客统计，优化加载速度'],
        en: ['Use Busuanzi instead of vercount for visitor counting, optimize loading speed'],
        category: 'Perf'
      },
      {
        date: '10.10',
        cn: ['精简 bulma CSS 框架，优化页面性能'],
        en: ['Streamline bulma CSS framework, optimize page Perf'],
        category: 'Perf'
      },
      {
        date: '10.21',
        cn: ['移动端 UX 优化，隐藏小部件'],
        en: ['Mobile UX optimization, hide widgets'],
        category: 'uiux'
      },
      {
        date: '11.16',
        cn: ['添加颜色主题切换，支持 Catppuccin、Tokyo Night 等', '优化页脚和面包屑 UI', '优化标注和 Twikoo UI', '更新 hexo-shiki-highlight，支持多主题'],
        en: ['Add color theme switching, support Catppuccin, Tokyo Night, etc.', 'Optimize Footer and Breadcrumb UI', 'Optimize Callout and twikoo UI', 'Update hexo-shiki-highlight, support multi-theme'],
        category: 'uiux'
      },
      {
        date: '11.21',
        cn: ['使用 markdown-it-mathjax3-pro 插件进行服务端数学渲染', '开发 markdown-it-inline-code 插件实现行内代码高亮'],
        en: ['Use markdown-it-mathjax3-pro plugin for server-side math rendering', 'Develop markdown-it-inline-code plugin for inline code highlighting'],
        category: 'Feat'
      },
      {
        date: '11.30',
        cn: ['使用纯文本重新设计 Logo', '响应式导航栏设计，移动端显示 logo 和 navbar-burger'],
        en: ['Redesign logo using plain text', 'Responsive navbar design, show logo & navbar-burger on mobile'],
        category: 'uiux'
      },
      {
        date: '12.08',
        cn: ['切换到 markdown-exit 渲染引擎', '使用 <code>@mdit/tabs</code> 替代 Hexo 自定义标签'],
        en: ['Switch to markdown-exit rendering engine', 'Use <code>@mdit/tabs</code> instead of Hexo Custom Tag'],
        category: 'refactor'
      },
      {
        date: '12.13',
        cn: ['使用 biome 进行代码检查和格式化'],
        en: ['Use biome for linting and formatting'],
        category: 'refactor'
      },
      {
        date: '12.18',
        cn: ['优化搜索框 UIUX 和性能', '使用 esbuild 和 @minify-html/node 进行资源压缩'],
        en: ['Optimize Search Box UIUX & Perf', 'Use esbuild and @minify-html/node for asset compression'],
        category: 'uiux'
      },
      {
        date: '12.21',
        cn: ['编写并使用 markdown-exit-mermaid 插件进行 mermaid 渲染'],
        en: ['Write and use markdown-exit-mermaid plugin for mermaid rendering'],
        category: 'Feat'
      }
    ]
  },
  {
    year: 2024,
    items: [
      {
        date: '1.3',
        cn: ['切换到 Hexo 框架 + Icarus 主题（HTML 繁琐，懒得学 Vue/React），迁移部分文章'],
        en: ['Switch to Hexo framework + Icarus theme (HTML is tedious, too lazy to learn vue/react), migrate some articles'],
        category: 'Feat'
      },
      {
        date: '1.13',
        cn: ['添加 Gallery 页面'],
        en: ['Add Gallery Page'],
        category: 'Feat'
      },
      {
        date: '1.15',
        cn: ['尝试 gittalk 和 utterances，最终选择 Twikoo 作为评论系统'],
        en: ['Try gittalk and utterances, finally choose Twikoo as comment system'],
        category: 'Feat'
      },
      {
        date: '3.12',
        cn: ['在阿里云购买 <code>jvav.love</code> 域名一年，费用为个位数', '使用 ZOHO 设置企业邮箱并向计算机网络老师发送邮件（用于"五个一工程"项目作业）'],
        en: ['Buy <code>jvav.love</code> domain for one year on Alibaba Cloud, cost is single digit.', 'Use ZOHO to set up enterprise email and send email to computer network teacher (for "五个一工程" project assignment)'],
        category: 'other'
      },
      {
        date: '4.26',
        cn: ['使用 Hexo-Blog-Encrypt 插件为部分文章设置密码'],
        en: ['Use Hexo-Blog-Encrypt plugin to set passwords for some articles'],
        category: 'Feat'
      },
      {
        date: '6.14',
        cn: ['添加 Vercel 部署，为文章图片设置圆角'],
        en: ['Add Vercel deployment, set rounded corners for post images'],
        category: 'Feat'
      },
      {
        date: '6.15',
        cn: ['添加 Onedrive 页面'],
        en: ['Add Onedrive Page'],
        category: 'Feat'
      },
      {
        date: '7.25',
        cn: ['添加 Asoul Live2D 模型，好可爱'],
        en: ['Add Asoul Live2d model, so cute'],
        category: 'Feat'
      },
      {
        date: '9.14',
        cn: ['移除 git deployer，切换到命令行 git push 配合 GitHub Action 部署'],
        en: ['Remove git deployer, switch to command line git push with GitHub action for deployment'],
        category: 'refactor'
      },
      {
        date: '9.16',
        cn: ['部署到 Cloudflare Pages'],
        en: ['Deploy to Cloudflare Pages'],
        category: 'Feat'
      },
      {
        date: '9.23',
        cn: ['在 namesilo 购买 vluv.space 域名；添加友链页面'],
        en: ['Buy vluv.space domain on namesilo; add friend links page'],
        category: 'Feat'
      },
      {
        date: '9.28',
        cn: ['使用 lazyload、gulp、instant page 等方案优化性能'],
        en: ['Use lazyload, gulp, instant page and other solutions to optimize Perf'],
        category: 'Perf'
      },
      {
        date: '9.30',
        cn: ['将 Twikoo 部署迁移到 Azure 服务器，1h1g 勉强够用'],
        en: ['Move twikoo deployment to Azure server, 1h1g is barely sufficient'],
        category: 'Perf'
      },
      {
        date: '10.1',
        cn: ['将代码渲染从 highlight.js 切换到 shiki'],
        en: ['Switch code rendering from highlight.js to shiki'],
        category: 'Feat'
      },
      {
        date: '10.9',
        cn: ['添加 Clarity'],
        en: ['Add Clarity'],
        category: 'Feat'
      },
      {
        date: '10.12',
        cn: ['在 About 页面添加时间线'],
        en: ['Add Time Line to About Page'],
        category: 'Feat'
      },
      {
        date: '11.15',
        cn: ['使用 Cloudflare R2 Storage 进行对象存储，将包管理器切换到 bun'],
        en: ['Use Cloudflare R2 Storage for object storage, switch package manager to bun'],
        category: 'Perf'
      },
      {
        date: '11.29',
        cn: ['切换到 Font Awesome 6 图标包'],
        en: ['Switch to Font Awesome 6 icon pack'],
        category: 'Feat'
      },
      {
        date: '12.2',
        cn: ['使用 Excalidraw 绘制 Logo 和 Icon'],
        en: ['Draw Logo & Icon with Excalidraw'],
        category: 'other'
      }
    ]
  },
  {
    year: 2023,
    items: [
      {
        date: '7.15',
        cn: ['创建个人网站首页，部署到 GitHub Page；基于 html+js+css'],
        en: ['Create personal website Homepage, deploy to GitHub Page; based on html+js+css'],
        category: 'Feat'
      },
      {
        date: '7.17',
        cn: ['设置背景音乐'],
        en: ['Set background music'],
        category: 'Feat'
      },
      {
        date: '8.16',
        cn: ['使用纯 html+css 编写时间线组件；记录初中到大一的事件；添加 404.html'],
        en: ['Write timeline component with pure html+css; record events from middle school to freshman year; add 404.html'],
        category: 'Feat'
      }
    ]
  }
];