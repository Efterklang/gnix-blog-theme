const crypto = require("node:crypto");

const ITERATIONS = 100_000;

function escapeAttribute(value) {
  return String(value).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

module.exports = (hexo) => {
  hexo.extend.filter.register(
    "after_post_render",
    (data) => {
      const password = data.password;
      if (!password && password !== 0) return data;

      const passphrase = String(password);
      const __ = hexo.theme.i18n.__(data.lang || data.language || hexo.config.language);

      const salt = crypto.randomBytes(16);
      const iv = crypto.randomBytes(12);
      const key = crypto.pbkdf2Sync(passphrase, salt, ITERATIONS, 32, "sha256");
      const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
      const encrypted = Buffer.concat([cipher.update(data.content, "utf8"), cipher.final()]);
      const tag = cipher.getAuthTag();
      const base64 = Buffer.concat([salt, iv, encrypted, tag]).toString("base64");

      data.content = `
<div class="encrypted-content" id="encrypted-article" data-error-message="${escapeAttribute(__("encrypt.error"))}">
  <div class="encrypted-data" style="display:none">${base64}</div>
  <form class="encrypt-form" id="encrypt-form">
    <p class="encrypt-message">${__("encrypt.message")}</p>
    <div class="encrypt-input-wrap">
      <input type="password" id="encrypt-pass" placeholder="${__("encrypt.placeholder")}" enterkeyhint="done" autocomplete="off" />
    </div>
  </form>
</div>`;

      data.excerpt = `<p>${__("encrypt.abstract")}</p>`;
      data.more = "";
      data.encrypt = true;

      return data;
    },
    1000,
  );
};
