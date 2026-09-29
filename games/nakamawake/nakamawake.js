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
    const qs = A.shuffle(NAKAMA_QUESTIONS).slice(0, ROUNDS); // 同じ問題は出さない
    return qs.map((q) => {
      const answer = A.shuffle(q.answers)[0];
      const wrongs = A.shuffle(q.wrongs).slice(0, nk.choices - 1);
      return { q, answer, options: A.shuffle([answer].concat(wrongs)) }; // 正解の場所もランダム
    });
  }

  function begin() {
    A.unlockAudio(); // iPhone：この タップのあとから 読み上げできる
    stopAll();
    state = { rounds: buildRounds(), idx: 0, phase: 'answer', readyAt: 0, nextAt: 0 };
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
    $('#nk-next').hidden = true;
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
      fb.textContent = 'せいかい！';
      fb.className = 'nk-feedback ok';
      A.sfx.correct();
      if (!reduceMotion.matches) {
        const rect = btn.getBoundingClientRect();
        A.fx.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, 18);
      }
      speak(`せいかい！${item.say}だね！`);
      state.nextAt = Date.now() + 700; // 連打で「つぎへ」まで押されないように
      const nb = $('#nk-next');
      nb.hidden = false;
      nb.setAttribute('aria-label', state.idx + 1 >= ROUNDS ? 'つぎへ（おわり）' : 'つぎへ');
    } else {
      btn.classList.add('is-wrong');
      btn.setAttribute('aria-disabled', 'true');
      btn.setAttribute('aria-label', NAKAMA_ITEMS[id].name + '。ちがったね');
      fb.textContent = 'もういちど やってみよう';
      fb.className = 'nk-feedback retry';
      A.sfx.retry();
      speak('もう一度、やってみよう！');
    }
  }

  function next() {
    if (!state || state.phase !== 'solved' || Date.now() < state.nextAt) return;
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

  function goTop() {
    stopAll();
    state = null;
    A.goTop(); // ゲーム一覧へ
  }

  // ---------------- ボタン ----------------
  $('#nk-start-home').addEventListener('click', goTop);
  $('#nk-home').addEventListener('click', goTop);
  $('#nk-end-home').addEventListener('click', goTop);
  $('#nk-begin').addEventListener('click', begin);
  $('#nk-again').addEventListener('click', begin);
  $('#nk-next').addEventListener('click', next);
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
