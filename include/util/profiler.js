const { performance } = require("node:perf_hooks");

const enabled = /^(1|true|yes|on)$/i.test(String(process.env.GNIX_I18N_PROFILE || process.env.GNIX_PROFILE_I18N || ""));
const registries = new Map();

function getRegistry(namespace) {
  if (!registries.has(namespace)) {
    registries.set(namespace, {
      flushed: false,
      hooksInstalled: false,
      stats: new Map(),
    });
  }

  return registries.get(namespace);
}

function formatMs(value) {
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`;
  return `${value.toFixed(2)}ms`;
}

function createProfiler(namespace) {
  if (!enabled) {
    return {
      enabled: false,
      start() {
        return () => {};
      },
      wrap(_label, fn) {
        return fn();
      },
      flush() {},
    };
  }

  const registry = getRegistry(namespace);

  function record(label, duration, detail = "") {
    const current = registry.stats.get(label) || {
      count: 0,
      samples: [],
      total: 0,
      max: 0,
    };

    current.count += 1;
    current.total += duration;
    current.max = Math.max(current.max, duration);
    if (detail) {
      current.samples.push({ detail, duration });
      current.samples.sort((a, b) => b.duration - a.duration);
      if (current.samples.length > 5) current.samples.length = 5;
    }
    registry.stats.set(label, current);
  }

  function start(label) {
    const startedAt = performance.now();
    return (detail = "") => record(label, performance.now() - startedAt, detail);
  }

  function wrap(label, fn) {
    const stop = start(label);
    try {
      return fn();
    } finally {
      stop();
    }
  }

  function flush() {
    if (registry.flushed || registry.stats.size === 0) return;
    registry.flushed = true;

    console.log(`[${namespace}] profiling summary`);
    const rows = [...registry.stats.entries()].sort((a, b) => b[1].total - a[1].total);
    rows.forEach(([label, stat]) => {
      const avg = stat.total / stat.count;
      console.log(
        `[${namespace}] ${label}: ${stat.count} calls, total ${formatMs(stat.total)}, avg ${formatMs(avg)}, max ${formatMs(stat.max)}`,
      );
      if (stat.samples.length) {
        const samples = stat.samples
          .slice(0, 3)
          .map((sample) => `${formatMs(sample.duration)} ${sample.detail}`)
          .join(" | ");
        console.log(`[${namespace}] ${label} slowest: ${samples}`);
      }
    });
  }

  if (!registry.hooksInstalled) {
    registry.hooksInstalled = true;
    process.once("beforeExit", () => flush());
    process.once("exit", () => flush());
  }

  return {
    enabled: true,
    start,
    wrap,
    flush,
  };
}

module.exports = {
  createProfiler,
};
