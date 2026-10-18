import { decryptPayload, GARDEN_PASSWORD_KEY, POST_PASSWORD_PREFIX, readStoredPassword, storePassword } from "./crypto.js";

function getCacheKey() {
  return `${POST_PASSWORD_PREFIX}${location.pathname}`;
}

function buildToc() {
  const tocContainer = document.getElementById("toc");
  if (!tocContainer) return;
  const headings = document.querySelectorAll(".content h1[id], .content h2[id], .content h3[id], .content h4[id], .content h5[id], .content h6[id]");
  if (!headings.length) return;
  const ol = document.createElement("ol");
  ol.className = "toc";
  for (const h of headings) {
    const li = document.createElement("li");
    li.className = `toc-item toc-level-${h.tagName[1]}`;
    const a = document.createElement("a");
    a.className = "toc-link";
    a.href = `#${h.id}`;
    const span = document.createElement("span");
    span.className = "toc-text";
    span.textContent = h.textContent;
    a.appendChild(span);
    li.appendChild(a);
    ol.appendChild(li);
  }
  const insert = tocContainer.querySelector("#toc-insert");
  if (insert) {
    insert.innerHTML = "";
    insert.appendChild(ol);
  }
  tocContainer.style.display = "";
}

async function decrypt(container, password) {
  const base64 = container.querySelector(".encrypted-data").textContent.trim();
  const html = await decryptPayload(password, base64);
  // 经 innerHTML / outerHTML 插入的 <script> 不会执行：内容进入文档后，把其中的脚本换成
  // 新建的 script 节点，文中组件的模块脚本（如 /js/components/video-player.js）才会加载
  const template = document.createElement("template");
  template.innerHTML = html;
  const inertScripts = Array.from(template.content.querySelectorAll("script"));
  container.replaceWith(template.content);
  for (const inert of inertScripts) {
    const script = document.createElement("script");
    for (const { name, value } of inert.attributes) script.setAttribute(name, value);
    script.textContent = inert.textContent;
    inert.replaceWith(script);
  }
  storePassword(getCacheKey(), password);
  buildToc();
  document.dispatchEvent(new CustomEvent("gnix:decrypted-content-ready"));
}

function showError(container) {
  const form = container.querySelector("#encrypt-form");
  let el = form.querySelector(".gate__error");
  if (!el) {
    el = document.createElement("p");
    el.className = "gate__error";
    el.setAttribute("role", "alert");
    form.appendChild(el);
  }
  el.textContent = container.dataset.errorMessage || "Wrong password, please try again";
  const input = container.querySelector("#encrypt-pass");
  if (input) {
    input.value = "";
    input.focus();
  }
}

async function attempt(container, password, { silent = false } = {}) {
  try {
    await decrypt(container, password);
    return true;
  } catch {
    // 自动尝试（本地记住的密码）失败时不报错：读者什么都没输，弹「密码错误」只会让人困惑
    if (!silent) showError(container);
    return false;
  }
}

function init() {
  const container = document.getElementById("encrypted-article");
  if (!container) return;
  const form = container.querySelector("#encrypt-form");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const pw = container.querySelector("#encrypt-pass")?.value.trim();
      if (pw) attempt(container, pw);
    });
  }

  // 归档页「秘密花园」里输过的密码同样适用：先试本页记住的，再试花园的
  const candidates = [readStoredPassword(getCacheKey()), readStoredPassword(GARDEN_PASSWORD_KEY)].filter(
    (value, index, list) => value && list.indexOf(value) === index,
  );

  if (!candidates.length) {
    container.querySelector("#encrypt-pass")?.focus();
    return;
  }

  (async () => {
    for (const password of candidates) {
      if (await attempt(container, password, { silent: true })) return;
    }
    // 全部落空（比如密码改过）：清掉本页失效的记忆，直接把输入框交给读者
    storePassword(getCacheKey(), null);
    container.querySelector("#encrypt-pass")?.focus();
  })();
}

(window.__gnixPrerender?.runWhenActivated || ((callback) => callback()))(init);
