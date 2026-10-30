export class Narrator {
  constructor(){this.token=0;this.muted=false;this.finish=null;}
  stop(){this.token++;this.finish?.();this.finish=null;window.speechSynthesis?.cancel();}
  say(text){
    this.stop();const token=this.token;
    if(this.muted||!window.speechSynthesis||!window.SpeechSynthesisUtterance)return Promise.resolve();
    return new Promise(resolve=>{
      let timer,done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);if(this.token===token)this.finish=null;resolve();};this.finish=finish;
      const u=new SpeechSynthesisUtterance(text);u.lang='ja-JP';u.rate=.95;u.pitch=1;u.volume=.85;
      const voices=speechSynthesis.getVoices();const available=voices.filter(v=>/^ja(?:[-_]|$)/i.test(v.lang)&&!/Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley/i.test(v.name));
      const voice=available.find(v=>/premium|拡張|Kyoko|Nanami|Google/i.test(v.name))||available[0];
      if(voice)u.voice=voice;else if(voices.length){finish();return;}
      u.onend=finish;u.onerror=finish;timer=setTimeout(()=>{if(this.token===token)speechSynthesis.cancel();finish();},Math.max(7000,text.length*500));
      try{speechSynthesis.speak(u);}catch{finish();}
    });
  }
}
