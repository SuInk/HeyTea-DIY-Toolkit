const CryptoJS = require("crypto-js");
const MOBILE_KEY = CryptoJS.enc.Utf8.parse("23290CFFBB5D39B8");
const RESPONSE_KEY_APP = CryptoJS.enc.Utf8.parse("F61niK84bDQAsVHy");
const RESPONSE_KEY_WEAPP = CryptoJS.enc.Utf8.parse("ByOCfgNpMRKtwWhJ");
const IV = CryptoJS.enc.Utf8.parse("HEYTEA1A2B3C4D5E");
const ENCRYPTION_PREFIX = "HEYTEA_ENCRYPTION_TRANSMISSION";
const SIGN_SALT = "r5YWPjgSGAT2dbOJzwiDBK";
function encryptHeyteaMobile(mobile) {
  const data = CryptoJS.enc.Utf8.parse(String(mobile).trim());
  const encrypted = CryptoJS.AES.encrypt(data, MOBILE_KEY, {
    iv: IV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  return CryptoJS.enc.Base64.stringify(encrypted.ciphertext);
}
function timestampSign(userMainId, timestamp) {
  const raw = `${SIGN_SALT}${userMainId}${timestamp}`;
  return CryptoJS.MD5(raw).toString();
}
function decryptResponseData(payload, isApp = false) {
  if (typeof payload !== "string" || !payload.startsWith(ENCRYPTION_PREFIX)) {
    return payload;
  }
  const base64Body = payload.slice(ENCRYPTION_PREFIX.length);
  const encrypted = CryptoJS.enc.Base64.parse(base64Body);
  const key = isApp ? RESPONSE_KEY_APP : RESPONSE_KEY_WEAPP;
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: encrypted,
  });
  const decrypted = CryptoJS.AES.decrypt(cipherParams, key, {
    iv: IV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });
  const text = CryptoJS.enc.Utf8.stringify(decrypted);
  return JSON.parse(text);
}
module.exports = { encryptHeyteaMobile, timestampSign, decryptResponseData };
