// Independent Node implementation of the publicly described HEYTEA wire format.
// Reference details and verification limits are documented in LOCAL-SETUP.md.
const crypto = require('node:crypto');
const { HEYTEA_API_BASE } = require('./heyteaConfig');
const protocolHeaders = Object.freeze({
  'Heytea-Secure-Transmission-Tenant': 'heyteago-android',
  'Heytea-Secure-Transmission-Version': '2',
  'X-client': 'app',
});
const aad = Buffer.from('heyteago-android_2');
const publicPoint = Buffer.from('04162ceeb164bbb1a47cfeec71883bb1442218250861befa47008544d33521167defb931f916ca701f6905e61da42c4d446e511f78ea0db8c02a114530acf5bde3', 'hex');
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();
function seal(key, value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-128-gcm', key.subarray(0,16), iv);
  cipher.setAAD(aad);
  return Buffer.concat([iv, cipher.update(JSON.stringify(value)), cipher.final(), cipher.getAuthTag()]).toString('base64');
}
function open(key, value) {
  if (typeof value !== 'string' || value.length > 1400000) throw new Error('安全传输响应格式错误');
  const raw = Buffer.from(value, 'base64');
  if (raw.length < 28) throw new Error('安全传输响应过短');
  const cipher = crypto.createDecipheriv('aes-128-gcm', key.subarray(0,16), raw.subarray(0,12));
  cipher.setAAD(aad); cipher.setAuthTag(raw.subarray(-16));
  return JSON.parse(Buffer.concat([cipher.update(raw.subarray(12,-16)), cipher.final()]).toString('utf8'));
}
function decodeEnvelope(key, input) {
  let result=input;
  if(result && typeof result.secure_encrypted_s_data==='string') result=open(key,result.secure_encrypted_s_data);
  if(!result || typeof result!=='object' || Array.isArray(result)) throw new Error('安全传输响应格式错误');
  result={...result};
  if(result.data && typeof result.data.secure_encrypted_s_data==='string') result.data=open(key,result.data.secure_encrypted_s_data);
  // Accept an explicitly represented numeric business code, never infer success from HTTP 200.
  if(typeof result.code==='string' && /^-?\d{1,10}$/.test(result.code)) result.code=Number(result.code);
  return result;
}
function createSecureTransport(http) {
  let session = null, pending = null;
  async function establish() {
    await http.get(`${HEYTEA_API_BASE}/api/_secure-transmission/tenant-config`, {headers:protocolHeaders});
    const exchange = crypto.createECDH('prime256v1');
    const clientPublic = exchange.generateKeys();
    const random = crypto.randomBytes(32);
    const signingKey = crypto.createHash('sha256').update(publicPoint.subarray(1)).digest();
    const {data} = await http.post(`${HEYTEA_API_BASE}/api/_secure-transmission/handshake`, {
      client_public_key:clientPublic.toString('base64'), client_random:random.toString('base64'),
      signature:hmac(signingKey, Buffer.concat([clientPublic,random])).toString('base64'),
    }, {headers:protocolHeaders});
    if (!data || typeof data.ticket !== 'string' || !/^[A-Za-z0-9._~+\/=\-]{1,8192}$/.test(data.ticket) || typeof data.server_random !== 'string') throw new Error('安全握手返回格式错误');
    const serverRandom=Buffer.from(data.server_random,'base64');
    const expiry=Number(data.expires_at)*1000;
    if(serverRandom.length!==32 || !Number.isFinite(expiry) || expiry<=Date.now()+60000) throw new Error('安全握手会话无效');
    return {key:hmac(exchange.computeSecret(publicPoint),Buffer.concat([random,serverRandom])),ticket:data.ticket,expiry};
  }
  async function getSession() {
    if(session && session.expiry>Date.now()+60000) return session;
    if(!pending) pending=establish().then(s=>(session=s)).finally(()=>{pending=null;});
    return pending;
  }
  return {
    async prepare(){ await getSession(); return {ok:true}; },
    async post(path, body, headers={}) {
      if(!['/api/service-member/openapi/vip/user/sms/verifiyCode/send','/api/service-login/openapi/vip/user/login_v1'].includes(path)) throw new Error('非允许的安全传输路径');
      const s=await getSession();
      const response=await http.post(HEYTEA_API_BASE+path,{secure_encrypted_c_data:seal(s.key,body)}, {headers:{...headers,...protocolHeaders,Cookie:`HeyteaSecureTransmissionTicket=${s.ticket}`}});
      response.data = decodeEnvelope(s.key,response.data);
      return response;
    },
  };
}
function loginSignature(path, timestamp) {
  return hmac(Buffer.from('qk6EZ2tLOQNunx5imqbgMYvDAqeR0txxet5Si6rEKsw=','base64'),`biz:user,url:${path.replace(/^\//,'')},timeStamp:${timestamp}`).toString('base64');
}
function imageSignature(bytes, timestamp) {
  const hash=crypto.createHash('sha256').update(bytes).digest('hex');
  const cipher=crypto.createCipheriv('aes-128-cbc',Buffer.from('2lJuL8jdH03oNIq5'),Buffer.from('HEYTEA6H7J8K9M0N'));
  return Buffer.concat([cipher.update(`${hash}#${timestamp}`),cipher.final()]).toString('hex');
}
module.exports={decodeEnvelope,createSecureTransport,protocolHeaders,seal,open,loginSignature,imageSignature};
