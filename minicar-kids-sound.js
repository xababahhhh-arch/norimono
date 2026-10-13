/* ミニカーロード用：子ども向けの「おもちゃの車」サウンド。
   実車エンジンの再現ではなく、やわらかく・低音ゴロゴロや路面ノイズなしで作る。 */
(function () {
  'use strict';

  if (!/\/games\/minicar\//.test(location.pathname)) return;

  var engineOn = document.getElementById('engineOn');
  var engineSeg = document.getElementById('engineSeg');
  var speedVal = document.getElementById('speedVal');
  var btnSound = document.getElementById('btnSound');
  var padNitro = document.getElementById('padNitro');
  if (!engineOn || !engineSeg || !speedVal) return;

  /* 既存のリアル系エンジン音だけを先に止める。
     UI上はONのままにし、このファイル側のやさしい音へ差し替える。 */
  try {
    engineOn.checked = false;
    engineOn.dispatchEvent(new Event('change', { bubbles: true }));
    engineOn.checked = true;
  } catch (_) { }

  var AC = window.AudioContext || window.webkitAudioContext;
  var audio = {
    ctx: null,
    master: null,
    bodyGain: null,
    shineGain: null,
    main: null,
    shine: null,
    filter: null,
    profile: 'sports',
    enabled: true,
    ready: false,
    lastStage: -1,
    lastChirpAt: 0
  };

  /* どれも「車種らしさ」は残すが、実車の爆音にはしない。
     triangle / sine のみ。ノイズ源と矩形波は使わない。 */
  var PROFILES = {
    sports:    { base: 150, range: 120, level: 0.030, shine: 0.006, cut: 1250 }, // きゅいーん
    sedan:     { base: 105, range:  78, level: 0.026, shine: 0.004, cut:  900 }, // やさしい ぶーん
    ambulance: { base: 125, range:  72, level: 0.027, shine: 0.005, cut: 1000 }  // ふんわり ぶーん
  };

  function soundIsOn() {
    return !btnSound || btnSound.textContent.indexOf('🔇') === -1;
  }

  function ensureAudio() {
    if (!AC) return false;
    if (audio.ready) {
      if (audio.ctx.state === 'suspended') audio.ctx.resume().catch(function () { });
      return true;
    }
    try {
      var ctx = new AC();
      var master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);

      var filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1000;
      filter.Q.value = 0.6;
      filter.connect(master);

      var bodyGain = ctx.createGain();
      bodyGain.gain.value = 0;
      bodyGain.connect(filter);

      var shineGain = ctx.createGain();
      shineGain.gain.value = 0;
      shineGain.connect(filter);

      var main = ctx.createOscillator();
      main.type = 'triangle';
      main.frequency.value = 130;
      main.connect(bodyGain);
      main.start();

      var shine = ctx.createOscillator();
      shine.type = 'sine';
      shine.frequency.value = 260;
      shine.connect(shineGain);
      shine.start();

      audio.ctx = ctx;
      audio.master = master;
      audio.bodyGain = bodyGain;
      audio.shineGain = shineGain;
      audio.main = main;
      audio.shine = shine;
      audio.filter = filter;
      audio.ready = true;
      return true;
    } catch (_) {
      return false;
    }
  }

  function chirp(freq1, freq2, vol) {
    if (!ensureAudio() || !audio.enabled || !soundIsOn()) return;
    var ctx = audio.ctx;
    var now = ctx.currentTime;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq1, now);
    o.frequency.exponentialRampToValueAtTime(freq2, now + 0.16);
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol || 0.035, now + 0.018);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.23);
    o.connect(g); g.connect(audio.master);
    o.start(now); o.stop(now + 0.25);
  }

  function sparkle() {
    if (!ensureAudio() || !audio.enabled || !soundIsOn()) return;
    var ctx = audio.ctx;
    var notes = [740, 930, 1175];
    notes.forEach(function (f, i) {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      var at = ctx.currentTime + i * 0.055;
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.022, at + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.17);
      o.connect(g); g.connect(audio.master);
      o.start(at); o.stop(at + 0.19);
    });
  }

  function update() {
    if (audio.ready) {
      var ctx = audio.ctx;
      var now = ctx.currentTime;
      var speed = Number(speedVal.textContent) || 0;
      var norm = Math.max(0, Math.min(1, speed / 150));
      var p = PROFILES[audio.profile] || PROFILES.sports;
      var active = audio.enabled && soundIsOn() && speed > 2;

      /* 走行音は小さく、速度が上がるほど少し明るくなるだけ。
         アイドリング騒音は出さない。 */
      audio.master.gain.setTargetAtTime(active ? 0.82 : 0, now, 0.08);
      audio.main.frequency.setTargetAtTime(p.base + p.range * norm, now, 0.09);
      audio.shine.frequency.setTargetAtTime((p.base + p.range * norm) * 2.02, now, 0.09);
      audio.bodyGain.gain.setTargetAtTime(active ? p.level * (0.78 + norm * 0.22) : 0, now, 0.10);
      audio.shineGain.gain.setTargetAtTime(active ? p.shine * (0.45 + norm * 0.55) : 0, now, 0.12);
      audio.filter.frequency.setTargetAtTime(p.cut + norm * 420, now, 0.12);

      /* 一定速度に達した時だけ短い「できた！」感のある音。
         連続音にしないので、騒がしくなりにくい。 */
      var stage = speed >= 105 ? 2 : speed >= 65 ? 1 : speed >= 30 ? 0 : -1;
      if (stage > audio.lastStage && performance.now() - audio.lastChirpAt > 1000) {
        var starts = [520, 620, 740];
        chirp(starts[stage], starts[stage] * 1.18, 0.024);
        audio.lastChirpAt = performance.now();
      }
      audio.lastStage = speed < 12 ? -1 : Math.max(audio.lastStage, stage);
    }
    requestAnimationFrame(update);
  }

  /* 最初のタップでだけAudioContextを起動。自動再生はしない。 */
  document.addEventListener('pointerdown', function () { ensureAudio(); }, { passive: true });
  document.addEventListener('touchstart', function () { ensureAudio(); }, { passive: true });

  /* 既存のリアル系エンジン音が再度ONにならないよう、設定UIをこの音に乗っ取る。 */
  document.addEventListener('change', function (e) {
    if (e.target !== engineOn) return;
    e.stopImmediatePropagation();
    audio.enabled = engineOn.checked;
    if (!audio.enabled && audio.ready) audio.master.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.05);
  }, true);

  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('#engineSeg button') : null;
    if (!b) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    audio.profile = PROFILES[b.dataset.v] ? b.dataset.v : 'sports';
    Array.prototype.forEach.call(engineSeg.querySelectorAll('button'), function (x) {
      var selected = x === b;
      x.classList.toggle('on', selected);
      x.setAttribute('aria-pressed', String(selected));
    });
    engineOn.checked = true;
    audio.enabled = true;
    chirp(audio.profile === 'sports' ? 660 : audio.profile === 'sedan' ? 520 : 580,
      audio.profile === 'sports' ? 820 : audio.profile === 'sedan' ? 650 : 720, 0.025);
  }, true);

  if (padNitro) padNitro.addEventListener('pointerdown', sparkle, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (!audio.ready) return;
    if (document.hidden) {
      audio.master.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.03);
      if (audio.ctx.state === 'running') audio.ctx.suspend().catch(function () { });
    }
  });

  /* 設定名だけ、子ども向けの意図が分かるように少し柔らかくする。 */
  var title = engineSeg.parentElement && engineSeg.parentElement.querySelector('span');
  if (title) title.textContent = 'たのしい はしる音';
  var small = engineOn.parentElement && engineOn.parentElement.querySelector('small');
  if (small) small.textContent = 'やさしい おもちゃの車の音です。サイレンとは別にオン・オフできます';

  requestAnimationFrame(update);
})();
