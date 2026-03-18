module.exports = (hexo) => {
  hexo.extend.filter.register(
    "after_post_render",
    async (data) => {
      const password = data.password;
      if (!password && password !== 0) return data;

      const passphrase = String(password);
      const __ = hexo.theme.i18n.__(hexo.config.language);

      const { Encrypter } = await import("age-encryption");
      const e = new Encrypter();
      e.setPassphrase(passphrase);
      const encrypted = await e.encrypt(data.content);
      const base64 = Buffer.from(encrypted).toString("base64");

      data.content = `
<div class="encrypted-content" id="encrypted-article">
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
