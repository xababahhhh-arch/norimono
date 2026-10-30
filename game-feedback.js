/* 2〜4歳向けゲーム共通の小さな効果音。
   外部音源なし / Web Audioのみ。短く、うるさくしない。 */
(function(){
  'use strict';
  if(window.NoriFeedback) return;
  var AC=window.AudioContext||window.webkitAudioContext;
  var ctx=null, master=null;

  function ensure(){
    if(!AC) return false;
    if(ctx){ if(ctx.state==='suspended') ctx.resume().catch(function(){}); return true; }
    try{
      ctx=new AC();
      master=ctx.createGain();
      master.gain.value=.72;
      master.connect(ctx.destination);
      return true;
    }catch(_){ return false; }
  }

  function tone(freq,at,dur,vol,type){
    if(!ensure()) return;
    var o=ctx.createOscillator(),g=ctx.createGain(),lp=ctx.createBiquadFilter();
    o.type=type||'sine'; o.frequency.value=freq;
    lp.type='lowpass'; lp.frequency.value=2200; lp.Q.value=.4;
    g.gain.setValueAtTime(.0001,at);
    g.gain.exponentialRampToValueAtTime(vol,at+.012);
    g.gain.exponentialRampToValueAtTime(.0001,at+dur);
    o.connect(lp); lp.connect(g); g.connect(master);
    o.start(at); o.stop(at+dur+.04);
  }

  function correct(){
    if(!ensure()) return;
    var n=ctx.currentTime+.01;
    tone(523.25,n,.18,.075,'triangle');
    tone(659.25,n+.10,.20,.070,'triangle');
    tone(783.99,n+.20,.26,.065,'sine');
  }
  function retry(){
    if(!ensure()) return;
    var n=ctx.currentTime+.01;
    tone(392,n,.15,.040,'sine');
    tone(349.23,n+.10,.19,.032,'sine');
  }
  function pop(){
    if(!ensure()) return;
    var n=ctx.currentTime+.01;
    tone(659.25,n,.10,.035,'triangle');
  }
  function fanfare(){
    if(!ensure()) return;
    var n=ctx.currentTime+.01;
    [523.25,659.25,783.99,1046.5].forEach(function(f,i){tone(f,n+i*.09,.28,.052,'triangle');});
  }

  function burst(x,y,count){
    count=count||12;
    var layer=document.createElement('div');
    layer.setAttribute('aria-hidden','true');
    layer.style.cssText='position:fixed;inset:0;z-index:9998;pointer-events:none;overflow:hidden';
    for(var i=0;i<count;i++){
      var s=document.createElement('span');
      var a=(Math.PI*2*i/count)+(Math.random()-.5)*.35;
      var d=36+Math.random()*54;
      var dx=Math.cos(a)*d,dy=Math.sin(a)*d;
      s.textContent=i%3===0?'★':'●';
      s.style.cssText='position:absolute;left:'+x+'px;top:'+y+'px;font:900 '+(14+Math.random()*10)+'px/1 system-ui;color:'+(i%2?'#ffd23f':'#ff7a59')+';transform:translate(-50%,-50%);opacity:1;transition:transform .55s ease-out,opacity .55s ease-out';
      layer.appendChild(s);
      requestAnimationFrame((function(el,tx,ty){return function(){el.style.transform='translate(calc(-50% + '+tx+'px),calc(-50% + '+ty+'px)) scale(.65)';el.style.opacity='0';};})(s,dx,dy));
    }
    document.body.appendChild(layer);
    setTimeout(function(){layer.remove();},650);
  }

  document.addEventListener('pointerdown',ensure,{passive:true,once:true});
  document.addEventListener('touchstart',ensure,{passive:true,once:true});
  window.NoriFeedback={ensure:ensure,correct:correct,retry:retry,pop:pop,fanfare:fanfare,burst:burst};
})();
