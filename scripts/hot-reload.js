const path = require("node:path");
const { clearComponentCache } = require("../include/util/common");

const LIVE_RELOAD_PATH = "/__hexo_live_reload";
const clients = new Set();
const reloadDebounceMs = 150;
const reloadCooldownMs = 500;

function isHexoServerCommand(ctx) {
  const command = ctx.env?.cmd;
  const aliases = ctx.extend?.console?.alias ?? {};

  return command === "server" || aliases[command] === "server";
}

function broadcastReload() {
  const payload = `data: ${JSON.stringify({ type: "reload", at: Date.now() })}\n\n`;

  for (const client of clients) {
    client.write(payload);
  }
}

if (isHexoServerCommand(hexo)) {
  let reloadTimer = null;
  let lastBroadcastAt = 0;

  /* JSX 模板热更新：渲染走 require(data.path)（见 include/hexo/renderer.js），
     但 Node 的 require 缓存与 cacheComponent 的元素缓存都钉着旧组件；
     侦测到 layout 下 jsx 变动后，在下一轮生成前整体清掉两层缓存，
     渲染时 esbuild 按需重新编译。include/ 下的 js 不在 Box 监听范围，
     改动仍需重启 server */
  const layoutDir = path.join(hexo.theme_dir, "layout") + path.sep;
  let layoutDirty = false;

  hexo.theme.on("processAfter", (file) => {
    if (file.path?.endsWith(".jsx")) {
      layoutDirty = true;
    }
  });

  hexo.on("generateBefore", () => {
    if (!layoutDirty) {
      return;
    }
    layoutDirty = false;

    for (const id of Object.keys(require.cache)) {
      if (id.startsWith(layoutDir)) {
        delete require.cache[id];
      }
    }
    clearComponentCache();
  });

  function scheduleReload() {
    if (reloadTimer) {
      clearTimeout(reloadTimer);
    }

    reloadTimer = setTimeout(() => {
      reloadTimer = null;

      const now = Date.now();
      if (now - lastBroadcastAt < reloadCooldownMs) {
        return;
      }

      lastBroadcastAt = now;
      broadcastReload();
    }, reloadDebounceMs);
  }

  hexo.on("generateAfter", () => {
    scheduleReload();
  });

  hexo.extend.filter.register("server_middleware", (app) => {
    app.use((req, res, next) => {
      if (req.url !== LIVE_RELOAD_PATH) {
        next();
        return;
      }

      res.writeHead(200, {
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "Content-Type": "text/event-stream",
        "X-Accel-Buffering": "no",
      });

      res.write("retry: 1000\n\n");
      clients.add(res);

      req.on("close", () => {
        clients.delete(res);
        res.end();
      });
    });
  });

  hexo.extend.injector.register(
    "body_end",
    `
<script>
(() => {
  if (!window.EventSource) return;

  const source = new EventSource('${LIVE_RELOAD_PATH}');
  source.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'reload') {
        window.location.reload();
      }
    } catch (_) {
      window.location.reload();
    }
  });
})();
</script>`,
  );
}
