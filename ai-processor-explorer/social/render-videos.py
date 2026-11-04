"""Create captioned H.264 exports using the original diagram states.

Requires Pillow and ffmpeg. First run render-diagrams.cjs. Animation timing is
illustrative, not a hardware benchmark. No generative image/video model is used.
"""
import json, math, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

units=Path(sys.argv[1]); out=Path(sys.argv[2]); out.mkdir(parents=True,exist_ok=True)
data=json.loads((units/'processors.json').read_text())
FPS=24; SECONDS=2; N=FPS*SECONDS
BG='#080e1b'; PANEL='#101a2a'; TEXT='#f1f5fc'; MUTED='#a4b2c9'; LINE='#293851'
colors={'cpu':'#adacff','gpu':'#62dfeb','tpu':'#ffaf83','npu':'#f2d16f','lpu':'#ff99cd','dpu':'#8dffcb'}
fontroot=Path('/usr/share/fonts/truetype/dejavu')
def font(n,bold=False,mono=False):
 return ImageFont.truetype(str(fontroot/('DejaVuSansMono.ttf' if mono else 'DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')),n)
def wrap(d,text,face,width):
 lines=['']
 for word in text.split():
  candidate=(lines[-1]+' '+word).strip()
  if d.textlength(candidate,font=face)>width and lines[-1]:lines.append(word)
  else:lines[-1]=candidate
 return lines
def lines(d,x,y,text,face,width,color,gap=1.28):
 for line in wrap(d,text,face,width):d.text((x,y),line,font=face,fill=color);y+=int(face.size*gap)
 return y
def base(p,phase,vertical):
 h=1920 if vertical else 1080;im=Image.new('RGB',(1080,h),BG);d=ImageDraw.Draw(im);c=colors[p['id']]
 d.text((64,190 if vertical else 42),'PROCESSOR ATLAS  /  KHALED HASSAN',font=font(28 if vertical else 23,True),fill=MUTED)
 d.text((60,270 if vertical else 85),p['name'],font=font(142 if vertical else 98,True),fill=c)
 d.text((66,453 if vertical else 213),p['full'],font=font(36 if vertical else 28),fill=TEXT)
 if vertical:lines(d,64,530,p['short'],font(42),950,TEXT)
 top=680 if vertical else 291
 d.rounded_rectangle((40,top-22,1040,top+580),radius=26,fill=PANEL,outline=LINE,width=2)
 diagram=Image.open(units/(p['id']+'-'+str(phase)+'.png')).convert('RGBA')
 im.paste(diagram,(60,top),diagram)
 cy=1295 if vertical else 891
 d.text((64,cy),f"{p['name']}  |  STEP {phase+1} OF 6",font=font(26 if vertical else 20,True),fill=c)
 lines(d,64,cy+56 if vertical else cy+34,p['steps'][phase][0],font(47 if vertical else 33,True),950,TEXT)
 mathy=1490 if vertical else 984
 lines(d,64,mathy,p['steps'][phase][2],font(32 if vertical else 22,mono=True),950,c)
 d.text((64,1740 if vertical else 1040),'Explore the full interactive guide on GitHub',font=font(27 if vertical else 21),fill=MUTED)
 if vertical:d.text((64,1790),'github.com/hassankx/gpu-platform-readiness',font=font(21),fill=MUTED)
 return im,top
positions={
 'cpu':[(72,252),(157,105),(250,132),(382,132),(316,195),(414,252)],
 'gpu':[(68,245),(137,149),(193,121),(263,150),(435,139),(435,178)],
 'tpu':[(118,130),(145,130),(263,126),(315,165),(315,202),(413,145)],
 'npu':[(240,141),(82,146),(222,142),(298,146),(240,219),(240,219)],
 'lpu':[(312,104),(74,145),(145,127),(300,139),(192,255),(400,255)],
 'dpu':[(60,138),(133,139),(193,139),(274,139),(382,139),(431,181)]}
def dot(d,xy,c,label=None):
 x,y=xy;r=15 if label else 10;d.ellipse((x-r,y-r,x+r,y+r),fill=c,outline=BG,width=2)
 if label:d.text((x,y-1),label,font=font(19,True),fill=BG,anchor='mm')
def animate(im,p,phase,frame,top,scene):
 d=ImageDraw.Draw(im);c=colors[p['id']];t=min(1,frame/(N*.6));t=t*t*(3-2*t)
 a=positions[p['id']][max(0,phase-1)];b=positions[p['id']][phase]
 pt=(60+2*(a[0]+(b[0]-a[0])*t),top+2*(a[1]+(b[1]-a[1])*t))
 dot(d,pt,c,'✓' if p['id']=='dpu' else None)
 if p['id']=='dpu' and phase<3:
  bad=[(54,181),(145,181),(189,220)];aa=bad[max(0,phase-1)];bb=bad[phase]
  dot(d,(60+2*(aa[0]+(bb[0]-aa[0])*t),top+2*(aa[1]+(bb[1]-aa[1])*t)),'#ff997d','×')
 if p['id']=='gpu' and phase==2:
  tile=(frame//4)%16;r,col=divmod(tile,4);x=60+2*(173+col*47);y=top+2*(111+r*25)
  d.rounded_rectangle((x,y,x+74,y+36),radius=12,outline=c,width=4)
 if p['id']=='lpu' and phase==3:
  col=(frame//12)%3;x=60+2*(180+col*87);y=top+240
  d.rounded_rectangle((x,y,x+156,y+78),radius=14,outline=c,width=4)
 progress=(scene*6+phase+frame/N)/36
 y=1850 if im.height==1920 else 1070
 d.rectangle((60,y,1020,y+5),fill=LINE);d.rectangle((60,y,60+int(960*progress),y+5),fill=c)
 return im
def writer(name,h):
 return subprocess.Popen(['ffmpeg','-y','-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'1080x{h}','-r',str(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','veryfast','-crf','22','-threads','3','-pix_fmt','yuv420p','-movflags','+faststart',str(out/name)],stdin=subprocess.PIPE)
story=writer('Processor_Atlas_Facebook_Story.mp4',1920);linkedin=writer('Processor_Atlas_LinkedIn.mp4',1080)
try:
 for scene,p in enumerate(data):
  for phase in range(6):
   a,ay=base(p,phase,True);b,by=base(p,phase,False)
   if phase==3:
    a.save(out/(p['name']+'_Story_Preview.jpg'));b.save(out/(p['name']+'_LinkedIn_Preview.jpg'))
   for frame in range(N):
    story.stdin.write(animate(a.copy(),p,phase,frame,ay,scene).tobytes())
    linkedin.stdin.write(animate(b.copy(),p,phase,frame,by,scene).tobytes())
  print('Rendered',p['name'],flush=True)
finally:
 story.stdin.close();linkedin.stdin.close()
for process in [story,linkedin]:
 if process.wait()!=0:raise RuntimeError('Video encoding failed')
storydir=out/'Processor_Atlas_Stories';storydir.mkdir(exist_ok=True)
for i,p in enumerate(data):
 subprocess.run(['ffmpeg','-y','-hide_banner','-loglevel','error','-ss',str(i*12),'-i',str(out/'Processor_Atlas_Facebook_Story.mp4'),'-t','12','-an','-c:v','libx264','-preset','veryfast','-crf','22','-threads','2','-pix_fmt','yuv420p','-movflags','+faststart',str(storydir/f"{i+1:02}_{p['name']}_Story.mp4")],check=True)
print('Complete: 72-second square post, vertical master and six 12-second Story parts.',flush=True)
