/*
 * のりものゲーム共通BGM
 * - ミニカーロードでは読み込まない
 * - 最初のユーザー操作後にだけ再生（iPhoneの自動再生制限に対応）
 * - パッヘルベル「カノン」の和声進行をもとにした、静かな自作アルペジオ
 * - 録音音源・外部APIは使わない
 * - 読み上げ中は自動で音量を大きく下げる
 */
(function () {
  'use strict';
  if (window.__norimonoClassicBgm) return;
  if (/\/games\/minicar\//.test(location.pathname)) return;

  var AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;

  var ctx = null;
  var master = null;
  var timer = null;
  var started = false;
  var step = 0;
  var nextAt = 0;
  var normalGain = 0.020;
  var duckGain = 0.0045;

  /* D - A - Bm - F#m - G - D - G - A
     カノンで広く知られる循環進行。音はやわらかいベル/ピアノ風。 */
  var chords = [
    [146.83, 185.00, 220.00], // D3 F#3 A3
    [110.00, 138.59, 164.81], // A2 C#3 E3
    [123.47, 146.83, 185.00], // B2 D3 F#3
    [92.50, 116.54, 138.59],  // F#2 A2 C#3
    [98.00, 123.47, 146.83],  // G2 B2 D3
    [146.83, 185.00, 220.00], // D3 F#3 A3
    [98.00, 123.47, 146.83],  // G2 B2 D3
    [110.00, 138.59, 164.81]  // A2 C#3 E3
  ];

  /* 1小節8音。低→中→高→中をゆっくり繰り返す。 */
  var pattern = [0, 1, 2, 1, 0, 1, 2, 1];
  var beat = 0.42;

  function initAudio() {
    if (started) {
      if (ctx && ctx.state === 'suspended' && !document.hidden) ctx.resume().catch(function () {});
      return;
    }
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.0001;
      master.connect(ctx.destination);
      started = true;
      nextAt = ctx.currentTime + 0.05;
      master.gain.exponentialRampToValueAtTime(normalGain, ctx.currentTime + 0.6);
      schedule();
      timer = setInterval(schedule, 450);
    } catch (_) {
      started = false;
    }
  }

  function note(freq, at, dur, vol, octave) {
    if (!ctx || !master) return;
    var o1 = ctx.createOscillator();
    var o2 = ctx.createOscillator();
    var g = ctx.createGain();
    var lp = ctx.createBiquadFilter();

    o1.type = 'triangle';
    o2.type = 'sine';
    o1.frequency.value = freq * (octave || 1);
    o2.frequency.value = freq * 2 * (octave || 1);
    o2.detune.value = 3;

    lp.type = 'lowpass';
    lp.frequency.value = 1600;
    lp.Q.value = 0.35;

    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(vol, at + 0.025);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * 0.45), at + Math.min(0.20, dur * 0.45));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);

    o1.connect(lp);
    o2.connect(lp);
    lp.connect(g);
    g.connect(master);
    o1.start(at);
    o2.start(at);
    o1.stop(at + dur + 0.05);
    o2.stop(at + dur + 0.05);
  }

  function schedule() {
    if (!started || !ctx || ctx.state === 'closed') return;
    var horizon = ctx.currentTime + 1.4;
    while (nextAt < horizon) {
      var chordIndex = Math.floor(step / pattern.length) % chords.length;
      var pos = step % pattern.length;
      var chord = chords[chordIndex];
      var freq = chord[pattern[pos]];

      /* 高い音を少し混ぜ、ピアノ/オルゴール寄りに。 */
      note(freq, nextAt, beat * 1.7, 0.10, pos === 2 ? 2 : 1);

      /* 小節頭だけ、とても薄い低音を置く。 */
      if (pos === 0) note(chord[0] / 2, nextAt, beat * 3.2, 0.045, 1);

      nextAt += beat;
      step++;
    }
  }

  function duckForSpeech() {
    if (!started || !ctx || !master) return;
    var synth = window.speechSynthesis;
    var speaking = !!(synth && (synth.speaking || synth.pending));
    var target = document.hidden ? 0.0001 : (speaking ? duckGain : normalGain);
    master.gain.setTargetAtTime(target, ctx.currentTime, speaking ? 0.05 : 0.22);
  }

  var duckTimer = setInterval(duckForSpeech, 120);

  function startFromGesture() {
    initAudio();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(function () {});
  }

  document.addEventListener('pointerdown', startFromGesture, { passive: true, once: true });
  document.addEventListener('touchstart', startFromGesture, { passive: true, once: true });
  document.addEventListener('keydown', startFromGesture, { once: true });

  document.addEventListener('visibilitychange', function () {
    if (!started || !ctx || !master) return;
    if (document.hidden) {
      master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.04);
      if (ctx.state === 'running') ctx.suspend().catch(function () {});
    } else {
      ctx.resume().then(duckForSpeech).catch(function () {});
    }
  });

  window.addEventListener('pagehide', function () {
    if (timer) clearInterval(timer);
    clearInterval(duckTimer);
    if (ctx && ctx.state !== 'closed') ctx.close().catch(function () {});
  });

  window.__norimonoClassicBgm = {
    start: startFromGesture,
    isStarted: function () { return started; }
  };
})();
