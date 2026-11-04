const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
class E{
 constructor(tag='div'){this.tag=tag;this.children=[];this.attrs={};this.textContent='';this.value='';this.hidden=false;this.disabled=false;this.dataset={};this.style={setProperty(){}};}
 setAttribute(k,v){this.attrs[k]=String(v)}
 append(e){this.children.push(e)}
 replaceChildren(){this.children=[];this.textContent=''}
 querySelector(sel){if(sel==='svg'){if(!this._svg)this._svg=new E('svg');return this._svg;}return null;}
 scrollIntoView(){}
 set innerHTML(v){this._innerHTML=v;}
 get innerHTML(){return this._innerHTML||''}
}
const html=fs.readFileSync(path.join(__dirname,'dist/index.html'),'utf8'),code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]),els=Object.fromEntries(ids.map(id=>[id,new E()]));
els.speed.value='2800';els['gpu-mode'].value='training';let timers=new Map(),lastTimer=0;
const doc={hidden:false,getElementById:id=>{assert(els[id],'Unknown ID '+id);return els[id]},createElement:t=>new E(t),createElementNS:(_,t)=>new E(t),addEventListener(){},querySelectorAll:()=>[...els.overview.children,...els.switcher.children],querySelector:sel=>{const m=sel.match(/data-processor="([^"]+)"/);return els.overview.children.find(e=>e.dataset.processor===m[1]).querySelector('svg');}};
const ctx={document:doc,window:{},matchMedia:()=>({matches:false}),setInterval:fn=>{const id=++lastTimer;timers.set(id,fn);return id},clearInterval:id=>timers.delete(id)};
vm.runInNewContext(code,ctx);const api=ctx.window.ProcessorAtlas;
function visible(e){return e.textContent+' '+e.children.map(visible).join(' ')}
function next(){els.step.onclick();}
for(const p of api.processors){api.choose(p.id);assert.equal(api.getState().phase,0);for(let n=0;n<6;n++){assert(visible(els['detail-scene']).trim().length);assert.equal(els['step-count'].textContent,'STEP '+String(n+1).padStart(2,'0')+' / 06');if(n<5)next();}assert.equal(els.step.disabled,true);}
// Semantic checks on the worked examples.
api.choose('tpu');for(let i=0;i<5;i++)next();assert.match(visible(els['detail-scene']),/19\s+22/);assert.match(visible(els['detail-scene']),/43\s+50/);
api.choose('dpu');for(let i=0;i<4;i++)next();assert.match(visible(els['detail-scene']),/dropped/);const countPackets=e=>(String(e.attrs.class||'').split(' ').includes('packet')?1:0)+e.children.reduce((sum,c)=>sum+countPackets(c),0);assert.equal(countPackets(els['detail-scene']),1);
api.choose('gpu');els['gpu-mode'].value='inference';for(let i=0;i<5;i++)next();assert.equal(els['step-title'].textContent,'Return the result');assert.match(els['step-math'].textContent,/weights unchanged/);assert.match(els.progress.children[5].attrs['aria-label'],/Return the result/);
els['gpu-mode'].value='training';els['gpu-mode'].onchange();assert.equal(els['step-title'].textContent,'Update weights');
api.choose('cpu');els.play.onclick();assert.equal(api.getState().playing,true);let tick=timers.values().next().value;tick();assert.equal(api.getState().phase,1);els.play.onclick();assert.equal(api.getState().playing,false);els.restart.onclick();assert.equal(api.getState().phase,0);
els.play.onclick();tick=timers.values().next().value;for(let i=0;i<5;i++)tick();assert.equal(api.getState().phase,5);assert.equal(api.getState().playing,false);
els['overview-play'].onclick();tick=timers.values().next().value;for(let i=0;i<5;i++)tick();assert.equal(api.getState().overviewPlaying,false);
console.log('PASS: 36 stages, matrix output, packet-drop display, training/inference labels, playback, restart and overview completion.');
