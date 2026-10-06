const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {build}=require('../scripts/build.cjs');
build({development:true});
build();

test('supplied defaults and retired auto shed migrate without automatic trimming',()=>{
 const g=game({shed:1,best:100,chips:20});
 assert.equal(g.run('DEFAULT_BALANCE.startLength'),4);assert.equal(g.run('DEFAULT_BALANCE.snakeBase'),.22);assert.equal(g.run('DEFAULT_BALANCE.snakeStep'),.008);
 assert.deepEqual(['armor','combo','bomb','echo','cutter'].map(id=>g.run(`permanentCost("${id}")`)),[40,100,300,800,1000]);
 assert.equal(g.run('typeof updateShedding'),'undefined');assert.equal(g.run('Object.hasOwn(meta,"shed")'),false);
 g.run('init();openLab()');assert.ok(!g.el('#modalContent').innerHTML.includes('オート・シェッド'));
 g.run('openSettings()');assert.ok(!g.el('#modalContent').innerHTML.includes('オート・シェッド'));
 const legacy=g.run('JSON.stringify({version:1,balance:{...DEFAULT_BALANCE,foodPoints:27,shedCost:600,shedThreshold:18,shedInterval:8,shedAmount:2}})');
 const loaded=game({shed:1},legacy);assert.equal(loaded.run('balance.foodPoints'),27);
 assert.equal(loaded.run('Object.keys(balance).some(key=>key.startsWith("shed"))'),false);
 loaded.run('init();state="playing";fx=false;tick=-1000;enemyTick=-1000;shootCD=1000;blocks=[];enemies=[];food=[];snake=Array.from({length:30},(_,i)=>({x:i%W,y:Math.floor(i/W)}));update(8)');
 assert.equal(loaded.run('snake.length'),30);
});

test('help explains live score, chain and chip rules without individual upgrade descriptions',()=>{
 const g=game({combo:2});g.run('saveBalance({...DEFAULT_BALANCE,foodPoints:20,enemyPoints:70,blockPoints:35});init();mut.gold=2;mut.combo=1;state="playing";openHelp()');
 const help=g.el('#modalContent').innerHTML;
 for(const text of ['通常エサは20点','金エサは60点','得点補正は×1.8','4.5秒','上限は×25','22チップ','進行中のランは保存されず'])assert.ok(help.includes(text),text);
 for(const u of g.run('[...upgrades,...permanentUpgrades]'))assert.ok(!help.includes(u.name));
 assert.equal(g.run('state'),'paused');
 g.run('score=1250;wave=5;state="playing";finish()');assert.equal(g.run('meta.chips'),22);
});

test('only highlighted tail can be cut from impact, with short-run status hidden',()=>{
 const g=game({cutter:1});g.run('init();state="playing";fx=false;food=[];blocks=[];enemies=[];snake=Array.from({length:21},(_,x)=>({x,y:8}));cutterCharge=12');
 assert.equal(g.run('tailCutStart()'),16);
 g.drawCalls.length=0;g.run('drawSnake(true);drawArenaStatus()');
 assert.equal(g.drawCalls.filter(c=>c.op==='fillRect'&&c.color==='#b4e4be').length,5);
 assert.ok(g.drawCalls.some(c=>c.op==='fillText'&&c.args[0]==='CUT READY'));
 g.run('bullets=[{x:15.5,y:7.5,dx:0,dy:1,life:2,pierce:0}];updateBullets(.05)');
 assert.equal(g.run('snake.length'),21);assert.equal(g.run('cutterCharge'),12);
 g.run('bullets=[{x:18.5,y:7.5,dx:0,dy:1,life:2,pierce:0}];updateBullets(.05)');
 assert.equal(g.run('snake.length'),18);assert.equal(g.run('snake.at(-1).x'),17);assert.equal(g.run('cutterCharge'),0);
 g.run('snake=Array.from({length:20},(_,x)=>({x,y:8}));cutterCharge=12');
 g.drawCalls.length=0;g.run('drawSnake(true);drawArenaStatus()');
 assert.ok(!g.drawCalls.some(c=>c.color==='#b4e4be'));
 assert.ok(!g.drawCalls.some(c=>c.op==='fillText'&&c.args[0].startsWith('CUT')));
 g.run('snake.push({x:20,y:8});cutterCharge=11');
 g.drawCalls.length=0;g.run('drawSnake(true);drawArenaStatus()');
 assert.ok(!g.drawCalls.some(c=>c.color==='#b4e4be'));
 assert.ok(g.drawCalls.some(c=>c.op==='fillText'&&c.args[0]==='CUT 11/12'));
});

test('tail cutter charges only from food, stores one use and applies next run',()=>{
 const g=game({chips:999});g.run('init()');assert.equal(g.run('buyPermanent("cutter")'),false);
 g.run('meta.chips=1000');assert.equal(g.run('buyPermanent("cutter")'),true);assert.equal(g.run('runMeta.cutter'),0);
 assert.equal(g.run('buyPermanent("cutter")'),false);
 g.run('init();state="playing";fx=false;mut.chain=1;food=[{x:2,y:2},{x:2,y:3},{x:3,y:3}];collect(food[0])');
 assert.equal(g.run('cutterCharge'),3);
 for(let i=0;i<20;i++)g.run('food=[{x:2,y:2}];collect(food[0])');
 assert.equal(g.run('cutterCharge'),12);
 g.run('state="upgrade";advanceWave(0)');assert.equal(g.run('cutterCharge'),12);
 g.run('resetPermanent()');assert.equal(g.run('meta.cutter'),0);assert.equal(g.run('runMeta.cutter'),1);
 g.run('restorePermanent()');assert.equal(g.run('meta.cutter'),1);
 g.run('init()');assert.equal(g.run('cutterCharge'),0);
 g.storage.set('snake-overdrive-upgrade-backup-v1',JSON.stringify({armor:0,combo:0,bomb:0,echo:0,shed:0}));assert.equal(g.run('permanentBackup().cutter'),0);
});

test('tail cutter uses swept hits, caps cuts, consumes piercing bullet and cannot loop without recovery',()=>{
 const g=game({cutter:1});g.run('init();state="playing";fx=false;snake=Array.from({length:21},(_,x)=>({x,y:8}));blocks=[];enemies=[];food=[];cutterCharge=12;score=123;chain=4;eaten=7;bullets=[{x:16.5,y:6.5,dx:0,dy:1,life:2,pierce:5}];updateBullets(.15)');
 assert.equal(g.run('snake.length'),16);assert.equal(g.run('bullets.length'),0);assert.equal(g.run('cutterCharge'),0);
 assert.equal(g.run('score'),123);assert.equal(g.run('chain'),4);assert.equal(g.run('eaten'),7);assert.equal(g.run('food.length'),0);assert.equal(g.run('hearts'),2);
 for(let i=0;i<10;i++)g.run('snake=Array.from({length:21},(_,x)=>({x,y:8}));bullets=[{x:16.5,y:7.5,dx:0,dy:1,life:2,pierce:0}];updateBullets(.05)');
 assert.equal(g.run('snake.length'),21);assert.equal(g.run('cutterCharge'),0);
 g.run('cutterCharge=12;bullets=[{x:16.5,y:7.5,dx:0,dy:1,life:2,pierce:3},{x:17.5,y:7.5,dx:0,dy:1,life:2,pierce:3}];updateBullets(.05)');
 assert.equal(g.run('snake.length'),16);assert.equal(g.run('bullets.length'),1);
 g.run('snake=Array.from({length:21},(_,x)=>({x,y:8}));cutterCharge=12;bullets=[{x:20.5,y:7.5,dx:0,dy:1,life:2,pierce:0}];updateBullets(.05)');assert.equal(g.run('snake.length'),20);
});

test('tail cutter respects unlock, length, head exclusion, minimum and configurable charge',()=>{
 const g=game({cutter:1});g.run('init();state="playing";fx=false;blocks=[];enemies=[];food=[];cutterCharge=12;snake=Array.from({length:19},(_,x)=>({x,y:8}));bullets=[{x:8.5,y:7.5,dx:0,dy:1,life:2,pierce:0}];updateBullets(.05)');
 assert.equal(g.run('snake.length'),19);assert.equal(g.run('cutterCharge'),12);
 g.run('snake.push({x:19,y:8});bullets=[{x:.5,y:7.5,dx:0,dy:1,life:2,pierce:0}];updateBullets(.05)');assert.equal(g.run('snake.length'),20);assert.equal(g.run('cutterCharge'),12);
 g.run('runMeta.cutter=0;bullets=[{x:8.5,y:7.5,dx:0,dy:1,life:2,pierce:0}];updateBullets(.05)');assert.equal(g.run('snake.length'),20);
 g.run('saveBalance({...DEFAULT_BALANCE,cutterFoods:2,cutterThreshold:10,cutterMin:9,cutterRatio:50});init();state="playing";fx=false;snake=Array.from({length:10},(_,x)=>({x,y:8}));food=[{x:1,y:2},{x:1,y:3}];for(const f of [...food])collect(f);blocks=[];enemies=[];bullets=[{x:9.5,y:7.5,dx:0,dy:1,life:2,pierce:0}];updateBullets(.05)');
 assert.equal(g.run('snake.length'),9);assert.equal(g.run('cutterCharge'),0);
 const old=g.run('(()=>{const b={...DEFAULT_BALANCE,foodPoints:22};for(const key of ["cutterFoods","cutterThreshold","cutterRatio","cutterMin","cutterCost"])delete b[key];return JSON.stringify({version:1,balance:b})})()');
 const reloaded=game({},old);assert.equal(reloaded.run('balance.foodPoints'),22);assert.equal(reloaded.run('balance.cutterFoods'),12);
 assert.throws(()=>g.run('validateBalance({...DEFAULT_BALANCE,cutterMin:20})'));
 assert.throws(()=>g.run('validateBalance({...DEFAULT_BALANCE,cutterRatio:1})'));
});

test('wrap echo purchase, saved toggle and reset apply with existing permanent upgrades',()=>{
 const g=game({chips:799});g.run('init()');assert.equal(g.run('buyPermanent("echo")'),false);
 g.run('meta.chips=800');assert.equal(g.run('buyPermanent("echo")'),true);
 assert.equal(g.run('meta.chips'),0);assert.equal(g.run('runMeta.echo'),0);
 assert.equal(g.run('buyPermanent("echo")'),false);
 g.run('init();openSettings()');assert.equal(g.run('runMeta.echo'),1);
 g.el('#echoEnabled').onchange({target:{checked:false}});
 assert.equal(g.run('wrapEchoCells().length'),0);
 const reload=game(JSON.parse(g.storage.get('snake-overdrive-v1')));reload.run('init()');
 assert.equal(reload.run('runMeta.echo'),1);assert.equal(reload.run('meta.echoEnabled'),false);
 g.run('resetPermanent()');assert.equal(g.run('meta.echo'),0);assert.equal(g.run('runMeta.echo'),1);
 g.run('restorePermanent()');assert.equal(g.run('meta.echo'),1);
 g.storage.set('snake-overdrive-upgrade-backup-v1',JSON.stringify({armor:1,combo:2,bomb:3}));
 assert.equal(g.run('permanentBackup().echo'),0);
 const old=g.run('(()=>{const b={...DEFAULT_BALANCE,foodPoints:17};delete b.echoCost;return JSON.stringify({version:1,balance:b})})()');
 const migrated=game({},old);assert.equal(migrated.run('balance.echoCost'),800);assert.equal(migrated.run('balance.foodPoints'),17);
});

test('wrap echo paints matching colors at opposite edges including corners and respects OFF',()=>{
 const g=game({echo:1});g.run('init();fx=false;snake=[{x:W-1,y:9}];food=[{x:0,y:4},{x:W-1,y:5,gold:true},{x:5,y:5}];enemies=[{x:7,y:0}];blocks=[{x:0,y:H-1}]');
 assert.equal(g.run('wrapEchoCells().length'),5);
 g.drawCalls.length=0;g.run('drawWrapEcho()');
 const paints=g.drawCalls.filter(c=>c.op==='fillRect');
 assert.ok(paints.some(c=>c.color==='#ff8bae'&&c.args[0]===g.run("W*C-1")&&c.args[1]===115));
 assert.ok(paints.some(c=>c.color==='#ffcc61'&&c.args[0]===0&&c.args[1]===143));
 assert.ok(paints.some(c=>c.color==='#65c9ff'&&c.args[0]===199&&c.args[1]===g.run("H*C-1")));
 assert.ok(paints.some(c=>c.color==='#bba1fa'&&c.args[0]===g.run("W*C-1")&&c.args[1]===g.run("(H-1)*C+3")));
 assert.ok(paints.some(c=>c.color==='#bba1fa'&&c.args[0]===3&&c.args[1]===0));
 assert.ok(paints.some(c=>c.color==='#e6ff92'&&c.args[0]===0&&c.args[1]===255));
 assert.equal(paints.length,60);
 for(const condition of ['meta.echoEnabled=false','meta.echoEnabled=true;runMeta.echo=0']){
  g.drawCalls.length=0;g.run(condition+';drawWrapEcho()');assert.equal(g.drawCalls.length,0);
 }
});

function game(saved={},savedBalance=null,savedLanguage=null,entry='.dev/index.html'){
  const drawCalls=[],downloads=[],urls=new Map(),elements=new Map(),storage=new Map([['snake-overdrive-v1',JSON.stringify(saved)]]);if(savedBalance)storage.set('snake-overdrive-balance-v1',savedBalance);if(savedLanguage)storage.set('snake-overdrive-language-v1',savedLanguage);
  const stack=[];const ctx=new Proxy({}, {get:(o,k)=>k in o?o[k]:(...args)=>{if(k==='save'){stack.push({...o});return}if(k==='restore'){const prior=stack.pop();for(const key of Object.keys(o))delete o[key];Object.assign(o,prior);return}drawCalls.push({op:k,color:o.fillStyle,strokeColor:o.strokeStyle,shadowBlur:o.shadowBlur||0,args})},set:(o,k,v)=>(o[k]=v,true)});
  function el(key){
    if(!elements.has(key)){
      const e={style:{setProperty(){}},classList:{add(){},remove(){},toggle(){}},clientWidth:616,clientHeight:504,offsetWidth:180,offsetHeight:70,listeners:{},listenerOptions:{},addEventListener(type,handler,options){this.listeners[type]=handler;this.listenerOptions[type]=options},setAttribute(){},setPointerCapture(){},getContext:()=>ctx,focus(){},append(){},showModal(){this.open=true},close(){this.open=false}};
      Object.defineProperty(e,'innerHTML',{configurable:true,get(){return this.html||''},set(v){this.html=v;this.choices=[...v.matchAll(/data-up="(\d+)"/g)].map(m=>({dataset:{up:m[1]}}))}});
      e.querySelectorAll=selector=>selector==='[data-up]'?e.choices||[]:[];
      elements.set(key,e);
    }
    return elements.get(key);
  }
  const box={Math,Blob,URL:{createObjectURL:b=>{const key=String(urls.size);urls.set(key,b);return key},revokeObjectURL:k=>urls.delete(k)},setTimeout:f=>f(),document:{querySelector:el,createElement:()=>({click(){downloads.push(urls.get(this.href))},remove(){}}),querySelectorAll:()=>[],addEventListener(){},body:el('body')},window:{addEventListener(){}},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},matchMedia:()=>({matches:false}),requestAnimationFrame(){}};
  vm.createContext(box);
  const scripts=[...fs.readFileSync(path.join(__dirname,'..',entry),'utf8').matchAll(/<script src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
  for(const file of scripts)vm.runInContext(fs.readFileSync(path.join(__dirname,'..',path.dirname(entry),file),'utf8'),box);
  return {run:code=>vm.runInContext(code,box),el,storage,downloads,drawCalls};
}

test('difficulty grows gradually, with documented campaign values and caps',()=>{
  const g=game();
  for(let n=1;n<=7;n++){
    const r=g.run(`waveRules(${n})`);
    assert.equal(r.target,12+(n-1)*3);
    assert.equal(r.enemies,2+Math.floor((n-1)/2));
    assert.equal(r.blocks,5+(n-1)*3);
    assert.ok(Math.abs(r.snakeInterval-(.22-(n-1)*.008))<1e-9);
    assert.ok(Math.abs(r.enemyInterval-(.85-(n-1)*.025))<1e-9);
  }
  let previous=g.run('waveRules(1)');
  for(let n=2;n<=100;n++){
    const r=g.run(`waveRules(${n})`);
    assert.ok(r.target>=previous.target&&r.enemies>=previous.enemies&&r.blocks>=previous.blocks);
    assert.ok(r.snakeInterval<=previous.snakeInterval&&r.enemyInterval<=previous.enemyInterval);
    previous=r;
  }
  assert.deepEqual(JSON.parse(JSON.stringify(previous)),{target:60,enemies:10,blocks:50,snakeInterval:.1,enemyInterval:.4});
});

test('wave layouts reach counts and avoid head, body, food and overlapping hazards',()=>{
  const g=game();
  for(const wave of [1,7,8,17,100])for(let i=0;i<8;i++){
    g.run(`init();snake=Array.from({length:6},(_,i)=>({x:W-1-i,y:0}));wave=${wave};setupWave()`);
    assert.equal(g.run('blocks.length'),g.run('waveRules(wave).blocks'));
    assert.equal(g.run('enemies.length'),g.run('waveRules(wave).enemies'));
    assert.equal(g.run('new Set([...blocks,...enemies].map(p=>p.x+","+p.y)).size'),g.run('blocks.length+enemies.length'));
    assert.ok(g.run('[...blocks,...enemies].every(p=>wrappedDist(p,snake[0])>5&&!snake.some(s=>eq(p,s))&&!food.some(f=>eq(p,f)))'));
  }
});

test('wave 5 continues; wave 7 awards milestone and enters endless; late waves continue',()=>{
  const g=game();g.run('init();fx=false;state="playing";wave=5;score=0;offer()');
  g.el('#overlay').choices[0].onclick();
  assert.equal(g.run('wave'),6);assert.equal(g.run('score'),500);
  g.run('wave=7;score=0;state="playing";offer()');
  assert.match(g.el('#overlay').innerHTML,/ENDLESS UNLOCKED/);
  const choose=g.el('#overlay').choices[0].onclick;choose();choose();
  assert.equal(g.run('wave'),8);assert.equal(g.run('score'),2700);assert.equal(g.run('state'),'playing');
  assert.match(g.el('#wave').innerHTML,/∞/);assert.equal(g.run('target'),33);
  g.run('wave=30;state="playing";offer()');g.el('#overlay').choices[1].onclick();
  assert.equal(g.run('wave'),31);assert.equal(g.run('target'),60);
});

test('bomb purchase enforces costs and limits, persists, and starts next run',()=>{
  const g=game({chips:299,armor:1,combo:2});g.run('init()');
  assert.equal(g.run('meta.bomb'),0);assert.equal(g.run('buyPermanent("bomb")'),false);
  g.run('meta.chips=2000');assert.equal(g.run('buyPermanent("bomb")'),true);
  assert.equal(g.run('meta.chips'),1700);assert.equal(g.run('runMeta.bomb'),0);
  assert.equal(g.run('availableUpgrades().length'),8);
  g.run('init()');assert.equal(g.run('runMeta.bomb'),1);assert.equal(g.run('availableUpgrades().length'),10);
  assert.equal(g.run('buyPermanent("bomb")'),true);assert.equal(g.run('buyPermanent("bomb")'),true);
  assert.equal(g.run('meta.chips'),200);assert.equal(g.run('meta.bomb'),3);
  assert.equal(g.run('buyPermanent("bomb")'),false);assert.equal(g.run('buyPermanent("unknown")'),false);
  const reloaded=game(JSON.parse(g.storage.get('snake-overdrive-v1')));reloaded.run('init()');
  assert.equal(reloaded.run('runMeta.bomb'),3);assert.equal(reloaded.run('hearts'),3);assert.equal(reloaded.run('runMeta.combo'),2);
});

test('bomb toss consumes no body, detonates once, converts hazards and preserves food/life',()=>{
  const g=game({bomb:1});g.run('init();fx=false;state="playing";bombCD=0;blocks=[{x:13,y:8},{x:14,y:8},{x:20,y:8}];enemies=[{x:13,y:9},{x:20,y:10}];food=[{x:12,y:9}];score=0;throwBomb()');
  assert.equal(g.run('bombs.length'),1);assert.equal(g.run('snake.length'),4);assert.equal(g.run('bombCD'),8);
  g.run('draw();updateBombs(.3)');assert.equal(g.run('score'),0);
  g.run('updateBombs(.3)');assert.equal(g.run('bombs.length'),0);assert.equal(g.run('score'),100);
  assert.equal(g.run('blocks.length'),1);assert.equal(g.run('enemies.length'),1);
  assert.equal(g.run('food.length'),4);assert.equal(g.run('hearts'),2);assert.equal(g.run('eaten'),0);
  g.run('updateBombs(.1)');assert.equal(g.run('score'),100);
});

test('bomb targeting, rank bonuses, run upgrades and pause behavior',()=>{
  const g=game({bomb:3});g.run('init();fx=false;state="playing";bombCD=0;blocks=[];enemies=[];throwBomb()');
  assert.equal(g.run('bombs.length'),0);assert.equal(g.run('bombCD'),0);
  g.run('blocks=[{x:18,y:8}];throwBomb()');assert.equal(g.run('bombs.length'),0);
  g.run('blocks=[{x:14,y:8}];mut={blast:10,charge:10};throwBomb()');
  assert.equal(g.run('bombRadius()'),6);assert.ok(Math.abs(g.run('bombInterval()')-2.4)<1e-9);
  assert.equal(g.run('bombs[0].radius'),6);
  const life=g.run('bombs[0].life'),cd=g.run('bombCD');
  g.run('state="paused";update(.05)');assert.equal(g.run('bombs[0].life'),life);assert.equal(g.run('bombCD'),cd);
  g.run('state="playing";offer()');assert.equal(g.run('bombs.length'),0);
});

test('endless defeat credits chips once and new runs reset campaign',()=>{
  const g=game();g.run('init();state="playing";wave=12;score=1234;finish();finish()');
  assert.equal(g.run('meta.chips'),36);assert.equal(g.run('meta.best'),1234);
  g.run('init()');assert.equal(g.run('wave'),1);assert.equal(g.run('target'),12);assert.equal(g.run('bombs.length'),0);
});


test('meeting the wave 7 target via the frame loop offers evolution instead of ending',()=>{
  const g=game();g.run('init();fx=false;state="playing";wave=7;target=30;eaten=30;tick=-1;enemies=[];blocks=[];update(.01)');
  assert.equal(g.run('state'),'upgrade');assert.equal(g.run('meta.chips'),0);
  g.el('#overlay').choices[0].onclick();assert.equal(g.run('wave'),8);assert.equal(g.run('state'),'playing');
});

test('documented difficulty table and upgrade names match game configuration',()=>{
  const g=game(),balanceDoc=fs.readFileSync(path.join(__dirname,'../docs/balance.md'),'utf8'),upgradeDoc=fs.readFileSync(path.join(__dirname,'../docs/upgrades.md'),'utf8');
  for(let n=1;n<=9;n++){
    const r=g.run(`waveRules(${n})`),label=n>7?`${n}（無限）`:n;
    assert.ok(balanceDoc.includes(`| ${label} | ${r.target} | ${r.enemies} | ${r.blocks} | ${r.snakeInterval.toFixed(3)}秒 | ${r.enemyInterval.toFixed(3)}秒 |`));
  }
  for(const u of g.run('[...upgrades,...permanentUpgrades]'))assert.ok(upgradeDoc.includes(u.name));
  for(const u of g.run('permanentUpgrades')){
    const prices=Array.from({length:u.max},(_,lv)=>g.run(`permanentCost("${u.id}",${lv})`)).join(' / ');
    const row=upgradeDoc.split('\n').find(line=>line.startsWith(`| ${u.name} |`));
    assert.ok(row.includes(`| ${prices} チップ |`),u.name);
  }
  for(let lv=1;lv<=3;lv++){
    g.run(`init();runMeta.bomb=${lv};mut.blast=0;mut.charge=0`);
    assert.ok(upgradeDoc.includes(`| ${lv} | ${g.run('bombRadius()')}マス | ${g.run('bombInterval()')}秒 |`));
  }
});

test('capped and ineffective upgrades disappear while useful secondary effects remain',()=>{
  const g=game({bomb:3});g.run('init();mut={split:1,blast:2,charge:4,magnet:2,chain:3,orchard:3,pierce:5};snake=snake.slice(0,4)');
  const ids=JSON.parse(g.run('JSON.stringify(availableUpgrades().map(u=>u.id))'));
  assert.deepEqual(ids,['gold','shield','combo']);
  assert.equal(g.run('applyRunUpgrade("split")'),false);
  assert.equal(g.run('applyRunUpgrade("compact")'),false);
  g.run('mut={pierce:4,gold:8}');
  assert.ok(g.run('availableUpgrades().some(u=>u.id==="pierce")'));
  assert.ok(g.run('availableUpgrades().some(u=>u.id==="gold")'));
});

test('compact upgrade cuts only on selection and respects minimum length',()=>{
  const g=game();g.run('init();fx=false;snake=Array.from({length:11},(_,i)=>({x:11-i,y:8}))');
  assert.equal(g.run('applyRunUpgrade("compact")'),true);assert.equal(g.run('snake.length'),7);
  assert.equal(g.run('applyRunUpgrade("compact")'),true);assert.equal(g.run('snake.length'),4);
  assert.equal(g.run('mut.compact'),2);assert.equal(g.run('applyRunUpgrade("compact")'),false);
  assert.equal(g.run('hearts'),2);assert.equal(g.run('invuln'),0);
});

test('compact is excluded only in runs with an active permanent tail cutter',()=>{
 const g=game({chips:1000});g.run('init();fx=false;snake=Array.from({length:30},()=>({x:1,y:1}))');
 assert.ok(g.run('availableUpgrades().some(u=>u.id==="compact")'));
 assert.equal(g.run('buyPermanent("cutter")'),true);
 assert.ok(g.run('availableUpgrades().some(u=>u.id==="compact")'));
 g.run('init();snake=Array.from({length:30},()=>({x:1,y:1}))');
 assert.ok(!g.run('availableUpgrades().some(u=>u.id==="compact")'));
 assert.equal(g.run('applyRunUpgrade("compact")'),false);assert.equal(g.run('snake.length'),30);
 g.run('resetPermanent()');assert.ok(!g.run('availableUpgrades().some(u=>u.id==="compact")'));
 g.run('init();snake=Array.from({length:30},()=>({x:1,y:1}))');
 assert.ok(g.run('availableUpgrades().some(u=>u.id==="compact")'));
});

test('choice levels, reduced choice counts and exhausted choices can continue',()=>{
  const g=game();g.run('init();fx=false;state="playing";for(const u of upgrades)mut[u.id]=upgradeLimit(u);mut.shield=0;offer()');
  assert.equal(g.el('#overlay').choices.length,1);
  assert.match(g.el('#overlay').innerHTML,/LV\.0 → 1 \/ 3/);
  g.el('#overlay').choices[0].onclick();assert.equal(g.run('wave'),2);assert.equal(g.run('hearts'),3);
  g.run('state="playing";for(const u of upgrades)mut[u.id]=upgradeLimit(u);offer()');
  assert.equal(g.el('#overlay').choices.length,0);
  g.el('#nextWave').onclick();assert.equal(g.run('wave'),3);assert.equal(g.run('state'),'playing');
});

test('max permanent purchases stay visible with disabled buttons and correct levels',()=>{
  const g=game({armor:3,combo:4,bomb:3,echo:1,cutter:1});g.run('init();openLab()');
  for(const id of ['armor','combo','bomb','echo','cutter'])assert.match(g.el('#modalContent').innerHTML,new RegExp('data-buy="'+id+'" disabled>MAX'));assert.ok(!g.el('#modalContent').innerHTML.includes('→ 5'));assert.ok(!g.el('#modalContent').innerHTML.includes('→ 4'));
  assert.match(g.el('#modalContent').innerHTML,/すべての永久強化が MAX/);
  g.run('renderBuild()');assert.match(g.el('#build').innerHTML,/LV\.3 \/ 3/);
  g.run('openSettings()');assert.match(g.el('#modalContent').innerHTML,/タフ・スキン LV\.3 \/ 3/);
});

test('JSON round trip, standard sample and validation reject unsafe or partial settings',()=>{
  const g=game();
  const sample=fs.readFileSync(path.join(__dirname,'../.dev/balance.default.json'),'utf8').replace(/\r\n/g,'\n');
  assert.equal(g.run('balanceJSON(DEFAULT_BALANCE)'),sample.trim());
  assert.equal(g.run('balanceJSON(parseBalanceJSON(balanceJSON(DEFAULT_BALANCE)))'),sample.trim());
  for(const code of [
    'validateBalance({...DEFAULT_BALANCE,enemyBase:1.5})',
    'validateBalance({...DEFAULT_BALANCE,targetBase:100,targetMax:60})',
    'validateBalance({...DEFAULT_BALANCE,snakeMin:1})',
    'validateBalance({...DEFAULT_BALANCE,bombRankStep:5})',
    'validateBalance({...DEFAULT_BALANCE,bulletSpeed:Infinity})',
    'validateBalance({...DEFAULT_BALANCE,unknown:2})',
    'validateBalance({...DEFAULT_BALANCE,bombFlight:"0.5"})',
    'parseBalanceJSON("{bad JSON")',
    'parseBalanceJSON(JSON.stringify({version:2,balance:DEFAULT_BALANCE}))',
    'parseBalanceJSON(JSON.stringify({version:1,balance:{}}))'
  ])assert.throws(()=>g.run(code));
  assert.equal(g.run('balance.targetBase'),12);
});

test('saved balances persist, apply next run and alter gameplay; invalid stored JSON falls back',()=>{
  const g=game();g.run('init();saveBalance({...DEFAULT_BALANCE,targetBase:20,targetStep:2,targetMax:80,enemyBase:0,enemyMax:0,blockBase:0,blockMax:0,startLength:9,startHearts:5,foodPoints:30})');
  assert.equal(g.run('runBalance.targetBase'),12);
  g.run('init()');assert.equal(g.run('snake.length'),9);assert.equal(g.run('hearts'),5);
  assert.equal(g.run('target'),20);assert.equal(g.run('enemies.length'),0);assert.equal(g.run('blocks.length'),0);
  g.run('food=[{x:12,y:8}];collect(food[0])');assert.equal(g.run('score'),30);
  const reload=game({},g.storage.get('snake-overdrive-balance-v1'));
  assert.equal(reload.run('balance.targetBase'),20);
  const corrupt=game({},'{bad');assert.equal(corrupt.run('balance.targetBase'),12);
  const before=g.storage.get('snake-overdrive-balance-v1');
  assert.throws(()=>g.run('saveBalance({...DEFAULT_BALANCE,startHearts:0})'));
  assert.equal(g.storage.get('snake-overdrive-balance-v1'),before);
});

test('reset and undo preserve score/chips/current run and persist only permanent ranks',()=>{
  const g=game({armor:2,combo:3,bomb:1,chips:70,best:999});g.run('init();resetPermanent()');
  assert.equal(g.run('meta.armor+meta.combo+meta.bomb'),0);
  assert.equal(g.run('meta.chips'),70);assert.equal(g.run('meta.best'),999);
  assert.equal(g.run('runMeta.bomb'),1);assert.equal(g.run('hearts'),4);
  assert.equal(g.run('resetPermanent()'),false);
  const saved=JSON.parse(g.storage.get('snake-overdrive-v1'));
  const reload=game(saved);reload.storage.set('snake-overdrive-upgrade-backup-v1',g.storage.get('snake-overdrive-upgrade-backup-v1'));
  assert.equal(reload.run('restorePermanent()'),true);
  assert.equal(reload.run('meta.bomb'),1);assert.equal(reload.run('meta.armor'),2);
  assert.equal(reload.run('restorePermanent()'),false);
  g.run('init()');assert.equal(g.run('runMeta.bomb'),0);assert.equal(g.run('hearts'),2);
});

test('debug start and chip setting reject invalid values and start selected wave',()=>{
  const g=game();g.run('openSettings();fillBalanceForm(DEFAULT_BALANCE)');
  g.el('#saveBalance').onclick();assert.match(g.el('#settingsStatus').textContent,/保存しました/);
  g.el('#balance-targetBase').value='';g.el('#saveBalance').onclick();assert.match(g.el('#settingsStatus').textContent,/空欄/);
  assert.throws(()=>g.run('startDebugWave(0,DEFAULT_BALANCE)'));
  assert.throws(()=>g.run('setDebugChips(-1)'));
  assert.throws(()=>g.run('setDebugChips(1.5)'));
  g.run('setDebugChips(1000);startDebugWave(12,DEFAULT_BALANCE)');
  assert.equal(g.run('wave'),12);assert.equal(g.run('target'),45);assert.equal(g.run('meta.chips'),1000);
  assert.equal(g.run('state'),'playing');assert.equal(g.el('#modal').open,false);
});


test('settings JSON file import stages changes and download exports edited numbers',async()=>{
  const g=game();g.run('openSettings();fillBalanceForm(DEFAULT_BALANCE)');
  const json=g.run('balanceJSON({...DEFAULT_BALANCE,targetBase:18})');
  const input={files:[{size:json.length,text:async()=>json}],value:'selected'};
  await g.el('#importBalance').onchange({target:input});
  assert.equal(g.el('#balance-targetBase').value,'18');assert.equal(g.run('balance.targetBase'),12);
  assert.equal(input.value,'');
  g.el('#exportBalance').onclick();assert.equal(g.downloads.length,1);
  assert.equal(JSON.parse(await g.downloads[0].text()).balance.targetBase,18);
  const bad={files:[{size:5,text:async()=>'{bad'}],value:'selected'};
  await g.el('#importBalance').onchange({target:bad});
  assert.equal(g.el('#balance-targetBase').value,'18');assert.equal(g.run('balance.targetBase'),12);
  g.el('#saveBalance').onclick();assert.equal(g.run('balance.targetBase'),18);
});


test('small non-score caps shrink the uniform pool and keep compact repeatable',()=>{
  const g=game({bomb:1});g.run('init();fx=false;snake.push({x:7,y:8})');
  assert.equal(g.run('availableUpgrades().length'),11);
  for(const [id,limit] of Object.entries({orchard:3,chain:3,split:1,magnet:2,shield:3,pierce:5,blast:2,charge:4})){
    assert.equal(g.run(`upgradeLimit(upgrades.find(u=>u.id==="${id}"))`),limit);
    for(let lv=0;lv<limit;lv++)assert.equal(g.run(`applyRunUpgrade("${id}")`),true);
    assert.equal(g.run(`applyRunUpgrade("${id}")`),false);
  }
  assert.deepEqual(JSON.parse(g.run('JSON.stringify(availableUpgrades().map(u=>u.id))')),['gold','combo','compact']);
  assert.equal(g.run('upgradeLimit(upgrades.find(u=>u.id==="compact"))'),Infinity);
  g.run('state="playing";offer()');
  assert.equal(g.el('#overlay').choices.length,3);
  assert.match(g.el('#overlay').innerHTML,/コンパクト・ボディ/);
});

test('long combo increases only multiplier cap, while permanent combo extends time',()=>{
  const g=game({combo:2});g.run('init();fx=false;mut.combo=10;time=1;lastEat=.5;chain=8;food=[{x:12,y:8}];collect(food[0])');
  assert.equal(g.run('chain'),9);assert.equal(g.run('chainTime'),4.5);
  g.run('time=6;food=[{x:13,y:8}];collect(food[0])');
  assert.equal(g.run('chain'),1);assert.equal(g.run('chainTime'),4.5);
  assert.match(g.run('upgrades.find(u=>u.id==="combo").desc'),/倍率/);
  assert.ok(!g.run('upgrades.find(u=>u.id==="combo").desc').includes('猶予'));
  g.run('init();fx=false;mut.combo=0;state="playing";time=1;lastEat=.5;chain=20;food=[{x:12,y:8}];collect(food[0])');
  assert.equal(g.run('chain'),20);assert.equal(g.run('chainLimit()'),20);
  assert.equal(g.run('applyRunUpgrade("combo")'),true);assert.equal(g.run('chainLimit()'),25);
  g.run('chain=24;food=[{x:13,y:8}];collect(food[0])');assert.equal(g.run('chain'),25);
  g.run('food=[{x:14,y:8}];collect(food[0])');assert.equal(g.run('chain'),25);
  assert.equal(g.run('chainTime'),4.5);
});

test('chain multiplier and timer update distinct rows even with large multipliers',()=>{
  const g=game();g.run('init();state="playing";chain=1024;chainTime=30.1;hud()');
  assert.equal(g.el('#chainMultiplier').textContent,'×1024');
  assert.equal(g.el('#chainTimer').textContent,'30.1s');
  g.run('chainTime=0;hud()');assert.equal(g.el('#chainTimer').textContent,'');
  const css=fs.readFileSync(path.join(__dirname,'../assets/css/style.css'),'utf8').replace(/\s+/g,'');
  assert.match(css,/#chain\{display:flex;flex-direction:column;/);
  assert.ok(!css.includes('#chain{display:grid;grid-template-columns:3ch 5ch}'));
});

test('permanent prices use independent manual entries and reject invalid ranks',()=>{
  const g=game();
  assert.deepEqual([0,1,2].map(lv=>g.run(`permanentCost("armor",${lv})`)),[40,200,800]);
  assert.deepEqual([0,1,2,3].map(lv=>g.run(`permanentCost("combo",${lv})`)),[100,200,400,600]);
  assert.deepEqual([0,1,2].map(lv=>g.run(`permanentCost("bomb",${lv})`)),[300,600,900]);
  g.run('meta.armor=2;meta.chips=799');assert.equal(g.run('buyPermanent("armor")'),false);
  g.run('meta.chips=800');assert.equal(g.run('buyPermanent("armor")'),true);assert.equal(g.run('meta.chips'),0);
  g.run('saveBalance({...DEFAULT_BALANCE,bombCost2:111,bombCost3:777})');
  assert.equal(g.run('permanentCost("bomb",0)'),300);
  assert.equal(g.run('permanentCost("bomb",1)'),111);
  assert.equal(g.run('permanentCost("bomb",2)'),777);
  assert.equal(JSON.parse(g.run('balanceJSON(balance)')).balance.bombCost3,777);
  assert.ok(!Object.hasOwn(JSON.parse(g.run('balanceJSON(balance)')).balance,'costGrowth'));
  assert.throws(()=>g.run('saveBalance({...DEFAULT_BALANCE,bombCost2:0})'));
  assert.throws(()=>g.run('saveBalance({...DEFAULT_BALANCE,comboCost4:12.5})'));
  assert.throws(()=>g.run('parseBalanceJSON(JSON.stringify({version:1,balance:(()=>{const v={...DEFAULT_BALANCE};delete v.bombCost2;return v})()}))'));
  assert.equal(g.run('permanentCost("bomb",3)'),Infinity);
});

test('old balance JSON migrates formula prices once into manual entries',()=>{
  const g=game();
  const old=g.run('(()=>{const value={...DEFAULT_BALANCE,targetBase:18,bombCost:100};for(const key of Object.keys(value))if(/Cost[2-4]$/.test(key))delete value[key];return JSON.stringify({version:1,balance:value})})()');
  const reload=game({},old);
  assert.equal(reload.run('balance.targetBase'),18);assert.equal(reload.run('balance.bombCost'),100);
  assert.equal(reload.run('balance.costGrowth'),undefined);
  assert.equal(reload.run('permanentCost("bomb",2)'),225);
  const withFactor=JSON.parse(old);withFactor.balance.costGrowth=2;
  const doubled=game({},JSON.stringify(withFactor));assert.equal(doubled.run('permanentCost("bomb",2)'),400);
  assert.equal(doubled.run('balance.costGrowth'),undefined);
  doubled.run('saveBalance(balance)');const again=game({},doubled.storage.get('snake-overdrive-balance-v1'));
  assert.equal(again.run('permanentCost("bomb",2)'),400);
});


test('all ground shadows and flat bullet halos precede every solid object',()=>{
 const g=game();g.run('init();state="playing";invuln=0;blocks=[{x:3,y:3},{x:4,y:3}];food=[{x:5,y:3},{x:6,y:3,gold:true}];enemies=[{x:7,y:3}];snake=[{x:8,y:3},{x:9,y:3},{x:9,y:4}];bullets=[{x:7.5,y:3.5,dx:1,dy:0}];particles=[];rings=[];texts=[];draw()');
 const paints=g.drawCalls.filter(c=>['fill','fillRect'].includes(c.op));
 const shadows=paints.map((c,i)=>['#223229','#25342b','#23342b','#22332a'].includes(c.color)||(c.color==='#ffd166'&&c.op==='fill')||c.shadowBlur>0?i:-1).filter(i=>i>=0);
 const solids=paints.map((c,i)=>['#bba1fa','#ff8bae','#ffcc61','#65c9ff','#e6ff92','#d8fa65'].includes(c.color)&&!c.shadowBlur?i:-1).filter(i=>i>=0);
 assert.equal(shadows.length,9);assert.ok(solids.length>=8);
 assert.ok(Math.max(...shadows)<Math.min(...solids));
 assert.ok(paints.some(c=>c.color==='#fff6bf'&&!c.shadowBlur));
});

test('snake shadow disappears with blink, and FX off keeps objects without bullet glow',()=>{
 const g=game();g.run('init();fx=false;state="playing";invuln=1;demoTime=.1;blocks=[];food=[];enemies=[];bullets=[{x:5,y:5,dx:1,dy:0}];particles=[];rings=[];draw()');
 assert.ok(!g.drawCalls.some(c=>c.color==='#22332a'));
 assert.ok(!g.drawCalls.some(c=>c.shadowBlur>0));
 assert.ok(g.drawCalls.some(c=>c.op==='fill'&&c.color==='#fff6bf'));
});

test('all recovery methods grow once per food with equal score and progress',()=>{
 const head=game(),recovered=game();
 for(const g of [head,recovered])g.run('init();fx=false;wave=10;target=waveRules(wave).target');
 for(let i=0;i<39;i++){
  head.run(`time=${i*5};food=[{x:12,y:8}];collect(food[0])`);
  recovered.run(`time=${i*5};food=[{x:12,y:8}];collect(food[0])`);
 }
 assert.equal(head.run('snake.length'),43);assert.equal(recovered.run('snake.length'),43);
 assert.equal(recovered.run('eaten'),39);assert.equal(recovered.run('score'),head.run('score'));
});

test('magnet and recursive chain recovery both grow once per food',()=>{
 const g=game();g.run('init();fx=false;state="playing";blocks=[];enemies=[];mut.magnet=1;food=[{x:12,y:8},{x:13,y:8}];step()');
 assert.equal(g.run('snake.length'),6);assert.equal(g.run('eaten'),2);
 g.run('init();fx=false;mut.chain=1;food=[{x:12,y:8},{x:12,y:9},{x:13,y:9},{x:13,y:10}];collect(food[0])');
 assert.equal(g.run('eaten'),4);assert.equal(g.run('snake.length'),8);
});

test('bullet recovery grows immediately before and after wave changes',()=>{
 const g=game();g.run('init();fx=false;state="playing";blocks=[];enemies=[];tick=-1;shootCD=10');
 g.run('food=[{x:3,y:3}];bullets=[{x:3.2,y:3.5,dx:1,dy:0,life:2,pierce:0}];update(.001)');
 assert.equal(g.run('snake.length'),5);
 g.run('state="upgrade";advanceWave(100);food=[{x:3,y:3}];collect(food[0])');
 assert.equal(g.run('snake.length'),6);
 g.run('food=[{x:3,y:3}];collect(food[0]);food=[{x:12,y:8}];collect(food[0])');
 assert.equal(g.run('snake.length'),8);
 g.run('init()');assert.equal(g.run('snake.length'),4);
});

test('compact percentage scales with length, rounds up and honors configurable minimum',()=>{
 const g=game();g.run('init();fx=false');
 for(const [length,expected] of [[5,4],[10,6],[20,14],[39,27],[40,28]]){
  g.run(`snake=Array.from({length:${length}},()=>({x:1,y:1}));applyRunUpgrade("compact")`);
  assert.equal(g.run('snake.length'),expected);
 }
 g.run('saveBalance({...DEFAULT_BALANCE,compactRatio:50,compactAmount:1});init();fx=false;snake=Array.from({length:20},()=>({x:1,y:1}));applyRunUpgrade("compact")');
 assert.equal(g.run('snake.length'),10);
 g.run('food=[{x:1,y:2},{x:1,y:3}];for(const f of [...food])collect(f)');
 assert.equal(g.run('snake.length'),12);
});

test('legacy settings preserve tuned values and remove retired growth parameter',()=>{
 const g=game();
 const old=g.run('(()=>{const b={...DEFAULT_BALANCE,compactAmount:6,bulletSpeed:40,indirectGrowthEvery:2};delete b.costGrowth;delete b.compactRatio;return JSON.stringify({version:1,balance:b})})()');
 const reloaded=game({},old);
 assert.equal(reloaded.run('balance.compactAmount'),6);assert.equal(reloaded.run('balance.bulletSpeed'),40);
 assert.equal(reloaded.run('balance.compactRatio'),30);assert.equal(reloaded.run('Object.hasOwn(balance,"indirectGrowthEvery")'),false);
 reloaded.run('init();fx=false;food=[{x:1,y:2}];collect(food[0])');assert.equal(reloaded.run('snake.length'),5);
 assert.throws(()=>g.run('saveBalance({...DEFAULT_BALANCE,compactRatio:101})'));
});


test('normal movement and turns produce no square particles but destruction does',()=>{
 const g=game();g.run('init();state="playing";fx=true;particles=[];rings=[];blocks=[];enemies=[];food=[];queue=[{x:0,y:-1}];step()');
 assert.equal(g.run('particles.length'),0);assert.ok(g.run('rings.every(r=>r.kind==="motion-square")'));
 g.run('hitEnemy({x:2,y:2})');assert.ok(g.run('particles.length')>0);
});

test('end screen upgrade prompt reflects remaining ranks, affordability and sold-out state',()=>{
 const g=game({armor:2,combo:4,bomb:3,echo:1,cutter:1,chips:0});g.run('init();score=0;wave=1;state="playing";finish()');
 assert.match(g.el('#overlay').innerHTML,/永久強化が残っています/);
 assert.match(g.el('#overlay').innerHTML,/あと ◆ 798/);
 g.run('setDebugChips(800)');assert.match(g.el('#resultUpgrades').innerHTML,/永久強化を購入できます/);
 assert.equal(g.run('buyPermanent("armor")'),true);
 assert.equal(g.run('resultUpgradePrompt()'),'');assert.equal(g.el('#resultUpgrades').hidden,true);
 const soldOut=game({armor:3,combo:4,bomb:3,echo:1,cutter:1});soldOut.run('init();state="playing";finish()');
 assert.ok(!soldOut.el('#overlay').innerHTML.includes('id="endLab"'));
});


test('English covers all screens, live values, upgrade descriptions and balance fields',()=>{
 const g=game({armor:1,combo:2,bomb:1,echo:1,cutter:1,chips:2000});
 const english=source=>g.run(`translateText(${JSON.stringify(source)}, 'en')`);
 const noJapanese=source=>assert.equal((english(source).match(/[^<>]*[\u3040-\u30ff\u4e00-\u9fff][^<>]*/g)||[]).join(' | '), '');
 noJapanese(fs.readFileSync(path.join(__dirname,'../src/index.html'),'utf8').split('<script')[0]);
 for(const action of ['ready()','init();state="playing";pause()','openHelp()','openLab()','openSettings()','init();state="playing";offer()','state="playing";finish()']){
  g.run(action);
  noJapanese(g.el('#overlay').innerHTML);
  noJapanese(g.el('#modalContent').innerHTML);
 }
 g.run('init();for(const u of upgrades)mut[u.id]=1;renderBuild()');noJapanese(g.el('#build').innerHTML);
 for(const field of g.run('BALANCE_FIELDS'))noJapanese(field[2]);
 assert.ok(english(g.run('cutterDescription(runBalance)')).includes('Above length 20'));
 g.run('openHelp()');assert.ok(english(g.el('#modalContent').innerHTML).includes('floor(score / 100) + wave reached × 2'));
 for(const call of ['validateBalance({...DEFAULT_BALANCE,startLength:999})','validateBalance({...DEFAULT_BALANCE,cutterMin:20})']){
  let error;try{g.run(call)}catch(e){error=e.message}noJapanese(error);
 }
});

test('language changes persist without changing the run, and canonical node text survives toggles',()=>{
 const g=game();g.run('init();state="playing";score=432;wave=10;setLanguage("en")');
 assert.equal(g.storage.get('snake-overdrive-language-v1'),'en');
 assert.equal(game({},null,'en').run('language'),'en');
 assert.equal(game({},null,'invalid').run('language'),'ja');
 assert.equal(g.run('state'),'playing');assert.equal(g.run('score'),432);assert.equal(g.run('wave'),10);
 g.run('testText={nodeValue:"あと 12 個"};localizeNode(testText)');assert.equal(g.run('testText.nodeValue'),'12 food remaining');
 g.run('setLanguage("ja");localizeNode(testText)');assert.equal(g.run('testText.nodeValue'),'あと 12 個');
 g.run('setLanguage("en");testText.nodeValue="あと 9 個";localizeNode(testText)');assert.equal(g.run('testText.nodeValue'),'9 food remaining');
 g.run('setLanguage("ja");localizeNode(testText)');assert.equal(g.run('testText.nodeValue'),'あと 9 個');
 g.run('setLanguage("invalid")');assert.equal(g.run('language'),'ja');
});


test('localization changes attributes and preserves existing form controls',()=>{
 const g=game();
 g.run(`testLabel={value:'閉じる',getAttribute(){return this.value},setAttribute(k,v){this.value=v}};setLanguage('en');localizeNode(testLabel,'aria-label')`);
 assert.equal(g.run('testLabel.value'),'Close');
 g.run("setLanguage('ja');localizeNode(testLabel,'aria-label')");assert.equal(g.run('testLabel.value'),'閉じる');
 g.run('openSettings()');g.el('#balance-startLength').value='9';const control=g.el('#balance-startLength');
 g.run('setLanguage("en");setLanguage("ja")');assert.equal(g.el('#balance-startLength'),control);assert.equal(control.value,'9');
});


test('HUD localization preserves the language tap target until click in both languages',()=>{
 const g=game();
 g.run(`
  languageButton=document.querySelector('#language');
  languageButton.nodeType=1;
  languageButton.attributes={'aria-label':'Switch to English'};
  languageButton.hasAttribute=k=>Object.hasOwn(languageButton.attributes,k);
  languageButton.getAttribute=k=>languageButton.attributes[k];
  languageButton.setAttribute=(k,v)=>{languageButton.attributes[k]=v};
  languageButton.matches=()=>false;
  languageButton.child={nodeType:3,nodeValue:'EN',parentNode:{tagName:'BUTTON'}};
  captionWrites=0;
  Object.defineProperty(languageButton,'textContent',{
    get(){return this.child.nodeValue},
    set(value){captionWrites++;this.child={nodeType:3,nodeValue:value,parentNode:{tagName:'BUTTON'}}}
  });
  pageRoot={nodeType:1,hasAttribute:()=>false,matches:()=>false};
  buildLabel={nodeType:3,nodeValue:'ビルド',parentNode:{tagName:'BUTTON'}};
  document.documentElement=pageRoot;
  document.createTreeWalker=()=>{
    const nodes=[pageRoot,languageButton,languageButton.child,buildLabel];let index=0;
    return {currentNode:pageRoot,nextNode:()=>nodes[++index]||null};
  };
  heldTarget=languageButton.child;
  for(let i=0;i<120;i++)localizePage();
 `);
 assert.equal(g.run('captionWrites'),0);assert.equal(g.run('languageButton.child===heldTarget'),true);
 g.el('#language').onclick();
 assert.equal(g.run('language'),'en');assert.equal(g.run('buildLabel.nodeValue'),'Build');
 assert.equal(g.run('languageButton.textContent'),'日本語');assert.equal(g.run('captionWrites'),1);
 g.run('heldTarget=languageButton.child;for(let i=0;i<120;i++)localizePage()');
 assert.equal(g.run('captionWrites'),1);assert.equal(g.run('languageButton.child===heldTarget'),true);
 g.el('#language').onclick();assert.equal(g.run('language'),'ja');assert.equal(g.run('buildLabel.nodeValue'),'ビルド');
 assert.equal(g.storage.get('snake-overdrive-language-v1'),'ja');
});


test('touch release switches language without click, generated click never toggles twice',()=>{
 const g=game();const button=g.el('#language');let prevented=0;
 const event=(type,x=20)=>({pointerType:type,pointerId:1,clientX:x,clientY:10,preventDefault(){prevented++}});
 button.listeners.pointerdown(event('touch'));button.listeners.pointerup(event('touch'));
 assert.equal(g.run('language'),'en');assert.equal(prevented,1);
 button.onclick({detail:1});assert.equal(g.run('language'),'en');
 button.listeners.pointerdown(event('touch'));button.listeners.pointerup(event('touch'));
 assert.equal(g.run('language'),'ja');button.onclick({detail:1});assert.equal(g.run('language'),'ja');
 button.listeners.pointerdown(event('touch'));button.listeners.pointermove(event('touch',60));button.listeners.pointerup(event('touch',20));
 assert.equal(g.run('language'),'ja');
 button.listeners.pointerdown(event('touch'));button.listeners.pointercancel();button.listeners.pointerup(event('touch'));
 assert.equal(g.run('language'),'ja');
 button.onclick({detail:0});assert.equal(g.run('language'),'en');
 const pc=game();const mouse=pc.el('#language');mouse.listeners.pointerdown(event('mouse'));mouse.listeners.pointerup(event('mouse'));assert.equal(pc.run('language'),'ja');
 mouse.onclick({detail:1});assert.equal(pc.run('language'),'en');
});

test('legacy Safari touch events switch without compatibility click and reject scrolling',()=>{
 const g=game();const button=g.el('#language');let prevented=0;
 const event=(x=20)=>({touches:[{identifier:1,clientX:x,clientY:10}],changedTouches:[{identifier:1,clientX:x,clientY:10}],preventDefault(){prevented++}});
 button.listeners.touchstart(event());button.listeners.touchend(event());assert.equal(g.run('language'),'en');assert.equal(prevented,1);
 button.onclick({detail:1});assert.equal(g.run('language'),'en');
 button.listeners.touchstart(event());button.listeners.touchmove(event(60));button.listeners.touchend(event(60));assert.equal(g.run('language'),'en');
 button.listeners.touchstart(event());button.listeners.touchcancel();button.listeners.touchend(event());assert.equal(g.run('language'),'en');
 button.listeners.touchstart(event());button.listeners.touchend(event());assert.equal(g.run('language'),'ja');
});


test('game surfaces suppress Safari touch-end zoom in every state without blocking swipes',()=>{
 const g=game();let prevented=0;
 for(const id of ['#game','#swipeControls']){
  const surface=g.el(id);assert.equal(surface.listenerOptions.touchend.passive,false);
  for(const state of ['ready','playing','paused','upgrade','over']){
   g.run(`state=${JSON.stringify(state)}`);
   surface.listeners.touchend({cancelable:true,preventDefault(){prevented++}});
  }
  surface.listeners.touchend({cancelable:false,preventDefault(){throw Error('not cancelable')}});
 }
 assert.equal(prevented,10);
 g.run('init();state="playing"');
 const surface=g.el('#swipeControls');
 const event=(y)=>({pointerType:'touch',button:0,pointerId:1,clientX:50,clientY:y,preventDefault(){}});
 surface.listeners.pointerdown(event(50));surface.listeners.pointermove(event(15));
 assert.equal(g.run('queue[0].y'),-1);
 surface.listeners.pointerup(event(15));
});


test('production uses shared defaults, excludes developer functions and retains player settings',()=>{
 const dev=game();const tuned=dev.run('JSON.stringify({version:1,balance:{...DEFAULT_BALANCE,foodPoints:999,startLength:12}})');
 const g=game({chips:500,armor:1,combo:1},tuned,'en','dist/index.html');
 assert.equal(g.run('balance.foodPoints'),10);assert.equal(g.run('balance.startLength'),4);
 for(const name of ['setDebugChips','startDebugWave','validateBalance','saveBalance','parseBalanceJSON','balanceForm','BALANCE_FIELDS'])assert.equal(g.run(`typeof ${name}`),'undefined',name);
 g.run('init();state="playing";openSettings()');assert.equal(g.run('state'),'paused');
 const html=g.el('#modalContent').innerHTML;
 for(const marker of ['debug','balance-','数値設定','JSON'])assert.ok(!html.includes(marker),marker);
 assert.equal(g.run('settingsSections.length'),0);
 g.el('#echoEnabled').onchange({target:{checked:false}});assert.equal(g.run('meta.echoEnabled'),false);
 g.el('#resetPermanent').onclick();assert.equal(g.run('meta.armor'),0);assert.equal(g.run('meta.chips'),500);assert.equal(g.run('runMeta.armor'),1);
 g.el('#undoPermanent').onclick();assert.equal(g.run('meta.armor'),1);
 g.run('openHelp()');const help=g.run(`translateText(${JSON.stringify(g.el('#modalContent').innerHTML)},'en')`);
 assert.doesNotMatch(help,/[\u3040-\u30ff\u4e00-\u9fff]/);assert.ok(!help.includes('JSON'));
 g.run('state="playing";score=1250;wave=5;finish()');assert.equal(g.run('meta.chips'),522);
});

test('both builds derive HTML, defaults and version from one source; Pages publishes only release files',()=>{
 const root=path.join(__dirname,'..');const version=require('../package.json').version;
 assert.equal(version,'1.0.0');
 assert.equal(require('../package.json').license,'CC0-1.0');
 assert.equal(fs.readFileSync(path.join(root,'dist/LICENSE'),'utf8'),fs.readFileSync(path.join(root,'LICENSE'),'utf8'));
 const production=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
 const development=fs.readFileSync(path.join(root,'.dev/index.html'),'utf8');
 assert.ok(production.includes(`v${version}</span>`));assert.ok(development.includes(`v${version} DEV</span>`));
 assert.ok(!production.includes('dev/'));assert.ok(!fs.existsSync(path.join(root,'dist/dev')));
 assert.deepEqual(fs.readdirSync(path.join(root,'dist')).sort(),['.nojekyll','LICENSE','assets','index.html']);
 for(const dir of ['assets/js','assets/css'])for(const name of fs.readdirSync(path.join(root,dir))){
  const source=fs.readFileSync(path.join(root,dir,name),'utf8');
  assert.equal(fs.readFileSync(path.join(root,'dist',dir,name),'utf8'),source);
  assert.equal(fs.readFileSync(path.join(root,'.dev',dir,name),'utf8'),source);
 }
 const g=game();for(const field of g.run('BALANCE_FIELDS'))assert.equal(field[3],g.run(`DEFAULT_BALANCE[${JSON.stringify(field[0])}]`));
 const workflow=fs.readFileSync(path.join(root,'.github/workflows/pages.yml'),'utf8');assert.match(workflow,/path: dist/);
});


function installAudio(g){
 g.run(`
  audioStats={buffers:0,sources:[]};
  audioParam=()=>({value:0,setValueAtTime(v){this.value=v},linearRampToValueAtTime(v){this.value=v},exponentialRampToValueAtTime(v){this.value=v},cancelScheduledValues(){}});
  window.AudioContext=class {
   constructor(){this.currentTime=0;this.state='suspended';this.destination={};}
   resume(){this.state='running';return Promise.resolve();}
   createBuffer(channels,length,rate){audioStats.buffers++;const data=new Float32Array(length);return {duration:length/rate,length,sampleRate:rate,getChannelData:()=>data};}
   createGain(){return {gain:audioParam(),connect(){},disconnect(){}};}
   createBufferSource(){const source={connect(){},disconnect(){},start(when,offset){this.offset=offset;this.started=true},stop(){this.stopped=true}};audioStats.sources.push(source);return source;}
   createOscillator(){return {frequency:audioParam(),connect(){},disconnect(){},start(){},stop(){}};}
  };
 `);
}

test('music loop is deterministic, bounded, non-silent and has a clean loop boundary',async()=>{
 const g=game();installAudio(g);
 g.run('ctxTest=new window.AudioContext()');
 await g.run('createMusicBuffer(ctxTest).then(buffer=>loopA=buffer)');
 await g.run('createMusicBuffer(ctxTest).then(buffer=>loopB=buffer)');
 assert.equal(g.run('loopA.duration'),15);assert.equal(g.run('loopA.sampleRate'),22050);
 assert.equal(g.run('loopA.getChannelData(0).every((v,i)=>Number.isFinite(v)&&Math.abs(v)<1&&v===loopB.getChannelData(0)[i])'),true);
 assert.ok(g.run('loopA.getChannelData(0).reduce((sum,v)=>sum+v*v,0)/loopA.length')>.001);
 assert.ok(g.run('Math.abs(loopA.getChannelData(0)[0]-loopA.getChannelData(0).at(-1))')<.05);
});

test('music follows sound, pause, dialogs and visibility without duplicate playback',async()=>{
 const g=game();installAudio(g);
 g.run('syncMusic()');assert.equal(g.run('audioStats.buffers'),0);
 g.el('#sound').onclick();assert.equal(g.run('sound'),true);assert.equal(g.run('audioStats.sources.length'),0);
 g.run('start();for(let i=0;i<10;i++)syncMusic()');await g.run('syncMusic()');assert.equal(g.run('audioStats.sources.length'),1);assert.equal(g.run('audioStats.buffers'),1);
 assert.equal(g.run('musicSource.loop'),true);assert.equal(g.run('musicSource.offset'),0);
 g.run('audioCtx.currentTime=4;pause()');assert.equal(g.run('musicSource'),null);assert.equal(g.run('audioStats.sources[0].stopped'),true);
 g.run('pause()');assert.equal(g.run('musicSource.offset'),4);
 g.run('state="upgrade";syncMusic()');assert.equal(g.run('audioStats.sources.length'),2);
 g.run('openLab();syncMusic()');assert.equal(g.run('musicSource'),null);
 g.run('document.querySelector("#modal").close();syncMusic()');assert.equal(g.run('audioStats.sources.length'),3);
 g.run('document.hidden=true;syncMusic()');assert.equal(g.run('musicSource'),null);
 g.run('document.hidden=false;state="playing";syncMusic()');assert.equal(g.run('audioStats.sources.length'),4);
 g.el('#sound').onclick();assert.equal(g.run('sound'),false);assert.equal(g.run('musicSource'),null);
 g.el('#sound').onclick();assert.equal(g.run('audioStats.sources.length'),5);
 g.run('finish()');assert.equal(g.run('musicSource'),null);assert.equal(g.run('audioStats.buffers'),1);
 const unsupported=game();unsupported.el('#sound').onclick();assert.doesNotThrow(()=>unsupported.run('start();syncMusic();pause()'));
});


test('separate volume sliders persist, sanitize old data and survive permanent resets',()=>{
 const g=game();assert.equal(g.run('meta.bgmVolume'),.7);assert.equal(g.run('meta.sfxVolume'),1);
 g.run('openSettings()');
 assert.ok(g.el('#modalContent').innerHTML.includes('id="bgmVolume"'));assert.ok(g.el('#modalContent').innerHTML.includes('id="sfxVolume"'));
 g.el('#bgmVolume').oninput({target:{value:'25'}});g.el('#sfxVolume').oninput({target:{value:'0'}});
 assert.equal(g.run('meta.bgmVolume'),.25);assert.equal(g.run('meta.sfxVolume'),0);
 assert.equal(g.el('#bgmVolumeValue').textContent,'25%');assert.equal(g.el('#sfxVolumeValue').textContent,'0%');
 const reloaded=game(JSON.parse(g.storage.get('snake-overdrive-v1')));assert.equal(reloaded.run('meta.bgmVolume'),.25);assert.equal(reloaded.run('meta.sfxVolume'),0);
 g.run('meta.armor=1;resetPermanent();restorePermanent()');assert.equal(g.run('meta.bgmVolume'),.25);assert.equal(g.run('meta.sfxVolume'),0);
 const bad=game({bgmVolume:'loud',sfxVolume:999});assert.equal(bad.run('meta.bgmVolume'),.7);assert.equal(bad.run('meta.sfxVolume'),1);
 g.run('setAudioVolume("bgmVolume",Infinity);setAudioVolume("chips",999)');assert.equal(g.run('meta.bgmVolume'),.25);assert.equal(g.run('meta.chips'),0);
});

test('music and SFX gain levels change independently without restarting the loop',async()=>{
 const g=game();installAudio(g);g.el('#sound').onclick();g.run('start()');await g.run('syncMusic()');
 assert.equal(g.run('musicGain.gain.value'),.42);assert.equal(g.run('sfxGain.gain.value'),1);
 g.run('setAudioVolume("bgmVolume",0)');assert.equal(g.run('musicGain.gain.value'),0);assert.equal(g.run('sfxGain.gain.value'),1);
 g.run('setAudioVolume("sfxVolume",.35)');assert.equal(g.run('sfxGain.gain.value'),.35);assert.equal(g.run('musicGain.gain.value'),0);
 g.run('setAudioVolume("bgmVolume",.5)');assert.equal(g.run('musicGain.gain.value'),.3);assert.equal(g.run('audioStats.sources.length'),1);
 g.el('#sound').onclick();assert.equal(g.run('musicSource'),null);assert.equal(g.run('sfxGain.gain.value'),0);
 g.run('setAudioVolume("sfxVolume",.9)');assert.equal(g.run('sfxGain.gain.value'),0);
 g.el('#sound').onclick();assert.equal(g.run('sfxGain.gain.value'),.9);assert.equal(g.run('musicGain.gain.value'),.3);
});


test('movement tempo sync is a saved on/off setting with a fixed two-move beat',()=>{
 const g=game();assert.equal(g.run('meta.bgmSync'),true);assert.ok(Math.abs(g.run('musicTempo()')-60/(.22*2))<1e-8);
 g.run('wave=7');assert.ok(Math.abs(g.run('musicTempo()')-60/(.172*2))<1e-8);
 g.run('wave=100');assert.equal(g.run('musicTempo()'),300);
 g.run('openSettings()');const html=g.el('#modalContent').innerHTML;
 assert.ok(html.includes('id="bgmSync"'));assert.ok(!html.includes('bgmStepsPerBeat'));
 g.el('#bgmSync').onchange({target:{checked:false}});assert.equal(g.run('musicTempo()'),128);assert.equal(g.el('#musicTempoValue').textContent,'128.0 BPM');
 const reload=game(JSON.parse(g.storage.get('snake-overdrive-v1')));assert.equal(reload.run('meta.bgmSync'),false);
 g.run('setMusicSync("yes")');assert.equal(g.run('meta.bgmSync'),false);
 g.el('#bgmSync').onchange({target:{checked:true}});assert.equal(g.run('musicTempo()'),300);
 const bad=game({bgmSync:'off'});assert.equal(bad.run('meta.bgmSync'),true);
});

test('tempo changes keep pitch and musical position without aligning note timing to movement',async()=>{
 const g=game();installAudio(g);g.el('#sound').onclick();g.run('start()');await g.run('syncMusic()');
 assert.ok(Math.abs(g.run('musicBuffer.duration')-.22*2*32)<1/22050);
 assert.equal(g.run('musicBpm'),60/(.22*2));
 g.run('audioCtx.currentTime=2;setMusicSync(false)');await g.run('syncMusic()');assert.equal(g.run('musicBpm'),128);assert.equal(g.run('musicBuffer.duration'),15);
 assert.ok(Math.abs(g.run('musicOffset')-2*(60/(.22*2))/128)<1e-8);
 assert.equal(g.run('musicBuffer.sampleRate'),22050);
 g.run('setMusicSync(true)');assert.equal(g.run('musicBpm'),60/(.22*2));
 g.run('beforeWaveBeat=(musicOffset+audioCtx.currentTime-musicStartedAt)*musicBpm/60;state="upgrade";advanceWave(0)');await g.run('syncMusic()');assert.equal(g.run('wave'),2);
 assert.ok(Math.abs(g.run('musicBpm')-60/(.212*2))<1e-8);
 assert.ok(Math.abs(g.run('musicOffset*musicBpm/60-beforeWaveBeat'))<1e-8);
 const sources=g.run('audioStats.sources.length');g.run('for(let i=0;i<20;i++)syncMusic()');assert.equal(g.run('audioStats.sources.length'),sources);
 g.run('setMusicSync(false);setMusicSync(true)');assert.ok(g.run('musicBuffers.size')<=4);
});


test('unchanged HUD frames preserve mounted text and wave markup',()=>{
 const g=game();g.run('init();hud()');
 const wave=g.el('#wave'),score=g.el('#score');let markup=wave.innerHTML,text=score.textContent,writes=0;
 Object.defineProperty(wave,'innerHTML',{get:()=>markup,set:value=>{writes++;markup=value}});
 Object.defineProperty(score,'textContent',{get:()=>text,set:value=>{writes++;text=value}});
 g.run('for(let i=0;i<120;i++)hud()');assert.equal(writes,0);
 g.run('score+=10;hud()');assert.equal(writes,1);assert.equal(text,'000010');
 g.run('wave=2;hud()');assert.equal(writes,2);assert.equal(markup,'02<span>/07</span>');
});

test('localization visits changed subtrees once and ignores removed nodes',()=>{
 const g=game();g.run(`
 language='en';walked=[];
 const textNode=(value,parent)=>({nodeType:3,nodeValue:value,parentNode:parent,isConnected:true});
 changedRoot={nodeType:1,hasAttribute:()=>false,matches:()=>false,parentNode:document.documentElement,isConnected:true};
 changedText=textNode('ビルド',changedRoot);
 removedText=textNode('設定',null);removedText.isConnected=false;
 document.createTreeWalker=root=>{
   walked.push(root);let nodes=root===changedRoot?[changedRoot,changedText]:[root],index=0;
   return {currentNode:root,nextNode:()=>nodes[++index]||null};
 };
 localizeMutations([
   {type:'childList',addedNodes:[changedRoot,removedText]},
   {type:'characterData',target:changedText}
 ]);
 `);
 assert.equal(g.run('walked.length'),1);assert.equal(g.run('walked[0]===changedRoot'),true);
 assert.equal(g.run('changedText.nodeValue'),'Build');
 g.run("language='ja';localizeMutations([{type:'characterData',target:changedText}])");
 assert.equal(g.run('changedText.nodeValue'),'ビルド');
});

test('music synthesis yields to the event loop and late completion cannot unmute playback',async()=>{
 const g=game();installAudio(g);
 g.run(`
 scheduled=[];setTimeout=callback=>scheduled.push(callback);
 const realNow=Date.now;let synthClock=0;Date.now=()=>synthClock++;
 `);
 g.el('#sound').onclick();g.run('start()');
 assert.equal(g.run('audioStats.buffers'),0);assert.equal(g.run('scheduled.length'),1);
 g.run('scheduled.shift()()');assert.equal(g.run('audioStats.buffers'),0);assert.equal(g.run('scheduled.length'),1);
 const pending=g.run('syncMusic()');g.run('setSoundEnabled(false);while(scheduled.length)scheduled.shift()();Date.now=realNow');
 await pending;
 assert.equal(g.run('musicSource'),undefined);assert.equal(g.run('audioStats.sources.length'),0);
 assert.equal(g.run('audioStats.buffers'),1);g.run('setSoundEnabled(true)');
 assert.equal(g.run('audioStats.sources.length'),1);
});

test('tempo replacement keeps playback alive and rechecks current tempo after completion',async()=>{
 const g=game();installAudio(g);g.el('#sound').onclick();g.run('start()');await g.run('syncMusic()');
 g.run(`
 scheduled=[];setTimeout=callback=>scheduled.push(callback);originalSource=musicSource;
 setMusicSync(false);
 `);
 const pending=g.run('syncMusic()');assert.equal(g.run('musicSource===originalSource'),true);
 g.run('setMusicSync(true);while(scheduled.length)scheduled.shift()()');await pending;
 assert.equal(g.run('musicSource===originalSource'),true);assert.equal(g.run('audioStats.sources.length'),1);
 assert.equal(g.run('musicBpm'),60/(.22*2));g.run('setMusicSync(false)');
 assert.equal(g.run('audioStats.sources.length'),2);assert.equal(g.run('musicBpm'),128);
});


test('pickup squares use food colors without rings; destructive FX retain object colors',()=>{
 const g=game();g.run('init();fx=true;particles=[];rings=[];pickupEffect({x:4,y:4},"#ff8bae",1)');
 assert.equal(g.run('particles.every(p=>p.shape==="debris"&&p.color==="#ff8bae")'),true);
 assert.equal(g.run('rings.length'),0);
 g.run('particles=[];hitEnemy({x:5,y:4})');
 assert.equal(g.run('particles.some(p=>p.shape==="debris"&&p.color==="#65c9ff")'),true);
 g.run('particles=[];rings=[];fx=false;pickupEffect({x:4,y:4},"#ff8bae",8);impactEffect(4,4,"#ffae42","#ffd166",84,"bomb")');
 assert.equal(g.run('particles.length+rings.length'),0);
});

test('flat explosions use no gradient or large translucent fill and remain behind the snake',()=>{
 const g=game();g.run('init();fx=true;state="playing";snake=[{x:4,y:4}];blocks=[];food=[];enemies=[];particles=[];rings=[];impactEffect(4,4,"#ffae42","#ffd166",84,"bomb");updateEffects(.16)');
 g.drawCalls.length=0;g.run('draw()');
 assert.ok(!g.drawCalls.some(c=>/Gradient/.test(c.op)||c.shadowBlur>0));
 const rays=g.drawCalls.map((c,i)=>c.op==='stroke'&&c.strokeColor==='#ffae42'?i:-1).filter(i=>i>=0);
 const head=g.drawCalls.findIndex(c=>c.op==='fillRect'&&c.color==='#e6ff92');
 assert.ok(rays.length>0&&Math.max(...rays)<head);
 g.drawCalls.length=0;g.run('drawRings()');const bands=g.drawCalls.filter(c=>c.op==='fill');assert.deepEqual(bands.map(c=>c.color),['#ff6475','#ffae42']);assert.ok(bands.every(c=>c.args[0]==='evenodd'));
 g.drawCalls.length=0;g.run('fx=false;drawRings();drawParticles()');assert.equal(g.drawCalls.length,0);
});


test('movement uses light square and diamond outlines at the supplied departure cell',()=>{
 const g=game();g.run('init();fx=true;rings=[];particles=[];motion({x:4,y:5});motion({x:8,y:9},true)');
 assert.equal(g.run('rings[0].kind'),'motion-square');assert.equal(g.run('rings[1].kind'),'motion-diamond');
 assert.equal(g.run('rings[0].x'),4.5*28);assert.equal(g.run('rings[1].y'),9.5*28);
 g.drawCalls.length=0;g.run('drawRings()');
 assert.ok(g.drawCalls.some(c=>c.op==='rect'));assert.ok(!g.drawCalls.some(c=>c.op==='fill'||c.op==='arc'));
 assert.equal(g.run('particles.length'),0);
 g.run('rings=[];fx=false;motion({x:4,y:5})');assert.equal(g.run('rings.length'),0);
});


test('result records require a strict improvement and celebrate without awarding twice',()=>{
 const g=game({best:1000});g.run('init();fx=true;state="playing";score=1250;wave=5;finish()');
 const html=g.el('#overlay').innerHTML;
 assert.ok(html.includes('new-record'));assert.ok(html.includes('ハイスコア更新！'));
 assert.ok(html.includes('<span>最高記録</span> <b>1,250</b>'));assert.equal(g.el('#best').textContent,'001250');
 assert.equal((html.match(/<i style=/g)||[]).length,240);
 assert.equal(g.run('meta.best'),1250);const chips=g.run('meta.chips');g.run('finish()');assert.equal(g.run('meta.chips'),chips);
 const tied=game({best:1000});tied.run('init();fx=true;state="playing";score=1000;finish()');
 assert.ok(!tied.el('#overlay').innerHTML.includes('new-record'));assert.equal((tied.el('#overlay').innerHTML.match(/<i style=/g)||[]).length,72);
 const off=game({best:1000});off.run('init();fx=false;state="playing";score=1250;finish()');
 assert.ok(off.el('#overlay').innerHTML.includes('ハイスコア更新！'));assert.ok(!off.el('#overlay').innerHTML.includes('result-confetti'));assert.ok(!off.el('#overlay').innerHTML.includes('result-animated'));
 assert.equal(g.run('translateText("ハイスコア更新！","en")'),'NEW HIGH SCORE!');
 assert.equal(g.run('translateText("最高記録","en")'),'BEST SCORE');
 const lower=game({best:2500});lower.run('init();score=500;state="playing";finish()');assert.ok(lower.el('#overlay').innerHTML.includes('<span>最高記録</span> <b>2,500</b>'));
});

test('developer FX preview uses shared UI and never modifies records or chips',()=>{
 const g=game({best:1000,chips:321},null,null,'.dev/effects.html');
 const before=g.storage.get('snake-overdrive-v1');
 for(const scene of ['effects','chain','chain-high','chain-max','damage','notice','result','record','wave']){
  g.el('#previewScene').value=scene;g.run('previewEffects()');
  assert.equal(g.storage.get('snake-overdrive-v1'),before);assert.equal(g.run('meta.best'),1000);assert.equal(g.run('meta.chips'),321);
 }
 g.el('#previewScene').value='record';g.run('previewEffects()');assert.ok(g.el('#overlay').innerHTML.includes('new-record'));
 const root=path.join(__dirname,'..');const release=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
 assert.ok(!release.includes('debugEffects'));assert.ok(!fs.existsSync(path.join(root,'dist/effects.html')));
 assert.ok(fs.readFileSync(path.join(root,'.dev/index.html'),'utf8').includes('debugEffects'));
});
