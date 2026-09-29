/* 3つのゲームで共通の「🏠 もどる」ボタン（左上）。1回タップで ゲームの一覧へ もどる。
   使い方：ゲームのHTMLの </body> の直前に次の1行を入れる。
     <script src="back.js" data-home="index.html"></script>
   ゲームが下のフォルダにある場合は、戻り先を指定する。
     <script src="../../back.js" data-home="../../index.html"></script>

   もどる直前に、document に 'norimono:leave' を知らせる。
   各ゲームは これを受けて 読み上げ・音・タイマー・描画を止める。

   ボタンの大きさ：高さ 52px（タップできる範囲は 48×48px 以上）、左上から 10px。
   ゲーム側は、左上の 幅 --nm-back-w × 高さ --nm-back-h を あけておく（下の値）。 */
(function () {
  var me = document.currentScript;
  var home = (me && me.dataset && me.dataset.home) ? me.dataset.home : 'index.html';

  var CSS =
    ':root{' +
      '--nm-back-w:calc(env(safe-area-inset-left,0px) + 140px);' +   /* ゲーム側で あけておく幅 */
      '--nm-back-h:calc(env(safe-area-inset-top,0px) + 70px);' +     /* ゲーム側で あけておく高さ */
    '}' +
    '#backToMenu{' +
      'position:fixed;z-index:40;box-sizing:border-box;' +
      'left:calc(env(safe-area-inset-left,0px) + 10px);' +
      'top:calc(env(safe-area-inset-top,0px) + 10px);' +
      'display:flex;align-items:center;justify-content:center;gap:6px;' +
      'width:122px;height:52px;padding:0 14px 0 10px;' +
      'border-radius:999px;border:3px solid #ffb36b;background:#fff;color:#f06a1c;' +
      'box-shadow:0 4px 0 rgba(0,0,0,.14),0 6px 14px rgba(0,40,80,.18);' +
      'font:800 19px/1 "Hiragino Maru Gothic ProN","ヒラギノ丸ゴ ProN","Hiragino Sans",system-ui,sans-serif;' +
      'letter-spacing:.04em;text-decoration:none;white-space:nowrap;' +
      '-webkit-tap-highlight-color:transparent;touch-action:manipulation;' +
      '-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;' +
    '}' +
    '#backToMenu svg{width:26px;height:26px;flex:none}' +
    '#backToMenu:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.14)}' +
    '#backToMenu:focus-visible{outline:4px solid #2f6fd0;outline-offset:3px}';

  function add() {
    if (document.getElementById('backToMenu')) return;
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);

    var a = document.createElement('a');
    a.id = 'backToMenu';
    a.href = home;
    a.setAttribute('aria-label', 'ゲームの いちらんへ もどる');
    a.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3 2 12h3v8h5v-5h4v5h5v-8h3z"/></svg>' +
      '<span aria-hidden="true">もどる</span>';
    a.addEventListener('click', function () {
      // 読み上げ・音・タイマーを すぐ止めてもらう（ページを はなれる前に）
      try { document.dispatchEvent(new CustomEvent('norimono:leave')); } catch (e) { }
      try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) { }
    });
    document.body.appendChild(a);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add);
  else add();
})();
