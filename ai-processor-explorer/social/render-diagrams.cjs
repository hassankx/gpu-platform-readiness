// Rasterize the existing original diagram renderers for deterministic social video.
// Requires Node.js and sharp. Output is intermediate material, not a new design.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),out=process.argv[2];
if(!out)throw new Error('Usage: node social/render-diagrams.cjs OUTPUT_DIRECTORY');
fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const script=html.match(/<script>([\s\S]*?)<\/script>/)[1].split("let current='cpu'")[0];
const esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
class E{constructor(tag){this.tag=tag;this.attrs={};this.children=[];this.textContent='';}setAttribute(k,v){this.attrs[k]=String(v)}append(e){this.children.push(e)}toString(){return '<'+this.tag+Object.entries(this.attrs).map(([k,v])=>' '+k+'="'+esc(v)+'"').join('')+'>'+esc(this.textContent)+this.children.join('')+'</'+this.tag+'>'}}
const ctx={document:{createElementNS:(_,t)=>new E(t)}};vm.createContext(ctx);vm.runInContext(script+';this.data=PROCESSORS;this.r=renderers;',ctx);
const colors={cpu:'#adacff',gpu:'#62dfeb',tpu:'#ffaf83',npu:'#f2d16f',lpu:'#ff99cd',dpu:'#8dffcb'};
const blend=(a,b)=>'#'+[1,3,5].map(k=>Math.round(parseInt(a.slice(k,k+2),16)*.22+parseInt(b.slice(k,k+2),16)*.78).toString(16).padStart(2,'0')).join('');
let css=html.match(/<style>([\s\S]*?)<\/style>/)[1].match(/\.diagram text[\s\S]*?(?=@media\(max-width:1000px\))/)[0];
(async()=>{for(const p of ctx.data){
const palette={'--text':'#f1f5fc','--muted':'#a4b2c9','--panel2':'#162338','--line':'#293851','--bg':'#080e1b','--tone':colors[p.id]};
let scoped=css.replaceAll('color-mix(in srgb,var(--tone) 22%,var(--panel2))',blend(colors[p.id],palette['--panel2']));for(const[k,v]of Object.entries(palette))scoped=scoped.replaceAll('var('+k+')',v);
scoped+=' .diagram .packet{display:none}.diagram .pulse,.diagram .travel{animation:none}';
for(let phase=0;phase<6;phase++){const svg=new E('svg');svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width',960);svg.setAttribute('height',560);svg.setAttribute('viewBox','0 0 480 280');svg.setAttribute('class','diagram');const style=new E('style');style.textContent=scoped;svg.append(style);ctx.r[p.id](svg,phase,'training');await sharp(Buffer.from(String(svg))).png().toFile(path.join(out,p.id+'-'+phase+'.png'));}
}
fs.writeFileSync(path.join(out,'processors.json'),JSON.stringify(ctx.data));console.log('Rendered 36 original diagram states.');})();
