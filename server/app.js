const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

const { HEYTEA_API_BASE, HEYTEA_BASE_HEADERS, CUP_WIDTH, CUP_HEIGHT } = require('./heyteaConfig');
const { encryptHeyteaMobile, timestampSign, decryptResponseData } = require('./heyteaCrypto');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });
const isVercel = Boolean(process.env.VERCEL);

app.use(cors({ origin: true }));
app.use(express.json({ limit: '5mb' }));
app.use(morgan('dev'));

function logInfo(tag, message, extra) {
  const ts = new Date().toISOString();
  if (extra !== undefined) {
    console.log(`[${ts}][${tag}] ${message}`, extra);
  } else {
    console.log(`[${ts}][${tag}] ${message}`);
  }
}

function logError(tag, message, error) {
  const ts = new Date().toISOString();
  if (error) {
    console.error(`[${ts}][${tag}] ${message}`, error);
  } else {
    console.error(`[${ts}][${tag}] ${message}`);
  }
}

function maskMobile(mobile = '') {
  return String(mobile).replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
}

function buildHeaders(currentPage, token) {
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
  if (!mobile) {
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
    const { data } = await axios.post(
      `${HEYTEA_API_BASE}/api/service-member/openapi/vip/user/sms/verifiyCode/send`,
      payload,
      { headers }
    );

    if (data.code === 4005021) {
      logInfo('SMS', '需要人机验证', { mobile: maskMobile(mobile) });
      return res.json({ requiresCaptcha: true, message: data.message });
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
  if (!mobile || !smsCode) {
    return res.status(400).json({ message: '手机号与验证码必填' });
  }

  try {
    const headers = buildHeaders('/pages/login/login_app/verify_code/index');
    const { data } = await axios.post(
      `${HEYTEA_API_BASE}/api/service-login/openapi/vip/user/login_v1`,
      {
        channel: 'A',
        client: 'app',
        loginType: 'APP_CODE',
        brand: '1000001',
        phone: encryptHeyteaMobile(mobile),
        email: null,
        smsCode,
        zone: '86',
        cryptoLevel: 2,
        ticketFrom: 'min',
      },
      { headers }
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
    : req.headers.authorization || req.query.token;

  if (!token) {
    return res.status(400).json({ message: '缺少授权 token' });
  }

  try {
    const headers = buildHeaders('/pages/my/index', token);
    const { data } = await axios.get(
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

  if (!token || !userMainId) {
    return res.status(400).json({ message: '缺少 token 或 userMainId' });
  }
  if (!req.file) {
    return res.status(400).json({ message: '缺少文件' });
  }

  try {
    const timestamp = Date.now();
    const sign = timestampSign(userMainId, timestamp);
    const headers = buildHeaders('/pages/diy/submit/index', token);
    delete headers['Content-Type'];

    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname || 'cup.png',
      contentType: req.file.mimetype || 'image/png',
    });
    formData.append('width', String(width || CUP_WIDTH));
    formData.append('height', String(height || CUP_HEIGHT));

    const target = `${HEYTEA_API_BASE}/api/service-cps/user/diy?sign=${sign}&t=${timestamp}`;
    const { data } = await axios.post(target, formData, {
      headers: {
        ...headers,
        ...formData.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
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

module.exports = app;
