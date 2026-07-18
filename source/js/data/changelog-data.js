window.__CHANGELOG_DATA__ = [
  {
    year: 2026,
    items: [
      {
        date: "7.17",
        cn: [
          "清理偏好设置脚本与样式：主题切换不再重复同步 UI（统一走 gnix:theme-change 事件）、调色板下拉仅在明暗方案切换时重建选项、自定义字体默认值缓存且快捷弹窗跳过相关计算（此前每次页面加载与每格行高拖动都会触发强制样式重算）；移除已无消费者的 data-article-line-height 属性及配套 legacy CSS，行高统一由 --article-line-height 变量驱动；设置页返回按钮补上手型光标",
        ],
        en: [
          "Clean up the preferences script and styles: theme switches no longer double-sync the UI (everything goes through the gnix:theme-change event), the palette select only rebuilds its options when the light/dark scheme flips, and default custom font families are cached with the quick popup skipping that work entirely (previously every page load and every line-height slider tick forced a style recalc); the consumer-less data-article-line-height attribute and its legacy CSS are removed in favor of the --article-line-height variable, and the settings page back button gains a pointer cursor",
        ],
        category: "refactor",
      },
      {
        date: "7.17",
        cn: [
          "偏好弹窗改用原生 Popover API 驱动：导航栏按钮通过 popovertarget 声明式开合，点击外部/Esc 关闭交由浏览器 light-dismiss 处理，进入全屏等浏览器强制关闭场景不再需要 hidden 兜底；删除自定义弹窗控制模块及其懒加载/空闲预热链路，preferences.js 改为全站 defer 常驻加载",
        ],
        en: [
          "Drive the preferences popup with the native Popover API: the navbar button toggles it declaratively via popovertarget, outside-click/Esc dismissal is handled by the browser's light-dismiss, and browser-forced closes such as entering fullscreen no longer need the hidden fallback; the custom popup controller module and its lazy-load/idle-prewarm chain are removed, with preferences.js now simply deferred on every page",
        ],
        category: "refactor",
      },
      {
        date: "7.17",
        cn: [
          "重做页面切换动画：移除原先几乎不可感知的 view-transition 整块交叉淡化（也不再采用正文整体上浮的粗颗粒方案），归档/标签页改为页面呈现时文章行自上而下逐条浮现，跨分组连续 stagger、节奏与标签幕帘一致，年份标记与季节标题直接呈现；动画由 pagereveal 事件触发，预渲染页激活时同样从首个可见帧开始，无 JS 时列表直接可见",
        ],
        en: [
          "Rework the page transition: drop the previous nearly imperceptible whole-block view-transition crossfade (and skip the coarse whole-content rise variant), archive/tag pages now reveal post rows one by one from the top with a continuous cross-group stagger matching the topic curtain's rhythm, while year markers and season headers render immediately; the animation is driven by the pagereveal event, so prerendered activations still animate from the first visible frame, and without JS the list simply renders visible",
        ],
        category: "uiux",
      },
      {
        date: "7.17",
        cn: ["移除全站 prefers-reduced-motion 降级分支：删除各页面 CSS、图片组/图片轮播/设备展示组件与 Sunny 主题视频中对「减弱动态效果」系统偏好的特判，动画与过渡行为对所有访客一致"],
        en: [
          'Remove the site-wide prefers-reduced-motion fallbacks: page CSS, the image-group / image-carousel / device-carousel components, and the Sunny theme video no longer special-case the system "reduce motion" preference, so animations and transitions behave the same for every visitor',
        ],
        category: "refactor",
      },
      {
        date: "7.16",
        cn: [
          "集成 S3/Bitiful 渐进式图片加载：Markdown 图片渲染支持 thumbhash 模糊占位图、自动 srcset 响应式尺寸、Obsidian 风格 `![alt|宽]` / `![alt|宽x高]` 尺寸语法，以及 JSON 元数据缓存（可通过 markdown_exit.image_options 配置）",
        ],
        en: [
          "Integrate S3/Bitiful progressive image loading: Markdown images now support thumbhash blur placeholders, automatic responsive srcset, Obsidian-style `![alt|width]` / `![alt|widthxheight]` sizing, and JSON metadata caching (configurable via markdown_exit.image_options)",
        ],
        category: "feature",
      },
      {
        date: "7.16",
        cn: [
          "修复偏好弹窗步进按钮的聚焦环以直角溢出容器圆角边框的问题：两端按钮补上与容器对齐的圆角，聚焦环与悬停背景现在沿圆角绘制",
          "偏好弹窗的四个下拉框补充 id 属性，消除浏览器「表单控件缺少 id/name」的提示",
        ],
        en: [
          "Fix the preferences popup stepper buttons' focus ring overflowing the container's rounded border with square corners: the outer buttons now carry matching corner radii, so the focus ring and hover background follow the curve",
          'Give the four selects in the preferences popup id attributes, silencing the browser\'s "form field should have an id or name" warning',
        ],
        category: "fix",
      },
      {
        date: "7.13",
        cn: ["导航栏偏好设置图标更换为 Type（文字排版）字形，更贴合弹窗内容"],
        en: ["Swap the navbar preferences icon for the Type glyph, better matching the popup's typography focus"],
        category: "uiux",
      },
      {
        date: "7.13",
        cn: [
          "文章宽度偏好现在同样作用于归档/标签页：列表列宽跟随收窄/加宽档位，左侧年份侧栏定位同步跟随（原先硬编码 50em）",
          "导航栏重排：偏好设置与搜索移入常驻动作区，移动端不再折叠进 burger 菜单、一步可达；移动端 burger 移到左侧顶替 logo，右侧仅保留偏好与搜索两个图标；外部链接仍在 burger 菜单内展示，桌面端布局不变",
        ],
        en: [
          "The article width preference now also applies to archive/tag pages: the list column follows the narrow/wide steps, and the year rail tracks it as well (previously hardcoded to 50em)",
          "Navbar rework: preferences and search move into an always-visible actions area, reachable in one tap on mobile instead of being folded into the burger menu; on mobile the burger replaces the logo on the left, leaving only the two action icons on the right; external links stay inside the burger menu, and the desktop layout is unchanged",
        ],
        category: "uiux",
      },
      {
        date: "7.13",
        cn: ["拆分偏好设置样式：导航栏快捷弹窗的样式移入常驻的 default.css，preferences.css 仅保留 /preferences 独立页样式且只在该页面加载；弹窗打开时不再懒加载 CSS，空闲预热列表同步移除该样式表"],
        en: [
          "Split the preferences styles: the navbar quick popup styles move into the always-loaded default.css, while preferences.css keeps only the standalone /preferences page styles and is loaded on that page only; opening the popup no longer lazy-loads CSS, and the stylesheet is dropped from the idle prewarm list",
        ],
        category: "refactor",
      },
      {
        date: "7.13",
        cn: ["设置页 Typography 区块调整：字重移到字号下方；自定义字体区块常驻显示（移除折叠开关）；移除 Apply 按钮，输入框失焦或按 Enter 后自动应用自定义字体"],
        en: [
          "Tweak the Typography section of the settings page: the weight row moves below the size row; the custom fonts block is always visible (the collapse toggle is removed); the Apply button is gone — custom fonts now apply automatically when an input loses focus or on Enter",
        ],
        category: "uiux",
      },
      {
        date: "7.12",
        cn: [
          "归档页标签弹窗重设计为沉浸式「幕帘」下拉：点击标题后 hero 区域保持原位，标签列表从其下方展开至视口底部、逐个上浮浮现，无卡片底色，直接浮于模糊淡出的文章列表之上（导航栏与页脚同步模糊），hero 标题染上强调色、分隔线在幕帘打开期间隐藏。浏览器不支持 CSS 锚点定位时回退为原先的居中弹窗",
          "弹窗头部精简为一行小字（标签栏目名 + 文章统计）；关闭按钮改为 hero 右侧的裸 × 符号，仅在幕帘打开时浮现",
          "归档列表行重新加回发布日期：以等宽小字显示在标题前，长标题换行时以悬挂缩进对齐标题文字；悬浮预览中的日期保持不变",
        ],
        en: [
          "Redesign the archive tag picker as an immersive curtain dropdown: clicking the title keeps the hero in place while the tag list floats in below it down to the bottom of the viewport with a staggered rise-in, with no card surface, directly over the blurred, faded post list (navbar and footer blur along with it); the hero title picks up the accent color and the hero divider is hidden while the curtain is open. Browsers without CSS anchor positioning fall back to the previous centered dialog",
          "Slim down the picker header to a single small-print row (topics label + post stats); the close control becomes a bare × at the hero's right edge, shown only while the curtain is open",
          "Bring the publish date back to archive list rows, shown in small mono type before the title, with a hanging indent so wrapped title lines stay aligned; the date in the hover preview is unchanged",
        ],
        category: "uiux",
      },
      {
        date: "7.12",
        cn: [
          "精简归档页 DOM 层级：h1 直接作为 hero（移除 header.archive-hero 与 h1 包裹层）、移除 .archive-stack 包裹层、season 分组的 header 包裹层与 .timeline 容器、条目内的 .archive-item__row 包裹层，以及年份标记内的 span；标签弹窗与年份侧栏结构不变",
          "如有依赖 .archive-stack / .timeline / .archive-item__row / .archive-era__year / .archive-hero__heading 的自定义样式，请迁移到 .archive-page / .archive-group / .archive-item / .archive-era / .archive-hero",
        ],
        en: [
          "Flatten the archive page DOM: the h1 is now the hero itself (dropping the header.archive-hero and h1 wrappers), and the .archive-stack wrapper, the season group's header wrapper and .timeline container, the per-item .archive-item__row wrapper, and the span inside the year marker are all removed; the tag picker popup and year rail markup are unchanged",
          "Custom styles targeting .archive-stack / .timeline / .archive-item__row / .archive-era__year / .archive-hero__heading should migrate to .archive-page / .archive-group / .archive-item / .archive-era / .archive-hero",
        ],
        category: "refactor",
      },
      {
        date: "7.12",
        cn: ["归档页标签弹窗新增 All Posts 入口（含总文章数），可从任意标签/年份归档一键回到全部文章", "归档列表行简化为仅标题；发布日期移入悬浮预览弹层，取代原先的 N° 00x 序号，显示在阅读时长左侧"],
        en: [
          "Add an All Posts entry (with total post count) to the archive tag picker popup, allowing a one-click return to the full archive from any tag or year view",
          "Archive list rows are simplified to the title only; the publish date moves into the hover preview popup, replacing the previous N° 00x running index to the left of the read time",
        ],
        category: "uiux",
      },
      {
        date: "7.10",
        cn: ["修复脚注悬浮预览在正文两端被截断的问题：hover 时 JS 测量并水平钳制 tooltip，使其始终位于正文可视区域内"],
        en: ["Fix footnote hover previews being clipped near the edges of the article body: the tooltip is now measured on hover and horizontally clamped to stay within the content area"],
        category: "fix",
      },
      {
        date: "7.09",
        cn: [
          "偏好设置入口重构为 Obsidian Web Clipper 风格的快捷弹窗：字号 / 文章宽度 / 行高三组 stepper、主题模式 / 配色方案 / 字体 / 语言四个下拉，以及进入完整设置页的 Settings 按钮；桌面端悬浮于导航栏右下、无遮罩且不锁定滚动，可实时对照正文查看排版效果，移动端呈现为底部面板",
          "新增文章宽度设置：五档栏宽（42em–64em）仅作用于文章页正文列，偏好持久化于 localStorage 并由首屏内联脚本即时生效",
          "语言切换移入快捷弹窗（下拉列出全部语言，缺少翻译的条目置灰不可选），并移除 navbar 的语言切换图标",
          "完整设置迁移至独立页面 /preferences/（含 en 路由与 hreflang）：保留主题模式预览卡、浅色/深色方案、字号、行高滑杆、字重、自定义字体 CSS 与实时预览，并新增文章宽度档位；弹窗中字体行的设置图标可直达 Typography 区块",
        ],
        en: [
          "Rebuild the preferences entry as an Obsidian Web Clipper style quick popup: three steppers (font size / article width / line height), four icon selects (theme mode / color palette / typeface / language), and a Settings button leading to the full settings page; on desktop it floats below the navbar with no backdrop or scroll lock so typography changes can be compared against the article in real time, while on mobile it becomes a bottom sheet",
          "Add an article width preference: five column widths (42em–64em) that only affect the article column, persisted in localStorage and applied by the inline boot script before first paint",
          "Move language switching into the quick popup (a select listing every language, with untranslated entries disabled) and remove the navbar language icon",
          "Move the full settings to a standalone /preferences/ page (with an en route and hreflang links): it keeps the theme mode preview cards, light/dark schemes, font size, line-height slider, weight, custom web font CSS, and the live preview, and gains the article width control; the font-row settings icon in the popup deep-links to the Typography section",
        ],
        category: "feature",
      },
      {
        date: "7.09",
        cn: [
          "精简页面 DOM 层级：移除 section.section 与 div.card 两个包裹层，文章链路由 section > .main-content > .card > article.card-content > .content 精简为 .main-content > article.article > .content；封面与评论/文章信息弹层改为 article 的兄弟节点，视觉布局保持不变",
          "如有依赖 .section / .card / .card-content 类名的自定义样式，请迁移到 .main-content / .article",
        ],
        en: [
          "Flatten the page DOM: remove the section.section and div.card wrappers, reducing the article chain from section > .main-content > .card > article.card-content > .content to .main-content > article.article > .content; the cover and the comment/article-info popovers become siblings of the article element, with no visual change",
          "Custom styles targeting the .section / .card / .card-content class names should migrate to .main-content / .article",
        ],
        category: "refactor",
      },
      {
        date: "7.09",
        cn: [
          "脚注引用悬浮预览：鼠标悬停正文中的脚注角标时，原地弹出脚注原文（保留链接与格式）；内容由构建期 markdown-it 插件（include/hexo/mdit/footnote-tooltip.js）内嵌进 HTML，纯 CSS 显示，运行时零 JS",
          "预览仅在具备 hover 的精确指针设备上启用，触屏仍保持点击跳转到页底脚注的原有行为",
        ],
        en: [
          "Footnote hover previews: hovering a footnote marker in the article body pops up the footnote's content in place (links and formatting preserved); the content is embedded into the HTML at build time by a markdown-it plugin (include/hexo/mdit/footnote-tooltip.js) and shown with pure CSS — zero runtime JS",
          "Previews are enabled only on hover-capable fine-pointer devices; on touch screens tapping a marker still jumps to the footnote at the bottom of the page as before",
        ],
        category: "feature",
      },
      {
        date: "7.08",
        cn: [
          "Markdown 渲染引擎从 markdown-exit 迁移到 markdown-it-ts：保持 markdown-it 插件生态与 renderAsync 异步渲染接口，解析性能进一步提升",
          "将 markdown-exit-ratex 插件内联到主题 include/hexo/mdit/ratex.js，并直接调用捆绑的 RaTeX 平台二进制渲染 SVG 公式，移除对外部插件包的依赖",
        ],
        en: [
          "Migrate the Markdown rendering engine from markdown-exit to markdown-it-ts: keeps the markdown-it plugin ecosystem and the renderAsync async rendering interface while further improving parse performance",
          "Inline the markdown-exit-ratex plugin into the theme's include/hexo/mdit/ratex.js and spawn the bundled RaTeX platform binary directly for SVG math, removing the external plugin package dependency",
        ],
        category: "refactor",
      },
      {
        date: "6.18",
        cn: [
          "新增 Sunny 浅色主题（归入浅色配色方案）：提供温暖的米色基础配色，并叠加受 dany.works 启发的氛围——金色阳光光晕与全屏 multiply 视频光影",
          "Sunny 视频光影静音播放，并在首屏内联启动；仅在 Sunny 模式下创建视频层与预加载媒体，避免影响其他主题性能",
          "视频光影为来自 Wikimedia Commons 的 CC BY-SA 素材，已转码压缩，署名见 source/media/CREDITS.md",
        ],
        en: [
          "Add a Sunny light theme (grouped under the light color scheme): a warm cream base palette layered with a dany.works-inspired atmosphere — a golden sun glow and a full-screen multiply-blended video texture",
          "The Sunny video texture plays silently and boots inline on first paint; the video layer and media preload are created only in Sunny mode to avoid impacting other themes",
          "The video texture is CC BY-SA media from Wikimedia Commons, transcoded and compressed; attribution lives in source/media/CREDITS.md",
        ],
        category: "feature",
      },
      {
        date: "6.15",
        cn: ["完善归档弹窗的弹出逻辑判定规则，弹窗展示时，页面底层所有背景元素统一施加模糊处理。"],
        en: [
          "Improve the judgment rules for the display logic of the archive popup, and uniformly apply blur processing to all underlying background elements of the page once the popup is rendered.",
        ],
        category: "feature",
      },
      {
        date: "6.14",
        cn: [
          "新增 image-group 自定义组件，用横向样片墙展示多张不同比例图片：每张图等高、宽度按自然比例变化，object-fit: contain 保证不裁剪，并通过固定组件高度避免图片加载推动后续内容产生 CLS",
          "组件支持 height / gap / label 属性、原生横向滚动、左右按钮和 hover/focus caption，适合不需要轮播顺序但需要集中展示同组照片的文章场景",
          "image-group 新增 wide 属性：可让组件在较宽视口突破文章正文栏宽，居中扩展到更接近视口的宽度；默认限制为 min(72rem, 100vw - 2rem)，避免横向溢出",
        ],
        en: [
          "Add an image-group custom element for mixed-ratio image sets: images share one visual height while their widths follow natural ratios, object-fit: contain prevents cropping, and the fixed component height avoids image-loading CLS for following content",
          "Support height / gap / label attributes, native horizontal scrolling, arrow buttons, and hover/focus captions for posts that need a grouped photo presentation rather than sequential carousel navigation",
          "Add a wide attribute to image-group so it can break out of the article column on wider viewports and center itself at a more viewport-like width; the default cap is min(72rem, 100vw - 2rem) to avoid horizontal overflow",
        ],
        category: "Feat",
      },
      {
        date: "6.11",
        cn: [
          "Accordion 从自定义元素改为 CSS-only 可选组件：删除 source/js/components/accordion.js，新增 /css/optional/accordion.css；内容直接使用原生 <details name> / <summary> 获得互斥展开，不再需要加载 JS",
          "保留原有视觉与纯 CSS 展开动画：用 summary::before 渲染加号图标，details[open] 驱动旋转，::details-content + interpolate-size 处理展开/收起动画，并通过 prefers-reduced-motion 关闭动效",
          "Accordion 结构测试改为覆盖原生 details 写法，同时保留 markdown-exit 对未缩进列表的边界约束验证",
        ],
        en: [
          "Convert Accordion from a custom element to a CSS-only optional component: delete source/js/components/accordion.js and add /css/optional/accordion.css. Content now uses native <details name> / <summary> for exclusive expansion without loading JavaScript",
          "Keep the existing visual treatment and CSS-only animation: render the plus icon with summary::before, rotate it from details[open], animate expansion with ::details-content + interpolate-size, and disable motion through prefers-reduced-motion",
          "Update Accordion structure tests to cover the native details markup while preserving markdown-exit boundary coverage for unindented lists",
        ],
        category: "refactor",
      },
      {
        date: "6.08",
        cn: [
          "偏好设置页去掉与整体视觉不搭的左侧 sidebar，并移除顶部 Appearance / Typography tabs；设置内容改为连续的 Appearance 与 Typography section，减少导航和初始化代码",
          "主题配置区不再为每个配色方案展示一张代码预览卡，改为 Light 与 Dark 两张预览卡；每张卡展示当前 scheme 的 palette 色块，并通过紧凑下拉菜单切换具体 scheme",
          "隐藏偏好设置页与 popup 内部滚动条，并进一步压平偏好设置视觉层级：移除 section/card 的多层装饰、冗余说明文案、预览卡图标和 Light / Dark 卡片标题；自定义字体帮助也从 popover 改为内联说明",
          "排版预览文案改为叶芝《当你老了》的中英文片段，预览内容更适合作为字体效果样张",
          "页面顶部新增返回上一页链接；全站 settings 快捷键从 Ctrl/Cmd+P 改为 Ctrl/Cmd+,",
          "进入与离开偏好设置页时主动跳过 native view-transition，不再播放主内容淡入淡出；导航栏偏好设置入口改为更简洁的 Lucide settings-2 图标",
          "偏好设置入口改为站内 Popup：不再生成或拉取 preferences.html，点击导航栏图标或按 Ctrl/Cmd+, 时按需加载 preferences.css / preferences.js 并打开弹层；再次触发会关闭弹层",
          "移除文章标题操作区的字体设置按钮，偏好设置只保留导航栏入口与 Ctrl/Cmd+, 快捷键，减少文章页操作噪音",
        ],
        en: [
          "Remove the preferences sidebar and the top-level Appearance / Typography tabs. Settings now render as continuous Appearance and Typography sections, reducing navigation and initialization code",
          "Collapse the seven per-scheme code preview cards into two Light and Dark preview cards. Each card now shows palette swatches for the current scheme, with a compact select for changing the concrete scheme",
          "Hide scrollbars in the preferences page and popup, then further flatten the preferences hierarchy by removing layered section/card decoration, redundant helper copy, preview-card icons, and Light / Dark card headings. Custom-font help now renders inline instead of using a popover",
          "Replace the typography preview copy with localized excerpts from Yeats' When You Are Old so the sample reads more naturally as a type specimen",
          "Add a back link at the top of the page and change the global settings shortcut from Ctrl/Cmd+P to Ctrl/Cmd+,",
          "Actively skip native view-transitions when entering or leaving preferences so the main-content fade no longer plays, and replace the navbar preferences entry with a cleaner Lucide settings-2 icon",
          "Turn the preferences entry into an in-page popup: preferences.html is no longer generated or fetched, and clicking the navbar icon or pressing Ctrl/Cmd+, loads preferences.css / preferences.js on demand before opening the popup. Triggering it again closes the popup",
          "Remove the article title-bar font settings button, leaving preferences accessible through the navbar entry and Ctrl/Cmd+, shortcut so article controls stay quieter",
        ],
        category: "Style",
      },
      {
        date: "6.07",
        cn: [
          "新增本地化 /preferences.html 偏好设置页：主题设置从 navbar 的临时 popover 迁移为完整页面，支持 System / Light / Dark 模式，并可分别选择浅色与深色配色方案；旧的 themePreference 字符串存储会自动兼容为新的 mode + light + dark 结构",
          "文章字体设置从文章页弹层迁移到偏好设置页，保留字号、行高、字体类型、字重、自定义网页字体与预览；文章工具栏的字体按钮改为跳转偏好设置页，同时移除旧 theme selector 组件、脚本与文章字体弹层绑定代码",
        ],
        en: [
          "Add localized /preferences.html pages: theme settings move from the navbar popover to a full preference page, with System / Light / Dark modes and separate light/dark color-scheme choices. Existing string-based themePreference values are normalized into the new mode + light + dark structure",
          "Move article typography settings from the article popover to the preference page, preserving size, line height, typeface, weight, custom web fonts, and preview. The article toolbar font action now links to preferences, while the old theme selector component/script and article font-popover bindings are removed",
        ],
        category: "Feat",
      },
      {
        date: "6.06",
        cn: ["修复浏览器后退 / 前进时 navbar 偶发 FOUC：navbar 不再注册独立的 native View Transition name，避免历史导航恢复时显示过期的导航栏快照；页面过渡仍只保留正文区域淡入淡出"],
        en: [
          "Fix intermittent navbar FOUC during browser back / forward navigation: the navbar no longer registers a separate native View Transition name, preventing stale navbar snapshots during history restores while keeping the main content fade transition intact",
        ],
        category: "fix",
      },
      {
        date: "6.04",
        cn: [
          "归档页接管主题索引：tag generator 不再额外生成 /tags/ 索引页，删除独立的 tags.jsx / tags.css，head.jsx 也不再加载 tags.css；主题入口改为 archive-hero 右侧的 # 数量按钮，打开轻量 popover 列出当前语言下有文章的 tag，并在 tag 页标记当前项",
          "重做 archive-hero：eyebrow 只保留文章数量，移除 Archive / Tag 文案、分隔点和罗马数字水印；标题与元信息改为极简双列布局，移动端自然堆叠，底部只保留一条安静的细分隔线",
        ],
        en: [
          "Let the archive page absorb the tag index: the tag generator no longer emits a separate /tags/ index, the standalone tags.jsx / tags.css are removed, and head.jsx stops loading tags.css. The topic entry is now a compact # count button in archive-hero, opening a lightweight popover of tags with posts in the current language and marking the active tag page",
          "Refine archive-hero: the eyebrow now only carries the entry count, with Archive / Tag copy, dot separator, and the Roman numeral watermark removed. The title and meta use a minimal two-column layout that stacks cleanly on mobile, with one quiet bottom rule",
        ],
        category: "uiux",
      },
      {
        date: "6.04",
        cn: [
          "新增本地化 /status.html：status generator 为每种语言输出状态页，展示文章总数与 busuanzi PV / UV；新增 status.css 与中英翻译，head.jsx 仅在状态页加载这份样式",
          "页脚作者链接改为进入对应语言的 status.html，Swup 导航时同步刷新 .footer-author 的 href，避免跨语言导航后仍指向旧语言状态页",
        ],
        en: [
          "Add localized /status.html pages: the status generator emits one status page per language, showing total posts plus busuanzi PV / UV metrics. Add status.css and bilingual strings, with head.jsx loading that stylesheet only on status pages",
          "Turn the footer author mark into a link to the matching-language status.html, and refresh .footer-author href during Swup navigation so cross-language visits do not keep pointing at the previous language status page",
        ],
        category: "Feat",
      },
      {
        date: "6.04",
        cn: [
          "修复文章 popover 点击穿透：字体设置、评论和文章信息 popover 都增加透明 backdrop button，:popover-open 改为覆盖整个视口并把实际面板放在上层；点击面板外会关闭 popover，不再落到下方文章链接或按钮上",
          "同步调整弹层尺寸与背景：面板主体负责宽度、圆角、阴影和滚动，评论 / 字体设置弹层在桌面保持原有宽度约束，移动端仍限制在视口内",
        ],
        en: [
          "Fix article popover click-through: font settings, comments, and article info popovers now include a transparent backdrop button, while :popover-open covers the viewport and places the real panel above it. Clicking outside the panel closes the popover instead of hitting article links or buttons underneath",
          "Tighten popover sizing and surface treatment at the same time: the panel body now owns width, radius, shadow, and scrolling; comment / font-settings panels keep their desktop width constraints while remaining viewport-bounded on mobile",
        ],
        category: "fix",
      },
      {
        date: "5.30",
        cn: [
          "image-carousel 限高：轮播图高度不再超过视口的 80%。对竖图（portrait），改为限制 .stage 的 max-width（= 宽高比 × max-height）并居中，而非直接裁剪或加黑边——宽度收窄、高度封顶但宽高比保持不变。在 _resolveRatio 解析出的宽高比基础上额外算出数值比并写入 --carousel-max-width；上限可用 --carousel-max-height CSS 变量覆盖（默认 80vh）",
        ],
        en: [
          "Cap image-carousel height at 80% of the viewport. For portrait images, constrain the stage's max-width (= aspect ratio × max-height) and center it rather than cropping or letterboxing — the width narrows and the height is capped while the aspect ratio stays intact. _resolveRatio now also derives a numeric ratio and writes --carousel-max-width; override the cap via the --carousel-max-height CSS variable (default 80vh)",
        ],
        category: "uiux",
      },
      {
        date: "5.30",
        cn: [
          "修复搜索框未搜索时底部边框重叠：把输入框与结果之间的分隔线从 .searchbox-input-container 常驻的 border-bottom 改为 .searchbox-body:not(:empty) 的 border-top，仅在有结果时出现——此前结果区为空（含初始未搜索状态及零结果搜索）时，输入容器的 border-bottom 会与 .searchbox-container 自身的圆角底边框叠在一起、并撞进圆角形成双线",
        ],
        en: [
          "Fix the doubled bottom border on the search box before searching: move the input/results divider from a permanent border-bottom on .searchbox-input-container to a border-top on .searchbox-body:not(:empty) so it only appears when there are results — previously, when the results body was empty (the initial pre-search state and zero-result searches) the input container's border-bottom stacked onto .searchbox-container's own rounded bottom border and ran into the corners, forming a double line",
        ],
        category: "fix",
      },
      {
        date: "5.29",
        cn: [
          "归档页文章预览弹层从 JS 改为纯 CSS 实现：删除 source/js/components/archive-popup.js（337 行）、head.jsx 中的条件 &lt;script&gt; 与 main.js 的 __gnixInitArchivePopup 调用；不再由 JS 创建并复用单个 body 级节点，改为每个 .archive-item 在模板（article_media.jsx）内内联自己的 popup",
          "显隐与开关延迟改由 :hover / :focus-within + transition-delay 承担（开 180ms / 关 140ms，对应原 HOVER_DELAY / CLOSE_DELAY）；弹层 display:none 时保持摘要不进入布局与无障碍树（沿用原 &lt;template&gt; 的懒加载特性），靠 @starting-style + transition display allow-discrete 实现淡入",
          "定位改用 CSS 锚点定位（anchor-name + anchor-scope 让每个弹层绑定到各自的 item，position-try-fallbacks 自动翻转）：≥1280px 优先放右侧，否则放下方，空间不足时翻到上方——取代原 JS 的视口测量、右/下/上选择与滚动/缩放重定位逻辑",
          '序号 N° 001 改用 CSS 计数器（counter-increment + @counter-style { pad: 3 "0" }），accent 配色直接继承 --archive-accent；阅读时长的分隔符与 "read" 后缀由伪元素生成、大写交给 text-transform',
          "移除 .archive-group 的 content-visibility:auto / contain-intrinsic-size：其 paint 容器会裁剪溢出到组外的弹层，style 容器会把计数器按组重置——计数器改在 .archive-stack 上 reset 以保证跨组连续编号",
          "锚点定位不可用的浏览器（如 Firefox）通过 @supports 直接隐藏弹层（fail closed），归档列表本身不受影响",
        ],
        en: [
          "Reimplement the archive post-preview popup in pure CSS: delete source/js/components/archive-popup.js (337 lines), its conditional &lt;script&gt; in head.jsx, and the __gnixInitArchivePopup call in main.js. Instead of JS creating and reusing one body-level node, each .archive-item now inlines its own popup in the template (article_media.jsx)",
          "Drive show/hide and open/close delays with :hover / :focus-within + transition-delay (180ms open / 140ms close, the former HOVER_DELAY / CLOSE_DELAY). The popup stays display:none when closed so the excerpt never enters layout or the a11y tree (the old &lt;template&gt; laziness), with @starting-style + transition display allow-discrete handling the fade-in",
          "Position via CSS anchor positioning (anchor-name + anchor-scope bind each popup to its own item; position-try-fallbacks flips automatically): prefer the right of the item at ≥1280px, else below, flipping above when space is tight — replacing the JS viewport measuring, right/below/above selection, and scroll/resize repositioning",
          'Render the "N° 001" index with a CSS counter (counter-increment + @counter-style { pad: 3 "0" }) and inherit the accent straight from --archive-accent; the read-time separator and " read" suffix come from pseudo-elements, with uppercasing left to text-transform',
          "Drop content-visibility:auto / contain-intrinsic-size from .archive-group: its paint containment clipped popups that overflow the group and its style containment reset the counter per group — the counter now resets on .archive-stack for continuous cross-group numbering",
          "Browsers without anchor positioning (e.g. Firefox) hide the popup via @supports (fail closed); the archive listing itself is unaffected",
        ],
        category: "refactor",
      },
      {
        date: "5.28",
        cn: [
          "h2 标题改为 flex 布局：移除原本的整行 border-bottom，改为从标题文字垂直中点向右延伸一条虚线（1px dashed var(--surface0)），编号（counter）从文字左侧移到虚线最右端，与文字保持在同一基线高度",
        ],
        en: [
          "Restyle h2 as a flex container: drop the full-width border-bottom and instead extend a 1px dashed line (var(--surface0)) from the vertical midpoint of the heading text out to the right, with the counter number moved from the left of the text to the far end of the dashed line, vertically aligned with the text",
        ],
        category: "uiux",
      },
      {
        date: "5.26",
        cn: [
          '语言切换按钮在当前文章无对应翻译时直接渲染为禁用 &lt;button disabled&gt;，悬浮显示"该文章暂无 X 翻译"提示；移除原本的"点击 → 弹 toast"交互（涉及全局 capture 阶段 click 监听器、showSiteToast 函数及 .site-toast 样式），改由原生 title tooltip + disabled 状态承担反馈',
        ],
        en: [
          'When the current article has no translation, render the language switch as a disabled &lt;button&gt; whose native title tooltip says "this article has no X translation"; remove the previous click → toast flow (the global capture-phase click listener, showSiteToast helper, and .site-toast styles) in favor of native title tooltip + disabled state',
        ],
        category: "refactor",
      },
      {
        date: "5.26",
        cn: [
          "拆分 default.css：把内容渲染样式（.content 及其后代、表格、blockquote、task-list、medium-zoom、heimu）、文章元数据（标题/meta-bar/字体设置 popover/comment popover/info popover/语言切换 popover）、.cover-image、TOC 浮动按钮与 #toc 全部迁出到新建的 source/css/article.css；head.jsx 仅在 isArticleLike（post + page）时加载 article.css，归档/标签索引等页面不再拉取这部分样式",
          "default.css 从 2404 行减到 991 行，只保留主题色变量、字体 @font-face、reset、navbar、theme selector、footer、searchbox 和 :popover-open 基础样式（搜索框 + 主题选择器分支），属于站点级骨架",
          "把 :popover-open 的 .toc-body 和 .article-popover 分支随 TOC / 文章 popover 一起迁到 article.css，避免无 TOC 的页面解析这部分嵌套规则",
        ],
        en: [
          "Split default.css: move content rendering styles (.content and descendants, tables, blockquote, task-list, medium-zoom, heimu), article metadata (title / meta-bar / font-settings popover / comment popover / info popover / language-switch popover), .cover-image, the floating TOC button and #toc into a new source/css/article.css; head.jsx only loads article.css when isArticleLike (post + page), so archive / tag-index pages no longer pull those styles",
          "default.css shrinks from 2404 to 991 lines, retaining only theme color variables, font @font-face, reset, navbar, theme selector, footer, searchbox, and the :popover-open base (searchbox + theme-selector branches) — the site-level scaffolding",
          "Move the .toc-body and .article-popover branches of :popover-open into article.css alongside the TOC and article popovers, so pages without TOC do not parse those nested rules",
        ],
        category: "Perf",
      },
      {
        date: "5.26",
        cn: [
          "自托管 Swup：把 swup、@swup/head-plugin、@swup/scripts-plugin 用 esbuild 打包为 source/js/host/swup/swup-bundle.js（26KB minified），不再从 unpkg.com 拉取，国内访问稳定；新增 npm 脚本 build:swup 用于升级时重新打包",
          '主入口 main.js 改为 ES module：直接 import 本地 swup 实例并 swup.hooks.on("page:view", initPage)，移除原本为绕过 module/classic script 时序问题而保留的 window.swup 同步检查 + gnix:swup-ready CustomEvent 双保险逻辑；decrypt.js 同步简化',
          "移除 swup.js 中冗余的全局 click 拦截器：swup 内部 link delegation 已处理导航期间的重复点击，外层补丁无需保留",
        ],
        en: [
          "Self-host Swup: bundle swup, @swup/head-plugin, and @swup/scripts-plugin into source/js/host/swup/swup-bundle.js (26KB minified) via esbuild instead of fetching from unpkg.com, giving stable access from mainland China; add npm script build:swup to regenerate the bundle when upgrading",
          'Convert main.js to an ES module: directly import the local swup instance and call swup.hooks.on("page:view", initPage); drop the window.swup synchronous check + gnix:swup-ready CustomEvent dual-binding pattern that previously worked around module/classic script ordering. decrypt.js is simplified the same way',
          "Remove the redundant global click interceptor from swup.js: swup's own link delegation already handles repeated clicks during in-flight navigations, so the outer guard is dead weight",
        ],
        category: "refactor",
      },
      {
        date: "5.26",
        cn: [
          "在 head.jsx 按页面类型条件渲染页面级资源：archive.css 与 archive-popup.js 仅在 archive / tag 页面输出，tags.css 仅在 tags 索引页输出；callout_blocks.css 与 shiki.css 仅在 post 或 page（about、links 等）页面输出",
          "移除 data-page-head 约定与对应的 after_render:html 正则后处理（include/hexo/filter.js），改由 Inferno 原生条件渲染实现；Swup head-plugin 在跨页导航时自动加载新增资源",
          "Swup head-plugin 改回 persistTags: true：旧 head 中已有的脚本/样式不在导航时被移除，避免对 outerHTML 精确匹配判定有差异时把脚本重新 appendChild 触发再次执行（曾导致 medium-zoom 多 instance 互相打架）；副作用是长会话会累积访问过的页面类型用过的资源，但首屏仍是按需加载",
          "archive-popup.js 在文件末尾自调用 initArchivePopup()：Swup head-plugin 动态注入脚本时是异步加载的，会晚于 page:view，导致 main.js 在脚本就绪前就调用 window.__gnixInitArchivePopup 而 no-op；自调用保证脚本一就绪就绑定到当前页面",
          "归档生成器 include/hexo/generator/archive.js 移除 redirectTo：i18n 启用且默认语言带前缀（如 /zh-CN/）时，直接把默认语言的归档内容写到站点根 /index.html，不再用 meta-refresh 跳转",
        ],
        en: [
          "Conditionally render page-level assets in head.jsx by page type: archive.css and archive-popup.js only on archive / tag pages, tags.css only on the tags index page; callout_blocks.css and shiki.css only on posts and pages (about, links, etc.)",
          "Drop the data-page-head convention and its after_render:html regex post-processing (include/hexo/filter.js) in favor of native Inferno conditional rendering; Swup head-plugin adds new assets on navigation",
          "Set Swup head-plugin persistTags: true: scripts and styles already in the current head are kept across navigations rather than removed and re-appended, avoiding the case where any outerHTML mismatch caused the script to be re-executed (which made medium-zoom spin up duplicate instances that fought over click handlers). Tradeoff is asset accumulation over a long session, but the first-paint is still on-demand",
          "Self-invoke initArchivePopup() at the bottom of archive-popup.js: when Swup head-plugin injects the script dynamically it loads asynchronously and resolves after page:view, so main.js calls window.__gnixInitArchivePopup before the script is ready and silently no-ops; the self-invocation ensures the popup binds to the current page as soon as the script lands",
          "Drop redirectTo from include/hexo/generator/archive.js: when i18n is enabled and the default language has a non-empty prefix (e.g. /zh-CN/), emit the default language archive content directly at /index.html instead of a meta-refresh redirect",
        ],
        category: "Perf",
      },
      {
        date: "5.25",
        cn: [
          "废弃归档与标签页的分页功能：archive_generator 与 tag_generator 现在为每种语言各生成一份完整列表，移除 hexo-pagination 依赖以及 per_page / pagination_dir 相关配置",
          "不再生成 /archives/ 页面（与首页内容完全一致），首页即归档列表；旧的 /archives/ 链接将 404",
          "移除 archive_generator 的 yearly / monthly / daily 按时间分组聚合页生成逻辑，对应配置项已废弃可从站点 _config 中删除",
        ],
        en: [
          "Drop pagination from archive and tag pages: archive_generator and tag_generator now emit a single full listing per language; hexo-pagination dependency and per_page / pagination_dir options are gone",
          "Stop emitting /archives/ (it duplicated the home page); the home page itself is the archive listing — existing /archives/ links will 404",
          "Remove archive_generator yearly / monthly / daily time-bucketed pages; the corresponding config keys are deprecated and can be removed from site _config",
        ],
        category: "refactor",
      },
      {
        date: "5.24",
        cn: ["修复 x-tree 嵌套在非活动 x-tab 中时子项不可见的问题：移除初始 max-height 测量（在 display:none 的父级中 scrollHeight 恒为 0，导致树永久折叠），改由 toggleNode 在展开/折叠时按需测量"],
        en: [
          "Fix x-tree children being invisible when nested inside an inactive x-tab: drop the initial max-height measurement (scrollHeight is 0 under a display:none ancestor, leaving the tree permanently collapsed) and rely on toggleNode to measure on demand",
        ],
        category: "fix",
      },
      {
        date: "5.24",
        cn: [
          "搜索框整体视觉重设计：玻璃质感容器（backdrop-blur）+ 统一圆角；section header 极简化；post item 用 surface 背景代替文字色跳变作为 hover/active 反馈，active 增加左侧高亮条；tag 结果改为内联 pill 排列",
          "修复搜索高亮：搜索 he 在 apache 中现在显示完整 apache 并高亮 he（原本只显示 he）；文章/页面标题也参与高亮；解码 content.json 中的 HTML 实体，例如 UI&#x2F;UX 正确显示为 UI/UX",
        ],
        en: [
          "Redesign searchbox: glass container with backdrop-blur and unified border-radius; minimal section labels; surface-based hover/active feedback on post items with a left accent bar for the active item; tag results render as inline pills",
          "Fix search highlight: searching `he` against `apache` now shows the full `apache` with `he` highlighted (previously only `he` was shown); post/page titles are also highlighted; HTML entities pre-encoded in content.json are decoded so e.g. UI&#x2F;UX renders correctly as UI/UX",
        ],
        category: "uiux",
      },
      {
        date: "5.24",
        cn: ["合并 layout/search/insight.jsx 到 layout/common/search.jsx：insight 是唯一搜索插件，移除多余的 dispatcher 层"],
        en: ["Merge layout/search/insight.jsx into layout/common/search.jsx: insight is the only search plugin; remove the dispatcher indirection"],
        category: "refactor",
      },
      {
        date: "5.23",
        cn: ["将变更日志提取为 x-changelog 自定义组件，数据与渲染逻辑单一来源，支持中英双语 lang 属性切换"],
        en: ["Extract changelog into an x-changelog custom component with single-source data and bilingual lang attribute switching"],
        category: "refactor",
      },
      {
        date: "5.23",
        cn: ["移除文章弹窗（字体设置、文章信息、评论）的标题栏"],
        en: ["Remove popover headers from article font settings, article info, and comment popovers"],
        category: "uiux",
      },
      {
        date: "5.22",
        cn: ["重构 i18n：改用 `__{lang}.md` 文件后缀作为多语言文章约定，简化目录结构与查找逻辑"],
        en: ["Refactor i18n: switch to `__{lang}.md` filename suffix convention for multi-language posts, simplifying directory layout and lookup logic"],
        category: "refactor",
      },
      {
        date: "5.20 - 5.22",
        cn: ["将首页合并进归档页，归档列表支持 hover 预览弹窗；清理重复样式与残留代码"],
        en: ["Merge home page into archive; archive list now supports a hover preview popup; clean up duplicate styles and stale code"],
        category: "Feat",
      },
      {
        date: "5.18",
        cn: [
          "将 hexo-generator-sitemap 移植到主题内部（include/hexo/sitemap.js），用模板字符串和内置简易 glob 匹配替换 nunjucks 和 micromatch 依赖；保留原插件的 hexo.config.sitemap 配置 schema，可直接卸载外部插件",
        ],
        en: [
          "Port hexo-generator-sitemap into the theme (include/hexo/sitemap.js), replacing nunjucks and micromatch with template literals and an inline glob matcher; preserves the upstream hexo.config.sitemap schema so the external plugin can be removed without site config changes",
        ],
        category: "refactor",
      },
      {
        date: "5.18",
        cn: [
          "将 markdown-it-obsidian-callouts 移植到主题作为默认插件（位于 include/hexo/obsidian-callouts.js），支持 [!note] 等 Obsidian/GitHub 风格 callouts 与 ad-* admonitions 语法",
          "修复 callout 标题中包含 inline code 时因 shiki 异步渲染而输出 [object Promise] 的问题；admonition body 同步改为 render 阶段异步渲染，使内嵌的代码块也能正常高亮",
          "优化 callout_blocks.css：清理无用 CSS 变量、修正 details[close] 错误选择器、仅对可折叠 callout 启用 cursor:pointer 与 hover、隐藏原生 summary marker；支持通过 admonition color: header 自定义单个 callout 颜色",
        ],
        en: [
          "Port markdown-it-obsidian-callouts into the theme as a default plugin (at include/hexo/obsidian-callouts.js), supporting [!note]-style Obsidian/GitHub callouts and ad-* admonition syntax",
          "Fix [object Promise] output when callout titles contain inline code (shiki async rendering); admonition bodies now also render asynchronously at render-time so nested fenced code blocks highlight correctly",
          "Optimize callout_blocks.css: drop dead CSS variables, fix the bogus details[close] selector, gate cursor:pointer and hover behind &lt;details&gt;, hide the native summary marker; support per-callout color override via admonition color: header",
        ],
        category: "Feat",
      },
      {
        date: "5.8",
        cn: ["支持中英文切换，集成markdown-exit作为md渲染器，在构建时为表格包裹figure.wrapper", "移除 @mdit/tabs，改用 x-tabs 自定义组件"],
        en: [
          "Add Chinese/English language switching, integrate markdown-exit as the Markdown renderer, wrap tables with figure.wrapper during build",
          "Remove @mdit/tabs, replace with x-tabs custom component",
        ],
        category: "Feat",
      },
      {
        date: "5.7",
        cn: [
          "将 article-info-popover 从 article.jsx 提取为独立的 article_info.jsx 组件",
          "替换 Markdown 源文件和评论图标为新的 SVG",
          "当评论弹窗存在时通过 requestIdleCallback 预加载 Twikoo JS，使评论点击时渲染更快",
        ],
        en: [
          "Extract article-info-popover from article.jsx into a standalone article_info.jsx component",
          "Replace markdown source and comment icons with new SVGs",
          "Preload Twikoo JS via requestIdleCallback when comment popover exists so comments render faster on click",
        ],
        category: "refactor",
      },
      {
        date: "5.7",
        cn: [
          "新增 md_generator：对于无密码文章，读取源 .md 文件，前置 UTF-8 BOM 以便浏览器原生渲染，并通过 Readable.from(buffer) 将其与生成的 HTML 一起输出；在文章头部暴露 rel=alternate text/markdown 链接，并在文章信息弹窗中提供 Markdown 源文件链接",
        ],
        en: [
          "Add md_generator: for non-password posts, read the source .md file, prepend UTF-8 BOM so browsers render it natively, and emit it alongside the generated HTML via Readable.from(buffer). Expose rel=alternate text/markdown in article head and a Markdown source link in the article info popover",
        ],
        category: "Feat",
      },
      {
        date: "5.6",
        cn: [
          "添加边注样式：.content 内的 &lt;aside&gt; 元素渲染为次文本颜色的注释，带细左边框；在 ≥1280px 屏幕上通过负 margin-right 浮动到右页边，与 .content 并列且不占用其宽度，边注顶部与相邻段落顶部对齐；在较小屏幕上回退为段落下方的流式块",
          "集成 hexo-generator-tag/archive/home 索引",
        ],
        en: [
          "Add side note style: &lt;aside&gt; elements inside .content render as subtext-colored notes with a thin left rule; on screens >= 1280px they float into the right margin via negative margin-right so they sit beside .content without taking width from it, and the aside top aligns with the adjacent paragraph top; on smaller screens they fall back to an in-flow block below the paragraph",
          "Integrate hexo-generator-tag/archive/home index",
        ],
        category: "Feat",
      },
      {
        date: "5.5",
        cn: [
          "重构 image-carousel：从第一张图片自动推导宽高比（通过缓存的 light-DOM &lt;img&gt; 就绪时获取，否则使用分离的 Image() 探测），替代硬编码 3/2——显式 ratio 属性仍优先；将 next/prev/dot/keyboard/touch 入口统一为单个 _userNav 辅助函数以重置自动播放时钟；将 chevron SVG 和魔数（默认间隔、滑动阈值、回退比例）提取为模块级常量；监听 ratio 属性变化",
          "重写 text-image-section：放弃包装 div，改用 &lt;figure&gt; 作为宿主元素的直接子元素，使用 display:flow-root 包含浮动并隔离父块级格式化上下文布局（例如避免引用块左边框在移动端渗入图片区域），保留用户内容为直接子元素而非重新序列化 innerHTML",
        ],
        en: [
          "Refactor image-carousel: auto-derive aspect ratio from the first image (via cached light-DOM &lt;img&gt; when ready, otherwise a detached Image() probe) instead of hardcoding 3/2 — explicit ratio attribute still wins; consolidate next/prev/dot/keyboard/touch entry points through a single _userNav helper that resets the autoplay clock; extract chevron SVGs and magic numbers (default interval, swipe threshold, fallback ratio) to module-scope constants; observe ratio attribute changes",
          "Rewrite text-image-section: drop wrapper divs in favor of &lt;figure&gt; as a direct child of the host element, use display:flow-root to contain floats and isolate the layout from parent block formatting (e.g. blockquote left borders bleeding into the image area on mobile), preserve user content as direct children instead of re-serializing innerHTML",
        ],
        category: "refactor",
      },
      {
        date: "5.5",
        cn: [
          "字体设置重置按钮现在能从 default.css 读取原始 --font-* 值，即使用户已通过内联样式覆盖，方法是临时剥离内联覆盖再读取计算样式",
          "放弃字体设置弹窗内的 i18n（显示设置、自定义字体、应用/重置等）——UI 固定为英文；从 languages/en.yml 和 zh-CN.yml 中移除未使用的键",
          "字体设置重置按钮现在用默认 CSS 变量值（如 --font-serif）填充输入框，使用户可以从默认值查看和编辑，而非空字段",
          "将 --article-font-family 应用于浮动目录并在移动端缩小目录字体，使标题在小屏幕上舒适显示",
          "在 x-chat shadow DOM 内添加 .chat-heading 样式，使聊天消息可使用非 h2/h3 标题而不污染文章目录",
          "重新设计 x-chat：极简网格布局，头像+标题在第 1 行，气泡在第 2 行；移动端气泡下移至标题下方的全宽行，避免头像占用水平空间；优化气泡内的排版、滚动条、代码/键盘/列表样式",
        ],
        en: [
          "Font settings reset button now reads the original --font-* values from default.css even after the user has overridden them inline, by temporarily stripping the inline overrides while reading the computed style",
          "Drop i18n inside the font settings popover (Display Settings, Custom Fonts, Apply/Reset, etc.) — UI is fixed in English; remove unused keys from languages/en.yml and zh-CN.yml",
          "Font settings reset button now fills inputs with the default CSS variable values (e.g. --font-serif) so users can see and edit from the defaults instead of empty fields",
          "Apply --article-font-family to floating TOC and shrink TOC font sizes on mobile so headings fit comfortably on small screens",
          "Add .chat-heading style inside x-chat shadow DOM so chat messages can use a non-h2/h3 heading that does not pollute the article TOC",
          "Redesign x-chat: minimalist grid layout with avatar+header on row 1 and bubble on row 2; on mobile the bubble drops to a full-width row below the header so avatar no longer eats horizontal space; refined typography, scrollbar, code/kbd/list styles inside bubbles",
        ],
        category: "uiux",
      },
      {
        date: "5.4",
        cn: ['对非关键 CSS（标注、zeoseven 字体）使用 media="print" 技巧替代 preload+swap，消除浏览器"preload 未使用"警告'],
        en: ['Replace preload+swap with media="print" trick for non-critical CSS (callouts, zeoseven fonts) to eliminate "preload not used" browser warnings'],
        category: "Perf",
      },
      {
        date: "5.4",
        cn: ["通过读取 hexo.config 修复 Atom 订阅源缺失 title、subtitle 和 author 字段"],
        en: ["Fix Atom feed missing title, subtitle, and author fields by reading from hexo.config"],
        category: "fix",
      },
      {
        date: "5.3",
        cn: ["在自定义字体设置中添加等宽字体输入框", "允许自定义 CSS URL 文本框垂直调整大小", "为自定义字体表单字段添加 name 属性"],
        en: ["Add monospace font input to custom font settings", "Allow vertical resizing of custom CSS URL textarea", "Add name attributes to custom font form fields"],
        category: "fix",
      },
      {
        date: "5.2",
        cn: ["在每次页面加载时初始化文章排版属性并在 html 元素上设置默认值", "为桌面端粘性导航栏添加半透明模糊效果"],
        en: ["Initialize article typography attributes on every page load and seed defaults on the html element", "Add translucent blur treatment to the desktop sticky navbar"],
        category: "fix",
      },
      {
        date: "5.1",
        cn: ["聚合 Busuanzi 页面 PV/UV，覆盖干净 URL、尾部斜杠和 index.html 变体", "改进 Open Graph 和 Twitter Card 元数据，使用规范化描述、绝对去重图片、区域设置、文章标签以及图片 alt/type 字段"],
        en: [
          "Aggregate Busuanzi page PV/UV across clean URL, trailing slash, and index.html variants",
          "Improve Open Graph and Twitter Card metadata with normalized descriptions, absolute deduped images, locale, article tags, and image alt/type fields",
        ],
        category: "Feat",
      },
      {
        date: "4.28",
        cn: ["重新设计标签和归档页面，使用新衬线字体"],
        en: ["Redesign tags and archive page, use new serif font"],
        category: "uiux",
      },
      {
        date: "4.26 4.27",
        cn: ["添加文章操作弹窗（字体设置、信息和评论）", "将许可详情移入文章信息", "使用 CSS 变量作为文章排版预设", "优化弹窗样式、焦点状态和操作图标", "调整移动端卡片和评论弹窗布局"],
        en: [
          "Add article action popovers for font settings, info, and comments",
          "Move license details into article info",
          "Use CSS variables for article typography presets",
          "Polish popover styling, focus states, and action icons",
          "Tune mobile card and comment popover layout",
        ],
        category: "uiux",
      },
      {
        date: "4.24",
        cn: ['重新设计文章布局：标题移至元数据下方，标签移至页脚，添加"阅读更多"链接，支持摘要'],
        en: ["Redesign article layout: move title below metadata, move tags to footer, add Read More link, support excerpts"],
        category: "uiux",
      },
      {
        date: "4.22",
        cn: ["重新排序字体栈并调整排版"],
        en: ["Reorder font stack and adjust typography"],
        category: "refactor",
      },
      {
        date: "4.17",
        cn: ["在订阅源中移除加密文章", "为图片显示 figcaption"],
        en: ["Remove encrypted post in feed", "Display figcaption for images"],
        category: "Feat",
      },
      {
        date: "4.16",
        cn: ["移除部分边框"],
        en: ["Remove some border"],
        category: "uiux",
      },
      {
        date: "4.12",
        cn: ["使用 feedsmith 添加 RSS/Atom 订阅源生成和自动发现"],
        en: ["Add RSS/Atom feed generation with autodiscovery using feedsmith"],
        category: "Feat",
      },
      {
        date: "4.8",
        cn: ["在聊天组件中隐藏滚动条，支持跨浏览器兼容"],
        en: ["Hide scrollbar in chat component with cross-browser compatibility"],
        category: "fix",
      },
      {
        date: "4.8",
        cn: ["为 hexo 服务器添加热重载脚本，任何源文件变更时自动重载"],
        en: ["Add hot reload script for hexo server, auto reload on any source file change"],
        category: "Feat",
      },
      {
        date: "4.8",
        cn: ["修复鼠标悬停在 owo-body 上时背景色意外变为透明的问题"],
        en: ["The background color unexpectedly becomes transparent when hovering over owo-body"],
        category: "fix",
      },
      {
        date: "3.14",
        cn: ["将 CDN 托管的 Swup UMD 脚本替换为 bun 打包的模块，单个 27KB 包"],
        en: ["Replace CDN-hosted Swup UMD scripts with bun-bundled module, single 27KB bundle"],
        category: "refactor",
      },
      {
        date: "3.7",
        cn: ["修复 Twikoo 评论在 SPA 导航中不加载的问题，通过 loadScriptOnce/loadCSSOnce 按需加载 JS/CSS 资源"],
        en: ["Fix Twikoo comment not loading on SPA navigation, load JS/CSS assets on demand via loadScriptOnce/loadCSSOnce"],
        category: "fix",
      },
      {
        date: "3.7",
        cn: ["提取 loadCSSOnce 辅助函数，在 mermaid 和 twikoo 中复用"],
        en: ["Extract loadCSSOnce helper, reuse across mermaid and twikoo"],
        category: "refactor",
      },
      {
        date: "3.6",
        cn: ["在加载时预计算小写搜索字段，提升转义常量以消除每次调用分配"],
        en: ["Precompute lowercase search fields at load time, hoist escape constants to eliminate per-call allocations"],
        category: "Perf",
      },
      {
        date: "3.6",
        cn: ["将手动 Swup page:view 钩子替换为 data-swup-reload-script 属性"],
        en: ["Replace manual Swup page:view hooks with data-swup-reload-script attribute"],
        category: "refactor",
      },
      {
        date: "3.6",
        cn: ["将覆盖层（主题选择器、搜索框、目录）迁移到原生 Popover API", "改进无障碍性：为搜索和主题选择器添加 ARIA 属性，Tab 导航和焦点恢复"],
        en: ["Migrate overlays (theme selector, searchbox, TOC) to native Popover API", "Improve a11y: add ARIA attributes to search and theme selector, Tab nav & focus restoration"],
        category: "refactor",
      },
      {
        date: "3.4",
        cn: ["Swup：避免不必要的脚本重载"],
        en: ["Swup: Avoid unnecessary script reloading"],
        category: "fix",
      },
      {
        date: "3.4",
        cn: ["移除 JS 属性，使 minify-html 能将 HTML 压缩为单行"],
        en: ["Remove the JS attribute so minify-html could compress HTML into a single line"],
        category: "refactor",
      },
      {
        date: "3.4",
        cn: ["在 oklch 颜色空间中使用 color-mix 生成颜色"],
        en: ["Use color-mix in oklch color space to generate colors"],
        category: "refactor",
      },
      {
        date: "2.25",
        cn: ["添加 image-carousel 自定义元素，支持导航、自动播放和触摸滑动"],
        en: ["Add image-carousel custom element with navigation, autoplay and touch swipe support"],
        category: "Feat",
      },
      {
        date: "2.25",
        cn: ["添加切换目录的快捷键，提升键盘可访问性"],
        en: ["Add shortcut to toggle TOC for keyboard accessibility"],
        category: "Feat",
      },
      {
        date: "2.25",
        cn: ["将 text-image-section 迁移到浮动布局，将 image-width 重命名为 width，reverse 重命名为 left"],
        en: ["Migrate text-image-section to float layout, rename image-width to width, reverse to left"],
        category: "refactor",
      },
      {
        date: "2.19",
        cn: ["添加 text-image-section 自定义元素组件"],
        en: ["Add text-image-section custom element component"],
        category: "Feat",
      },
      {
        date: "2.19",
        cn: ["统一目录样式，将 SVG 替换为汉堡菜单按钮"],
        en: ["Unified TOC styling, replace SVG with hamburger menu button"],
        category: "refactor",
      },
      {
        date: "2.14",
        cn: ["在归档页面添加面包屑组件"],
        en: ["Add Breadcrumb components in archive page"],
        category: "uiux",
      },
      {
        date: "2.8",
        cn: ["Twikoo 初始化错误"],
        en: ["Twikoo init bug"],
        category: "fix",
      },
      {
        date: "2.7",
        cn: ["添加堆叠卡片展示主题", "调整任务列表内边距"],
        en: ["Add stacked-card to display themes", "tweak task-list padding"],
        category: "uiux",
      },
      {
        date: "2.2",
        cn: ["改进链接样式，添加正文文本颜色，更新元数据分隔符"],
        en: ["Improve link styling, add body text color, update meta separators"],
        category: "uiux",
      },
      {
        date: "2.1",
        cn: ["使用新 Marquee 卡片重写 ABOUT 页面，删除 now 页面"],
        en: ["Rewrite ABOUT page with new Marquee card, delete now page"],
        category: "Feat",
      },
      {
        date: "1.29",
        cn: ["添加 rose pine 主题"],
        en: ["Add rose pine theme"],
        category: "Feat",
      },
      {
        date: "1.16",
        cn: ["导航栏使用 mingcute 图标", "Logo 使用 homemade-apple 字体"],
        en: ["Use mingcute icons for navbar", "Use homemade-apple font for logo"],
        category: "uiux",
      },
      {
        date: "1.12",
        cn: ["使用 Swup 替换 Pjax 进行页面过渡"],
        en: ["Replace Pjax with Swup for page transitions"],
        category: "refactor",
      },
      {
        date: "1.1",
        cn: ["为文章所有标题级别添加锚点", "重构归档页面，按年份和季节组织"],
        en: ["Add anchors to all heading levels in articles", "Refactor archive page, organize by year and season"],
        category: "refactor",
      },
    ],
  },
  {
    year: 2025,
    items: [
      {
        date: "1.31",
        cn: ["为 Hexo 博客适配 Obsidian 语法，添加 Obsidian 语法支持"],
        en: ["Adapt Obsidian syntax for Hexo blog, add Obsidian syntax support"],
        category: "Feat",
      },
      {
        date: "2.12",
        cn: ["复制 hexo-shiki 插件代码并发布到 npm，默认使用 Maple Mono 字体 + Catppuccin Mocha 主题"],
        en: ["Copy hexo-shiki plugin code and publish to npm, default to Maple Mono font + Catppuccin Mocha theme"],
        category: "Feat",
      },
      {
        date: "2.17",
        cn: ["基于 Catppuccino Mocha 主题调整深色模式颜色"],
        en: ["Adjust Dark Mode colors based on Catppuccino Mocha theme"],
        category: "refactor",
      },
      {
        date: "2.22",
        cn: ["切换到 Medium Zoom 进行页内图片预览"],
        en: ["Switch to Medium Zoom for in-page image preview"],
        category: "Feat",
      },
      {
        date: "5.24",
        cn: ["为 Live2D 模型添加深色模式切换；调整标注样式"],
        en: ["Add dark mode switching for live2d model; tweak callout styles"],
        category: "Feat",
      },
      {
        date: "6.1",
        cn: ["重构 hexo-shiki-highlight，添加交通灯装饰"],
        en: ["Refactor hexo-shiki-highlight, add Traffic Light decoration"],
        category: "refactor",
      },
      {
        date: "6.2",
        cn: ["优化表格和引用样式"],
        en: ["Optimize table and quote styles"],
        category: "uiux",
      },
      {
        date: "6.20",
        cn: ["为更多组件适配 Catppuccin 浅色/深色主题，更改浅色主题背景，更新标签样式，添加悬停效果"],
        en: ["Adapt more components to Catppuccin light/dark theme, change light theme background, update tag styles, add hover effects"],
        category: "uiux",
      },
      {
        date: "6.21",
        cn: ["通过 git 子模块分离主题和博客文章，实现独立源码控制"],
        en: ["Separate theme and blog posts via git submodule for independent source control"],
        category: "other",
      },
      {
        date: "6.28",
        cn: ["添加 hexo-shiki-highlight 功能，支持浅色/深色主题", "重构 obsidian-callout，支持浅色/深色主题"],
        en: ["Add hexo-shiki-highlight Feat, support light/dark theme", "Refactor obsidian-callout, support light/dark theme"],
        category: "Feat",
      },
      {
        date: "6.29",
        cn: [
          "开发 hexo-mermaid-diagram 插件，在右下角添加 GitHub 式控制面板，仅在使用 mermaid 时嵌入 iframe",
          "优化字体大小，使用 FontTools 进行字体子集化，移除繁体中文，保留拉丁文和常用简体中文",
          "尝试 EdgeOne CDN（认证要求过多，短暂试用后切回 Cloudflare）",
        ],
        en: [
          "Develop hexo-mermaid-diagram plugin, add GitHub-like control panel in bottom right, only embed iframe when mermaid is used",
          "Optimize font size, use FontTools for font subsetting, remove Traditional Chinese, keep Latin and common Simplified Chinese",
          "Try EdgeOne CDN (too many authentication requirements, switched back to Cloudflare after brief trial)",
        ],
        category: "Feat",
      },
      {
        date: "7.2",
        cn: ["将对象存储从 Cloudflare R2 迁移到 Bitiful S4"],
        en: ["Migrate object storage from Cloudflare R2 to Bitiful S4"],
        category: "Perf",
      },
      {
        date: "8.9",
        cn: ["从导航栏移除 /GALLERY，通过 Vercel 部署 exif-photo-blog 到 photos.vluv.space", "整理 /ABOUT 和 NOW 内容"],
        en: ["Remove /GALLERY from Navigation Bar, deploy exif-photo-blog to photos.vluv.space via Vercel", "Organize /ABOUT and NOW content"],
        category: "uiux",
      },
      {
        date: "8.10",
        cn: ["使用 Google 字体 Noto Sans，中文字体项目 Maple Mono NF CN"],
        en: ["Use Google Font for Noto Sans, Chinese Webfont Project for Maple Mono NF CN"],
        category: "Feat",
      },
      {
        date: "9.2",
        cn: ["添加 ICP 备案，为国内图片设置 CDN"],
        en: ["Add ICP filing, set up domestic CDN for images"],
        category: "Feat",
      },
      {
        date: "9.6",
        cn: ["博客封面和文章图片支持渐进加载"],
        en: ["Blog cover and post images support progressive loading"],
        category: "Perf",
      },
      {
        date: "9.8",
        cn: ["设置国内和国际 CDN 分流（EdgeOne CDN + Bitiful）"],
        en: ["Set up domestic and international CDN splitting (EdgeOne CDN + Bitiful)"],
        category: "Perf",
      },
      {
        date: "9.9",
        cn: ["为 CDN 分流自托管部分 npm 包，优化国内加载速度"],
        en: ["Self-host some npm packages for CDN splitting, optimize domestic loading speed"],
        category: "Perf",
      },
      {
        date: "9.11",
        cn: ["使用 Busuanzi 替代 vercount 进行访客统计，优化加载速度"],
        en: ["Use Busuanzi instead of vercount for visitor counting, optimize loading speed"],
        category: "Perf",
      },
      {
        date: "10.10",
        cn: ["精简 bulma CSS 框架，优化页面性能"],
        en: ["Streamline bulma CSS framework, optimize page Perf"],
        category: "Perf",
      },
      {
        date: "10.21",
        cn: ["移动端 UX 优化，隐藏小部件"],
        en: ["Mobile UX optimization, hide widgets"],
        category: "uiux",
      },
      {
        date: "11.16",
        cn: ["添加颜色主题切换，支持 Catppuccin、Tokyo Night 等", "优化页脚和面包屑 UI", "优化标注和 Twikoo UI", "更新 hexo-shiki-highlight，支持多主题"],
        en: [
          "Add color theme switching, support Catppuccin, Tokyo Night, etc.",
          "Optimize Footer and Breadcrumb UI",
          "Optimize Callout and twikoo UI",
          "Update hexo-shiki-highlight, support multi-theme",
        ],
        category: "uiux",
      },
      {
        date: "11.21",
        cn: ["使用 markdown-it-mathjax3-pro 插件进行服务端数学渲染", "开发 markdown-it-inline-code 插件实现行内代码高亮"],
        en: ["Use markdown-it-mathjax3-pro plugin for server-side math rendering", "Develop markdown-it-inline-code plugin for inline code highlighting"],
        category: "Feat",
      },
      {
        date: "11.30",
        cn: ["使用纯文本重新设计 Logo", "响应式导航栏设计，移动端显示 logo 和 navbar-burger"],
        en: ["Redesign logo using plain text", "Responsive navbar design, show logo & navbar-burger on mobile"],
        category: "uiux",
      },
      {
        date: "12.08",
        cn: ["切换到 markdown-exit 渲染引擎", "使用 &lt;code&gt;@mdit/tabs&lt;/code&gt; 替代 Hexo 自定义标签"],
        en: ["Switch to markdown-exit rendering engine", "Use &lt;code&gt;@mdit/tabs&lt;/code&gt; instead of Hexo Custom Tag"],
        category: "refactor",
      },
      {
        date: "12.13",
        cn: ["使用 biome 进行代码检查和格式化"],
        en: ["Use biome for linting and formatting"],
        category: "refactor",
      },
      {
        date: "12.18",
        cn: ["优化搜索框 UIUX 和性能", "使用 esbuild 和 @minify-html/node 进行资源压缩"],
        en: ["Optimize Search Box UIUX & Perf", "Use esbuild and @minify-html/node for asset compression"],
        category: "uiux",
      },
      {
        date: "12.21",
        cn: ["编写并使用 markdown-exit-mermaid 插件进行 mermaid 渲染"],
        en: ["Write and use markdown-exit-mermaid plugin for mermaid rendering"],
        category: "Feat",
      },
    ],
  },
  {
    year: 2024,
    items: [
      {
        date: "1.3",
        cn: ["切换到 Hexo 框架 + Icarus 主题（HTML 繁琐，懒得学 Vue/React），迁移部分文章"],
        en: ["Switch to Hexo framework + Icarus theme (HTML is tedious, too lazy to learn vue/react), migrate some articles"],
        category: "Feat",
      },
      {
        date: "1.13",
        cn: ["添加 Gallery 页面"],
        en: ["Add Gallery Page"],
        category: "Feat",
      },
      {
        date: "1.15",
        cn: ["尝试 gittalk 和 utterances，最终选择 Twikoo 作为评论系统"],
        en: ["Try gittalk and utterances, finally choose Twikoo as comment system"],
        category: "Feat",
      },
      {
        date: "3.12",
        cn: ["在阿里云购买 &lt;code&gt;jvav.love&lt;/code&gt; 域名一年，费用为个位数", '使用 ZOHO 设置企业邮箱并向计算机网络老师发送邮件（用于"五个一工程"项目作业）'],
        en: [
          "Buy &lt;code&gt;jvav.love&lt;/code&gt; domain for one year on Alibaba Cloud, cost is single digit.",
          'Use ZOHO to set up enterprise email and send email to computer network teacher (for "五个一工程" project assignment)',
        ],
        category: "other",
      },
      {
        date: "4.26",
        cn: ["使用 Hexo-Blog-Encrypt 插件为部分文章设置密码"],
        en: ["Use Hexo-Blog-Encrypt plugin to set passwords for some articles"],
        category: "Feat",
      },
      {
        date: "6.14",
        cn: ["添加 Vercel 部署，为文章图片设置圆角"],
        en: ["Add Vercel deployment, set rounded corners for post images"],
        category: "Feat",
      },
      {
        date: "6.15",
        cn: ["添加 Onedrive 页面"],
        en: ["Add Onedrive Page"],
        category: "Feat",
      },
      {
        date: "7.25",
        cn: ["添加 Asoul Live2D 模型，好可爱"],
        en: ["Add Asoul Live2d model, so cute"],
        category: "Feat",
      },
      {
        date: "9.14",
        cn: ["移除 git deployer，切换到命令行 git push 配合 GitHub Action 部署"],
        en: ["Remove git deployer, switch to command line git push with GitHub action for deployment"],
        category: "refactor",
      },
      {
        date: "9.16",
        cn: ["部署到 Cloudflare Pages"],
        en: ["Deploy to Cloudflare Pages"],
        category: "Feat",
      },
      {
        date: "9.23",
        cn: ["在 namesilo 购买 vluv.space 域名；添加友链页面"],
        en: ["Buy vluv.space domain on namesilo; add friend links page"],
        category: "Feat",
      },
      {
        date: "9.28",
        cn: ["使用 lazyload、gulp、instant page 等方案优化性能"],
        en: ["Use lazyload, gulp, instant page and other solutions to optimize Perf"],
        category: "Perf",
      },
      {
        date: "9.30",
        cn: ["将 Twikoo 部署迁移到 Azure 服务器，1h1g 勉强够用"],
        en: ["Move twikoo deployment to Azure server, 1h1g is barely sufficient"],
        category: "Perf",
      },
      {
        date: "10.1",
        cn: ["将代码渲染从 highlight.js 切换到 shiki"],
        en: ["Switch code rendering from highlight.js to shiki"],
        category: "Feat",
      },
      {
        date: "10.9",
        cn: ["添加 Clarity"],
        en: ["Add Clarity"],
        category: "Feat",
      },
      {
        date: "10.12",
        cn: ["在 About 页面添加时间线"],
        en: ["Add Time Line to About Page"],
        category: "Feat",
      },
      {
        date: "11.15",
        cn: ["使用 Cloudflare R2 Storage 进行对象存储，将包管理器切换到 bun"],
        en: ["Use Cloudflare R2 Storage for object storage, switch package manager to bun"],
        category: "Perf",
      },
      {
        date: "11.29",
        cn: ["切换到 Font Awesome 6 图标包"],
        en: ["Switch to Font Awesome 6 icon pack"],
        category: "Feat",
      },
      {
        date: "12.2",
        cn: ["使用 Excalidraw 绘制 Logo 和 Icon"],
        en: ["Draw Logo & Icon with Excalidraw"],
        category: "other",
      },
    ],
  },
  {
    year: 2023,
    items: [
      {
        date: "7.15",
        cn: ["创建个人网站首页，部署到 GitHub Page；基于 html+js+css"],
        en: ["Create personal website Homepage, deploy to GitHub Page; based on html+js+css"],
        category: "Feat",
      },
      {
        date: "7.17",
        cn: ["设置背景音乐"],
        en: ["Set background music"],
        category: "Feat",
      },
      {
        date: "8.16",
        cn: ["使用纯 html+css 编写时间线组件；记录初中到大一的事件；添加 404.html"],
        en: ["Write timeline component with pure html+css; record events from middle school to freshman year; add 404.html"],
        category: "Feat",
      },
    ],
  },
];
