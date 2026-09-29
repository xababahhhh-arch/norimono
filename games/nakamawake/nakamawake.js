/* なかまわけ - おなじ なかまを さがす ゲーム
 * 問題データは nakama-data.js、読み上げ・効果音などは core.js（NoriApp）を使います。
 */
(function () {
  'use strict';

  const A = window.NoriApp;
  if (!A || !window.NAKAMA_QUESTIONS || !window.NAKAMA_ITEMS) return;

  const $ = (sel) => document.querySelector(sel);
  const ROUNDS = 5;
  const INPUT_GUARD_MS = 500; // 画面が切りかわった直後のタップは受けつけない（連打対策）
  const reduceMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };

  // なかまわけ だけの設定（のりものゲームの設定とは別に保存）
  let nk = { choices: 2 };
  try {
    const saved = JSON.parse(localStorage.getItem('nakama-settings') || '{}');
    if (saved.choices === 2 || saved.choices === 3) nk.choices = saved.choices;
  } catch (e) { }
  function saveNk() {
    try { localStorage.setItem('nakama-settings', JSON.stringify(nk)); } catch (e) { }
  }

  let state = null;
  let token = 0; // 画面を離れたら古いタイマーを無視する

  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
  function speak(text) {
    if (!A.settings.voice) return Promise.resolve();
    return A.speech.say(text);
  }
  function stopAll() {
    token++;
    A.stopAudio();
    A.fx.clear();
  }

  // 絵：image → のりものの絵 → 自作の絵 の順に使う
  function pic(item) {
    if (item.image) return `<img src="${A.root + item.image}" alt="" draggable="false">`;
    if (item.vehicle) {
      const v = VEHICLES.find((x) => x.id === item.vehicle);
      if (v) return A.art(v);
    }
    return A.art({ svg: item.svg });
  }

  // ---------------- はじめの画面 ----------------
  function refreshStartUI() {
    $('#nk-c2').setAttribute('aria-pressed', String(nk.choices === 2));
    $('#nk-c3').setAttribute('aria-pressed', String(nk.choices === 3));
    const canSpeak = A.speech.ok;
    const on = canSpeak && A.settings.voice;
    const vb = $('#nk-voice');
    vb.disabled = !canSpeak;
    vb.setAttribute('aria-pressed', String(on));
    vb.querySelector('.nk-voice-icon').textContent = on ? '🔊' : '🔇';
    vb.querySelector('.nk-voice-text').textContent = !canSpeak ? 'こえは つかえません' : on ? 'こえ あり' : 'こえ なし';
    vb.setAttribute('aria-label', !canSpeak ? 'この きかいでは こえが つかえません' : on ? 'こえ あり。おすと こえ なし' : 'こえ なし。おすと こえ あり');
  }
  function openStart() {
    stopAll();
    state = null;
    const ids = ['train', 'dog', 'apple'];
    $('#nk-preview').innerHTML = ids.map((id) => `<div class="nk-prev-item">${pic(NAKAMA_ITEMS[id])}</div>`).join('');
    refreshStartUI();
    A.show('nk-start');
  }

  // ---------------- 問題づくり ----------------
  function buildRounds() {
    // 同じ問題は出さない。できるだけ ちがう分類（group）から 1問ずつ えらぶ
    const pool = A.shuffle(NAKAMA_QUESTIONS);
    const qs = [];
    const usedGroups = new Set();
    pool.forEach((q) => {
      if (qs.length < ROUNDS && !usedGroups.has(q.group)) { qs.push(q); usedGroups.add(q.group); }
    });
    pool.forEach((q) => { if (qs.length < ROUNDS && qs.indexOf(q) < 0) qs.push(q); });

    // 正解の絵も 毎回かわるように、このプレイで まだ出ていない絵を なるべく使う
    const seen = new Set();
    const fresh = (ids) => { const f = ids.filter((id) => !seen.has(id)); return f.length ? f : ids; };
    return A.shuffle(qs).map((q) => {
      const answer = A.shuffle(fresh(q.answers))[0];
      const w = A.shuffle(q.wrongs);
      const wrongs = w.filter((id) => !seen.has(id)).concat(w.filter((id) => seen.has(id))).slice(0, nk.choices - 1);
      [answer].concat(wrongs).forEach((id) => seen.add(id));
      return { q, answer, options: A.shuffle([answer].concat(wrongs)) }; // 正解の場所もランダム
    });
  }

  function begin() {
    A.unlockAudio(); // iPhone：この タップのあとから 読み上げできる
    stopAll();
    state = { rounds: buildRounds(), idx: 0, phase: 'answer', readyAt: 0 };
    renderProgress();
    A.show('nk-game');
    renderQuestion();
  }

  function renderProgress() {
    const box = $('#nk-progress');
    box.innerHTML = state.rounds.map((_, i) => {
      const done = i < state.idx;
      const now = i === state.idx;
      return `<li class="nk-pdot${done ? ' done' : ''}${now ? ' now' : ''}" aria-label="${i + 1}もんめ${done ? ' できた' : now ? ' いま' : ''}">` +
        (done ? '★' : String(i + 1)) + '</li>';
    }).join('');
  }

  function renderQuestion() {
    token++;
    const my = token;
    A.stopAudio();
    const r = state.rounds[state.idx];
    state.phase = 'answer';
    state.readyAt = Date.now() + INPUT_GUARD_MS;

    $('#nk-question').textContent = r.q.text;
    $('#nk-feedback').textContent = '';
    $('#nk-feedback').className = 'nk-feedback';
    $('#nk-listen').hidden = !(A.speech.ok && A.settings.voice);

    const box = $('#nk-choices');
    box.className = 'nk-choices n' + r.options.length;
    box.innerHTML = '';
    r.options.forEach((id) => {
      const item = NAKAMA_ITEMS[id];
      const b = document.createElement('button');
      b.className = 'nk-choice';
      b.dataset.id = id;
      b.setAttribute('aria-label', item.name);
      b.innerHTML = `<span class="nk-pic">${pic(item)}</span><span class="nk-name">${item.name}</span>` +
        '<span class="nk-badge" aria-hidden="true"></span>';
      b.addEventListener('click', () => choose(b, id));
      box.appendChild(b);
    });
    renderProgress();

    setTimeout(() => { if (my === token) speak(r.q.say); }, 350);
  }

  // ---------------- こたえる ----------------
  function choose(btn, id) {
    if (!state || state.phase !== 'answer' || Date.now() < state.readyAt) return;
    if (btn.getAttribute('aria-disabled') === 'true') return;
    const r = state.rounds[state.idx];
    const fb = $('#nk-feedback');

    if (id === r.answer) {
      state.phase = 'solved'; // ここで すぐ ロック（二重判定を防ぐ）
      const item = NAKAMA_ITEMS[id];
      btn.classList.add('is-correct');
      btn.querySelector('.nk-badge').textContent = '◎ せいかい';
      btn.setAttribute('aria-label', item.name + '。せいかい');
      document.querySelectorAll('.nk-choice').forEach((c) => {
        c.setAttribute('aria-disabled', 'true');
        if (c !== btn) c.classList.add('is-other');
      });
      fb.textContent = `せいかい！ ${item.name} だね！`; // 読み上げと 同じ言葉
      fb.className = 'nk-feedback ok';
      A.sfx.correct();
      if (!reduceMotion.matches) {
        const rect = btn.getBoundingClientRect();
        A.fx.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 18);
      }
      // 「せいかい！」を言いおわったら、自動で つぎの問題へ（こえ なし でも 少し待ってから）
      // 読み上げの「せいかい」は漢字にする（ひらがなだと「セ・イ・カ・イ」と カタコトに読まれるため）
      const my = token;
      Promise.all([wait(1800), speak(`正解！${item.say}だね！`)])
        .then(() => wait(500))
        .then(() => { if (my === token && state && state.phase === 'solved') next(); });
    } else {
      btn.classList.add('is-wrong');
      btn.setAttribute('aria-disabled', 'true');
      // おしたものの 名前を おしえてから、もういちど
      const wrong = NAKAMA_ITEMS[id];
      btn.setAttribute('aria-label', wrong.name + '。ちがったね');
      fb.innerHTML = `それは ${wrong.name} だよ。<br>もういちど やってみよう`;
      fb.className = 'nk-feedback retry';
      A.sfx.retry();
      speak(`それは、${wrong.say}だよ。もう一度、やってみよう！`);
    }
  }

  function next() {
    if (!state || state.phase !== 'solved') return;
    state.phase = 'moving';
    A.sfx.pop();
    state.idx++;
    if (state.idx >= ROUNDS) finish();
    else renderQuestion();
  }

  // ---------------- おわり ----------------
  const STAMP_ICONS = ['★', '♪', '♥', '●', '▲'];
  const STAMP_COLORS = ['#ff6b4a', '#2f8be0', '#36c275', '#b36bff', '#f5a300'];
  function finish() {
    stopAll();
    const my = token;
    state.phase = 'end';
    $('#nk-stamps').innerHTML = STAMP_ICONS.map((ic, i) =>
      `<span class="nk-stamp" style="--c:${STAMP_COLORS[i]};animation-delay:${0.15 + i * 0.25}s">` +
      `<span class="nk-stamp-ic">${ic}</span><span class="nk-stamp-tx">できた</span></span>`).join('');
    A.show('nk-end');
    A.sfx.fanfare();
    if (!reduceMotion.matches) A.fx.rain(50);
    wait(300).then(() => { if (my === token) speak('すごい！全部できたね！'); });
  }

  // ---------------- ゲームの一覧へ もどるとき ----------------
  // 共通の「🏠 もどる」（back.js）を押した・ページを はなれた：読み上げ・自動で次へ進むタイマー・紙吹雪を止める
  function leave() {
    stopAll();
    state = null;
  }
  document.addEventListener('norimono:leave', leave);
  window.addEventListener('pagehide', leave);
  // 「もどる」で このページに もどってきたとき（ページが保存されていた場合）は はじめの画面から
  window.addEventListener('pageshow', (e) => { if (e.persisted) openStart(); });

  // ---------------- ボタン ----------------
  $('#nk-begin').addEventListener('click', begin);
  $('#nk-again').addEventListener('click', begin);
  $('#nk-listen').addEventListener('click', () => {
    if (!state || (state.phase !== 'answer' && state.phase !== 'solved')) return;
    speak(state.rounds[state.idx].q.say);
  });
  $('#nk-c2').addEventListener('click', () => { nk.choices = 2; saveNk(); refreshStartUI(); });
  $('#nk-c3').addEventListener('click', () => { nk.choices = 3; saveNk(); refreshStartUI(); });
  $('#nk-voice').addEventListener('click', () => {
    A.settings.voice = !A.settings.voice;
    A.saveSettings();
    if (!A.settings.voice) A.stopAudio();
    else { A.unlockAudio(); speak('声が、出るよ！'); }
    refreshStartUI();
  });
  // このページを開いたら はじめの画面から
  openStart();
})();
