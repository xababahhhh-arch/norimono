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

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add);
  else add();
})();
