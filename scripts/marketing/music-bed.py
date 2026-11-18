import numpy as np, sys
from scipy.io import wavfile
from scipy.signal import butter, lfilter
SR=48000; DUR=float(sys.argv[2]) if len(sys.argv)>2 else 12.0; N=int(SR*DUR); t=np.arange(N)/SR
BPM=100; beat=60/BPM
def lp(x,f): b,a=butter(2,f/(SR/2)); return lfilter(b,a,x)
def hp(x,f): b,a=butter(2,f/(SR/2),'high'); return lfilter(b,a,x)
out=np.zeros(N)
# chords Am F C G, one bar (4 beats) each
prog=[[57,60,64],[53,57,60],[48,52,55],[55,59,62]]
mf=lambda m:440*2**((m-69)/12)
bar=4*beat
for i in range(int(DUR/bar)+1):
    s=int(i*bar*SR); e=min(N,int((i+1)*bar*SR)); 
    if s>=N: break
    tt=np.arange(e-s)/SR; env=np.minimum(1,tt/0.4)*np.minimum(1,(bar-tt)/0.4)
    ch=prog[i%4]; pad=sum(np.sin(2*np.pi*mf(m)*tt)+0.5*np.sin(2*np.pi*mf(m)*1.003*tt)+0.25*np.sin(2*np.pi*mf(m)*2*tt) for m in ch)
    out[s:e]+=0.05*lp(pad,1800)*env
    # bass on each beat
    for b in range(4):
        bs=s+int(b*beat*SR); be=min(N,bs+int(beat*SR))
        if bs>=N: break
        bt=np.arange(be-bs)/SR
        out[bs:be]+=0.16*np.sin(2*np.pi*mf(ch[0]-24)*bt)*np.exp(-bt*3)
# drums
nb=int(DUR/beat)
rng=np.random.default_rng(1)
for b in range(nb):
    s=int(b*beat*SR)
    if b>=4:  # drums enter after first bar
        L=int(0.35*SR); kt=np.arange(min(L,N-s))/SR
        out[s:s+len(kt)]+=0.5*np.sin(2*np.pi*(50+90*np.exp(-kt*30))*kt)*np.exp(-kt*9)
        if b%2==1:
            L=int(0.2*SR); n=min(L,N-s); out[s:s+n]+=0.18*hp(rng.standard_normal(n),1500)*np.exp(-np.arange(n)/SR*18)
    for h in (0,0.5):
        hs=s+int(h*beat*SR); n=min(int(0.05*SR),N-hs)
        if n>0: out[hs:hs+n]+=(0.05 if b>=2 else 0.025)*hp(rng.standard_normal(n),7000)*np.exp(-np.arange(n)/SR*60)
fade=np.minimum(1,t/0.6)*np.minimum(1,(DUR-t)/1.2)
out*=fade; out/=np.max(np.abs(out))*1.12
st=np.stack([out,np.roll(out,240)],1)
wavfile.write(sys.argv[1],SR,(st*32767).astype(np.int16))
