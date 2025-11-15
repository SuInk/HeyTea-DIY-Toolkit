const HEYTEA_API_BASE = "https://app-go.heytea.com";
const HEYTEA_BASE_HEADERS = {
  Accept: "application/prs.heytea.v1+json",
  "Content-Type": "application/json",
  "x-client-version": "4.0.1",
  "client-version": "4.0.1",
  version: "4.0.1",
  "x-region-id": "10",
  region: "1",
  "x-client": "app",
  client: "2",
  "x-version": "4.0.1",
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 16; 2410DPN6CC Build/BP2A.250605.031.A3; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/86.0.4240.99 XWEB/4433 MMWEBSDK/20220904 Mobile Safari/537.36",
};
const CAPTCHA_APP_ID = "197451715";
const CUP_WIDTH = 596;
const CUP_HEIGHT = 832;
module.exports = {
  HEYTEA_API_BASE,
  HEYTEA_BASE_HEADERS,
  CAPTCHA_APP_ID,
  CUP_WIDTH,
  CUP_HEIGHT,
};
