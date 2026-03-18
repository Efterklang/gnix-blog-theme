import { Decrypter } from "age-encryption";

function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getCacheKey() {
  return `gnix-encrypt:${location.pathname}`;
}

function buildToc() {
  const tocContainer = document.getElementById("icarus-toc-container");
  if (!tocContainer) return;

  const headings = document.querySelectorAll(".content h1[id], .content h2[id], .content h3[id], .content h4[id], .content h5[id], .content h6[id]");
  if (!headings.length) return;

  const ol = document.createElement("ol");
  ol.className = "toc";

  for (const heading of headings) {
    const level = parseInt(heading.tagName[1]);
    const li = document.createElement("li");
    li.className = `toc-item toc-level-${level}`;

    const a = document.createElement("a");
    a.className = "toc-link";
    a.href = `#${heading.id}`;

    const span = document.createElement("span");
    span.className = "toc-text";
    span.textContent = heading.textContent;

    a.appendChild(span);
    li.appendChild(a);
    ol.appendChild(li);
  }

  const tocInsert = tocContainer.querySelector("#toc-insert");
  if (tocInsert) {
    tocInsert.innerHTML = "";
    tocInsert.appendChild(ol);
  }

  tocContainer.style.display = "";
}

async function decrypt(container, password) {
  const dataEl = container.querySelector(".encrypted-data");
  const base64 = dataEl.textContent.trim();
  const encrypted = base64ToUint8Array(base64);

  const d = new Decrypter();
  d.addPassphrase(password);
  const html = await d.decrypt(encrypted, "text");

  // Replace container content with decrypted HTML
  container.outerHTML = html;

  // Cache password
  localStorage.setItem(getCacheKey(), password);

  // Show deferred comment section
  const commentWrapper = document.getElementById("comment-deferred");
  if (commentWrapper) {
    commentWrapper.style.display = "";
  }

  // Build TOC from decrypted headings
  buildToc();

  // Re-initialize page components (medium-zoom, code highlight, etc.)
  if (typeof window.initPage === "function") window.initPage();

  // Add relock button
  addRelockButton();
}

function addRelockButton() {
  const article = document.querySelector(".article");
  if (!article) return;
  const existing = article.querySelector(".encrypt-relock");
  if (existing) return;

  const btn = document.createElement("button");
  btn.className = "encrypt-relock";
  btn.textContent = document.documentElement.lang === "zh-CN" ? "重新锁定" : "Re-lock";
  btn.addEventListener("click", () => {
    localStorage.removeItem(getCacheKey());
    location.reload();
  });
  article.appendChild(btn);
}

function showError(container) {
  const form = container.querySelector("#encrypt-form");
  let errEl = form.querySelector(".encrypt-error");
  if (!errEl) {
    errEl = document.createElement("p");
    errEl.className = "encrypt-error";
    form.appendChild(errEl);
  }
  const isZh = document.documentElement.lang === "zh-CN";
  errEl.textContent = isZh ? "密码错误，请重试" : "Wrong password, please try again";
  const input = container.querySelector("#encrypt-pass");
  if (input) {
    input.value = "";
    input.focus();
  }
}

async function tryDecrypt(container, password) {
  try {
    await decrypt(container, password);
  } catch {
    showError(container);
  }
}

function bindEvents(container) {
  const form = container.querySelector("#encrypt-form");
  if (!form) return;
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = container.querySelector("#encrypt-pass");
    const password = input?.value.trim();
    if (password) tryDecrypt(container, password);
  });
}

function init() {
  const container = document.getElementById("encrypted-article");
  if (!container) return;

  // Check localStorage cache
  const cached = localStorage.getItem(getCacheKey());
  if (cached) {
    tryDecrypt(container, cached);
    return;
  }

  bindEvents(container);
  const input = container.querySelector("#encrypt-pass");
  if (input) input.focus();
}

// Module scripts are deferred, DOM is ready when this runs
init();

// Swup compatibility
if (window.swup) {
  window.swup.hooks.on("page:view", init);
}
