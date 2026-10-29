export const ROUTE = [
  {name:'ひだまり', say:'ひだまり駅', length:360, limit:16, theme:'town', color:'#e7b84d', icon:'sun'},
  {name:'かわのほとり', say:'川のほとり駅', length:450, limit:18, theme:'river', color:'#68b4c2', icon:'water'},
  {name:'ほしぞら', say:'星空駅', length:520, limit:20, theme:'tunnel', color:'#9a95c8', icon:'star'}
];
export const BRAKE = 2.65;
export const classifyStop = (offset, assisted=false) => Math.abs(offset)<=4&&!assisted?'perfect':offset>18?'overrun':'arrival';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

// Metres / seconds. Pure simulation: rendering and sound never advance the journey.
export class TrainJourney {
  constructor(seed=0){
    this.seed=seed;this.leg=0;this.position=0;this.speed=0;this.notch=0;
    this.phase='doors-open';this.elapsed=0;this.phaseTime=0;this.visited=[];
    this.near=false;this.assisted=false;this.result=null;this.stopOffset=0;
    this.pendingNext=false;this.idle=0;this.earlyHint=false;this.events=[];
  }
  get route(){return ROUTE[this.leg];}
  get distance(){return this.route.length-this.position;}
  get doorsOpen(){return ['doors-open','boarding'].includes(this.phase);}
  get canDrive(){return this.phase==='ready'||this.phase==='running';}
  emit(type,extra={}){this.events.push({type,...extra});}
  drain(){return this.events.splice(0);}
  enter(phase){this.phase=phase;this.phaseTime=0;this.emit('phase',{phase});}
  setNotch(value){
    if(!this.canDrive)return false;
    this.notch=clamp(Math.round(value),-1,1);
    if(this.notch===1){this.earlyHint=false;this.idle=0;if(this.phase==='ready')this.enter('running');}
    return true;
  }
  door(){
    if(this.phase==='doors-open'){this.notch=0;this.enter('closing');return true;}
    if(this.phase==='arrived'){this.enter('opening');return true;}
    return false;
  }
  stop(){
    this.speed=0;this.notch=0;this.stopOffset=this.position-this.route.length;
    this.result=classifyStop(this.stopOffset,this.assisted);
    if(this.stopOffset>24){this.emit('overrun');this.enter('aligning');}
    else this.arrive();
  }
  arrive(){
    this.speed=0;this.notch=0;this.visited.push({station:this.leg,result:this.result,offset:this.stopOffset,assisted:this.assisted});
    this.enter('arrived');this.emit('arrival',{result:this.result});
  }
  step(dt){
    if(!Number.isFinite(dt)||dt<=0)return;
    // Large wall-clock gaps are subdivided by the caller, never teleported.
    dt=Math.min(dt,.05);this.elapsed+=dt;this.phaseTime+=dt;
    if(this.phase==='closing'&&this.phaseTime>=1.1){
      if(this.pendingNext){this.leg++;this.position=0;this.near=false;this.assisted=false;this.result=null;this.pendingNext=false;this.idle=0;this.earlyHint=false;}
      this.enter('ready');this.emit('ready');return;
    }
    if(this.phase==='opening'&&this.phaseTime>=.7){this.enter('boarding');return;}
    if(this.phase==='boarding'&&this.phaseTime>=2.1){
      if(this.leg===ROUTE.length-1)this.enter('complete');
      else{this.pendingNext=true;this.enter('doors-open');}
      return;
    }
    if(this.phase==='aligning'){
      const distance=this.position-this.route.length;
      const v=Math.min(7,Math.max(.8,distance*1.3));
      this.position=Math.max(this.route.length,this.position-v*dt);this.speed=-v;
      if(this.position-this.route.length<.15){this.position=this.route.length;this.arrive();}
      return;
    }
    if(this.phase!=='running')return;
    if(!this.near&&this.distance<135){this.near=true;this.emit('approach');}
    let acceleration=this.notch===1?2.15:this.notch===-1?-BRAKE:-.16;
    // First run: a gentle envelope brings an unattended power handle to the platform.
    if(this.leg===0&&this.distance<95){
      const safeSpeed=Math.sqrt(Math.max(0,2*1.9*(this.distance+2)));
      if(this.speed>safeSpeed||this.distance<1){acceleration=Math.min(acceleration,-2.15);this.assisted=true;}
    }
    // Later runs leave room to overshoot, then help back to the platform.
    if(this.distance<-6){acceleration=Math.min(acceleration,-4.5);this.assisted=true;}
    const before=this.speed;
    this.speed=clamp(this.speed+acceleration*dt,0,this.route.limit);
    this.position+=(before+this.speed)*.5*dt;
    if(this.speed<.04){
      this.speed=0;
      if(this.distance<=28){this.stop();return;}
      if(this.notch!==1){this.idle+=dt;if(this.idle>1.5&&!this.earlyHint){this.earlyHint=true;this.emit('early-stop');}}
    }else this.idle=0;
  }
}
