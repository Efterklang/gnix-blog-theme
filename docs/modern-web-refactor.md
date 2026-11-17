# Modern Web 重构效果与验证

本次重构参考 [GoogleChrome/modern-web-guidance](https://github.com/GoogleChrome/modern-web-guidance)，重点改善资源加载、渐进增强、搜索响应和键盘可访问性。对比基线为主题提交 `ffb278a444ba34b978da4acb3f1d8db806e6ea1a`。

## 可量化的变化

下表统计生产构建中，页面加载完成后 4.5 秒内实际请求的本地 JavaScript。计量单位为十进制 KB；字节数为已压缩代码的文件大小，不是服务器的 HTTP 压缩传输量。每个场景使用独立浏览器上下文，不操作搜索、偏好设置或评论。

| 页面 | 重构前 JS | 重构后 JS | 减少 | JS 请求数 |
| --- | ---: | ---: | ---: | ---: |
| 首页 `/` | 34.5 KB | 7.1 KB | 79.5% | 4 → 2 |
| 文字文章 `/beneath_the_wheel/` | 625.6 KB | 34.5 KB | 94.5% | 9 → 6 |
| 代码文章 `/shiki_highlight/` | 622.6 KB | 31.5 KB | 94.9% | 8 → 5 |
| 图文文章 `/uiux_terms/` | 632.9 KB | 41.8 KB | 93.4% | 10 → 7 |

文章页节省的主要部分是 Twikoo 评论客户端，以及搜索和偏好设置脚本。它们仍在需要时加载，首次打开评论会等待客户端初始化。悬停和键盘聚焦提前启动加载，已初始化的评论实例在再次打开时复用。

以相同参数逐文件计算 gzip 大小，首页 JS 为 **13.1 → 3.1 KB**，代码文章 JS 为 **178.4 → 11.7 KB**。这是压缩后的参考量；实际 CDN 可能采用 Brotli 或其他配置。

| 页面 | CSS 字节数 | CSS 请求数 | HTML 字节数 |
| --- | ---: | ---: | ---: |
| 首页 | 52,383 → 52,930 | 3 → 3 | 41,589 → 39,450 |
| 文字文章 | 106,308 → 75,125 | 6 → 4 | 59,102 → 56,982 |
| 代码文章 | 106,308 → 78,115 | 6 → 4 | 212,586 → 210,463 |
| 图文文章 | 107,797 → 76,614 | 7 → 5 | 78,397 → 76,114 |

首页 CSS 增加 547 字节，用于可见的键盘跳转入口与标准滚动条及其兼容规则。文章按内容选择代码和提示块样式，并省去未打开评论的样式请求。

## 实现变化

- `include/util/page_assets.js` 统一管理页面样式、模块入口和 `modulepreload`，让 head 的提前发现与 body 的实际入口保持一致。加密文章提前保留解密后可能需要的样式。
- 搜索与偏好设置的加载逻辑从每页内联脚本移到可缓存的 `main.js`。页面只内联经过转义的 JSON 配置；可选界面在悬停、聚焦或打开时加载，失败后下一次操作可重试。
- 评论取消页面空闲时的自动初始化，在用户接近入口或打开评论时加载。统计脚本采用低下载优先级。
- 搜索索引预处理按 8 ms 的时间预算让出主线程，优先使用 `scheduler.yield()`，不支持时回退到 Promise 包裹的 `setTimeout`。检查 HTTP 状态，失败不会将错误响应当作索引数据。
- 代码与提示块的样式在使用它们的页面直接生效，不再依赖 `onload` 切换样式表。图片默认可见，加载事件只释放缩略占位背景；无 JavaScript 时仍保留图片、说明及尺寸。普通 Markdown 图片使用原生懒加载和异步解码；封面保持 eager/high，只对支持尺寸转换的图片生成转换 URL。
- 新增中英文“跳到主要内容”键盘入口。密码输入支持 `current-password` 自动填充；评论表单使用 `:user-invalid`，在用户完成交互后显示校验样式。
- 滚动条使用 `scrollbar-width` 和 `scrollbar-color`，旧 WebKit 样式限制在 `@supports not` 回退中。非模态栏目 popover 去除不准确的 `aria-modal` 声明。
- 用 `pagehide` / `pageshow` 清理临时弹层。浏览器实际从 bfcache 返回时，栏目菜单关闭且 `aria-expanded` 恢复为 `false`。

## 验证与边界

1. 独立检出原始主题提交，使用相同文章、配置、图片元数据与依赖，分别进行 Hexo 生成及现有 `build.js` 压缩。最终版本执行 `bun run rebuild`，确保 Markdown 渲染器修改不会被 Hexo 旧缓存覆盖。
2. Chrome 测试桌面 1440 × 900 与手机 390 × 844，两种宽度各检查上述四个页面。前后两组本地资源请求全部成功；最终版本无页面 JS 异常或横向溢出，测得 CLS 均为 0。
3. **60 项主检查通过**：包括实际资源加载、可选脚本不自动下载、首次打开搜索与设置、字体更新、键盘跳转、搜索结果与命令、无 JS 图片及代码样式、偏好脚本失败重试。
4. 补充检查通过：搜索模块首次下载返回 503 后，第二次请求成功打开；禁用 `scheduler` 后搜索仍返回结果；实际后退恢复的 `pageshow.persisted` 为 `true`，弹层数量为 0。
5. 检查 **612 个生成 HTML 页面**，本地 JS/CSS 引用不存在缺失文件。修改的 17 个代码文件通过 Biome 检查；本机 CLI 与仓库已有配置的 schema 版本提示未涉及代码诊断。
6. 官方扫描器的可识别旧模式从 **7 → 0**。扫描覆盖 33 个指南、35 条确定性规则，约为指南目录的 20%；此结果不等于完整网站的性能或无障碍认证。

为使对比可重复，浏览器验证屏蔽外部图片、分析与评论后端请求。评论验证确认客户端按需加载并初始化，未验证线上后端数据返回。LCP 受真实 CDN、图片网络、设备与已有入场动画影响，本次不将本机时间换算为线上 LCP/INP 提升百分比。资源减量与兼容行为是本次直接验证的收益。

复查入口：

```sh
bun run rebuild
npx -y modern-web-guidance@latest legacy-scan themes/gnix --json
```

## Modern Web Guidance

- **[`performance`](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/performance/performance.md)**：我将隐藏界面改为按需加载，集中可缓存的加载逻辑，并按内容选择样式，落实 “DON'T load invisible or unreachable CSS/JS”。
- **[`break-up-long-tasks`](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/performance/break-up-long-tasks.md)**：我按耗时分批处理索引，保留浏览器回退，落实 “You MUST implement a fallback using `setTimeout`”。
- **[`optimize-image-priority`](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/performance/optimize-image-priority.md)**：我保留封面 eager/high 和正文图片的原生懒加载，避免 “Never use `loading="lazy"` on the LCP image”，同时修复无 JS 图片显示和不支持转换的封面 URL。
- **[`optimize-script-priority`](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/performance/optimize-script-priority.md)**：我降低非核心统计脚本的下载优先级，落实 “deprioritize scripts that are not required for the initial user experience”。
- **[`autofill-sign-in-form`](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/forms/autofill-sign-in-form.md)**：我在文章与归档密码输入中采用原生自动填充并保留必填约束，落实 “Use `autocomplete="current-password"` for an existing password”。
- **[`customize-scrollbar-color-and-thickness`](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/visual-design/customize-scrollbar-color-and-thickness.md)**：我使用标准属性，并将旧样式限制在兼容分支，落实 “Wrap legacy fallbacks in an `@supports not (scrollbar-color: auto)` block”。
- **[`validate-input-after-interaction`](https://github.com/GoogleChrome/modern-web-guidance/blob/main/skills/modern-web-guidance/guides/forms/validate-input-after-interaction.md)**：我将评论字段的校验样式改为 `:user-invalid`，落实 “use `:user-invalid` to apply error styling only after interaction”，避免输入过程中立即出现错误边框。
