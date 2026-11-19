(function(root){
  'use strict';
  let sequence=0,current=null,voiceWait=null,transition=null;
  const synth=root.speechSynthesis;
  const ready=()=>!!(synth&&root.SpeechSynthesisUtterance);
  // Do not use novelty voices or a non-Japanese voice as a fallback.
  const novelty=/Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Albert|Bahh|Bells|Boing|Bubbles|Cellos|Jester|Organ|Trinoids|Whisper|Wobble|Zarvox/i;
  function voices(){return ready()?synth.getVoices().filter(v=>/^ja(?:[-_]|$)/i.test(v.lang||'')&&!novelty.test(v.name)):[];}
  function choose(){return voices().map((v,i)=>({v,i,score:(/premium|プレミアム/i.test(v.name)?100:0)+(/enhanced|拡張/i.test(v.name)?60:0)+(/Kyoko|Otoya|Google|Nanami|Keita|Haruka|Ayumi/i.test(v.name)?20:0)})).sort((a,b)=>b.score-a.score||a.i-b.i)[0]?.v||null;}
  function waitVoices(){
    if(!ready()||voices().length)return Promise.resolve();
    if(!voiceWait)voiceWait=new Promise(resolve=>{let timer;const finish=()=>{clearTimeout(timer);synth.removeEventListener?.('voiceschanged',finish);voiceWait=null;resolve();};synth.addEventListener?.('voiceschanged',finish,{once:true});timer=setTimeout(finish,1200);});
    return voiceWait;
  }
  function releaseTransition(token){if(transition&&(token===undefined||transition.token===token)){const previous=transition;transition=null;previous.resolve();}}
  function stop(){sequence++;releaseTransition();if(current){current.finish('cancelled');current=null;}if(ready())synth.cancel();}
  async function speak(display,callback){
    if(typeof callback!=='function'&&transition){await transition.promise;return {status:'deferred'};}
    stop();const token=sequence;
    if(typeof callback==='function'){let resolve;const promise=new Promise(r=>resolve=r);transition={token,promise,resolve};}
    await waitVoices();if(token!==sequence)return {status:'cancelled'};
    const text=root.NoriPronunciation.text(display);
    const result=await new Promise(resolve=>{
      let done=false,timer,utterance;
      const finish=status=>{if(done)return;done=true;clearTimeout(timer);if(current?.token===token)current=null;resolve({status,text});};
      if(!ready()||!text){finish('unavailable');return;}
      const voice=choose();
      // Empty voice lists on iOS may populate only after the first gesture.
      if(!voice&&synth.getVoices().length){finish('unavailable');return;}
      utterance=new root.SpeechSynthesisUtterance(text);
      utterance.lang='ja-JP';if(voice)utterance.voice=voice;
      utterance.rate=1;utterance.pitch=1;utterance.volume=.85;
      current={token,utterance,finish};
      utterance.onend=()=>finish('ended');utterance.onerror=()=>finish('error');
      timer=setTimeout(()=>{if(token===sequence)synth.cancel();finish('timeout');},Math.max(8000,text.length*550));
      try{synth.speak(utterance);}catch{finish('error');}
    });
    if(token!==sequence||result.status==='cancelled')return {status:'cancelled',text};
    await new Promise(resolve=>setTimeout(resolve,280));
    if(token!==sequence)return {status:'cancelled',text};
    releaseTransition(token);
    if(typeof callback==='function')callback();
    return result;
  }
  root.NoriVoice={speak,stop,prepare:waitVoices,chooseVoice:choose,normalize:text=>root.NoriPronunciation.text(text),get available(){return ready();},get current(){return current?.utterance||null;}};
  root.addEventListener?.('pagehide',stop);
  root.document?.addEventListener('visibilitychange',()=>{if(root.document.hidden)stop();});
})(globalThis);
