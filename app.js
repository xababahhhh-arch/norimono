/* のりもの あてっこ - ゲームのしくみ */
(function () {
  'use strict';

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

  // ---------------- 録音した声・音（この端末の中だけに保存） ----------------
  // key の形: 'name:<乗り物id>' 名前の声 / 'sound:<乗り物id>' 本物の音 / 'phrase:<q|ok|retry|end>' ことば
  const PHRASES = [
    { key: 'phrase:q', text: 'は、どれ？', note: '名前のあとに つなげて流します' },
    { key: 'phrase:ok', text: 'せいかい！', note: '名前の前に流します' },
    { key: 'phrase:retry', text: 'もういちど！' },
    { key: 'phrase:end', text: 'すごい！ぜんぶできたね！' }
  ];

  const db = {
    p: null,
    open() {
      if (!this.p) {
        this.p = new Promise((res, rej) => {
          const r = indexedDB.open('norimono', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('clips');
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
      }
      return this.p;
    },
    async run(mode, fn) {
      const d = await this.open();
      return new Promise((res, rej) => {
        const tx = d.transaction('clips', mode);
        const req = fn(tx.objectStore('clips'));
        tx.oncomplete = () => res(req.result);
        tx.onerror = () => rej(tx.error);
      });
    },
    get(k) { return this.run('readonly', (st) => st.get(k)); },
    set(k, v) { return this.run('readwrite', (st) => st.put(v, k)); },
    del(k) { return this.run('readwrite', (st) => st.delete(k)); },
    keys() { return this.run('readonly', (st) => st.getAllKeys()); }
  };

  // 前後の無音を切って、音の大きさをそろえる
  function trimBuffer(ctx, b) {
    const d = b.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
    if (peak < 0.001) return b;
    const th = peak * 0.08;
    let a = 0, z = d.length - 1;
    while (a < z && Math.abs(d[a]) < th) a++;
    while (z > a && Math.abs(d[z]) < th) z--;
    const pad = Math.floor(b.sampleRate * 0.06);
    a = Math.max(0, a - pad);
    z = Math.min(d.length - 1, z + pad);
    const gain = Math.min(0.9 / peak, 6);
    const out = ctx.createBuffer(1, z - a + 1, b.sampleRate);
    const o = out.getChannelData(0);
    for (let i = a; i <= z; i++) o[i - a] = d[i] * gain;
    return out;
  }

  const clips = {
    buf: {},
    playing: [],
    decode(data) {
      const ctx = sfx.ensure();
      if (!ctx) return Promise.resolve(null);
      return (data instanceof Blob ? data.arrayBuffer() : Promise.resolve(data)).then((ab) =>
        new Promise((res) => ctx.decodeAudioData(ab, (b) => res(trimBuffer(ctx, b)), () => res(null))));
    },
    async load(key, data) {
      const b = await this.decode(data);
      if (b) this.buf[key] = b; else delete this.buf[key];
    },
    async loadAll() {
      try {
        const keys = await db.keys();
        for (const k of keys) {
          const blob = await db.get(k);
          if (blob) await this.load(k, blob);
        }
      } catch (e) { /* 保存できない環境 */ }
      // vehicles.js に書いた 本物の音のファイル
      for (const v of VEHICLES) {
        if (!v.sound) continue;
        try {
          const r = await fetch(v.sound);
          if (r.ok) await this.load('file:' + v.id, await r.arrayBuffer());
        } catch (e) { }
      }
    },
    has(keys) { return keys.every((k) => this.buf[k]); },
    stop() {
      this.playing.forEach((src) => { try { src.stop(); } catch (e) { } });
      this.playing = [];
    },
    // 順番につなげて流す。流し終わるころに resolve
    play(keys) {
      const ctx = sfx.ctx;
      if (!ctx) return Promise.resolve();
      this.stop();
      let t = ctx.currentTime + 0.05;
      keys.forEach((k) => {
        const b = this.buf[k];
        if (!b) return;
        const src = ctx.createBufferSource();
        src.buffer = b;
        src.connect(ctx.destination);
        src.start(t);
        this.playing.push(src);
        t += b.duration + 0.05;
      });
      return wait((t - ctx.currentTime) * 1000);
    }
  };

  // しゃべる：録音がそろっていれば おうちの人の声、なければ iPhone の読み上げ
  function talk(keys, text) {
    if (!settings.voice) return Promise.resolve();
    if (clips.has(keys)) { speech.stop(); return clips.play(keys); }
    clips.stop();
    return speech.say(text);
  }

  // 乗り物の本物の音（録音 または sounds フォルダのファイル）。なければ鳴らさない
  function vehicleSound(v) {
    if (!settings.sfx) return Promise.resolve();
    const key = clips.buf['sound:' + v.id] ? 'sound:' + v.id : clips.buf['file:' + v.id] ? 'file:' + v.id : null;
    if (!key) return Promise.resolve();
    return Promise.race([clips.play([key]), wait(5000)]);
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
    // ゲーム一覧へ もどる「← もどる」（back.js）は、はじめの画面だけに出す（ほかの画面のボタンと重ならないように）
    document.body.classList.toggle('on-start', name === 'start');
  }

  // 乗り物の絵：image があれば画像、なければ SVG イラスト
  let artCount = 0;
  function art(v) {
    if (v.image) return `<img src="${v.image}" alt="" draggable="false">`;
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

  // はじめの画面の パレード
  function startParade() {
    const box = $('#parade');
    const picks = shuffle(VEHICLES).slice(0, 3);
    box.innerHTML = picks
      .map((v, i) => `<div class="pv" style="animation-delay:${-i * 2.4}s">${art(v)}</div>`)
      .join('');
  }

  // ---------------- ゲーム ----------------
  let game = null;
  let token = 0; // 画面を離れたときに古いタイマーを無視するため

  // 設定で「出す」になっている乗り物
  function enabledVehicles() {
    const list = VEHICLES.filter((v) => settings.off.indexOf(v.id) < 0);
    return list.length >= 2 ? list : VEHICLES;
  }

  // まちがいの選択肢をえらぶ（むずかしさで変える）
  function pickOthers(t, pool) {
    const level = Number(settings.level) || 2;
    const need = level === 1 ? 1 : 2;
    const cand = shuffle(pool.filter((v) => v.id !== t.id));
    const rest = shuffle(VEHICLES.filter((v) => v.id !== t.id && cand.indexOf(v) < 0));
    let ordered;
    if (level === 1) ordered = cand.filter((v) => v.group !== t.group).concat(cand, rest);
    else if (level === 3) ordered = cand.filter((v) => v.group === t.group).concat(cand, rest);
    else ordered = cand.concat(rest);
    const out = [];
    ordered.forEach((v) => { if (out.length < need && out.indexOf(v) < 0) out.push(v); });
    return out;
  }

  function newGame() {
    token++;
    fx.clear();
    const pool = enabledVehicles();
    const n = Number(settings.count) || 5;
    // 乗り物が少ないときは くりかえし出す（同じものが続かないように）
    const targets = [];
    while (targets.length < n) {
      shuffle(pool).forEach((v) => {
        if (targets.length < n && targets[targets.length - 1] !== v) targets.push(v);
      });
    }
    game = {
      rounds: targets.map((t) => ({ target: t, choices: shuffle([t].concat(pickOthers(t, pool))) })),
      idx: 0,
      misses: 0,
      locked: false,
      lastRetry: 0,
      idleTimer: null,
      idleCount: 0
    };
    renderProgress();
    show('game');
    renderRound();
  }

  const STAR_PATH = 'M50 6l12.9 26.2 28.9 4.2-20.9 20.4 4.9 28.8L50 72 24.2 85.6l4.9-28.8L8.2 36.4l28.9-4.2z';
  function renderProgress() {
    const box = $('#progress');
    box.classList.toggle('many', game.rounds.length > 6);
    box.innerHTML = game.rounds
      .map(() => `<svg class="pstar" viewBox="0 0 100 100"><path d="${STAR_PATH}"/></svg>`)
      .join('');
  }

  function askQuestion() {
    const t = game.rounds[game.idx].target;
    const q = $('#question');
    q.classList.remove('bump'); void q.offsetWidth; q.classList.add('bump');
    armIdle();
    return talk(['name:' + t.id, 'phrase:q'], `${t.say}は、どれ？`);
  }

  // しばらくタップがないときは、やさしく もう一度きく（2回まで）
  function armIdle() {
    if (!game) return;
    clearTimeout(game.idleTimer);
    const my = token;
    game.idleTimer = setTimeout(() => {
      if (my !== token || !game || game.locked || game.idleCount >= 2) return;
      game.idleCount++;
      const t = game.rounds[game.idx].target;
      const q = $('#question');
      q.classList.remove('bump'); void q.offsetWidth; q.classList.add('bump');
      talk(['name:' + t.id, 'phrase:q'], `${t.say}は、どれかな？`);
      armIdle();
    }, 10000);
  }

  const PRAISE = ['せいかい！', 'すごい！せいかい！', 'やったね！せいかい！', 'せいかい！よくできたね。'];

  function renderRound() {
    const round = game.rounds[game.idx];
    const t = round.target;
    game.misses = 0;
    game.idleCount = 0;
    game.locked = false;

    const qn = $('#qname');
    qn.textContent = t.name;
    qn.classList.toggle('long', t.name.length >= 8);
    $('#question').style.setProperty('--qcolor', t.color || '#2f8be0');

    const box = $('#choices');
    box.innerHTML = '';
    box.classList.toggle('two', round.choices.length === 2);
    round.choices.forEach((v) => {
      const b = document.createElement('button');
      b.className = 'card';
      b.setAttribute('aria-label', v.name);
      b.innerHTML = art(v);
      b.addEventListener('click', () => onChoose(b, v));
      box.appendChild(b);
    });

    const my = token;
    setTimeout(() => { if (my === token) askQuestion(); }, 450);
  }

  async function onChoose(card, v) {
    if (!game || game.locked) return;
    const round = game.rounds[game.idx];
    const t = round.target;

    if (v.id === t.id) {
      // ---- せいかい ----
      game.locked = true;
      clearTimeout(game.idleTimer);
      const my = token;
      card.classList.add('correct');
      document.querySelectorAll('.card').forEach((c) => { if (c !== card) c.classList.add('fade'); });
      sfx.correct();

      const r = card.getBoundingClientRect();
      fx.burst(r.left + r.width / 2, r.top + r.height / 2, 36);
      fx.rain(40);

      const pop = $('#correct-pop');
      $('#cp-name').textContent = t.name;
      $('#cp-name').classList.toggle('long', t.name.length >= 8);
      $('#cp-name').style.color = t.color || '#2f8be0';
      pop.classList.remove('show'); void pop.offsetWidth; pop.classList.add('show');

      const stars = document.querySelectorAll('#progress .pstar');
      if (stars[game.idx]) stars[game.idx].classList.add('on');

      const praise = PRAISE[Math.floor(Math.random() * PRAISE.length)];
      await Promise.all([wait(2400), talk(['phrase:ok', 'name:' + t.id], `${praise}${t.say}だね！`)]);
      if (my !== token) return;

      // 乗り物の音を鳴らして、走っていく
      card.classList.add('drive');
      await Promise.all([wait(1700), vehicleSound(t)]);
      if (my !== token) return;

      game.idx++;
      if (game.idx >= game.rounds.length) finish();
      else renderRound();
    } else {
      // ---- ちがうとき（やさしく もういちど） ----
      const now = Date.now();
      card.classList.remove('wiggle'); void card.offsetWidth; card.classList.add('wiggle');
      if (now - game.lastRetry < 900) return; // 連打で声が重ならないように
      game.lastRetry = now;
      game.misses++;
      sfx.retry();
      const bubble = $('#retry-bubble');
      bubble.classList.remove('show'); void bubble.offsetWidth; bubble.classList.add('show');
      if (game.misses >= 2) {
        const idx = round.choices.findIndex((c) => c.id === t.id);
        const cards = document.querySelectorAll('.card');
        if (cards[idx]) cards[idx].classList.add('hint');
      }
      armIdle();
      // おしたものの名前を教えてから、もう一度きく
      showCardTag(card, v);
      talk(['name:' + v.id, 'phrase:retry', 'name:' + t.id, 'phrase:q'], `それは、${v.say}だよ。もう一度！${t.say}は、どれ？`);
    }
  }

  // まちがえたカードに、その乗り物の名前を出す
  function showCardTag(card, v) {
    let tag = card.querySelector('.card-tag');
    if (!tag) {
      tag = document.createElement('span');
      tag.className = 'card-tag';
      card.appendChild(tag);
    }
    tag.textContent = v.name;
    tag.style.color = v.color || '#2f8be0';
    tag.classList.remove('show'); void tag.offsetWidth; tag.classList.add('show');
  }

  function finish() {
    const my = token;
    show('end');
    $('#end-list').innerHTML = game.rounds
      .map((r, i) => `<div class="thumb" style="animation-delay:${0.3 + i * 0.1}s">${art(r.target)}</div>`)
      .join('');
    sfx.fanfare();
    fx.rain(120);
    setTimeout(() => { if (my === token) fx.rain(80); }, 1200);
    talk(['phrase:end'], 'すごい！全部できたね！');
  }

  function goHome() {
    token++;
    if (game) clearTimeout(game.idleTimer);
    game = null;
    speech.stop();
    clips.stop();
    fx.clear();
    startParade();
    show('start');
  }

  // ---------------- ずかん ----------------
  function openZukan() {
    token++;
    const list = $('#zukan-list');
    list.innerHTML = '';
    GROUPS.forEach((g) => {
      const members = VEHICLES.filter((v) => v.group === g.id);
      if (!members.length) return;
      const h = document.createElement('div');
      h.className = 'zgroup';
      h.textContent = g.name;
      list.appendChild(h);
      members.forEach((v) => addZukanCard(list, v));
    });
    list.scrollTop = 0;
    show('zukan');
  }

  function addZukanCard(list, v) {
    const b = document.createElement('button');
    b.className = 'zcard';
    b.setAttribute('aria-label', v.name);
    b.innerHTML = `<div class="zart">${art(v)}</div><div class="zname" style="color:${v.color || '#2f8be0'}">${v.name}</div>`;
    b.addEventListener('click', () => {
      unlockAudio();
      const my = token;
      b.classList.remove('zgo'); void b.offsetWidth; b.classList.add('zgo');
      talk(['name:' + v.id], `${v.say}！`).then(() => { if (my === token) vehicleSound(v); });
    });
    list.appendChild(b);
  }

  // ---------------- 長押しボタン（保護者用） ----------------
  function longPress(el, ms, fn) {
    let timer = null;
    const cancel = () => { clearTimeout(timer); timer = null; el.classList.remove('pressing'); };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      cancel();
      el.classList.add('pressing');
      timer = setTimeout(() => { cancel(); fn(); }, ms);
    });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => el.addEventListener(ev, cancel));
  }

  // ---------------- せってい画面 ----------------
  function refreshSettingsUI() {
    document.querySelectorAll('.seg').forEach((seg) => {
      const key = seg.dataset.key;
      seg.querySelectorAll('button').forEach((b) => {
        b.classList.toggle('on', String(settings[key]) === b.dataset.val);
      });
    });
  }
  document.querySelectorAll('.seg').forEach((seg) => {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      const key = seg.dataset.key;
      const raw = b.dataset.val;
      settings[key] = raw === 'true' ? true : raw === 'false' ? false : Number(raw);
      saveSettings();
      refreshSettingsUI();
    });
  });
  function renderVehicleChips() {
    const box = $('#set-vehicles');
    box.innerHTML = '';
    // なかまごと まとめて オン・オフ
    GROUPS.forEach((g) => {
      const ids = VEHICLES.filter((v) => v.group === g.id).map((v) => v.id);
      const offCount = ids.filter((id) => settings.off.indexOf(id) >= 0).length;
      const b = document.createElement('button');
      b.className = 'chip group' + (offCount === 0 ? ' on' : offCount < ids.length ? ' part' : '');
      b.textContent = g.name + ' ぜんぶ';
      b.addEventListener('click', () => {
        if (offCount === 0) {
          const next = settings.off.concat(ids);
          if (VEHICLES.length - next.length >= 3) settings.off = next; // 最低3つは残す
        } else {
          settings.off = settings.off.filter((id) => ids.indexOf(id) < 0);
        }
        saveSettings();
        renderVehicleChips();
      });
      box.appendChild(b);
    });
    const sep = document.createElement('div');
    sep.className = 'chip-sep';
    box.appendChild(sep);
    VEHICLES.forEach((v) => {
      const b = document.createElement('button');
      b.className = 'chip' + (settings.off.indexOf(v.id) < 0 ? ' on' : '');
      b.textContent = v.name;
      b.addEventListener('click', () => {
        const i = settings.off.indexOf(v.id);
        if (i >= 0) settings.off.splice(i, 1);
        else if (VEHICLES.length - settings.off.length > 3) settings.off.push(v.id); // 最低3つは残す
        saveSettings();
        renderVehicleChips();
      });
      box.appendChild(b);
    });
  }
  function renderVoiceSelect() {
    const sel = $('#set-voice');
    const ja = speech.japaneseVoices();
    sel.innerHTML = '<option value="">おすすめ（自動）</option>' +
      ja.map((v) => `<option value="${v.name.replace(/"/g, '&quot;')}">${v.name}</option>`).join('');
    sel.value = ja.some((v) => v.name === settings.voiceName) ? settings.voiceName : '';
    if (!ja.length) sel.innerHTML = '<option value="">（日本語の声が見つかりません）</option>';
  }
  $('#set-voice').addEventListener('change', (e) => {
    settings.voiceName = e.target.value;
    saveSettings();
    speech.pickVoice();
    unlockAudio();
    talk(['name:hayabusa', 'phrase:q'], 'はやぶさは、どれ？');
  });
  function openSettings() {
    refreshSettingsUI();
    renderVehicleChips();
    renderVoiceSelect();
    $('#settings').hidden = false;
  }
  $('#btn-close-settings').addEventListener('click', () => { $('#settings').hidden = true; });
  $('#btn-test-voice').addEventListener('click', () => {
    unlockAudio();
    sfx.correct();
    talk(['phrase:ok', 'name:hayabusa'], 'せいかい！はやぶさだね！');
  });

  // ---------------- 声と音の録音（保護者用） ----------------
  const rec = { mr: null, stream: null, key: null, btn: null, timer: null };

  function recControls(key, label) {
    const has = !!clips.buf[key];
    return `<div class="rc${has ? ' has' : ''}" data-key="${key}"><span class="rc-label">${label}</span>` +
      `<button class="rc-rec" aria-label="録音">●</button><button class="rc-play" aria-label="再生"${has ? '' : ' disabled'}>▶</button>` +
      `<button class="rc-del" aria-label="消す"${has ? '' : ' disabled'}>✕</button></div>`;
  }
  function renderRecorder() {
    let h = '<div class="rec-group">ことば</div>';
    PHRASES.forEach((p) => {
      h += `<div class="rec-row"><div class="rec-name">「${p.text}」${p.note ? `<small>${p.note}</small>` : ''}</div>${recControls(p.key, 'ことば')}</div>`;
    });
    GROUPS.forEach((g) => {
      const members = VEHICLES.filter((v) => v.group === g.id);
      if (!members.length) return;
      h += `<div class="rec-group">${g.name}</div>`;
      members.forEach((v) => {
        h += `<div class="rec-row"><div class="rec-name"><span class="rec-thumb">${art(v)}</span>${v.name}</div>` +
          recControls('name:' + v.id, 'なまえ') + recControls('sound:' + v.id, 'おと') + '</div>';
      });
    });
    $('#rec-list').innerHTML = h;
  }
  function refreshRecControl(key) {
    const el = document.querySelector(`.rc[data-key="${key}"]`);
    if (!el) return;
    const has = !!clips.buf[key];
    el.classList.toggle('has', has);
    el.querySelector('.rc-play').disabled = !has;
    el.querySelector('.rc-del').disabled = !has;
  }
  function stopRec() {
    clearTimeout(rec.timer);
    if (rec.mr && rec.mr.state !== 'inactive') rec.mr.stop();
    if (rec.btn) { rec.btn.classList.remove('recording'); rec.btn.textContent = '●'; }
    rec.mr = null;
    rec.btn = null;
  }
  async function toggleRec(key, btn) {
    const wasSame = rec.mr && rec.key === key;
    if (rec.mr) stopRec();
    if (wasSame) return;
    if (!window.MediaRecorder || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('この端末・ブラウザでは録音できません。');
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      alert('マイクが使えませんでした。iPhoneの「設定」→「Safari」→「マイク」で許可してください。');
      return;
    }
    speech.stop();
    clips.stop();
    const chunks = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop()); // マイクを切る（音が小さくなるのを防ぐ）
      const blob = new Blob(chunks, { type: mr.mimeType || 'audio/mp4' });
      if (blob.size < 300) return;
      try { await db.set(key, blob); } catch (e) { alert('保存できませんでした。'); return; }
      await clips.load(key, blob);
      refreshRecControl(key);
      setTimeout(() => clips.play([key]), 250);
    };
    rec.mr = mr;
    rec.key = key;
    rec.btn = btn;
    btn.classList.add('recording');
    btn.textContent = '■';
    mr.start();
    rec.timer = setTimeout(stopRec, key.indexOf('sound:') === 0 ? 10000 : 5000);
  }
  $('#rec-list').addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    const box = e.target.closest('.rc');
    if (!btn || !box) return;
    unlockAudio();
    const key = box.dataset.key;
    if (btn.classList.contains('rc-rec')) toggleRec(key, btn);
    else if (btn.classList.contains('rc-play')) clips.play([key]);
    else if (btn.classList.contains('rc-del')) {
      if (!confirm('この録音を消しますか？')) return;
      try { await db.del(key); } catch (err) { }
      delete clips.buf[key];
      refreshRecControl(key);
    }
  });
  $('#btn-open-recorder').addEventListener('click', () => {
    unlockAudio();
    renderRecorder();
    $('#recorder').hidden = false;
  });
  $('#btn-rec-close').addEventListener('click', () => {
    stopRec();
    clips.stop();
    $('#recorder').hidden = true;
  });

  // ---------------- ボタンの動き ----------------
  $('#btn-play').addEventListener('click', () => {
    unlockAudio();
    sfx.pop();
    newGame();
  });
  $('#btn-again').addEventListener('click', () => {
    unlockAudio();
    sfx.pop();
    newGame();
  });
  $('#btn-repeat').addEventListener('click', () => { unlockAudio(); if (game && !game.locked) askQuestion(); });
  $('#question').addEventListener('click', () => { unlockAudio(); if (game && !game.locked) askQuestion(); });
  longPress($('#btn-settings'), 1200, openSettings);
  longPress($('#btn-home'), 1200, goHome);
  $('#btn-end-home').addEventListener('click', goHome);
  $('#btn-zukan').addEventListener('click', () => { unlockAudio(); sfx.pop(); openZukan(); });
  $('#btn-zukan-back').addEventListener('click', goHome);

  // ---------------- 誤操作の防止 ----------------
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault()); // ピンチで拡大しない
  document.addEventListener('dblclick', (e) => e.preventDefault());
  document.addEventListener('touchmove', (e) => {
    if (!e.target.closest('.settings-panel, .zukan-list, .rec-list')) e.preventDefault(); // 画面がびよーんと動かない
  }, { passive: false });

  // アプリを閉じたら声を止める
  document.addEventListener('visibilitychange', () => { if (document.hidden) speech.stop(); });

  // ---------------- オフライン対応 ----------------
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    // 新しい版が届いたら、すぐに切りかえる（古い版が残らないように）
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloaded) return;
      reloaded = true;
      location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((r) => r.update()).catch(() => { });
    });
  }

  document.body.classList.toggle('on-start', !!document.querySelector('#screen-start.active'));
  startParade();
  clips.loadAll();
})();
