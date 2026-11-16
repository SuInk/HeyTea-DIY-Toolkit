const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, globals = {}) {
 const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../frontend/src/utils',file),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const context={exports:{},queueMicrotask,...globals};vm.createContext(context);vm.runInContext(code,context);return context.exports;
}
function browser() {
 const timers=new Map();let next=0,node=null,appends=0;
 const window={setTimeout:(fn)=>{timers.set(++next,fn);return next;},clearTimeout:id=>timers.delete(id)};
 const document={getElementById:()=>node,createElement:()=>({remove(){if(node===this)node=null;}}),body:{appendChild(s){node=s;appends++;}}};
 return {window,document,timers,get node(){return node;},get appends(){return appends;}};
}

test('only latest editor task can commit, including invalidation',async()=>{
 const gate=load('latest-task.ts').createLatestTask();
 const old=gate.begin(),current=gate.begin();
 assert.equal(old.isCurrent(),false);assert.equal(current.isCurrent(),true);
 gate.invalidate();assert.equal(current.isCurrent(),false);
 const after=gate.begin();assert.equal(after.isCurrent(),true);
});
test('captcha concurrent loading shares one promise, failure cleans up and allows retry',async()=>{
 const env=browser(),api=load('captcha.ts',env);
 const a=api.loadCaptchaScript(),b=api.loadCaptchaScript();assert.equal(a,b);assert.equal(env.appends,1);
 const rejected=assert.rejects(a,/加载失败/);env.node.onerror();await rejected;
 assert.equal(env.node,null);assert.equal(env.timers.size,0);
 const retry=api.loadCaptchaScript();assert.equal(env.appends,2);
 env.window.TencentCaptcha=function(){};env.node.onload();await retry;
 assert.equal(env.timers.size,0);
});
test('captcha load timeout is bounded and absent constructor is rejected',async()=>{
 const env=browser(),api=load('captcha.ts',env);
 let p=api.loadCaptchaScript(),rejected=assert.rejects(p,/超时/);
 [...env.timers.values()][0]();await rejected;assert.equal(env.node,null);
 p=api.loadCaptchaScript();rejected=assert.rejects(p,/不可用/);env.node.onload();await rejected;
 assert.equal(env.node,null);
});
test('captcha challenge cancellation, timeout and success all release SDK',async()=>{
 const env=browser();let callback,destroyed=0;
 env.window.TencentCaptcha=function(_,cb){callback=cb;this.show=()=>{};this.destroy=()=>{destroyed++;};};
 const api=load('captcha.ts',env);
 let p=api.requestCaptcha('offline');await Promise.resolve();let rejected=assert.rejects(p,/取消/);callback({ret:2});await rejected;
 p=api.requestCaptcha('offline');await Promise.resolve();rejected=assert.rejects(p,/超时/);[...env.timers.values()][0]();await rejected;
 p=api.requestCaptcha('offline');await Promise.resolve();callback({ret:0,ticket:'offline',randstr:'offline',appid:'offline'});assert.equal((await p).ret,0);
 await Promise.resolve();assert.equal(destroyed,3);assert.equal(env.timers.size,0);
});
