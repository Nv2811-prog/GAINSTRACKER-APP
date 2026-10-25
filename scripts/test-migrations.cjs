// Migration safety tests — run: node scripts/test-migrations.cjs "Gainstracker app not complete.html"
// Exercises the versioned migration runner against a copy of OLD data (templates/exercises deleted).
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync(process.argv[2],'utf8');
const js=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const slice=(a,b)=>{const i=js.indexOf(a),j=js.indexOf(b,i);assert(i>=0&&j>i,'marker '+a);return js.slice(i,j);};
const migBlock=slice('const MIGRATION_BACKUP_KEY','/* --- Live-session crash/kill recovery');
const loadBlock=slice('function blankData(){','/* ========================= VERSIONED DATA MIGRATIONS');

function sandbox(raw,opts={}){
  const store=new Map();if(raw!=null)store.set('gt_data',raw);
  const ls={getItem:k=>store.has(k)?store.get(k):null,setItem:(k,v)=>{if(ls.quota&&k===ls.quota)throw new Error('QuotaExceeded');store.set(k,String(v));},removeItem:k=>store.delete(k),quota:null};
  const ctx={localStorage:ls,console:{error(){} },DEF_PLATES:[25,20],JSON,Date,Object,Array,String,Number,Error};
  vm.createContext(ctx);vm.runInContext((loadBlock+'\n'+migBlock).replace(/\blet state=/,'var state='),ctx);
  if(!opts.real)vm.runInContext('MIGRATIONS.length=0',ctx);
  return {ctx,store,ls};
}
// OLD DATA copy: templates deleted/renamed, a custom exercise removed, real logged history, no dataVersion.
const old={u:{name:'QA',activeGym:'Fitness X',gyms:['Fitness X'],_dbV3:true,_xpV2:true,_gymV1:true,_rirMig:true,metric:'rir'},
  splits:[{id:'mine',name:'My hacked split',days:[{name:'Push renamed',exercises:['Barbell Bench Press']}]}],activeSplitId:'mine',
  workouts:[{id:'w1',date:'2026-10-10T10:00:00Z',name:'Push renamed',exercises:[{name:'T-Bar Row',sets:[{w:60,r:8,type:'NRM',done:true}]},{name:'Barbell Wrist Curl',sets:[{w:30,r:12,type:'NRM',done:true}]}],prs:[]}],
  prsByGym:{'Fitness X':{'T-Bar Row':{orm:76,w:60,r:8}}},customEx:[],muscleVol:{back:500}};
const RAW=JSON.stringify(old);
let pass=0;const ok=(c,m)=>{assert(c,m);pass++;console.log('  ✓',m);};

// 1. No pending migrations → total no-op.
{const {ctx,store}=sandbox(RAW);ctx.load();ctx.runMigrations();
 ok(!store.has('gt_data_backup'),'no pending steps → no backup written, nothing touched');}

// 2. A real step lands once, backs up first, keeps history byte-identical, re-links prs.
const addPlan=`MIGRATIONS.push({v:1,name:'test plan',run:d=>{const has=(d.splits||[]).some(s=>s.id==='plan8');
  return has?d:Object.assign({},d,{splits:(d.splits||[]).concat([{id:'plan8',name:'8-day',days:[{name:'A',exercises:['T-Bar Row']},{name:'Rest',rest:true,exercises:[]}]}])});}});`;
{const {ctx,store}=sandbox(RAW);vm.runInContext(addPlan,ctx);ctx.load();
 const wBefore=JSON.stringify(ctx.state.data.workouts);ctx.runMigrations();
 ok(store.get('gt_data_backup')===RAW,'backup key holds the exact pre-migration data');
 ok(ctx.state.data.dataVersion===1,'dataVersion bumped to 1');
 ok(ctx.state.data.splits.filter(s=>s.id==='plan8').length===1,'new plan present exactly once');
 ok(ctx.state.data.splits.some(s=>s.id==='mine'),'user\'s own (edited) split kept');
 ok(JSON.stringify(ctx.state.data.workouts)===wBefore,'logged workouts/sets/weights byte-identical');
 ok(ctx.state.data.prs===ctx.state.data.prsByGym['Fitness X'],'d.prs re-linked to active gym record book');
 ok(JSON.parse(store.get('gt_data')).dataVersion===1,'persisted to gt_data');
 // 3. Re-run at boot: version gate → no duplicate. Re-run the step itself: idempotent.
 ctx.runMigrations();ok(ctx.state.data.splits.filter(s=>s.id==='plan8').length===1,'second boot: no duplicate');
 ctx.state.data.dataVersion=0;ctx.runMigrations();ok(ctx.state.data.splits.filter(s=>s.id==='plan8').length===1,'forced re-run of the step: still no duplicate');}

// 4. A step that touches a logged weight is rejected wholesale.
{const {ctx,store}=sandbox(RAW);vm.runInContext(`MIGRATIONS.push({v:1,name:'bad',run:d=>{d.workouts[0].exercises[0].sets[0].w=999;d.splits=[];return d;}});`,ctx);
 ctx.load();const before=JSON.stringify(ctx.state.data);ctx.runMigrations();
 ok(JSON.stringify(ctx.state.data)===before,'history-altering step rejected: state untouched');
 ok(store.get('gt_data')===RAW,'history-altering step rejected: saved data untouched');
 ok(JSON.parse(store.get('gt_migration_error')).message.includes('logged workouts'),'rejection reason recorded');}

// 5. A step that throws → nothing changes.
{const {ctx,store}=sandbox(RAW);vm.runInContext(`MIGRATIONS.push({v:1,name:'boom',run:()=>{throw new Error('boom')}});`,ctx);
 ctx.load();ctx.runMigrations();ok(store.get('gt_data')===RAW&&!ctx.state.data.dataVersion,'throwing step: data untouched, retries next launch');}

// 6. Backup can't be written (storage full) → no migration at all.
{const {ctx,store,ls}=sandbox(RAW);vm.runInContext(addPlan,ctx);ls.quota='gt_data_backup';ctx.load();ctx.runMigrations();
 ok(store.get('gt_data')===RAW&&!ctx.state.data.dataVersion,'no backup possible → no migration');}

// 7. Old backup WITHOUT _dbV3 but with history: load() must no longer wipe it.
{const legacy=JSON.parse(RAW);delete legacy.u._dbV3;const {ctx}=sandbox(JSON.stringify(legacy));ctx.load();
 ok(ctx.state.data.workouts.length===1&&ctx.state.data.workouts[0].exercises[0].sets[0].w===60,'old backup without _dbV3 keeps its workouts on load');}


// ===== The real v1 migration: 8-day cycle on OLD data (templates edited, exercises deleted) =====
const coreTxt=js.slice(js.indexOf('const CORE_EX = ')+16,js.indexOf('const M12='));
const CORE=new Set(eval(coreTxt.trim().replace(/;\s*$/,'')).map(e=>e.n));
{const {ctx,store}=sandbox(RAW,{real:true});ctx.load();const wBefore=JSON.stringify(ctx.state.data.workouts);ctx.runMigrations();
 const d=ctx.state.data,cyc=d.splits.filter(s=>s.id==='cycle8');
 ok(cyc.length===1,'8-day cycle present exactly once');
 ok(d.activeSplitId==='cycle8v2'&&d.activeGymSplits['Fitness X']==='cycle8v2'&&d.splits.some(s=>s.id==='cycle8'),'v1 installs the 8-day cycle, v3 then makes its v2 the active plan (old one kept)');
 const days=cyc[0].days;ok(days.length===8&&days.filter(x=>x.rest).length===3,'8 days: 5 sessions + 3 rest');
 const sum=i=>Object.values(days[i].plan).reduce((a,v)=>a+v.s,0);
 ok([sum(0),sum(3),sum(6),sum(1),sum(4)].join()==='18,19,18,16,16','set totals match the plan (A18 B19 C18 / A16 B16)');
 ok(days[6].plan['Pec Deck Fly'].opt===1,'Pec Deck Fly marked optional');
 const all=[...new Set(days.flatMap(x=>x.exercises))];const missing=all.filter(n=>!CORE.has(n));
 ok(!missing.length,'every lift exists in the exercise library'+(missing.length?' — missing: '+missing:''));
 ok(d.splits.some(s=>s.id==='mine'),'your own edited split is kept');
 ok(JSON.stringify(d.workouts)===wBefore,'history byte-identical after the real migration');
 ok(store.get('gt_data_backup')===RAW,'backup taken before the real migration');
 d.dataVersion=0;ctx.runMigrations();ok(ctx.state.data.splits.filter(s=>s.id==='cycle8').length===1,'re-run: still one copy');}
// Imported by code first (old app, no plan), migration runs later: no second copy, plan gets attached.
{const imp=JSON.parse(RAW);const {ctx:c0}=sandbox(RAW,{real:true});
 const plain=vm.runInContext('cycle8Split()',c0);plain.id='s123';plain.days.forEach(x=>delete x.plan);imp.splits.push(plain);
 const {ctx}=sandbox(JSON.stringify(imp),{real:true});ctx.load();ctx.runMigrations();const d=ctx.state.data;
 ok(d.splits.filter(s=>/^8-Day Cycle · /.test(s.name)).length===1,'imported-by-code copy reused, no duplicate');
 ok(d.splits.find(s=>s.id==='s123').days[0].plan['Plate-Loaded Chest Press'].s===2&&d.activeSplitId==='cycle8v2','imported copy given its set targets (v3 then activates the v2 cycle)');}

// ===== The real v2 migration: plan reps "5–8" → "5–10" (exact matches only; history untouched) =====
{const {ctx:c0}=sandbox(RAW,{real:true});
 const rewind=sp=>{sp.days.forEach(x=>{if(x.plan)Object.keys(x.plan).forEach(n=>{if(x.plan[n].r==='5–10')x.plan[n].r='5–8';});});return sp;};
 const rs=sp=>sp.days.flatMap(x=>x.plan?Object.values(x.plan).map(v=>v.r):[]);
 const noR=sp=>JSON.stringify(sp.days.map(x=>x.plan?Object.fromEntries(Object.entries(x.plan).map(([n,v])=>[n,Object.assign({},v,{r:0})])):null));
 const cyc=rewind(vm.runInContext('cycle8Split()',c0));                          // the pre-v2 plan, as installed by v1 before today
 cyc.days[0].plan['Cable Lateral Raise'].r='8–12';                                // custom range → untouched
 cyc.days[0].plan['Lat Pulldown (Wide Grip)'].r='5-8';                            // ASCII hyphen = not exactly "5–8" → untouched
 const imp=rewind(vm.runInContext('cycle8Split()',c0));imp.id='s123';             // imported-by-code copy (same name, other id)
 const mine={id:'mine2',name:'Mine',days:[{name:'A',exercises:['T-Bar Row'],plan:{'T-Bar Row':{s:2,r:'5–8'}}}]};
 const v1=JSON.parse(RAW);v1.dataVersion=1;v1.splits=v1.splits.concat([cyc,imp,mine]);v1.activeSplitId='cycle8';
 const RAW1=JSON.stringify(v1),expected=rs(cyc).filter(r=>r==='5–8').length;
 ok(expected>=10&&rs(cyc).every(r=>r!=='5–10'),'fixture is a faithful pre-v2 plan ('+expected+' lifts at "5–8", none at "5–10")');
 const {ctx,store}=sandbox(RAW1,{real:true});ctx.load();const wBefore=JSON.stringify(ctx.state.data.workouts);ctx.runMigrations();
 const d=ctx.state.data,c2=d.splits.find(s=>s.id==='cycle8'),i2=d.splits.find(s=>s.id==='s123'),m2=d.splits.find(s=>s.id==='mine2');
 ok(d.dataVersion===4,'dataVersion bumped 1 → 4 (v2 + v3 + v4)');
 ok(rs(c2).every(r=>r!=='5–8')&&rs(c2).filter(r=>r==='5–10').length===expected,'every exact "5–8" in the 8-day cycle is now "5–10"');
 ok(c2.days[0].plan['Cable Lateral Raise'].r==='8–12'&&c2.days[0].plan['Lat Pulldown (Wide Grip)'].r==='5-8','custom ranges (8–12, 5-8) untouched');
 ok(rs(c2).filter(r=>r==='6–10').length===rs(cyc).filter(r=>r==='6–10').length,'existing 6–10 targets untouched');
 ok(noR(c2)===noR(cyc),'only the rep strings changed (set counts, optional flags, order intact)');
 ok(rs(i2).every(r=>r!=='5–8')&&rs(i2).includes('5–10'),'imported copy of the 8-day split (same name) updated too');
 ok(m2.days[0].plan['T-Bar Row'].r==='5–8','your own split keeps its "5–8"');
 ok(JSON.stringify(d.workouts)===wBefore,'workouts byte-identical after v2');
 ok(store.get('gt_data_backup')===RAW1,'backup taken before v2');
 const after=JSON.stringify(d.splits);d.dataVersion=1;ctx.runMigrations();ok(JSON.stringify(ctx.state.data.splits)===after,'idempotent: forced re-run changes nothing');
 // brand-new install path: v1 installs the (already 5–10) plan, v2 is a no-op
 const {ctx:cf}=sandbox(RAW,{real:true});cf.load();cf.runMigrations();const f=cf.state.data;
 ok(f.dataVersion===4&&new Set(rs(f.splits.find(s=>s.id==='cycle8'))).size===2&&rs(f.splits.find(s=>s.id==='cycle8')).every(r=>r==='5–10'||r==='6–10'),'fresh v0 → v2: plan only holds 5–10 / 6–10');}

// ===== The real v3 migration: 8-day cycle v2 (identical upper days) added + activated; old split untouched =====
{const {ctx:c0}=sandbox(RAW,{real:true});
 const v2=JSON.parse(RAW);v2.dataVersion=2;const cyc=vm.runInContext('cycle8Split()',c0);
 v2.splits=v2.splits.concat([cyc]);v2.activeSplitId='cycle8';v2._nextDay=6;
 const RAW2=JSON.stringify(v2),cycBefore=JSON.stringify(cyc);
 const {ctx,store}=sandbox(RAW2,{real:true});ctx.load();const wBefore=JSON.stringify(ctx.state.data.workouts);ctx.runMigrations();
 const d=ctx.state.data,n2=d.splits.find(s=>s.id==='cycle8v2');
 ok(d.dataVersion===4&&!!n2,'v3 adds the 8-day cycle v2');
 ok(JSON.stringify(n2.from)==='["cycle8"]','v4: the v2 cycle remembers the old cycle as its lineage');
 ok(d.activeSplitId==='cycle8v2'&&d._nextDay===6,'v2 cycle is active and the cycle position is kept');
 ok(JSON.stringify(d.splits.find(s=>s.id==='cycle8'))===cycBefore,'the old 8-day split is untouched (one tap to switch back)');
 const ups=[0,3,6].map(i=>n2.days[i]);
 ok(ups.every(x=>x.exercises.slice(0,12).join('|')===ups[0].exercises.slice(0,12).join('|')),'all three upper days share one exercise list in one order');
 ok(!JSON.stringify(n2).includes('Pec Deck Fly')&&ups.every(x=>x.plan['High-to-Low Cable Row']&&x.plan['Machine Shoulder Press']&&x.plan['Reverse-Grip Cable Curl']&&x.plan['Incline Machine Chest Press'].s===2),'high-to-low row, shoulder press and reverse curls every upper day; incline always 2; no pec deck fly');
 ok(!ups[0].plan['Reverse Pec Deck']&&ups[1].exercises.at(-1)==='Reverse Pec Deck'&&ups[2].exercises.at(-1)==='Reverse Pec Deck','reverse pec deck is the last lift on B and C only');
 const lows=[1,4].map(i=>n2.days[i]);
 ok(lows[0].exercises.join('|')===lows[1].exercises.join('|')&&lows[0].plan['Hip Hinge (Erectors)'].s===1&&lows[1].plan['Hip Hinge (Erectors)'].s===2,'both lower days share one exercise list in one order; only set counts differ');
 const work=x=>Object.entries(x.plan).filter(([n])=>n!=='Cable Rope Crunch').reduce((a,[,p])=>a+p.s,0);
 ok(ups.concat(lows).every(x=>work(x)<=20),'every training day is at most 20 working sets (abs not counted)');
 ok(JSON.stringify(d.workouts)===wBefore,'workouts byte-identical after v3');
 ok(store.get('gt_data_backup')===RAW2,'backup taken before v3');
 const after=JSON.stringify(d.splits);d.dataVersion=2;ctx.runMigrations();
 ok(JSON.stringify(ctx.state.data.splits)===after&&ctx.state.data.splits.filter(s=>s.id==='cycle8v2').length===1&&ctx.state.data._nextDay===6,'idempotent: re-run adds nothing and keeps the position');
 // someone using their OWN split: v3 adds the new plan but does not switch them
 const own=JSON.parse(RAW);own.dataVersion=2;own.splits=own.splits.concat([cyc]);own.activeSplitId='mine';
 const {ctx:co}=sandbox(JSON.stringify(own),{real:true});co.load();co.runMigrations();
 ok(co.state.data.activeSplitId==='mine'&&co.state.data.splits.some(s=>s.id==='cycle8v2'),'a different active split is never switched');}

// ===== The real v4 migration: lineage on the v2 cycle only (old cycle + imported copies by name), nothing else touched =====
{const {ctx:c0}=sandbox(RAW,{real:true});
 const v3=JSON.parse(RAW);v3.dataVersion=3;const cyc=vm.runInContext('cycle8Split()',c0),imp=vm.runInContext('cycle8Split()',c0),v2c=vm.runInContext('cycle8v2Split()',c0);
 imp.id='s123';v3.splits=v3.splits.concat([cyc,imp,v2c]);v3.activeSplitId='cycle8v2';
 const RAW3=JSON.stringify(v3);
 const {ctx,store}=sandbox(RAW3,{real:true});ctx.load();const wBefore=JSON.stringify(ctx.state.data.workouts),others=JSON.stringify(ctx.state.data.splits.filter(s=>s.id!=='cycle8v2'));ctx.runMigrations();
 const d=ctx.state.data,n2=d.splits.find(s=>s.id==='cycle8v2');
 ok(d.dataVersion===4&&JSON.stringify(n2.from)==='["cycle8","s123"]','v4: lineage = the old cycle and its imported copy');
 ok(JSON.stringify(d.splits.filter(s=>s.id!=='cycle8v2'))===others&&JSON.stringify(Object.assign({},n2,{from:undefined}))===JSON.stringify(Object.assign({},v2c,{from:undefined})),'v4 touches nothing but that one field');
 ok(JSON.stringify(d.workouts)===wBefore&&store.get('gt_data_backup')===RAW3,'v4: workouts byte-identical, backup taken');
 const after=JSON.stringify(d.splits);d.dataVersion=3;ctx.runMigrations();
 ok(JSON.stringify(ctx.state.data.splits)===after,'v4 idempotent');}

// ===== seedSets honours the plan's set count, and every set carries its row's last numbers =====
{const fn=js.slice(js.indexOf('function withPrev('),js.indexOf('/* ========================= SCIENCE-BASED FATIGUE'))+js.slice(js.indexOf('function seedSets('),js.indexOf('function setReadiness('));
 const c={};vm.createContext(c);vm.runInContext('function lastSetFor(){return [{w:20,r:10,type:"W"},{w:80,r:7,type:"NRM"},{w:80,r:6,type:"NRM"},{w:75,r:8,type:"NRM"}];}\n'+fn,c);
 const five=vm.runInContext('seedSets("x",{s:5,r:"5–10"})',c);
 ok(five.length===5&&five[2].prevW===75&&five[3].prevW===75&&five[4].prevR===8&&five.every(s=>s.type==="NRM"&&s.w===""),'plan 5 sets after a 3-set session → the extra sets show the last working set (never blank)');
 const sw=vm.runInContext('withPrev("x",[{type:"NRM",prevW:999,prevR:1},{type:"W",prevW:999}],true)',c);
 ok(sw[0].prevW===80&&sw[1].prevW===20,'withPrev re-stamps working and warm-up sets from the newest outing');
 const two=vm.runInContext('seedSets("x",{s:2,r:"5–8"})',c);
 ok(two.length===2&&two[0].prevW===80&&two[1].prevR===6,'plan 2 sets → exactly 2 sets, last session\'s working numbers shown');
 ok(vm.runInContext('seedSets("x").length',c)===4,'no plan → old behaviour (copies last session)');}

// ===== Import code round-trip (carries the plan, rejects junk targets) =====
{const blk=js.slice(js.indexOf('function encodeSplit('),js.indexOf('function shareSplit('));
 const c={btoa,atob,escape,unescape,now:()=>1};vm.createContext(c);vm.runInContext(blk,c);
 const {ctx:c0}=sandbox(RAW,{real:true});const sp=vm.runInContext('cycle8Split()',c0);
 c.sp=sp;const code=vm.runInContext('encodeSplit(sp)',c);c.code=code;const back=vm.runInContext('decodeSplit(code)',c);
 ok(code.startsWith('GTSPL1:')&&back.name===sp.name&&back.days.length===8,'code decodes to the same 8-day split');
 ok(JSON.stringify(back.days.map(x=>x.plan||null))===JSON.stringify(sp.days.map(x=>x.plan||null)),'set/rep targets survive the code');
 c.bad='GTSPL1:'+Buffer.from(JSON.stringify({n:'x',d:[{n:'A',e:['Leg Extension'],p:{'Leg Extension':{s:999,r:'x'},'Curl':{s:2,r:'6–10'}}}]})).toString('base64');
 const b2=vm.runInContext('decodeSplit(bad)',c);ok(!b2.days[0].plan['Leg Extension']&&b2.days[0].plan['Curl'].s===2,'malformed targets in a pasted code are dropped');
 require('fs').writeFileSync(process.env.CODE_OUT||'/dev/null',code);}

console.log(`\n${pass} checks passed`);
