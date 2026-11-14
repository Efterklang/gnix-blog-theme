// 双链图，Obsidian 式：节点是小圆点（越多连线越大）、名字在圆点下方的小字；连线是细灰线。
// 布局是持续运行的力模拟（斥力 + 弹簧 + 向心），拖一个节点它会被拎走、邻居跟着动；
// 滚轮缩放、拖空白平移；悬停点亮一个节点与它的邻居，其余退淡；点击进入文章
import { runWhenActivated } from "./main.js";

function seeded(seed) {
  let value = seed >>> 0 || 1;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function createGraph(container, data) {
  const svgNS = "http://www.w3.org/2000/svg";
  const width = Math.max(container.clientWidth, 320);
  const height = Math.max(Math.round(window.innerHeight * 0.78), 520);
  const random = seeded(data.nodes.length * 7919 + data.edges.length);
  const index = new Map(data.nodes.map((node, i) => [node.id, i]));
  const links = data.edges.map(([a, b]) => ({ a: index.get(a), b: index.get(b) })).filter(({ a, b }) => a != null && b != null);
  const degree = data.nodes.map(() => 0);
  for (const { a, b } of links) {
    degree[a] += 1;
    degree[b] += 1;
  }
  const neighbours = data.nodes.map(() => new Set());
  for (const { a, b } of links) {
    neighbours[a].add(b);
    neighbours[b].add(a);
  }
  // 初始散在中心附近的一圈里，力把它们推开
  const nodes = data.nodes.map((node, i) => {
    const angle = random() * Math.PI * 2;
    const radius = Math.min(width, height) * 0.1 * Math.sqrt(random());
    return { ...node, i, x: width / 2 + Math.cos(angle) * radius, y: height / 2 + Math.sin(angle) * radius, vx: 0, vy: 0, r: 3 + Math.min(degree[i], 8) * 0.9, fixed: false };
  });

  // ---- 模拟（d3-force 的最简版本：速度衰减 + alpha 冷却） ----
  const CHARGE = -520;
  const LINK_DISTANCE = 60;
  const LINK_STRENGTH = 0.25;
  const CENTER = 0.035;
  let alpha = 1;
  let frame = null;

  function tick() {
    const n = nodes.length;
    for (let i = 0; i < n; i += 1) {
      const a = nodes[i];
      for (let j = i + 1; j < n; j += 1) {
        const b = nodes[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) {
          dx = random() - 0.5;
          dy = random() - 0.5;
          d2 = 1;
        }
        if (d2 > 260 * 260) continue;
        const force = (CHARGE * alpha) / d2;
        const d = Math.sqrt(d2);
        const fx = (dx / d) * force;
        const fy = (dy / d) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }
    for (const { a, b } of links) {
      const na = nodes[a];
      const nb = nodes[b];
      const dx = nb.x - na.x;
      const dy = nb.y - na.y;
      const d = Math.hypot(dx, dy) || 1;
      const force = ((d - LINK_DISTANCE) / d) * LINK_STRENGTH * alpha;
      const wa = degree[b] / (degree[a] + degree[b]);
      na.vx += dx * force * wa;
      na.vy += dy * force * wa;
      nb.vx -= dx * force * (1 - wa);
      nb.vy -= dy * force * (1 - wa);
    }
    for (const node of nodes) {
      node.vx += (width / 2 - node.x) * CENTER * alpha;
      node.vy += (height / 2 - node.y) * CENTER * alpha;
      if (node.fixed) {
        node.vx = 0;
        node.vy = 0;
        continue;
      }
      node.vx *= 0.6;
      node.vy *= 0.6;
      node.x += node.vx;
      node.y += node.vy;
    }
    alpha *= 0.985;
  }

  // ---- 画 ----
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("class", "graph-svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", width);
  svg.setAttribute("height", height);
  const world = document.createElementNS(svgNS, "g");
  world.setAttribute("class", "graph-world");
  const edgeLayer = document.createElementNS(svgNS, "g");
  edgeLayer.setAttribute("class", "graph-edges");
  const nodeLayer = document.createElementNS(svgNS, "g");
  nodeLayer.setAttribute("class", "graph-nodes");
  world.append(edgeLayer, nodeLayer);
  svg.append(world);
  container.replaceChildren(svg);

  const edgeEls = links.map(() => {
    const line = document.createElementNS(svgNS, "line");
    edgeLayer.append(line);
    return line;
  });
  const nodeEls = nodes.map((node) => {
    const group = document.createElementNS(svgNS, "g");
    group.setAttribute("class", "graph-node");
    group.dataset.index = node.i;
    const circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("r", node.r);
    const label = document.createElementNS(svgNS, "text");
    label.setAttribute("class", "graph-node__label");
    label.setAttribute("dy", node.r + 12);
    label.textContent = node.title;
    const hint = document.createElementNS(svgNS, "title");
    hint.textContent = node.tag ? `${node.title} · ${node.tag}` : node.title;
    group.append(circle, label, hint);
    nodeLayer.append(group);
    return group;
  });

  function draw() {
    for (let i = 0; i < links.length; i += 1) {
      const { a, b } = links[i];
      const line = edgeEls[i];
      line.setAttribute("x1", nodes[a].x);
      line.setAttribute("y1", nodes[a].y);
      line.setAttribute("x2", nodes[b].x);
      line.setAttribute("y2", nodes[b].y);
    }
    for (let i = 0; i < nodes.length; i += 1) nodeEls[i].setAttribute("transform", `translate(${nodes[i].x} ${nodes[i].y})`);
  }

  function run() {
    if (frame != null) return;
    const step = () => {
      frame = null;
      tick();
      draw();
      if (alpha > 0.004) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
  }
  const reheat = (value = 0.5) => {
    alpha = Math.max(alpha, value);
    run();
  };

  // ---- 悬停：点亮自己与邻居 ----
  let focused = -1;
  const focus = (i) => {
    if (focused === i) return;
    focused = i;
    svg.classList.toggle("is-focused", i >= 0);
    nodeEls.forEach((el, j) => el.classList.toggle("is-lit", i >= 0 && (j === i || neighbours[i].has(j))));
    links.forEach(({ a, b }, j) => edgeEls[j].classList.toggle("is-lit", i >= 0 && (a === i || b === i)));
  };

  // ---- 缩放与平移（viewBox 不动，改 world 的 transform） ----
  const view = { x: 0, y: 0, k: 1 };
  const applyView = () => world.setAttribute("transform", `translate(${view.x} ${view.y}) scale(${view.k})`);
  svg.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const px = ((event.clientX - rect.left) / rect.width) * width;
      const py = ((event.clientY - rect.top) / rect.height) * height;
      const factor = Math.exp(-event.deltaY * 0.0015);
      const k = Math.min(4, Math.max(0.35, view.k * factor));
      view.x = px - ((px - view.x) * k) / view.k;
      view.y = py - ((py - view.y) * k) / view.k;
      view.k = k;
      applyView();
    },
    { passive: false },
  );

  // ---- 指针：拖节点 / 拖空白平移 / 点击进入 ----
  let drag = null;
  const toWorld = (event) => {
    const rect = svg.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / rect.width) * width;
    const py = ((event.clientY - rect.top) / rect.height) * height;
    return { x: (px - view.x) / view.k, y: (py - view.y) / view.k, px, py };
  };
  svg.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    const target = event.target.closest?.(".graph-node");
    const point = toWorld(event);
    drag = target ? { node: nodes[Number(target.dataset.index)], moved: false, start: point } : { pan: true, start: point, origin: { x: view.x, y: view.y }, moved: false };
    if (drag.node) drag.node.fixed = true;
    svg.setPointerCapture(event.pointerId);
    svg.classList.add("is-dragging");
  });
  svg.addEventListener("pointermove", (event) => {
    if (!drag) {
      const target = event.target.closest?.(".graph-node");
      focus(target ? Number(target.dataset.index) : -1);
      return;
    }
    const point = toWorld(event);
    if (Math.hypot(point.px - drag.start.px, point.py - drag.start.py) > 3) drag.moved = true;
    if (drag.node) {
      drag.node.x = point.x;
      drag.node.y = point.y;
      reheat(0.3);
    } else {
      view.x = drag.origin.x + (point.px - drag.start.px);
      view.y = drag.origin.y + (point.py - drag.start.py);
      applyView();
    }
  });
  const endDrag = (event) => {
    if (!drag) return;
    const current = drag;
    drag = null;
    svg.classList.remove("is-dragging");
    if (current.node) {
      current.node.fixed = false;
      // 点一下（没拖动）就进文章
      if (!current.moved) window.location.href = current.node.url;
      else reheat(0.2);
    }
    if (event?.pointerId != null && svg.hasPointerCapture?.(event.pointerId)) svg.releasePointerCapture(event.pointerId);
  };
  svg.addEventListener("pointerup", endDrag);
  svg.addEventListener("pointercancel", endDrag);
  svg.addEventListener("pointerleave", () => {
    if (!drag) focus(-1);
  });

  // 先在后台跑一段再显示，第一帧就是摊开的图
  for (let i = 0; i < 200; i += 1) tick();
  draw();
  run();
}

function initGraph() {
  const container = document.getElementById("graph");
  if (!container?.dataset.src) return;
  fetch(container.dataset.src, { credentials: "same-origin" })
    .then((response) => {
      if (!response.ok) throw new Error(`graph: ${response.status}`);
      return response.json();
    })
    .then((data) => {
      if (!data?.nodes?.length) {
        container.innerHTML = '<p class="graph-caption">No linked writings yet.</p>';
        return;
      }
      createGraph(container, data);
    })
    .catch((error) => {
      console.warn(error);
      container.innerHTML = '<p class="graph-caption">The graph could not be loaded.</p>';
    });
}

runWhenActivated(initGraph);
