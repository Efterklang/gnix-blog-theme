/**
 * 加密文章：front-matter 写 `encrypt: true` 即由本模块在构建期用 AES-256-GCM 加密正文，
 * 密码取主题配置的 encrypt.password（`password: xxx` 是旧写法，继续认作加密标记）。
 * 加密载荷为 salt | iv | ciphertext | tag 的 base64，客户端解密见 source/js/crypto.js
 * @module hexo/encrypt
 */
const crypto = require("node:crypto");

const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

// 已加密正文的哨兵：同一进程里二次渲染（hexo s 热更新、重复 generate）时据此跳过，
// 否则会把占位表单再加密一层
const ENCRYPTED_MARKER = 'id="encrypted-article"';

function escapeAttribute(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** 文章是否加密。加密文章不进任何公开列表（归档、首页、搜索索引、站点地图、feed、.md 直出） */
function isEncrypted(post) {
  if (!post) return false;
  return post.encrypt === true || Boolean(post.password || post.password === 0);
}

function getPassword(hexo) {
  const configured = hexo.theme.config.encrypt?.password;
  if (configured === undefined || configured === null || configured === "") return null;
  return String(configured);
}

/** 与 source/js/crypto.js 一一对应的加密：密钥由 PBKDF2-SHA256 迭代 100000 次派生 */
function encryptPayload(plaintext, passphrase) {
  const salt = crypto.randomBytes(SALT_BYTES);
  const iv = crypto.randomBytes(IV_BYTES);
  const key = crypto.pbkdf2Sync(passphrase, salt, ITERATIONS, 32, "sha256");
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([salt, iv, body, cipher.getAuthTag()]).toString("base64");
}

module.exports = (hexo) => {
  // 「秘密花园」的文章清单在构建期整体加密后随页面下发：解锁前页面源码里只有密文，
  // 标题与链接都不外泄；解不开就是密码不对，不必再存一份校验值
  hexo.extend.helper.register("encrypt_payload", (plaintext) => {
    const password = getPassword(hexo);
    if (!password || typeof plaintext !== "string" || !plaintext) return null;
    return encryptPayload(plaintext, password);
  });

  hexo.extend.filter.register(
    "after_post_render",
    (data) => {
      if (!isEncrypted(data)) return data;
      if (typeof data.content === "string" && data.content.includes(ENCRYPTED_MARKER)) return data;

      const __ = hexo.theme.i18n.__(data.lang || data.language || hexo.config.language);
      const password = getPassword(hexo);

      if (!password) {
        // 标了加密却没配密码：失败要往「关」的方向倒——正文只留一句提示，绝不原样输出
        hexo.log.error("[gnix] %s 标记了加密，但主题配置缺少 encrypt.password，正文已置为占位内容", data.source);
        data.content = `<div class="encrypted-content"><p class="gate__message">${__("encrypt.unconfigured")}</p></div>`;
        // 摘要不覆盖：加密文章也带着自己 front-matter 里写的 excerpt
        data.more = "";
        data.encrypt = true;
        return data;
      }

      const base64 = encryptPayload(data.content, password);

      // 门禁表单与归档页「秘密花园」共用 default.css 的 .gate 语汇：无边框、mono 标记 + 强调色
      data.content = `
<div class="encrypted-content" id="encrypted-article" data-error-message="${escapeAttribute(__("encrypt.error"))}">
  <div class="encrypted-data" style="display:none">${base64}</div>
  <form class="gate" id="encrypt-form" autocomplete="off">
    <p class="gate__message">${__("encrypt.message")}</p>
    <div class="gate__field">
      <span class="gate__mark" aria-hidden="true">✳</span>
      <input class="gate__input" type="password" id="encrypt-pass" placeholder="${escapeAttribute(__("encrypt.placeholder"))}" aria-label="${escapeAttribute(__("encrypt.placeholder"))}" enterkeyhint="done" autocomplete="off" />
      <button class="gate__submit" type="submit">${__("encrypt.unlock")}</button>
    </div>
  </form>
</div>`;

      data.more = "";
      data.encrypt = true;

      return data;
    },
    1000,
  );
};

// 供构建侧脚本与自检使用（加密格式须与 source/js/crypto.js 严格对应）
module.exports.isEncrypted = isEncrypted;
module.exports.encryptPayload = encryptPayload;
