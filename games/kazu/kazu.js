/* かずあそび「でんしゃに のせよう」
 * 駅にとまった電車に、どうぶつを 1ぴきずつ のせて かぞえる → 目標の数になったら しゅっぱつ！
 * 読み上げ・効果音・紙吹雪は ../common/core.js（NoriApp）を使います。
 */
(function () {
  'use strict';

  const A = window.NoriApp;
  if (!A) return;

  const $ = (sel) => document.querySelector(sel);
  const ROUNDS = 5;
  const reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  const ms = (normal, reduced) => (reduceMotion.matches ? reduced : normal);
  const wait = (t) => new Promise((r) => setTimeout(r, t));
  const NUM = ['', 'いち', 'に', 'さん', 'よん', 'ご']; // 乗るたびに読む かず

  // ---------------- どうぶつ（顔の絵・自作SVG） ----------------
  const face = (inner) => `<svg viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
  const ANIMALS = [
    { id: 'dog', name: 'いぬ', say: '犬', svg: face(`
      <ellipse cx="20" cy="46" rx="12" ry="22" fill="#8a5a2b" transform="rotate(20 20 46)"/>
      <ellipse cx="80" cy="46" rx="12" ry="22" fill="#8a5a2b" transform="rotate(-20 80 46)"/>
      <circle cx="50" cy="54" r="34" fill="#d9a066"/>
      <ellipse cx="50" cy="68" rx="18" ry="13" fill="#f2d3b0"/>
      <circle cx="38" cy="50" r="4.5" fill="#2b2b2b"/><circle cx="62" cy="50" r="4.5" fill="#2b2b2b"/>
      <ellipse cx="50" cy="62" rx="6" ry="4.5" fill="#2b2b2b"/>
      <path d="M44,72 q6,5 12,0" stroke="#2b2b2b" stroke-width="3" fill="none" stroke-linecap="round"/>`) },
    { id: 'cat', name: 'ねこ', say: '猫', svg: face(`
      <path d="M20,42 L24,10 L46,28 Z M80,42 L76,10 L54,28 Z" fill="#f5a35a"/>
      <path d="M26,32 L28,18 L39,28 Z M74,32 L72,18 L61,28 Z" fill="#ffb3c1"/>
      <circle cx="50" cy="56" r="34" fill="#f5a35a"/>
      <path d="M42,26 L44,36 M50,24 L50,34 M58,26 L56,36" stroke="#d9772e" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="38" cy="52" rx="4" ry="6" fill="#2b2b2b"/><ellipse cx="62" cy="52" rx="4" ry="6" fill="#2b2b2b"/>
      <path d="M46,63 L54,63 L50,68 Z" fill="#ff8aa0"/>
      <path d="M50,68 q-5,6 -10,1 M50,68 q5,6 10,1" stroke="#2b2b2b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <path d="M28,64 L12,61 M28,69 L12,72 M72,64 L88,61 M72,69 L88,72" stroke="#6b4b2b" stroke-width="2" stroke-linecap="round"/>`) },
    { id: 'rabbit', name: 'うさぎ', say: 'うさぎ', svg: face(`
      <ellipse cx="36" cy="24" rx="9" ry="22" fill="#fff" stroke="#c9ced6" stroke-width="3"/>
      <ellipse cx="64" cy="24" rx="9" ry="22" fill="#fff" stroke="#c9ced6" stroke-width="3"/>
      <ellipse cx="36" cy="26" rx="4" ry="14" fill="#ffc2cf"/><ellipse cx="64" cy="26" rx="4" ry="14" fill="#ffc2cf"/>
      <circle cx="50" cy="64" r="30" fill="#fff" stroke="#c9ced6" stroke-width="3"/>
      <circle cx="39" cy="60" r="4.5" fill="#2b2b2b"/><circle cx="61" cy="60" r="4.5" fill="#2b2b2b"/>
      <circle cx="31" cy="72" r="5" fill="#ffc2cf"/><circle cx="69" cy="72" r="5" fill="#ffc2cf"/>
      <path d="M46,70 L54,70 L50,75 Z" fill="#ff8aa0"/>
      <path d="M50,75 q-4,5 -8,1 M50,75 q4,5 8,1" stroke="#2b2b2b" stroke-width="2.5" fill="none" stroke-linecap="round"/>`) },
    { id: 'bear', name: 'くま', say: 'くま', svg: face(`
      <circle cx="24" cy="28" r="13" fill="#a0522d"/><circle cx="76" cy="28" r="13" fill="#a0522d"/>
      <circle cx="24" cy="28" r="6" fill="#d9a06b"/><circle cx="76" cy="28" r="6" fill="#d9a06b"/>
      <circle cx="50" cy="56" r="34" fill="#a0522d"/>
      <ellipse cx="50" cy="67" rx="17" ry="13" fill="#e8c39e"/>
      <circle cx="38" cy="50" r="4.5" fill="#2b2b2b"/><circle cx="62" cy="50" r="4.5" fill="#2b2b2b"/>
      <ellipse cx="50" cy="62" rx="6" ry="4.5" fill="#2b2b2b"/>
      <path d="M44,72 q6,5 12,0" stroke="#2b2b2b" stroke-width="3" fill="none" stroke-linecap="round"/>`) },
    { id: 'pig', name: 'ぶた', say: 'ぶた', svg: face(`
      <path d="M18,40 L22,14 L42,28 Z M82,40 L78,14 L58,28 Z" fill="#f48fb1"/>
      <circle cx="50" cy="56" r="34" fill="#ffb3c1"/>
      <circle cx="38" cy="48" r="4.5" fill="#2b2b2b"/><circle cx="62" cy="48" r="4.5" fill="#2b2b2b"/>
      <ellipse cx="50" cy="64" rx="16" ry="11" fill="#f48fb1"/>
      <ellipse cx="44" cy="64" rx="3" ry="4.5" fill="#c2185b"/><ellipse cx="56" cy="64" rx="3" ry="4.5" fill="#c2185b"/>
      <path d="M44,79 q6,4 12,0" stroke="#2b2b2b" stroke-width="3" fill="none" stroke-linecap="round"/>`) }
  ];

  // 電車の 先頭：のりものゲームの「山手線」の絵の 前の部分だけを使う
  function headSVG() {
    const v = (window.VEHICLES || []).find((x) => x.id === 'yamanote');
    if (!v) return '';
    return A.art(v).replace('viewBox="0 0 320 160"', 'viewBox="262 38 50 92" preserveAspectRatio="xMinYMid meet"');
  }

  // ---------------- 設定（この端末に保存） ----------------
  const kz = { range: 3 };
  try {
    const saved = JSON.parse(localStorage.getItem('kazu-settings') || '{}');
    if (saved.range === 3 || saved.range === 5) kz.range = saved.range;
  } catch (e) { }
  const saveKz = () => { try { localStorage.setItem('kazu-settings', JSON.stringify(kz)); } catch (e) { } };
  const isFirstPlay = () => { try { return !localStorage.getItem('kazu-played'); } catch (e) { return false; } };
  const markPlayed = () => { try { localStorage.setItem('kazu-played', '1'); } catch (e) { } };

  let state = null;
  let token = 0; // 画面を はなれたら 古いタイマーを むしする

  function speak(text) {
    if (!A.settings.voice) return Promise.resolve();
    return A.speech.say(text);
  }
  // 効果音は ひかえめに（数える声を 聞きやすく）
  function tones(list, vol) {
    list.forEach(([f, t, d]) => A.sfx.tone(f, t, d, 'sine', vol || 0.05));
  }
  function clearFlying() {
    document.querySelectorAll('.kz-fly').forEach((el) => el.remove());
  }
  function stopAll() {
    token++;
    A.stopAudio();
    A.fx.clear();
    clearFlying();
  }

  // ---------------- 出題 ----------------
  // 同じ数が つづかないように、1回の中で 同じ数は 2回まで
  function numbers(range, start) {
    const out = start.slice();
    const used = {};
    out.forEach((v) => { used[v] = (used[v] || 0) + 1; });
    while (out.length < ROUNDS) {
      const cands = [];
      for (let v = 1; v <= range; v++) {
        if (v === out[out.length - 1] || (used[v] || 0) >= 2) continue;
        cands.push(v);
      }
      const v = cands.length ? cands[Math.floor(Math.random() * cands.length)] : 1 + Math.floor(Math.random() * range);
      out.push(v);
      used[v] = (used[v] || 0) + 1;
    }
    return out;
  }
  function buildRounds() {
    // はじめて遊ぶときは 1ぴき → 2ひき → 3びき の順に体験し、のこり2問は 1〜3 から
    const first = isFirstPlay();
    const ns = first ? numbers(3, [1, 2, 3]) : numbers(kz.range, []);
    let prev = null;
    return ns.map((n) => {
      const pool = ANIMALS.filter((a) => a !== prev); // 1問の中では 同じどうぶつ、つぎの問題では かえる
      const animal = pool[Math.floor(Math.random() * pool.length)];
      prev = animal;
      return { n, animal };
    });
  }
  const cur = () => state.rounds[state.idx];

  // ---------------- はじめの画面 ----------------
  function refreshStartUI() {
    $('#kz-r3').setAttribute('aria-pressed', String(kz.range === 3));
    $('#kz-r5').setAttribute('aria-pressed', String(kz.range === 5));
    const canSpeak = A.speech.ok;
    const on = canSpeak && A.settings.voice;
    const vb = $('#kz-voice');
    vb.disabled = !canSpeak;
    vb.setAttribute('aria-pressed', String(on));
    vb.querySelector('.kz-voice-icon').textContent = on ? '🔊' : '🔇';
    vb.querySelector('.kz-voice-text').textContent = !canSpeak ? 'こえは つかえません' : on ? 'こえ あり' : 'こえ なし';
    vb.setAttribute('aria-label', !canSpeak ? 'この きかいでは こえが つかえません' : on ? 'こえ あり。おすと こえ なし' : 'こえ なし。おすと こえ あり');
  }
  function openStart() {
    stopAll();
    state = null;
    $('#kz-preview').innerHTML =
      `<div class="kz-prev-faces">${ANIMALS.slice(0, 3).map((a) => `<span>${a.svg}</span>`).join('')}</div>` +
      `<div class="kz-prev-head">${headSVG()}</div>`;
    refreshStartUI();
    A.show('kz-start');
  }

  // ---------------- ゲーム ----------------
  function begin() {
    A.unlockAudio(); // iPhone：「はじめる」の タップのあとから 読み上げできる
    stopAll();
    state = { rounds: buildRounds(), idx: 0, count: 0, phase: 'arriving', busy: false };
    markPlayed();
    $('#kz-head').innerHTML = headSVG();
    A.show('kz-game');
    arrive();
  }

  function reqText(r) { return `${r.animal.name}を ${r.n}ひき のせてね`; }
  function reqSay(r) { return `${r.animal.say}を、${r.n}匹、乗せてね。`; }

  function renderProgress() {
    $('#kz-progress').innerHTML = state.rounds.map((_, i) => {
      const done = i < state.idx, now = i === state.idx;
      return `<li class="kz-pdot${done ? ' done' : ''}${now ? ' now' : ''}" aria-label="${i + 1}ばんめの えき${done ? ' しゅっぱつ した' : now ? ' いま' : ''}">${done ? '★' : i + 1}</li>`;
    }).join('');
  }

  function setCount(c) {
    const num = $('#kz-count-num');
    num.textContent = String(c);
    num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop');
    $('#kz-count').setAttribute('aria-label', `いま ${c}ひき`);
    $('#kz-seats').setAttribute('aria-label', `せき ${cur().n}こ。のっているのは ${c}ひき`);
  }

  // いまの駅を 描く（fill = もう 乗っている数）
  function renderStation(fill) {
    const r = cur();
    $('#kz-req').textContent = reqText(r);
    $('#kz-station').dataset.n = String(r.n);
    $('#kz-seats').innerHTML = Array.from({ length: r.n }, (_, i) =>
      `<span class="kz-seat${i < fill ? ' on' : ''}" data-i="${i}"><span class="kz-face">${r.animal.svg}</span></span>`).join('');
    // ホームには 目標より 少し多く まっている（じぶんで 数えて とめる）
    const total = Math.min(r.n + 2, 7);
    const box = $('#kz-animals');
    box.innerHTML = '';
    box.dataset.count = String(total - fill);
    for (let i = 0; i < total - fill; i++) {
      const b = document.createElement('button');
      b.className = 'kz-animal';
      b.setAttribute('aria-label', `${r.animal.name}を のせる`);
      b.innerHTML = `<span class="kz-face">${r.animal.svg}</span>`;
      b.addEventListener('click', () => board(b));
      box.appendChild(b);
    }
    $('#kz-platform').classList.remove('done');
    $('#kz-go').hidden = true;
    $('#kz-listen').hidden = !(A.speech.ok && A.settings.voice);
    setCount(fill);
    renderProgress();
  }

  function arrive() {
    const my = ++token;
    A.stopAudio();
    clearFlying();
    state.count = 0;
    state.busy = false;
    state.phase = 'arriving';
    renderStation(0);
    const tr = $('#kz-train');
    tr.className = 'kz-train';
    void tr.offsetWidth;
    tr.className = 'kz-train arriving';
    wait(ms(900, 150)).then(() => {
      if (my !== token || !state) return;
      tr.className = 'kz-train';
      state.phase = 'boarding';
      speak((state.idx > 0 ? '次の駅に、着いたよ。' : '') + reqSay(cur()));
    });
  }

  // どうぶつを 1ぴき のせる
  function board(btn) {
    if (!state || state.phase !== 'boarding' || state.busy || btn.disabled) return;
    const r = cur();
    if (state.count >= r.n) return; // 目標より 多くは のせない
    state.busy = true;               // 乗っている とちゅうは つぎを 受けつけない（二重に数えない）
    btn.disabled = true;
    const my = token;
    state.count += 1;
    const c = state.count;
    setCount(c);

    const seat = document.querySelector(`.kz-seat[data-i="${c - 1}"]`);
    const from = btn.querySelector('.kz-face').getBoundingClientRect();
    const to = seat.querySelector('.kz-face').getBoundingClientRect();
    btn.classList.add('gone');
    const flyMs = ms(450, 0);
    if (flyMs > 0) {
      const fly = document.createElement('span');
      fly.className = 'kz-face kz-fly';
      fly.innerHTML = r.animal.svg;
      fly.style.cssText = `left:${from.left}px;top:${from.top}px;width:${from.width}px;height:${from.height}px`;
      document.body.appendChild(fly);
      requestAnimationFrame(() => {
        fly.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width})`;
      });
      wait(flyMs).then(() => { fly.remove(); if (my === token) seat.classList.add('on'); });
    } else {
      seat.classList.add('on');
    }
    tones([[660, 0, 0.12]], 0.045);

    // 「いち」「に」… と 読みおわるまで（最大 1.4秒）、つぎの 乗車を 少し待たせる
    const voice = speak(NUM[c] + '！');
    Promise.all([wait(flyMs + ms(250, 200)), Promise.race([voice, wait(1400)])]).then(() => {
      if (my !== token || !state) return;
      state.busy = false;
      if (c >= r.n) complete();
    });
  }

  // 目標の数になった
  function complete() {
    const r = cur();
    state.phase = 'ready';
    document.querySelectorAll('.kz-animal').forEach((b) => { b.disabled = true; });
    $('#kz-platform').classList.add('done');
    $('#kz-msg').textContent = `${r.n}ひき のれたね！`;
    $('#kz-go').hidden = false;
    tones([[523, 0, 0.25], [659, 0.12, 0.25], [784, 0.24, 0.35]], 0.06);
    if (!reduceMotion.matches) {
      const rc = $('#kz-train').getBoundingClientRect();
      A.fx.burst(rc.left + rc.width / 2, rc.top + rc.height / 2, 14);
    }
    speak(`${r.n}匹、乗れたね！`);
  }

  // しゅっぱつ！
  function depart() {
    if (!state || state.phase !== 'ready') return;
    const my = token;
    state.phase = 'departing';
    $('#kz-go').hidden = true;
    A.stopAudio();
    tones([[880, 0, 0.3], [1100, 0.32, 0.5]], 0.05); // ポッポー（ひかえめ）
    speak('出発、進行！');
    const tr = $('#kz-train');
    tr.className = 'kz-train departing';
    wait(ms(1500, 250)).then(() => {
      if (my !== token || !state) return;
      state.idx++;
      if (state.idx >= ROUNDS) finish();
      else arrive();
    });
  }

  function finish() {
    stopAll();
    const my = token;
    state.phase = 'end';
    $('#kz-stamps').innerHTML = state.rounds.map((r, i) =>
      `<span class="kz-stamp" style="animation-delay:${0.15 + i * 0.2}s"><span class="kz-face">${r.animal.svg}</span><b>${r.n}ひき</b></span>`).join('');
    A.show('kz-end');
    A.sfx.fanfare();
    if (!reduceMotion.matches) A.fx.rain(40);
    wait(300).then(() => { if (my === token) speak('すごい！全部、乗せられたね！'); });
  }

  function listen() {
    if (!state || (state.phase !== 'boarding' && state.phase !== 'ready')) return;
    speak(reqSay(cur()) + (state.count > 0 ? `今、${state.count}匹。` : ''));
  }

  // ---------------- 画面を はなれる・もどる ----------------
  function leave() { stopAll(); state = null; }
  document.addEventListener('norimono:leave', leave);
  window.addEventListener('pagehide', leave);
  window.addEventListener('pageshow', (e) => { if (e.persisted) openStart(); });
  // 画面が見えなくなったら 音と 予約を止め、もどったら 落ちついた状態から つづける
  document.addEventListener('visibilitychange', () => {
    if (!state || state.phase === 'end') return;
    if (document.hidden) {
      token++;
      A.stopAudio();
      clearFlying();
      return;
    }
    if (state.phase === 'departing') {
      state.idx++;
      if (state.idx >= ROUNDS) finish(); else arrive();
    } else if (state.phase === 'arriving') {
      arrive();
    } else {
      state.busy = false;
      renderStation(state.count);
      $('#kz-train').className = 'kz-train';
      state.phase = 'boarding';
      if (state.count >= cur().n) complete();
    }
  });

  // ---------------- ボタン ----------------
  $('#kz-begin').addEventListener('click', begin);
  $('#kz-again').addEventListener('click', begin);
  $('#kz-depart').addEventListener('click', depart);
  $('#kz-listen').addEventListener('click', listen);
  $('#kz-tolist').addEventListener('click', () => {
    try { document.dispatchEvent(new CustomEvent('norimono:leave')); } catch (e) { }
  });
  $('#kz-r3').addEventListener('click', () => { kz.range = 3; saveKz(); refreshStartUI(); });
  $('#kz-r5').addEventListener('click', () => { kz.range = 5; saveKz(); refreshStartUI(); });
  $('#kz-voice').addEventListener('click', () => {
    A.settings.voice = !A.settings.voice;
    A.saveSettings();
    if (!A.settings.voice) A.stopAudio();
    else { A.unlockAudio(); speak('声が、出るよ！'); }
    refreshStartUI();
  });

  // テスト用に 状態を見られるようにする（遊び方には影響しない）
  window.__kazu = { get state() { return state; } };

  openStart();
})();
