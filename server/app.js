const path = require('path');
const fs = require('fs');
const express = require('express');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');
const { imageMetadata, upstreamOptions } = require('./security');
const upstream = axios.create(upstreamOptions);
const { createSecureTransport, loginSignature, imageSignature } = require('./secureTransport');
const secure = createSecureTransport(upstream);

const { HEYTEA_API_BASE, HEYTEA_BASE_HEADERS, CUP_WIDTH, CUP_HEIGHT } = require('./heyteaConfig');
const { encryptHeyteaMobile, timestampSign, decryptResponseData } = require('./heyteaCrypto');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 200 * 1024, files: 1, fields: 4, parts: 5, fieldNameSize: 50, fieldSize: 8192 } });
const isVercel = Boolean(process.env.VERCEL);

// Local-only deployment: reject foreign origins and DNS-rebinding hosts.
app.use((req, res, next) => {
  if (!['127.0.0.1', 'localhost'].includes(req.hostname)) {
    return res.status(403).json({ message: 'Local access only' });
  }
  const origin = req.get('origin');
  if (origin && origin !== `http://${req.get('host')}`) {
    return res.status(403).json({ message: 'Same-origin access only' });
  }
  next();
});
app.use(express.json({ limit: '32kb', inflate: false }));

// Never log request payloads, tokens, user data or Axios request objects.
function logInfo(tag) { console.log(`[${new Date().toISOString()}][${tag}] OK`); }
function logError(tag) { console.error(`[${new Date().toISOString()}][${tag}] Failed`); }

let processGuardsRegistered = false;
function registerProcessGuards() {
  if (processGuardsRegistered) {
    return;
  }
  const isIgnorable = (error) => {
    if (!error || typeof error !== 'object') return false;
    return error.code === 'EPIPE' || error.code === 'ECONNRESET';
  };
  process.on('uncaughtException', (error) => {
    if (isIgnorable(error)) {
      logError('PROCESS', `捕获到可忽略的 ${error.code}，可能是客户端过早断开连接。`, error);
      return;
    }
    logError('PROCESS', '未捕获异常', error);
  });
  process.on('unhandledRejection', (reason) => {
    logError('PROCESS', '未处理的 Promise 拒绝', reason);
  });
  processGuardsRegistered = true;
}
registerProcessGuards();

function maskMobile(mobile = '') {
  return String(mobile).replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
}

function buildHeaders(currentPage, token) {
  if (!currentPage.startsWith('/pages/login/')) {
    return {'x-client':'app', 'x-client-version':'163', ...(token ? {Authorization:`Bearer ${token}`} : {})};
  }
  const headers = {
    ...HEYTEA_BASE_HEADERS,
    'current-page': currentPage,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function handleAxiosError(error, res) {
  if (error.response) {
    const status = error.response.status || 500;
    const message =
      error.response.data?.message || error.response.data?.msg || error.message || '请求失败';
    logError('AXIOS', `下游接口返回 ${status}: ${message}`);
    return res.status(status).json({ message });
  }
  logError('AXIOS', '请求失败', error);
  return res.status(500).json({ message: error.message || '未预期的错误' });
}

app.get('/api/health', (_, res) => {
  res.json({ ok: true, timestamp: Date.now(), env: isVercel ? 'vercel' : 'node' });
});

app.post('/api/sms/send', async (req, res) => {
  const { mobile, ticket, randstr } = req.body || {};
  if (typeof mobile !== 'string' || !/^1[3-9]\d{9}$/.test(mobile)) {
    return res.status(400).json({ message: '手机号必填' });
  }

  try {
    logInfo('SMS', '请求发送验证码', { mobile: maskMobile(mobile) });
    const payload = {
      client: 'app',
      brandId: '1000001',
      mobile: encryptHeyteaMobile(mobile),
      zone: '86',
      cryptoLevel: 2,
      ticketFrom: 'min',
    };

    if (ticket && randstr) {
      payload.ticket = ticket;
      payload.randstr = randstr;
    }

    const headers = buildHeaders('/pages/login/login_app/index');
    const { data } = await secure.post(
      '/api/service-member/openapi/vip/user/sms/verifiyCode/send',
      payload,
      headers
    );

    if (data.code === 4005021) {
      logInfo('SMS', '需要人机验证', { mobile: maskMobile(mobile) });
      return res.json({ requiresCaptcha: true, message: data.message });
    }

    if (typeof data.code !== 'number') {
      return res.status(502).json({ message: '发送状态未确认；若已收到验证码，可直接登录，请勿连续重发' });
    }

    if (data.code !== 0) {
      logError('SMS', `发送失败：${data.message}`);
      return res.status(400).json({ message: data.message || '验证码发送失败' });
    }

    logInfo('SMS', '验证码发送成功', { mobile: maskMobile(mobile) });
    res.json({ requiresCaptcha: false, message: '短信已发送' });
  } catch (error) {
    logError('SMS', '发送异常', error);
    handleAxiosError(error, res);
  }
});

app.post('/api/login/sms', async (req, res) => {
  const { mobile, smsCode } = req.body || {};
  if (typeof mobile !== 'string' || !/^1[3-9]\d{9}$/.test(mobile) || typeof smsCode !== 'string' || !/^\d{4,8}$/.test(smsCode)) {
    return res.status(400).json({ message: '手机号与验证码必填' });
  }

  try {
    const headers = buildHeaders('/pages/login/login_app/verify_code/index');
    const loginPath = '/api/service-login/openapi/vip/user/login_v1';
    const loginTime = String(Date.now());
    Object.assign(headers, {biz:'user', url:loginPath, timeStamp:loginTime, hmacStr:loginSignature(loginPath,loginTime)});
    const { data } = await secure.post(
      loginPath,
      {
        channel: 'A',
        client: 'app',
        loginType: 'APP_CODE',
        brand: '1000001',
        phone: encryptHeyteaMobile(mobile),
        email: null,
        smsCode,
        deviceId: require('node:crypto').randomUUID(),
        ticket: '',
        verifyTicket: '',
        zone: '86',
        cryptoLevel: 2,
        ticketFrom: 'min',
      },
      headers
    );

    if (data.code !== 0 || !data.data?.token) {
      logError('LOGIN', `登录失败：${data.message}`, { mobile: maskMobile(mobile) });
      return res.status(400).json({ message: data.message || '登录失败' });
    }

    logInfo('LOGIN', '短信登录成功', { mobile: maskMobile(mobile) });
    res.json({ token: data.data.token });
  } catch (error) {
    logError('LOGIN', '登录异常', error);
    handleAxiosError(error, res);
  }
});

app.get('/api/user', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.headers.authorization;

  if (!token) {
    return res.status(400).json({ message: '缺少授权 token' });
  }

  try {
    const headers = buildHeaders('/pages/my/index', token);
    const { data } = await upstream.get(
      `${HEYTEA_API_BASE}/api/service-member/vip/user/info`,
      { headers }
    );

    if (data.code !== 0) {
      logError('USER', `获取用户信息失败：${data.message}`);
      return res.status(400).json({ message: data.message || '获取用户信息失败' });
    }

    const user = decryptResponseData(data.data, true);
    logInfo('USER', '获取用户信息成功', {
      userId: user?.user_main_id,
      name: user?.name,
    });
    res.json({ user });
  } catch (error) {
    logError('USER', '获取用户信息异常', error);
    handleAxiosError(error, res);
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  const { token, userMainId, width = CUP_WIDTH, height = CUP_HEIGHT } = req.body || {};

  if (typeof token !== 'string' || !token || token.length > 8192 || /[\r\n]/.test(token) || !/^\d{1,30}$/.test(String(userMainId || ''))) {
    return res.status(400).json({ message: '缺少 token 或 userMainId' });
  }
  if (!req.file) {
    return res.status(400).json({ message: '缺少文件' });
  }

  const image = imageMetadata(req.file);
  if (!image) return res.status(400).json({ message: '只支持不超过 200KB 的 PNG/JPEG 图片' });

  try {
    const timestamp = Date.now();
    const sign = timestampSign(userMainId, timestamp);
    const headers = buildHeaders('/pages/diy/submit/index', token);
    delete headers['Content-Type'];
    headers['x-client-version'] = '163';

    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: image.filename,
      contentType: image.mime,
    });
    formData.append('width', String(CUP_WIDTH));
    formData.append('height', String(CUP_HEIGHT));
    formData.append('aiNos', '');
    formData.append('deviceType', 'PHONE');

    const target = `${HEYTEA_API_BASE}/api/service-cps/user/diy?sign=${sign}&t=${timestamp}&hash=${imageSignature(req.file.buffer,timestamp)}`;
    const { data } = await upstream.post(target, formData, {
      headers: {
        ...headers,
        ...formData.getHeaders(),
      },
    });

    if (data.code !== 0) {
      logError('UPLOAD', `上传失败：${data.message}`, { userMainId });
      return res.status(400).json({ message: data.message || '上传失败' });
    }

    logInfo('UPLOAD', '上传成功', { userMainId });
    res.json({ message: '上传成功', data: data.data });
  } catch (error) {
    logError('UPLOAD', '上传异常', error);
    handleAxiosError(error, res);
  }
});

const distDir = path.resolve(__dirname, '../frontend/dist');
if (!isVercel && fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    return res.sendFile(path.join(distDir, 'index.html'));
  });
}

// Do not emit parser stack traces or malformed request content.
app.use((error, req, res, next) => {
  const status = error instanceof multer.MulterError ? 400 : (error.status >= 400 && error.status < 500 ? error.status : 500);
  res.status(status).json({ message: status === 500 ? '服务处理失败' : '请求格式或大小不符合要求' });
});

module.exports = app;
