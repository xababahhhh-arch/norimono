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
      '#noriVoiceGate{position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;padding:calc(env(safe-area-inset-top,0px) + 70px) 20px calc(env(safe-area-inset-bottom,0px) + 24px);background:rgba(240,249,255,.78);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}',
      '#noriVoiceGate button{width:min(78vw,330px);min-height:190px;border:0;border-radius:34px;background:#fff;color:#17324a;box-shadow:0 9px 0 rgba(23,50,74,.16),0 18px 42px rgba(23,50,74,.18);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-weight:900}',
      '#noriVoiceGate .nori-gate-icons{font-size:68px;line-height:1;animation:noriGateTap .9s ease-in-out infinite alternate}',
      '#noriVoiceGate .nori-gate-main{font-size:25px}',
      '#noriVoiceGate .nori-gate-sub{font-size:15px;opacity:.7}',
      '#noriVoiceGate.listening .nori-gate-icons{animation:none}',
      '@keyframes noriGateTap{to{transform:translateY(8px) scale(1.04)}}',
      '.nori-minicar .controls{bottom:calc(env(safe-area-inset-bottom,0px) + 16px)!important}',
      '.nori-minicar .hud{top:var(--nm-back-h)!important}',
      '.nori-atekko #screen-start{padding-top:calc(env(safe-area-inset-top,0px) + 58px)!important}',
      '@media(max-width:390px){#backToMenu{left:calc(env(safe-area-inset-left,0px) + 8px)!important;top:calc(env(safe-area-inset-top,0px) + 8px)!important;min-width:84px!important;min-height:42px!important;font-size:14px!important}#noriVoiceGate button{min-height:170px;border-radius:28px}#noriVoiceGate .nori-gate-icons{font-size:58px}#noriVoiceGate .nori-gate-main{font-size:22px}.nori-minicar .hud{left:calc(env(safe-area-inset-left,0px) + 8px)!important;right:calc(env(safe-area-inset-right,0px) + 8px)!important;gap:8px!important}.nori-minicar .controls{left:calc(env(safe-area-inset-left,0px) + 8px)!important;right:calc(env(safe-area-inset-right,0px) + 8px)!important}}'
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

  function installStartupVoice() {
    var path = location.pathname || '';
    var intro = '';
    if (/\/games\/shapes\//.test(path)) intro = 'のりものを なおそう。ひかっている ところを タッチして、のりものを なおしてね。';
    else if (/\/games\/shadow\//.test(path)) intro = 'のりもの かげあて。かげと おなじ のりものを タッチしてね。';
    else if (/\/games\/nakamawake\//.test(path)) intro = 'なかまわけ。おなじ なかまを えらんでね。';
    else if (/\/games\/signal\//.test(path)) intro = 'しんごう できるかな。あかは とまる。あおになったら くるまを タッチしてね。';
    else if (/\/games\/garage\//.test(path)) intro = 'おうちに かえそう。のりものが かえる ばしょを えらんでね。';
    else if (/\/games\/sound\//.test(path)) intro = 'おとで あてよう。おとを きいて、おなじ のりものを タッチしてね。';
    if (!intro || document.getElementById('noriVoiceGate')) return;

    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (_) {}
    window.__noriInteractionStarted = false;

    var gate = document.createElement('div');
    gate.id = 'noriVoiceGate';
    gate.innerHTML = '<button type="button" aria-label="タップして はじめる"><span class="nori-gate-icons">👆 🔊</span><span class="nori-gate-main">タップして はじめる</span><span class="nori-gate-sub">おとを きいてね</span></button>';
    var btn = gate.querySelector('button');
    var used = false;

    function finishGate() {
      if (window.__noriInteractionStarted) return;
      window.__noriInteractionStarted = true;
      gate.remove();
      try { document.dispatchEvent(new Event('norimono-started')); } catch (_) {}
      if (/\/games\/shapes\//.test(path)) {
        var replay = document.getElementById('voice');
        if (replay) setTimeout(function(){ replay.click(); }, 350);
      }
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault();e.stopPropagation();
      if (used) return;used = true;gate.classList.add('listening');
      btn.querySelector('.nori-gate-icons').textContent = '🔊';
      btn.querySelector('.nori-gate-main').textContent = 'きいてね';
      if (!('speechSynthesis' in window)) { setTimeout(finishGate, 500); return; }
      try {
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(intro);
        u.lang = 'ja-JP';u.rate = .84;u.pitch = 1.04;
        var ended = false;
        var done = function(){ if(ended)return;ended=true;setTimeout(finishGate,300); };
        u.onend = done;u.onerror = function(){setTimeout(done,500)};
        speechSynthesis.speak(u);
        setTimeout(function(){if(!ended)done()},15000);
      } catch (_) { setTimeout(finishGate, 700); }
    });
    document.body.appendChild(gate);
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
  function installVoiceGap(pathMatch,delay) {
    if(!pathMatch.test(location.pathname))return;
    var key='__noriVoiceGap'+delay;if(window[key])return;window[key]=true;
    var nativeSetTimeout=window.setTimeout.bind(window);
    window.setTimeout=function(fn,wait){var args=Array.prototype.slice.call(arguments,2);if(wait!==delay||typeof fn!=='function')return nativeSetTimeout.apply(window,[fn,wait].concat(args));return nativeSetTimeout(function waitForVoice(){var synth=window.speechSynthesis;if(synth&&(synth.speaking||synth.pending)){nativeSetTimeout(waitForVoice,100);return}nativeSetTimeout(function(){fn.apply(window,args)},400)},wait)};
  }
  function init(){installLayoutGuard();add();installStartupVoice();loadMinicarKidsSound();loadClassicBgm();loadSharedFeedback();installVoiceGap(/\/games\/shadow\//,1550);installVoiceGap(/\/games\/shapes\//,1650)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
