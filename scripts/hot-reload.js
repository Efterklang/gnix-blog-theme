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
