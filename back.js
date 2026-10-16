/* ゲーム共通UI：戻るボタン、音、フィードバック、iPhone向け基本レイアウト */
(function () {
  var me = document.currentScript;
  var home = (me && me.dataset && me.dataset.home) ? me.dataset.home : 'index.html';

  function installLayoutGuard() {
    if (document.getElementById('norimonoSharedLayout')) return;
    document.documentElement.classList.add('norimono-game');
    document.body.classList.add('norimono-game-body');
    var path = location.pathname || '';
    if (/\/games\/minicar\//.test(path)) document.body.classList.add('nori-minicar');
    if (/\/atekko\.html$/.test(path)) document.body.classList.add('nori-atekko');
    document.documentElement.style.setProperty('--nm-back-h', 'calc(env(safe-area-inset-top,0px) + 62px)');
    document.documentElement.style.setProperty('--nm-back-w', 'calc(env(safe-area-inset-left,0px) + 112px)');
    var style = document.createElement('style');
    style.id = 'norimonoSharedLayout';
    style.textContent = [
      ':root{--nori-edge:12px;--nori-radius:22px;--nori-shadow:0 5px 0 rgba(0,0,0,.12)}',
      'html,body{overscroll-behavior:none;-webkit-tap-highlight-color:transparent}',
      'button,a,[role="button"]{touch-action:manipulation}',
      'button{font-family:inherit}',
      '#backToMenu{min-width:88px!important;min-height:44px!important;display:flex!important;align-items:center!important;justify-content:center!important;padding:0 14px!important;border-radius:16px!important;font-size:15px!important;line-height:1!important}',
      '.nori-minicar .controls{bottom:calc(env(safe-area-inset-bottom,0px) + 16px)!important}',
      '.nori-minicar .hud{top:var(--nm-back-h)!important}',
      '.nori-atekko #screen-start{padding-top:calc(env(safe-area-inset-top,0px) + 58px)!important}',
      '@media(max-width:390px){#backToMenu{left:calc(env(safe-area-inset-left,0px) + 8px)!important;top:calc(env(safe-area-inset-top,0px) + 8px)!important;min-width:84px!important;min-height:42px!important;font-size:14px!important}.nori-minicar .hud{left:calc(env(safe-area-inset-left,0px) + 8px)!important;right:calc(env(safe-area-inset-right,0px) + 8px)!important;gap:8px!important}.nori-minicar .controls{left:calc(env(safe-area-inset-left,0px) + 8px)!important;right:calc(env(safe-area-inset-right,0px) + 8px)!important}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function add() {
    if (document.getElementById('backToMenu')) return;
    var a = document.createElement('a');
    a.id = 'backToMenu';
    a.href = home;
    a.textContent = '← もどる';
    a.setAttribute('aria-label', 'メニューにもどる');
    a.style.cssText = [
      'position:fixed','left:calc(env(safe-area-inset-left,0px) + 10px)','top:calc(env(safe-area-inset-top,0px) + 10px)','z-index:9999','padding:10px 14px','border-radius:16px','background:rgba(10,14,20,.72)','color:#fff','font:800 15px/1 -apple-system,BlinkMacSystemFont,"Hiragino Sans",system-ui,sans-serif','text-decoration:none','-webkit-backdrop-filter:blur(8px)','backdrop-filter:blur(8px)','box-shadow:0 3px 10px rgba(0,0,0,.28)'
    ].join(';');
    document.body.appendChild(a);
  }

  function loadMinicarKidsSound() {
    if (!/\/games\/minicar\//.test(location.pathname)) return;
    if (document.querySelector('script[data-minicar-kids-sound]')) return;
    var s = document.createElement('script');
    s.src = '../../minicar-kids-sound.js';s.dataset.minicarKidsSound = '1';document.body.appendChild(s);
  }
  function loadClassicBgm() {
    if (/\/games\/minicar\//.test(location.pathname)) return;
    if (document.querySelector('script[data-classic-bgm]')) return;
    var s = document.createElement('script');
    s.src = /\/games\//.test(location.pathname) ? '../../classic-bgm.js' : 'classic-bgm.js';s.dataset.classicBgm = '1';document.body.appendChild(s);
  }
  function loadSharedFeedback() {
    if (!/\/games\/(shadow|shapes)\//.test(location.pathname)) return;
    if (window.NoriFeedback) { afterFeedbackReady(); return; }
    var old = document.querySelector('script[data-game-feedback]');
    if (old) { old.addEventListener('load', afterFeedbackReady, { once:true }); return; }
    var s = document.createElement('script');s.src='../../game-feedback.js';s.dataset.gameFeedback='1';s.addEventListener('load',afterFeedbackReady,{once:true});document.body.appendChild(s);
  }
  function afterFeedbackReady(){loadShadowPolish();installShapesFeedback()}
  function loadShadowPolish(){if(!/\/games\/shadow\//.test(location.pathname))return;if(document.querySelector('script[data-shadow-polish]'))return;var s=document.createElement('script');s.src='../../shadow-polish.js';s.dataset.shadowPolish='1';document.body.appendChild(s)}
  function installShapesFeedback(){
    if(!/\/games\/shapes\//.test(location.pathname))return;
    if(window.__shapesFeedbackInstalled||!window.NoriFeedback)return;
    window.__shapesFeedbackInstalled=true;
    var celebrate=document.getElementById('celebrate'),restart=document.getElementById('restart'),vehicle=document.getElementById('vehicle');
    if(celebrate)new MutationObserver(function(){if(celebrate.classList.contains('show')){if(celebrate.dataset.fxDone==='1')return;celebrate.dataset.fxDone='1';NoriFeedback.correct();var r=vehicle?vehicle.getBoundingClientRect():celebrate.getBoundingClientRect();NoriFeedback.burst(r.left+r.width/2,r.top+r.height/2,12)}else delete celebrate.dataset.fxDone}).observe(celebrate,{attributes:true,attributeFilter:['class']});
    if(restart)new MutationObserver(function(){if(restart.classList.contains('show')){if(restart.dataset.endFx==='1')return;restart.dataset.endFx='1';NoriFeedback.fanfare()}else delete restart.dataset.endFx}).observe(restart,{attributes:true,attributeFilter:['class']});
  }
  function installShadowVoiceGap(){
    if(!/\/games\/shadow\//.test(location.pathname)||window.__shadowVoiceGapInstalled)return;
    window.__shadowVoiceGapInstalled=true;var nativeSetTimeout=window.setTimeout.bind(window);
    window.setTimeout=function(fn,delay){var args=Array.prototype.slice.call(arguments,2);if(delay!==1550||typeof fn!=='function')return nativeSetTimeout.apply(window,[fn,delay].concat(args));return nativeSetTimeout(function waitForVoice(){var synth=window.speechSynthesis;if(synth&&(synth.speaking||synth.pending)){nativeSetTimeout(waitForVoice,100);return}nativeSetTimeout(function(){fn.apply(window,args)},400)},delay)};
  }
  function installShadowWrongVoice(){
    if(!/\/games\/shadow\//.test(location.pathname)||!('MutationObserver'in window)||!('speechSynthesis'in window))return;
    var box=document.getElementById('choices');if(!box||box.dataset.wrongVoiceReady==='1')return;box.dataset.wrongVoiceReady='1';
    new MutationObserver(function(ms){ms.forEach(function(m){var el=m.target;if(!el||!el.classList||!el.classList.contains('choice')||!el.classList.contains('wrong'))return;var name=el.getAttribute('aria-label')||'';if(!name)return;try{speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(name+'だよ。もういちど、かげを よくみてね');u.lang='ja-JP';u.rate=.86;u.pitch=1.05;speechSynthesis.speak(u)}catch(_){}})}).observe(box,{subtree:true,attributes:true,attributeFilter:['class']});
  }
  function init(){installLayoutGuard();add();loadMinicarKidsSound();loadClassicBgm();loadSharedFeedback();installShadowVoiceGap();installShadowWrongVoice()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
