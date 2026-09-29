/* なかまわけ 用の共通部品（読み上げ・効果音・紙吹雪など）
 * のりもの あてっこ（app.js）と同じしくみを、このゲームだけで使えるように取り出したもの。
 * 声の設定（こえ あり／なし・声の種類・速さ）は のりもの あてっこ と共通で保存されます。
 */
(function () {
  'use strict';

  const ROOT = '../../'; // リポジトリのいちばん上（index.html や images/ がある場所）
  const $ = (sel) => document.querySelector(sel);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------------- せってい（端末に保存） ----------------
  // level: 1=かんたん 2=ふつう 3=むずかしい / off: 出さない乗り物のid / voiceName: 選んだ声（空=自動）
  const DEFAULTS = { count: 5, voice: true, sfx: true, rate: 0.95, level: 2, off: [], voiceName: '' };
  let settings = Object.assign({}, DEFAULTS);
  try {
    const saved = JSON.parse(localStorage.getItem('norimono-settings') || '{}');
    settings = Object.assign(settings, saved);
  } catch (e) { /* 保存できない環境でも遊べるようにする */ }
  if ([0.8, 0.95].indexOf(Number(settings.rate)) < 0) settings.rate = DEFAULTS.rate;
  if (!Array.isArray(settings.off)) settings.off = [];
  function saveSettings() {
    try { localStorage.setItem('norimono-settings', JSON.stringify(settings)); } catch (e) { }
  }


  // ---------------- 声（Web Speech API） ----------------
  const speech = {
    ok: 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window,
    voice: null,
    current: null,
    // 日本語の声を、自然に聞こえる順に並べる
    japaneseVoices() {
      if (!this.ok) return [];
      const voices = window.speechSynthesis.getVoices() || [];
      const score = (v) => {
        let n = 0;
        if (/premium|プレミアム/i.test(v.name)) n += 100;
        if (/enhanced|拡張/i.test(v.name)) n += 60;
        if (/Kyoko|O-ren|Otoya|Hattori|Google/i.test(v.name)) n += 20;
        // iPhoneに入っている「おもしろ声」（片言っぽく聞こえる）は使わない
        if (/Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Junior|Kathy|Ralph/i.test(v.name)) n -= 200;
        return n;
      };
      return voices
        .filter((v) => /^ja([-_]|$)/i.test(v.lang || ''))
        .sort((a, b) => score(b) - score(a));
    },
    pickVoice() {
      const ja = this.japaneseVoices();
      this.voice = (settings.voiceName && ja.find((v) => v.name === settings.voiceName)) || ja[0] || null;
    },
    // 話し終わったら（または一定時間で）resolve する
    say(text) {
      if (!this.ok || !settings.voice) return Promise.resolve();
      const synth = window.speechSynthesis;
      return new Promise((resolve) => {
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'ja-JP';
        if (this.voice) u.voice = this.voice;
        u.rate = Number(settings.rate) || 0.95;
        u.pitch = 1; // 高さを変えると不自然になるので そのまま
        let done = false;
        const finish = () => { if (!done) { done = true; resolve(); } };
        u.onend = finish;
        u.onerror = finish;
        setTimeout(finish, 1200 + text.length * 260); // 念のための時間切れ
        this.current = u; // iOS/Chrome で途中で消えないよう参照を保持
        if (synth.speaking || synth.pending) {
          synth.cancel();
          setTimeout(() => synth.speak(u), 60);
        } else {
          synth.speak(u);
        }
      });
    },
    stop() { if (this.ok) window.speechSynthesis.cancel(); }
  };
  if (speech.ok) {
    speech.pickVoice();
    window.speechSynthesis.onvoiceschanged = () => speech.pickVoice();
  }

  // ---------------- 効果音（Web Audio API） ----------------
  const sfx = {
    ctx: null,
    ensure() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!this.ctx) this.ctx = new AC();
      return this.ctx;
    },
    unlock() {
      // iPhone では、最初のタップの中で音声の準備をする必要がある
      try {
        if (navigator.audioSession) navigator.audioSession.type = 'playback';
      } catch (e) { }
      if (!this.ensure()) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const buf = this.ctx.createBuffer(1, 1, 22050);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.connect(this.ctx.destination);
      src.start(0);
    },
    tone(freq, start, dur, type, vol) {
      if (!this.ctx || !settings.sfx) return;
      const t0 = this.ctx.currentTime + start;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    },
    pop() { this.tone(660, 0, 0.12, 'sine', 0.15); },
    correct() {
      [523, 659, 784, 1047].forEach((f, i) => this.tone(f, i * 0.09, 0.3, 'triangle', 0.22));
      [1568, 2093, 2637].forEach((f, i) => this.tone(f, 0.4 + i * 0.07, 0.25, 'sine', 0.06));
    },
    retry() {
      // こわくない、やさしい「ぽよん」
      this.tone(520, 0, 0.18, 'sine', 0.16);
      this.tone(620, 0.16, 0.22, 'sine', 0.14);
    },
    fanfare() {
      const notes = [523, 659, 784, 1047, 784, 1047, 1319];
      notes.forEach((f, i) => this.tone(f, i * 0.13, i === notes.length - 1 ? 0.8 : 0.22, 'triangle', 0.22));
    }
  };

  let audioReady = false;
  function unlockAudio() {
    if (audioReady) return;
    audioReady = true;
    sfx.unlock();
    // iPhone Safari: 最初のタップの中で一度しゃべらせると、その後も読み上げできる
    if (speech.ok) {
      speech.pickVoice();
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      u.lang = 'ja-JP';
      window.speechSynthesis.speak(u);
    }
  }

  // ---------------- 紙吹雪・キラキラ ----------------
  const fx = {
    canvas: $('#fx'),
    ctx: null,
    parts: [],
    running: false,
    colors: ['#ff5a5f', '#ffd23f', '#36c275', '#2f8be0', '#ff8a3d', '#b36bff', '#ff7ac6'],
    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = window.innerWidth * dpr;
      this.canvas.height = window.innerHeight * dpr;
      this.ctx = this.canvas.getContext('2d');
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    add(p) { this.parts.push(p); if (!this.running) { this.running = true; requestAnimationFrame(() => this.loop()); } },
    burst(x, y, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 4 + Math.random() * 8;
        this.add({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 4,
          size: 10 + Math.random() * 12, rot: Math.random() * 6, vr: (Math.random() - .5) * .3,
          color: this.colors[i % this.colors.length], shape: i % 3 === 0 ? 'star' : 'circle',
          life: 60 + Math.random() * 30, g: 0.25
        });
      }
    },
    rain(n) {
      const w = window.innerWidth;
      for (let i = 0; i < n; i++) {
        this.add({
          x: Math.random() * w, y: -20 - Math.random() * window.innerHeight * .6,
          vx: (Math.random() - .5) * 2, vy: 2 + Math.random() * 3,
          size: 8 + Math.random() * 8, rot: Math.random() * 6, vr: (Math.random() - .5) * .25,
          color: this.colors[i % this.colors.length], shape: i % 4 === 0 ? 'star' : 'rect',
          life: 240, g: 0.04
        });
      }
    },
    star(ctx, r) {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? r * 0.45 : r;
        const a = (i * Math.PI) / 5 - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    },
    loop() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const h = window.innerHeight;
      this.parts = this.parts.filter((p) => p.life > 0 && p.y < h + 40);
      for (const p of this.parts) {
        p.vy += p.g; p.vx *= 0.99;
        p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life / 25);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 'star') this.star(ctx, p.size * 0.7);
        else if (p.shape === 'circle') { ctx.beginPath(); ctx.arc(0, 0, p.size * 0.35, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (this.parts.length) requestAnimationFrame(() => this.loop());
      else { this.running = false; ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); }
    },
    clear() { this.parts = []; }
  };
  fx.resize();
  window.addEventListener('resize', () => fx.resize());

  // ---------------- 画面の表示 ----------------
  function show(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    $('#screen-' + name).classList.add('active');
  }

  // 乗り物の絵：image があれば画像、なければ SVG イラスト
  let artCount = 0;
  function art(v) {
    if (v.image) return `<img src="${ROOT + v.image}" alt="" draggable="false">`;
    // 同じ絵が画面に2つあっても崩れないよう、SVG内のIDを毎回ちがう名前にする
    artCount++;
    return v.svg.replace(/(id="|#)clip-([\w-]+)/g, `$1clip-$2-${artCount}`);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }


  function stopAudio() { speech.stop(); }

  // ゲーム一覧（いちばん上の index.html）へ もどる
  function goTop() {
    stopAudio();
    fx.clear();
    location.href = ROOT + 'index.html';
  }

  // 誤操作の防止（ピンチ拡大・長押しメニュー・画面のびよーん）
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
  // アプリを閉じたら声を止める
  document.addEventListener('visibilitychange', () => { if (document.hidden) speech.stop(); });
  // ゲームの一覧へ もどるとき：読み上げ・効果音・紙吹雪を止める
  function leave() {
    speech.stop();
    fx.clear();
    if (sfx.ctx && sfx.ctx.state === 'running') sfx.ctx.suspend().catch(() => { });
    audioReady = false; // もどってきたら、次のタップで 音を もう一度 用意する
  }
  document.addEventListener('norimono:leave', leave);
  window.addEventListener('pagehide', leave);

  window.NoriApp = {
    root: ROOT, settings, saveSettings, speech, sfx, fx, art, show, shuffle, unlockAudio, goTop, stopAudio
  };

  // オフライン用（ゲーム集の sw.js を使う）
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register(ROOT + 'sw.js').catch(() => { });
  }
})();
