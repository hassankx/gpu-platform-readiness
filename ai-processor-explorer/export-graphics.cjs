// Export the same six original diagram renderers as standalone SVG artwork.
// No browser, dependencies, network calls or hardware access are required.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'dist/index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1].split("let current='cpu'")[0];
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
class E{
 constructor(tag){this.tag=tag;this.attrs={};this.children=[];this.textContent='';this.style={setProperty:(k,v)=>{this.attrs.style=(this.attrs.style||'')+k+':'+v+';'}};}
 setAttribute(k,v){this.attrs[k]=String(v)}
 append(e){this.children.push(e)}
 replaceChildren(){this.children=[];this.textContent=''}
 toString(){return '<'+this.tag+Object.entries(this.attrs).map(([k,v])=>' '+k+'="'+esc(v)+'"').join('')+'>'+esc(this.textContent)+this.children.join('')+'</'+this.tag+'>'}
}
const context={document:{createElementNS:(_,tag)=>new E(tag)}};
vm.createContext(context);vm.runInContext(script+';this.data=PROCESSORS;this.renderers=renderers;',context);
const data=context.data,renderers=context.renderers;
const colors={cpu:'#adacff',gpu:'#62dfeb',tpu:'#ffaf83',npu:'#f2d16f',lpu:'#ff99cd',dpu:'#8dffcb'};
const css=html.match(/<style>([\s\S]*?)<\/style>/)[1].match(/\.diagram text[\s\S]*?(?=@media\(max-width:1000px\))/)[0];
const txt=(x,y,t,size=20,fill='#a4b2c9',weight=400)=>`<text x="${x}" y="${y}" font-family="system-ui,sans-serif" font-size="${size}" fill="${fill}" font-weight="${weight}">${esc(t)}</text>`;
function make(animated){
 let out=`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="1790" viewBox="0 0 1280 1790" role="img" aria-labelledby="title desc"><title id="title">Processor Atlas — Six processors explained</title><desc id="desc">Six original ${animated?'animated':'illustrated'} diagrams show CPU instruction execution, GPU parallel tiles, TPU matrix accumulation, NPU local inference, LPU scheduled inference and DPU packet filtering. The diagrams are conceptual and their timings are not benchmarks.</desc><style>:root{--text:#f1f5fc;--muted:#a4b2c9;--panel2:#162338;--line:#293851;--bg:#080e1b}${css}text{font-family:system-ui,sans-serif}@media(prefers-reduced-motion:reduce){.frame{opacity:0!important}.frame0{opacity:1!important}.diagram .pulse,.diagram .travel{animation:none}}</style><rect width="1280" height="1790" fill="#080e1b"/>`;
 out+=txt(56,55,'PROCESSOR ATLAS',17,'#8dffcb',650)+txt(56,117,'Six processors. Different kinds of work.',46,'#f1f5fc',650)+txt(56,158,'Follow the data • Compare the mechanisms • Choose by the workload',21)+txt(56,191,'Original diagrams by Khaled Hassan • Conceptual examples, not hardware benchmarks',16);
 data.forEach((p,i)=>{
  const x=56+(i%2)*594,y=229+Math.floor(i/2)*490,color=colors[p.id];
  out+=`<g transform="translate(${x} ${y})" style="--tone:${color}"><rect width="574" height="466" rx="20" fill="#101a2a" stroke="#293851"/>`;
  out+=txt(24,53,p.name,38,color,650)+txt(24,85,p.short,19,'#f1f5fc')+txt(24,111,p.full,15);
  const phases=animated?[0,1,2,3,4,5]:[[3,2,4,3,5,4][i]];
  phases.forEach(phase=>{
   const svg=new E('svg');svg.setAttribute('x',20);svg.setAttribute('y',129);svg.setAttribute('width',534);svg.setAttribute('height',312);svg.setAttribute('viewBox','0 0 480 280');svg.setAttribute('class','diagram');renderers[p.id](svg,phase,'training');
   out+=`<g class="frame frame${phase}" opacity="${animated?(phase===0?1:0):1}">`+svg;
   out+=txt(25,447,(phase+1)+'/6 · '+p.steps[phase][0],16,color);
   if(animated){const values=Array.from({length:7},(_,n)=>Math.min(n,5)===phase?1:0).join(';');out+=`<animate attributeName="opacity" values="${values}" keyTimes="0;0.1666667;0.3333333;0.5;0.6666667;0.8333333;1" dur="18s" calcMode="discrete" repeatCount="indefinite"/>`;}
   out+='</g>';
  });out+='</g>';
 });
 out+=txt(56,1739,'CPU coordinates · GPU parallelizes · TPU accumulates · NPU infers locally · LPU schedules · DPU offloads',17,'#f1f5fc')+txt(56,1770,animated?'Open this SVG in a browser to animate. Use the HTML explorer for pause, step controls and detailed explanations.':'See the interactive HTML explorer for six-step animations, worked examples, trade-offs and technical sources.',15);
 return out+'</svg>';
}
fs.writeFileSync(path.join(__dirname,'dist/processor-atlas.svg'),make(false));
fs.writeFileSync(path.join(__dirname,'dist/processor-atlas-animated.svg'),make(true));
console.log('Exported static and animated six-processor graphics.');
