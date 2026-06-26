function getCacheKey() {
  return `gnix-encrypt:${location.pathname}`;
}

function b64ToBytes(base64) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function deriveKey(password, salt) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
}

async function decryptPayload(password, base64) {
  const data = b64ToBytes(base64);
  const salt = data.slice(0, 16);
  const iv = data.slice(16, 28);
  const ciphertext = data.slice(28);
  const key = await deriveKey(password, salt);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plain);
}

function buildToc() {
  const tocContainer = document.getElementById("icarus-toc-container");
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
  container.outerHTML = html;
  localStorage.setItem(getCacheKey(), password);
  buildToc();
  document.dispatchEvent(new CustomEvent("gnix:decrypted-content-ready"));
}

function showError(container) {
  const form = container.querySelector("#encrypt-form");
  let el = form.querySelector(".encrypt-error");
  if (!el) {
    el = document.createElement("p");
    el.className = "encrypt-error";
    form.appendChild(el);
  }
  el.textContent = container.dataset.errorMessage || "Wrong password, please try again";
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

function init() {
  const container = document.getElementById("encrypted-article");
  if (!container) return;
  const cached = localStorage.getItem(getCacheKey());
  if (cached) {
    tryDecrypt(container, cached);
    return;
  }
  const form = container.querySelector("#encrypt-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const pw = container.querySelector("#encrypt-pass")?.value.trim();
      if (pw) tryDecrypt(container, pw);
    });
  }
  const input = container.querySelector("#encrypt-pass");
  if (input) input.focus();
}

(window.__gnixPrerender?.runWhenActivated || ((callback) => callback()))(init);
