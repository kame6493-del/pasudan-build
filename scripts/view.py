"""ref_NN の一部を拡大し、20px ごとの目盛りを付けて保存。python view.py NN x0 y0 x1 y1 [zoom]"""
import sys
from PIL import Image, ImageDraw
from pathlib import Path
R=Path(__file__).resolve().parents[2]/'ref'
n,x0,y0,x1,y1=sys.argv[1],*map(int,sys.argv[2:6]); z=float(sys.argv[6]) if len(sys.argv)>6 else 2
im=Image.open(R/f'ref_{n}.png').convert('RGB').crop((x0,y0,x1,y1))
im=im.resize((int(im.width*z),int(im.height*z)),Image.LANCZOS)
d=ImageDraw.Draw(im)
for x in range((x0//20+1)*20,x1,20):
    X=(x-x0)*z; d.line([(X,0),(X,8 if x%100 else 18)],fill=(255,0,0),width=2)
    if x%100==0: d.text((X+2,10),str(x),fill=(255,0,0))
for y in range((y0//20+1)*20,y1,20):
    Y=(y-y0)*z; d.line([(0,Y),(8 if y%100 else 18,Y)],fill=(255,0,0),width=2)
    if y%100==0: d.text((10,Y+2),str(y),fill=(255,0,0))
out=Path(__file__).parent/'view'/f'v{n}_{x0}_{y0}.png'; im.save(out); print(out)
