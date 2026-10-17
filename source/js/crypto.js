/**
 * 加密正文与「秘密花园」清单共用的解密内核：构建期用 AES-256-GCM 加密，载荷是
 * salt(16) | iv(12) | ciphertext | tag 的 base64，密钥由 PBKDF2-SHA256 迭代 100000 次派生
 * （构建侧见 include/hexo/encrypt.js）。文章页 decrypt.js 与归档页 archive.js 共用本模块，
 * 避免两份实现各自漂移
 * @module js/crypto
 */

const SALT_BYTES = 16;
const IV_BYTES = 12;
const ITERATIONS = 100000;

// 解开的密码记在本地：花园与文章页共用同一个键，花园里输过一次，点进文章就不必再输
export const GARDEN_PASSWORD_KEY = "gnix-garden-password";
export const POST_PASSWORD_PREFIX = "gnix-encrypt:";

function b64ToBytes(base64) {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function deriveKey(password, salt) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
}

/** 解不开就抛错（GCM 会校验认证标签），调用侧据此判定密码不对 */
export async function decryptPayload(password, base64) {
  const data = b64ToBytes(base64);
  const salt = data.slice(0, SALT_BYTES);
  const iv = data.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const ciphertext = data.slice(SALT_BYTES + IV_BYTES);
  const key = await deriveKey(password, salt);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plain);
}

export async function decryptJson(password, base64) {
  return JSON.parse(await decryptPayload(password, base64));
}

export function readStoredPassword(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function storePassword(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // 隐私模式下不可写：记住密码是可选项，写不进去不影响本次解锁
  }
}

/** 锁定花园时一并清掉文章页记住的密码，否则「锁定」之后已读过的文章仍是开的 */
export function forgetPasswords() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (key === GARDEN_PASSWORD_KEY || key.startsWith(POST_PASSWORD_PREFIX)) localStorage.removeItem(key);
    }
  } catch {
    // 同上
  }
}
