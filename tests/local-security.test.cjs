const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { imageMetadata, upstreamOptions } = require('../server/security');
const app = require('../server/app');

test('upload filename never inherits original name or MIME', () => {
  const image=imageMetadata({buffer:Buffer.from([137,80,78,71,13,10,26,10]),originalname:'x\"\r\nX-Test: bad',mimetype:'text/html'});
  assert.deepEqual(image,{filename:'cup.png',mime:'image/png'});
  assert.deepEqual(imageMetadata({buffer:Buffer.from([255,216,255,0])}),{filename:'cup.jpg',mime:'image/jpeg'});
  assert.equal(imageMetadata({buffer:Buffer.from('<html>')}),null);
  assert.equal(imageMetadata({buffer:Buffer.alloc(200*1024+1)}),null);
  assert.equal(imageMetadata({buffer:Buffer.alloc(0)}),null);
});
test('upstream requests have finite limits and no redirects', () => {
  assert.equal(upstreamOptions.maxRedirects,0);
  for(const key of ['timeout','maxContentLength','maxBodyLength']) assert.ok(Number.isFinite(upstreamOptions[key]) && upstreamOptions[key]>0);
  assert.equal(app.get('trust proxy'),false);
});
test('local endpoints reject foreign origins, invalid host and invalid JSON',async()=>{
 const server=app.listen(0,'127.0.0.1');
 await new Promise(r=>server.on('listening',r));
 const request=(path,headers={},body=null)=>new Promise((resolve,reject)=>{
   const req=http.request({hostname:'127.0.0.1',port:server.address().port,path,method:body===null?'GET':'POST',headers},res=>{
    let data='';res.on('data',c=>data+=c);res.on('end',()=>resolve({status:res.statusCode,data}));
   });req.on('error',reject);req.end(body);
 });
 try {
  assert.equal((await request('/api/health')).status,200);
  assert.equal((await request('/')).status,200);
  assert.equal((await request('/api/health',{Origin:'https://example.com'})).status,403);
  assert.equal((await request('/api/health',{Host:'example.com'})).status,403);
  assert.equal((await request('/api/user')).status,400);
  assert.equal((await request('/api/upload',{'Content-Type':'application/json'},'{bad')).status,400);
  assert.equal((await request('/api/upload',{'Content-Type':'application/json'},'{}')).status,400);
  assert.equal((await request('/api/upload',{'Content-Type':'application/json','Content-Encoding':'gzip'},'x')).status,415);
  assert.equal((await request('/api/upload',{'Content-Type':'application/json'},JSON.stringify({x:'a'.repeat(33000)}))).status,413);
 } finally {await new Promise(r=>server.close(r));}
});

test('secure transport authenticates ciphertext and restricts endpoints', async()=>{
 const crypto=require('node:crypto');
 const {seal,open,createSecureTransport,loginSignature,imageSignature}=require('../server/secureTransport');
 const key=crypto.randomBytes(32), value={test:'offline only'};
 const a=seal(key,value), b=seal(key,value);
 assert.notEqual(a,b); assert.deepEqual(open(key,a),value);
 const altered=Buffer.from(a,'base64'); altered[15]^=1;
 assert.throws(()=>open(key,altered.toString('base64')));
 assert.throws(()=>open(crypto.randomBytes(32),a));
 let calls=[];
 const http={get:async(u,o)=>{calls.push({u,o});return {data:{}};},post:async(u,body,o)=>{
  calls.push({u,body,o});
  if(u.endsWith('/handshake')) return {data:{server_random:crypto.randomBytes(32).toString('base64'),ticket:'offline-test-ticket',expires_at:Math.floor(Date.now()/1000)+3600}};
  return {data:{code:0,data:{}}};
 }};
 const client=createSecureTransport(http);
 await Promise.all([client.prepare(),client.prepare()]);
 assert.equal(calls.length,2);
 await assert.rejects(client.post('/api/other',{}));
 assert.equal(calls.length,2);
 await client.post('/api/service-member/openapi/vip/user/sms/verifiyCode/send',{test:'no mobile'});
 assert.deepEqual(Object.keys(calls[2].body),['secure_encrypted_c_data']);
 assert.equal(calls[2].o.headers['Heytea-Secure-Transmission-Version'],'2');
 assert.equal(calls[2].o.headers.Cookie,'HeyteaSecureTransmissionTicket=offline-test-ticket');
 assert.equal(Buffer.from(loginSignature('/test','1'),'base64').length,32);
 assert.match(imageSignature(Buffer.from('offline'),'1'),/^[0-9a-f]+$/);
});

test('SMS response decoding does not confuse encryption or string codes with failure',()=>{
 const {decodeEnvelope,seal}=require('../server/secureTransport');
 const key=require('node:crypto').randomBytes(32);
 assert.deepEqual(decodeEnvelope(key,{secure_encrypted_s_data:seal(key,{code:0,data:null})}),{code:0,data:null});
 assert.deepEqual(decodeEnvelope(key,{code:'0',data:{secure_encrypted_s_data:seal(key,{ok:true})}}),{code:0,data:{ok:true}});
 assert.equal(decodeEnvelope(key,{code:'4005021'}).code,4005021);
 assert.equal(decodeEnvelope(key,{code:401,message:'denied'}).code,401);
 assert.equal(decodeEnvelope(key,{}).code,undefined);
 assert.equal(decodeEnvelope(key,{code:'success'}).code,'success');
 assert.throws(()=>decodeEnvelope(key,null));
});

test('SMS UI holds one sending lock through challenge and preserves real errors',async()=>{
 const fs=require('node:fs'),vm=require('node:vm');
 const template=fs.readFileSync(require('node:path').join(__dirname,'../frontend/src/App.vue'),'utf8');
 const source=fs.readFileSync(require('node:path').join(__dirname,'../frontend/src/composables/useWorkbench.ts'),'utf8');
 assert.ok(template.includes('@click="handleSendCode()"')); 
 const handler=source.slice(source.indexOf('async function handleSendCode()'),source.indexOf('async function bindToken'));
 let resolveFirst,calls=0,challengeCalls=0;const notices=[];
 const ctx={isSendingCode:{value:false},countdown:{value:0},phone:{value:'13800000000'},CAPTCHA_APP_ID:'offline',
 sendSmsCode:async()=>{calls++; if(calls===1)return new Promise(r=>{resolveFirst=r;});return {requiresCaptcha:false};},
 requestCaptcha:async()=>{challengeCalls++;assert.equal(ctx.isSendingCode.value,true);return {ticket:'offline',randstr:'offline'};},
 startCountdown:()=>{ctx.countdown.value=60;},showSuccessMessage:m=>notices.push(['ok',m]),showErrorMessage:m=>notices.push(['error',m]),getErrorMessage:(e,f)=>e.message||f};
 vm.createContext(ctx);vm.runInContext(handler,ctx);
 const first=ctx.handleSendCode(); await ctx.handleSendCode(); assert.equal(calls,1);
 resolveFirst({requiresCaptcha:true});await first;
 assert.equal(calls,2);assert.equal(challengeCalls,1);assert.equal(ctx.isSendingCode.value,false);assert.equal(notices[0][0],'ok');
 ctx.countdown.value=0;ctx.sendSmsCode=async()=>{throw new Error('official denial');};await ctx.handleSendCode();
 assert.deepEqual(notices[1],['error','official denial']);assert.equal(ctx.isSendingCode.value,false);
});
