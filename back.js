/* ゲームの画面に「← もどる」ボタンを出す。
   使い方：ゲームのHTMLの </body> の直前に次の1行を入れる。
     <script src="back.js"></script>
   ゲームが下のフォルダにある場合は、戻り先を指定する。
     <script src="../../back.js" data-home="../../index.html"></script>  */
(function () {
  var me = document.currentScript;
  var home = (me && me.dataset && me.dataset.home) ? me.dataset.home : 'index.html';

  function add() {
    if (document.getElementById('backToMenu')) return;
    var a = document.createElement('a');
    a.id = 'backToMenu';
    a.href = home;
    a.textContent = '← もどる';
    a.style.cssText = [
      'position:fixed',
      'left:calc(env(safe-area-inset-left,0px) + 10px)',
      'top:calc(env(safe-area-inset-top,0px) + 10px)',
      'z-index:9999',
      'padding:10px 14px',
      'border-radius:14px',
      'background:rgba(10,14,20,.68)',
      'color:#fff',
      'font:700 14px/1 -apple-system,BlinkMacSystemFont,"Hiragino Sans",system-ui,sans-serif',
      'text-decoration:none',
      '-webkit-backdrop-filter:blur(6px)',
      'backdrop-filter:blur(6px)',
      'box-shadow:0 2px 8px rgba(0,0,0,.3)'
    ].join(';');
    document.body.appendChild(a);
  }

  function loadMinicarKidsSound() {
    if (!/\/games\/minicar\//.test(location.pathname)) return;
    if (document.querySelector('script[data-minicar-kids-sound]')) return;
    var s = document.createElement('script');
    s.src = '../../minicar-kids-sound.js';
    s.dataset.minicarKidsSound = '1';
    document.body.appendChild(s);
  }

  function loadClassicBgm() {
    if (/\/games\/minicar\//.test(location.pathname)) return;
    if (document.querySelector('script[data-classic-bgm]')) return;
    var s = document.createElement('script');
    s.src = /\/games\//.test(location.pathname) ? '../../classic-bgm.js' : 'classic-bgm.js';
    s.dataset.classicBgm = '1';
    document.body.appendChild(s);
  }

  /* なかまわけで好評だった「正解音・間違い音・短い祝福」を他ゲームでも共通化。 */
  function loadSharedFeedback() {
    if (!/\/games\/(shadow|shapes)\//.test(location.pathname)) return;
    if (window.NoriFeedback) { afterFeedbackReady(); return; }
    var old = document.querySelector('script[data-game-feedback]');
    if (old) { old.addEventListener('load', afterFeedbackReady, { once:true }); return; }
    var s = document.createElement('script');
    s.src = '../../game-feedback.js';
    s.dataset.gameFeedback = '1';
    s.addEventListener('load', afterFeedbackReady, { once:true });
    document.body.appendChild(s);
  }

  function afterFeedbackReady() {
    loadShadowPolish();
    installShapesFeedback();
  }

  function loadShadowPolish() {
    if (!/\/games\/shadow\//.test(location.pathname)) return;
    if (document.querySelector('script[data-shadow-polish]')) return;
    var s = document.createElement('script');
    s.src = '../../shadow-polish.js';
    s.dataset.shadowPolish = '1';
    document.body.appendChild(s);
  }

  function installShapesFeedback() {
    if (!/\/games\/shapes\//.test(location.pathname)) return;
    if (window.__shapesFeedbackInstalled || !window.NoriFeedback) return;
    window.__shapesFeedbackInstalled = true;
    var celebrate = document.getElementById('celebrate');
    var restart = document.getElementById('restart');
    var vehicle = document.getElementById('vehicle');
    if (celebrate) {
      new MutationObserver(function(){
        if (celebrate.classList.contains('show')) {
          if (celebrate.dataset.fxDone === '1') return;
          celebrate.dataset.fxDone = '1';
          NoriFeedback.correct();
          var r = vehicle ? vehicle.getBoundingClientRect() : celebrate.getBoundingClientRect();
          NoriFeedback.burst(r.left + r.width/2, r.top + r.height/2, 12);
        } else {
          delete celebrate.dataset.fxDone;
        }
      }).observe(celebrate,{attributes:true,attributeFilter:['class']});
    }
    if (restart) {
      new MutationObserver(function(){
        if (restart.classList.contains('show')) {
          if (restart.dataset.endFx === '1') return;
          restart.dataset.endFx = '1';
          NoriFeedback.fanfare();
        } else {
          delete restart.dataset.endFx;
        }
      }).observe(restart,{attributes:true,attributeFilter:['class']});
    }
  }

  /* かげあて：正解後の次問題への移動は、読み上げが終わるまで待つ。 */
  function installShadowVoiceGap() {
    if (!/\/games\/shadow\//.test(location.pathname)) return;
    if (window.__shadowVoiceGapInstalled) return;
    window.__shadowVoiceGapInstalled = true;

    var nativeSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = function (fn, delay) {
      var args = Array.prototype.slice.call(arguments, 2);
      if (delay !== 1550 || typeof fn !== 'function') {
        return nativeSetTimeout.apply(window, [fn, delay].concat(args));
      }
      return nativeSetTimeout(function waitForVoice() {
        var synth = window.speechSynthesis;
        if (synth && (synth.speaking || synth.pending)) {
          nativeSetTimeout(waitForVoice, 100);
          return;
        }
        nativeSetTimeout(function () { fn.apply(window, args); }, 400);
      }, delay);
    };
  }

  /* かげあて：間違えて押した乗り物名を読み上げる。 */
  function installShadowWrongVoice() {
    if (!/\/games\/shadow\//.test(location.pathname)) return;
    if (!('MutationObserver' in window) || !('speechSynthesis' in window)) return;

    var box = document.getElementById('choices');
    if (!box || box.dataset.wrongVoiceReady === '1') return;
    box.dataset.wrongVoiceReady = '1';

    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        var el = m.target;
        if (!el || !el.classList || !el.classList.contains('choice') || !el.classList.contains('wrong')) return;
        var name = el.getAttribute('aria-label') || '';
        if (!name) return;
        try {
          speechSynthesis.cancel();
          var u = new SpeechSynthesisUtterance(name + 'だよ。もういちど、かげを よくみてね');
          u.lang = 'ja-JP';
          u.rate = 0.86;
          u.pitch = 1.05;
          speechSynthesis.speak(u);
        } catch (_) { }
      });
    });
    observer.observe(box, { subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  function init() {
    add();
    loadMinicarKidsSound();
    loadClassicBgm();
    loadSharedFeedback();
    installShadowVoiceGap();
    installShadowWrongVoice();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
