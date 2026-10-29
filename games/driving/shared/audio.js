// All effects are synthesized here. No recordings, samples, or network services.
export class CabAudio {
  constructor(){this.context=null;this.muted=false;this.lastUpdate=0;this.lastRail=0;this.horns=[];}
  unlock(){
    try{
      if(!this.context){
        const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
        const c=this.context=new Context();
        this.master=c.createGain();this.master.gain.value=this.muted?0:.55;
        const limiter=c.createDynamicsCompressor();limiter.threshold.value=-15;limiter.ratio.value=8;
        this.master.connect(limiter).connect(c.destination);
        const buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate),data=buffer.getChannelData(0);let brown=0;
        for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.02)/1.02;data[i]=brown*3.5;}
        this.noiseBuffer=buffer;
        this.roll=c.createBufferSource();this.roll.buffer=buffer;this.roll.loop=true;
        this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=500;
        this.rollGain=c.createGain();this.rollGain.gain.value=0;this.roll.connect(this.filter).connect(this.rollGain).connect(this.master);this.roll.start();
        this.motor=c.createOscillator();this.motor.type='triangle';this.motor.frequency.value=65;
        this.motorGain=c.createGain();this.motorGain.gain.value=0;this.motor.connect(this.motorGain).connect(this.master);this.motor.start();
      }
      if(this.context.state==='suspended')this.context.resume().catch(()=>{});
    }catch{/* A silent browser remains playable. */}
  }
  setMuted(muted){this.muted=muted;if(this.context)this.master.gain.setTargetAtTime(muted?0:.55,this.context.currentTime,.04);}
  note(frequency,offset=0,duration=.25,volume=.12,type='sine'){
    const c=this.context;if(!c)return;const t=c.currentTime+offset,o=c.createOscillator(),g=c.createGain();
    o.type=type;o.frequency.value=frequency;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(volume,t+.018);g.gain.exponentialRampToValueAtTime(.0001,t+duration);
    o.connect(g).connect(this.master);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  horn(){
    this.unlock();const c=this.context;if(!c)return;
    const now=c.currentTime;this.horns=this.horns.filter(t=>now-t<.7);
    // Retrigger the attack, but bound summed volume under enthusiastic repeated taps.
    if(this.horns.length>=5)return;
    const volume=.16/(1+this.horns.length*.45);this.horns.push(now);
    this.note(392,0,.7,volume,'triangle');this.note(523,.015,.65,volume*.52,'sine');
  }
  whoosh(){const c=this.context;if(!c)return;const src=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain(),t=c.currentTime;src.buffer=this.noiseBuffer;f.type='highpass';f.frequency.value=600;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(.1,t+.15);g.gain.exponentialRampToValueAtTime(.0001,t+.6);src.connect(f).connect(g).connect(this.master);src.start(t);src.stop(t+.65);src.onended=()=>{src.disconnect();f.disconnect();g.disconnect();};}
  door(){this.whoosh();this.note(659,0,.18,.1);this.note(523,.22,.22,.08);}
  approach(){[659,784,659].forEach((f,i)=>this.note(f,i*.15,.23,.08));}
  arrival(perfect){(perfect?[523,659,784,1047]:[523,784,1047]).forEach((f,i)=>this.note(f,i*.13,.3,.12,'triangle'));}
  complete(){[523,659,784,1047,784,1047].forEach((f,i)=>this.note(f,i*.16,i===5?.7:.24,.13,'triangle'));}
  update(speed,notch,position,active=true,tunnel=false){
    const c=this.context;if(!c||c.currentTime-this.lastUpdate<.08)return;this.lastUpdate=c.currentTime;
    const v=active?Math.abs(speed):0,t=c.currentTime;
    this.motor.frequency.setTargetAtTime(58+v*9+(notch===1?18:0),t,.12);
    this.motorGain.gain.setTargetAtTime(v>.1?.014+v*.002:0,t,.15);
    this.rollGain.gain.setTargetAtTime(v*.007+(notch===-1&&v>1?.025:0),t,.15);
    this.filter.frequency.setTargetAtTime((tunnel?350:650)+v*45,t,.12);
    if(v>1&&Math.abs(position-this.lastRail)>9){this.lastRail=position;this.note(105,0,.045,.025,'triangle');this.note(95,.07,.04,.018,'triangle');}
  }
  quiet(){this.update(0,0,0,false);if(this.context){this.motorGain.gain.setTargetAtTime(0,this.context.currentTime,.03);this.rollGain.gain.setTargetAtTime(0,this.context.currentTime,.03);}}
  suspend(){this.quiet();this.context?.suspend().catch(()=>{});}
}
