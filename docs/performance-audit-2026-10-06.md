# 性能审计 · 2026-10-06

后续实施记录：已接通正文与封面共用的 `thumbcache.json`、修正正文 `sizes` 与封面尺寸 / 占位图，并将 Nerd Font 拆成 53 个按字符加载的分片（常用分片 9.4 KB）。以下保留实施前的审计证据；其他建议尚未实施。此次实现同样没有运行测试或 Hexo 构建。

优先处理 Shiki 样式去重、正文与封面的图片尺寸、图片构建缓存。这三项分别减少大篇幅文章的 HTML、图片下载与解码、构建时的重复网络请求，收益依据最明确。

本次仅阅读主题、父项目配置和构建脚本，并统计文章源文件、现有 `db.json` / `thumbcache.json`。没有运行测试、Hexo 生成、浏览器性能录制或部署。当前没有 `public` 目录；缓存中的 335 篇文章和现有 329 个 Markdown 文件并非同一快照，以下缓存数据只用来说明问题规模。体积采用十进制 KB / MB；gzip 数据是本地压缩估算，不代表生产传输量或实测加载耗时。

| 顺序 | 建议 | 主要收益 | 工作量 |
| --- | --- | --- | --- |
| 1 | Shiki 重复样式提取为 CSS class | 减少 HTML 下载、解析和重复样式声明 | 中 |
| 2 | 修正正文 `sizes`，缩小封面占位图 | 减少图片流量和解码内存；封面涉及首屏 | 小至中 |
| 3 | 启用图片元数据缓存并合并相同请求 | 加快需要重新渲染文章的构建 | 小 |
| 4 | 细分 Symbols Nerd Font Mono | 减少遇到少量图标时的首次下载 | 中 |
| 5 | 评论资源改为交互意图触发预取 | 减少不打开评论的访客流量 | 小 |
| 6 | 搜索计算移入 Worker，面板脚本延迟加载 | 减少搜索期间的主线程占用 | 中 |
| 7 | 整理资源哈希与 HTML 后处理 | 保证缓存版本正确，控制构建内存 | 中 |

**1. Shiki 是目前最明确的 HTML 体积问题。**

[shiki.js](../include/hexo/mdit/shiki.js) 对 token 输出九套主题的颜色；父项目 `_config.yml` 显式关闭了 `style_to_class`。现有缓存包含 118,772 个带 `--shiki-*` 的内联样式属性，但只有 280 种不同的样式值；这些值合计约 33.98 MB，全部文章正文 HTML 合计约 53.90 MB。

以缓存中的 `langs__en.md` 为例：正文 HTML 为 2,938,901 字节，7,506 个 Shiki 样式属性只有 76 种不同值，样式值占 2,398,089 字节。仅做字符串级去重估算，HTML 可缩到约 566 KB，另加约 27 KB 的 CSS；gzip 后两者合计约 25 KB，原 HTML 约 82 KB。这是容量估算，未生成或验证可用页面，不能直接作为生产收益承诺。DOM token 数量不会因样式去重而减少。

建议将相同声明映射到稳定的 class，并统一输出 CSS，同时覆盖 fenced code 和带语言标记的 inline code，保留全部主题。现成的 `transformerStyleToClass` 可以复用，但不能只把配置改成 `true`：当前只在 fence 中接入，并在每个代码块后写累计 CSS；需要补齐行内代码、将 CSS 输出汇总到合适的生成阶段、让含代码页面及时加载样式。稳定类名或持久化映射还要兼容 Hexo 缓存命中的旧 HTML，避免增量构建引用不存在的 class。

**2. 图片声明的宽度与实际显示宽度脱节，封面占位图也没有缩小像素尺寸。**

[image.js](../include/hexo/mdit/image.js) 的 `buildProgressiveImageHTML` 默认把 `sizes` 写成原图宽度，除非文章提供 Obsidian 宽度或配置覆盖；当前配置没有覆盖。正文默认限制在 `42em`，手机通常更窄。例：原图 4000px、显示约 390px 时，浏览器收到 `sizes="4000px"`，会倾向于选原图，而不是按实际显示宽度和 DPR 选 400 / 800 / 1200px 候选。显式写了较大文章宽度也有同样问题。

已有元数据缓存的 364 张图片中，246 张宽于 1200px、156 张宽于 2000px，足以说明这不是极少数图片的边缘情况。建议为 lazy 图片采用有尺寸约束的 `sizes="auto, …"`，并提供兼容旧浏览器、匹配正文宽度的回退；补齐固有尺寸，保留读者调整正文宽度的行为。不要只把固定原图宽度替换成另一个固定桌面宽度。

[article_cover.jsx](../layout/common/article_cover.jsx) 在首屏同时输出封面与 `?q=80&blur=80` 占位图。占位 URL 没有 `w` / `h`，模糊和质量参数不保证降低像素尺寸，CSS 还再次施加 blur。现有源文件中约 184 篇有远程封面。建议复用小尺寸 ThumbHash 占位或请求几十像素宽的缩略图；按真实固有宽度生成 srcset，去掉将所有原图一律标为 `6144w` 的写法，并让 `sizes` 对应当前封面网格。封面本身继续保持 eager / high priority。

**3. 图片缓存代码已经存在，但当前配置没有启用。**

[image.js](../include/hexo/mdit/image.js) 默认 `cache_path: null`，仅在 `options.cache_path` 有值时创建 `ImageCache`；[renderer.js](../include/hexo/renderer.js) 直接传入 `markdown_exit.image_options`，父项目当前未配置该项。因此根目录虽然已有 `thumbcache.json`，插件实际不会读取它。

每次处理未从 Hexo 数据库复用的图片，插件会并行请求 `fmt=info` 与 `fmt=thumbhash`，随后将占位 PNG 转为 WebP。当前 Markdown 正则扫描约有 700 处站内图片引用、332 个不同 URL，其中 688 处 URL 已能匹配旧缓存；这些是包含双语文章和示例代码的近似计数，不是实际构建请求数。旧缓存的 `width` / `height` / `dataURL` 结构与当前插件一致。

建议先将 `cache_path` 指向项目根目录的 `thumbcache.json`，路径相对于 `hexo.base_dir` 明确解析。再增加按 URL 保存进行中 Promise 的映射，合并双语文章并发请求，并限制总体网络并发。失败请求应能重试。CI 已缓存 Hexo `db.json`，因此收益主要体现在首次构建、清理数据库、渲染规则变化和修改相关文章时，不能声称每次增量构建都会下载全部图片。

**4. Nerd Font 已经按字符加载，但两个分片仍然很粗。**

[default.css](../source/css/default.css) 当前两个 WOFF2 分别为 611,696 和 500,536 字节，共保留 10,410 个字符。页面只要有一个需要回退的 BMP 图标，就可能请求约 612 KB；如果同时用到补充平面图标，还需要约 501 KB。没有命中字符的页面不会因此下载字体。

建议按图标集合或较小 Unicode 范围细分，在保留完整覆盖的前提下让一次请求只承担较少字符。也可以将文章和 tree 组件常用图标放进小分片，其余字符继续分片回退；常用集合与其余集合的 `unicode-range` 应精确分离。继续保留原字体名称和许可证，不加全站 preload。收益是遇到图标时的首次流量，不能将 1.11 MB 视为每页固定开销。

**5. Twikoo 的初始化是按需的，但下载预热是每篇文章自动触发的。**

[article.js](../source/js/article.js) 的 `initArticleCommentPopover` 对评论资源执行 `prewarmLazyAssetsOnIdle`。支持 prefetch 且缓存未命中时，不点评论也会下载资源。Twikoo JS 实际文件为 563,150 字节，本地 gzip 估算 156,009 字节，另有评论 CSS。

建议在 comments 按钮的 pointerenter / focus / pointerdown 时开始预热，点击仍走现有加载 Promise；可按网络条件跳过预热。这样减少纯阅读访客的流量，代价是没有预热的首次评论打开需要等资源到达。不要把当前预取描述为提前执行了 Twikoo：目前初始化确实仍在打开弹层后发生。

**6. 搜索按需获取数据，但查询计算仍阻塞主线程。**

[command-palette.js](../source/js/command-palette.js) 在搜索按钮悬停、聚焦或打开时获取索引，已经有价值；[generator/index.js](../include/hexo/generator/index.js) 也已经按语言拆分索引。当前没有生成后的 `content.json`，本次没有给出其实际传输大小。

`prepareDocument` 在主线程解码并复制小写全文；`rankList` 对每个查询遍历全文、统计每个关键词全部出现次数，再排序。`requestAnimationFrame` 只合并输入事件，不会把检索计算移出主线程。建议把索引解析、预处理和查询放进 Worker，用查询序号丢弃旧结果；主线程只接收有限的结果与片段。先保留现有全文匹配语义，避免为了缩小索引而丢失正文搜索能力。

[command_palette.jsx](../layout/common/command_palette.jsx) 还在每页直接加载面板模块。可保留小型触发入口，在第一次交互意图时动态导入，覆盖键盘快捷键与 hash 打开入口。面板源码约 29.7 KB，生成时还会内联所用 Lucide 图标，因此源码大小不能当成最终模块体积。

**7. 构建后处理的哈希时机需要调整，HTML 并发也没有内存上限。**

父项目 `build.js` 先通过 esbuild 的 `[hash]` 命名，再修改输出 JS 中的依赖 URL。这样父模块源代码未变、子模块改变时，父模块最终内容可能改变而文件名不变；如果部署使用长缓存，会破坏文件名对应内容版本的前提。建议将最终依赖路径纳入哈希生成，优先让 esbuild 管理模块图和拆分；仍需兼顾运行时拼出的资源地址。未检查线上缓存头，本次不认定生产已发生缓存故障。

同一脚本对所有 HTML 执行无上限 `Promise.all`，其中原生 `minify` 是同步调用。它不会因为 Promise 包装自动并行利用 CPU，却可能让多个大型 HTML 同时驻留内存。建议限制读取与处理并发，先处理前述 Shiki 膨胀；确有 CPU 瓶颈再引入有界 Worker 池。每个 HTML 还会重新排序资源映射，可提前计算一次，但这只是附带的小优化。

`bun run build` 没有先清理输出，资源扫描也不排除已带哈希的文件，复用本地 `public` 时存在重复处理旧产物的路径；CI 从新 checkout 开始，不应把该风险泛化成每次 CI 都发生。建议将输入和输出目录分开，或显式维护当次产物清单。

**次优先级事项。**

- [glass-lens.js](../source/js/glass-lens.js) 已有尺寸缓存、贴图尺寸上限、引擎与设备门控；但 `flush` 会在一次 idle callback 中处理整个队列，同步 `buildLensMap` 不会因后续 `toBlob` 异步而让出主线程。可先按时间预算分批处理，再考虑相同几何参数共享贴图。实际是否明显卡顿仍需性能录制确认。
- [head.jsx](../layout/common/head.jsx) 每页同步读取并内联完整字体工具，工具源码约 4.45 KB；[scripts.jsx](../layout/common/scripts.jsx) 每页加载约 29.1 KB 的 preferences 源码。可以缓存构建期文件读取、将仅设置页需要的控制逻辑拆出，但应保留首帧应用主题和已选字体的少量同步代码。优先级低于图片和 Shiki。
- Shiki 和 Mermaid 目前没有输出级持久缓存。缓存文章中正则识别到约 1402 个非 Mermaid fenced code，其中约 384 次重复；可按源码、语言、主题、transformer 选项和版本缓存输出。RaTeX 已有进程内 Promise 缓存和并发限制，新增缓存应聚焦跨构建复用，不能重复推荐已有机制。

Mermaid 大库已经只在不支持服务端渲染的图类型中加载；视频平台已有封面门面，视频折射模块使用动态导入；文章与归档入口也已经分开。仅凭这些文件较大，不足以把它们列为全站首屏问题。

建议实施顺序：先接通图片缓存；再合并处理正文 `sizes` 与封面占位；随后完成 Shiki 样式提取。前三项落地后，再处理字体分片、评论预取和搜索 Worker。本次没有实施这些性能改动。
