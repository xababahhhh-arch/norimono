// 画面の制御（5ステップ）。状態はこのファイルの state に集約する。
import { h, announce, storageGet, storageSet, storageRemove } from './ui/dom.js';
import { createReviewForm, renderGateSummary } from './ui/form.js';
import { createPreview } from './ui/preview.js';
import { buildOutputs, renderStep4, renderStep5 } from './ui/outputs.js';
import { extractPdf } from './extract/pdf.js';
import { ocrImage } from './extract/ocr.js';
import { ADAPTERS, runWithAdapter } from './ai/adapter.js';
import { normalizeEvent, EVENT_TYPES, WORKFLOW_STATES } from './core/schema.js';
import { canFinalize, gateProgress } from './core/validate.js';
import { reviewState } from './core/field.js';

const STORAGE_KEY = 'sakura-event:draft:v1';
const $ = (id) => document.getElementById(id);

const state = {
  step: 1,
  files: [], // { file, name, kind: 'pdf'|'image', side, url }
  sources: [], // プレビュー用 { name, kind, pages, pdf, url, sideLabel }
  event: null,
  analysis: null,
  outputs: null,
};

const SIDES = { front: '表面', back: '裏面', other: 'その他' };

// ---- ステップ表示 -------------------------------------------------------

function reachable(step) {
  if (step <= 2) return true;
  if (step <= 4) return !!state.event;
  return !!state.outputs;
}

function goto(step, { focus = true } = {}) {
  if (!reachable(step)) {
    announce(step >= 5 ? '先に STEP 4 で生成してください。' : '先に STEP 2 で解析するか、event.json を読み込んでください。');
    return;
  }
  state.step = step;
  for (let i = 1; i <= 5; i++) $(`step-${i}`).hidden = i !== step;
  updateStepper();
  if (step === 3) renderStep3();
  if (step === 4) renderStep4Gate();
  if (step === 5 && state.outputs) { renderWorkflow(); renderStep5($('step5-output'), state.outputs); }
  if (focus) {
    const hd = $(`step-${step}-h`);
    hd.setAttribute('tabindex', '-1');
    hd.focus();
    window.scrollTo({ top: 0 });
  }
  document.title = `STEP ${step}｜イベント広報生成｜戸塚区民文化センター さくらプラザ`;
}

function updateStepper() {
  for (const li of $('stepper').children) {
    const n = Number(li.dataset.step);
    const btn = li.querySelector('button');
    const st = li.querySelector('.step-state');
    li.classList.toggle('current', n === state.step);
    li.classList.toggle('done', n < state.step);
    if (n === state.step) btn.setAttribute('aria-current', 'step');
    else btn.removeAttribute('aria-current');
    st.textContent = n === state.step ? '（現在）' : !reachable(n) ? '（まだ進めません）' : '';
    btn.setAttribute('aria-disabled', reachable(n) ? 'false' : 'true');
  }
  // 固定表示のステップ表示でフォーカスが隠れないように（WCAG 2.4.11）
  const hdr = document.querySelector('.app-header');
  document.documentElement.style.setProperty('--header-h', `${hdr.offsetHeight + 8}px`);
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-goto]');
  if (b) goto(Number(b.dataset.goto));
});

// ---- 保存 --------------------------------------------------------------

function save() {
  if (!state.event) return;
  state.event.meta.updated_at = new Date().toISOString();
  storageSet(STORAGE_KEY, JSON.stringify({ event: state.event, pasted: $('paste-text').value }));
}

function loadSaved() {
  const s = storageGet(STORAGE_KEY);
  if (!s) return null;
  try { return JSON.parse(s); } catch { return null; }
}

// ---- STEP 1 ------------------------------------------------------------

function renderFileList() {
  const box = $('file-list');
  box.replaceChildren();
  if (!state.files.length) return;
  box.append(h('h2', { class: 'h-small' }, `選んだファイル（${state.files.length}件）`), h('ul', { class: 'file-list' }, state.files.map((f, i) => {
    const selId = `side-${i}`;
    const sel = h('select', { id: selId }, Object.entries(SIDES).map(([k, v]) => h('option', { value: k, selected: f.side === k }, v)));
    sel.addEventListener('change', () => { f.side = sel.value; });
    return h('li', {},
      h('span', {}, `${f.name}（${f.kind === 'pdf' ? 'PDF' : '画像'}、${Math.ceil(f.file.size / 1024)}KB）`),
      h('label', { for: selId }, ' 種類：'), sel,
      h('button', { type: 'button', class: 'btn-secondary', onclick: () => { state.files.splice(i, 1); renderFileList(); announce(`${f.name} を外しました。`); } }, `${f.name} を外す`));
  })));
}

$('file-input').addEventListener('change', (e) => {
  const errors = [];
  for (const file of e.target.files) {
    const kind = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name) ? 'pdf' : /^image\/(jpeg|png)$/.test(file.type) || /\.(jpe?g|png)$/i.test(file.name) ? 'image' : null;
    if (!kind) { errors.push(`エラー：「${file.name}」は対応していない形式です。PDF・JPG・PNG を選んでください。`); continue; }
    const side = state.files.length === 0 ? 'front' : state.files.length === 1 ? 'back' : 'other';
    state.files.push({ file, name: file.name, kind, side, url: kind === 'image' ? URL.createObjectURL(file) : null });
  }
  e.target.value = '';
  $('step1-error').textContent = errors.join('\n');
  $('step1-error').hidden = !errors.length;
  renderFileList();
  if (state.files.length) announce(`${state.files.length}件のファイルを選びました。`);
});

$('sample-select').addEventListener('change', async (e) => {
  const v = e.target.value;
  if (!v) return;
  try {
    const res = await fetch(`fixtures/raw/${v}.txt`);
    $('paste-text').value = await res.text();
    announce('サンプルの文字を貼り付け欄に入れました。「次へ：自動解析」を押してください。');
  } catch {
    announce('サンプルを読み込めませんでした。');
  }
});

$('json-input').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    state.event = normalizeEvent(data, { confirmed: false });
    // 保存済みの確認状態はそのまま引き継ぐ（Field 形式の confirmed を保持）
    state.analysis = null;
    state.outputs = null;
    save();
    announce(`${file.name} を読み込みました。STEP 3 で内容を確認してください。`);
    goto(3);
  } catch (err) {
    $('step1-error').textContent = `エラー：event.json を読み込めませんでした（${err.message}）。ファイルが壊れていないか確認してください。`;
    $('step1-error').hidden = false;
    $('step1-error').focus?.();
  }
  e.target.value = '';
});

$('to-step2').addEventListener('click', () => {
  if (!state.files.length && !$('paste-text').value.trim()) {
    $('step1-error').textContent = 'エラー：チラシのファイルが選ばれていません。ファイルを選ぶか、チラシの文字を貼り付けてください。';
    $('step1-error').hidden = false;
    $('file-input').focus();
    return;
  }
  $('step1-error').hidden = true;
  goto(2);
});

$('clear-btn').addEventListener('click', async () => {
  const ok = await confirmDialog('このブラウザに保存した作業データ（event.json の下書き）を消去します。元に戻せません。よろしいですか？');
  if (!ok) return;
  storageRemove(STORAGE_KEY);
  $('resume-btn').hidden = true;
  announce('作業データを消去しました。');
});

$('resume-btn').addEventListener('click', () => {
  const saved = loadSaved();
  if (!saved) return;
  state.event = normalizeEvent(saved.event);
  $('paste-text').value = saved.pasted ?? '';
  announce('前回の作業を再開しました。');
  goto(3);
});

// ---- STEP 2 ------------------------------------------------------------

for (const a of ADAPTERS) {
  $('adapter-select').append(h('option', { value: a.id, disabled: a.external && !a.enabled }, a.label));
}

$('analyze-btn').addEventListener('click', async () => {
  const out = $('analyze-result');
  const btn = $('analyze-btn');
  btn.disabled = true;
  out.replaceChildren(h('p', {}, '解析しています…'));
  try {
    const raw = { files: [] };
    state.sources = [];
    const notes = [];
    for (const f of state.files) {
      if (f.kind === 'pdf') {
        const r = await extractPdf(f.file, { onProgress: (i, n) => { out.firstChild.textContent = `解析しています…（${f.name} ${i}/${n}ページ）`; } });
        raw.files.push({ name: r.name, type: r.type, pages: r.pages });
        state.sources.push({ name: f.name, kind: 'pdf', pdf: r.pdf, pages: r.pages, sideLabel: `${SIDES[f.side]}・` });
        if (!r.pages.some((p) => p.text.trim())) notes.push(`「${f.name}」から文字を取り出せませんでした（画像だけのPDFの可能性があります）。チラシの文字を貼り付けるか、STEP 3 で直接入力してください。`);
      } else {
        const r = await ocrImage(f.file);
        if (!r.ok) notes.push(`「${f.name}」：${r.message}`);
        raw.files.push({ name: f.name, type: f.file.type, pages: r.pages });
        state.sources.push({ name: f.name, kind: 'image', url: f.url, pages: [{ page: 1, text: '' }], sideLabel: `${SIDES[f.side]}・` });
      }
    }
    const pasted = $('paste-text').value.trim();
    if (pasted) {
      raw.files.push({ name: '貼り付けた文字', type: 'text/plain', pages: [{ page: 1, text: pasted }] });
      state.sources.push({ name: '貼り付けた文字', kind: 'text', pages: [{ page: 1, text: pasted }] });
    }
    const adapter = ADAPTERS.find((a) => a.id === $('adapter-select').value) ?? ADAPTERS[0];
    const result = await runWithAdapter(adapter, 'extract', [raw, {}], { files: raw.files.map((f) => f.name) }, confirmDialog);
    const ev = result.event;
    // メディア（チラシのファイル名）を記録（値は要確認のまま）
    const front = state.files.find((f) => f.side === 'front');
    const back = state.files.find((f) => f.side === 'back');
    if (front) ev.media.flyer_front.value = front.name;
    if (back) ev.media.flyer_back.value = back.name;
    for (const k of ['flyer_front', 'flyer_back']) if (ev.media[k].value) Object.assign(ev.media[k], { origin: 'manual', confidence: 1, note: 'アップロードしたファイル名です。CMSにアップロードしたURLに置き換えてください。' });
    state.event = ev;
    state.analysis = result;
    state.outputs = null;
    save();

    let count = 0;
    const walk = (o) => {
      if (o && typeof o === 'object') {
        if ('value' in o && 'confirmed' in o) { if (o.origin === 'extracted' && o.value !== null && o.value !== '') count += 1; return; }
        Object.values(o).forEach(walk);
      }
    };
    walk(ev);
    const cls = result.classification;
    out.replaceChildren(
      h('h2', { class: 'h-small' }, '解析の結果'),
      h('ul', {},
        h('li', {}, `取り出した項目：${count}件（すべて「要確認」です）`),
        h('li', {}, `イベント種別の候補：${EVENT_TYPES[ev.event_type.value]}（推定の根拠：${cls?.reason ?? 'なし'}）　※STEP 3 で変更できます`),
        h('li', {}, `日程：${ev.schedule.dates.items.length}件、出演者：${ev.performers.items.length}名、料金：${ev.pricing.prices.items.length}件、販売方法ごとの発売日時：${ev.tickets.sales_schedule.items.length}件`),
        h('li', {}, `判断が必要な記載：${ev.meta.review_items.length}件（STEP 3 の一番上に原文つきで表示します）`),
        h('li', {}, '販売・受付状況はチラシからは決めません。STEP 3 で設定してください。')),
      ...[...notes, ...result.warnings].map((w) => h('p', { class: 'st st-needs_review' }, `！ ${w}`)),
      ...result.suggestions.map((s) => h('p', { class: 'st st-needs_review' }, `！ ${s.message}（販売・受付状況は STEP 3 で設定してください）`)),
    );
    $('to-step3').disabled = false;
    announce(`解析が終わりました。${count}件の項目を取り出しました。`);
  } catch (err) {
    out.replaceChildren(h('p', { class: 'err' }, `エラー：解析できませんでした（${err.message}）。ファイルを選び直すか、チラシの文字を貼り付けてください。`));
    announce('解析できませんでした。');
  } finally {
    btn.disabled = false;
  }
});

$('to-step3').addEventListener('click', () => goto(3));

// ---- STEP 3 ------------------------------------------------------------

const preview = createPreview($('preview'), () => state.sources);
const form = createReviewForm($('review-form'), () => state.event, onFormChange);

function onFormChange({ structural, focusPath }) {
  state.outputs = null;
  $('to-step5').disabled = true;
  if (state.event.meta.finalized) {
    state.event.meta.finalized = false;
    state.event.meta.finalized_at = null;
  }
  // 生成・承認の後に内容を変えたら、記録を取り消す（承認した内容と公開する内容を一致させるため）
  const wf = state.event.meta.workflow;
  if (wf && wf.state !== 'draft') {
    state.event.meta.workflow = { state: 'draft', generated_at: null, approved_by: '', approved_at: null, published_at: null, published_url: '' };
    announce('内容を変更したため、生成・承認の記録を取り消しました。もう一度生成し、承認を受けてください。');
  }
  save();
  if (structural) form.render(focusPath);
  else form.refreshAll();
  renderGateSummary($('gate-summary'), state.event, (p) => form.focusField(p));
  updateStepper();
}

function renderStep3() {
  preview.render();
  form.render();
  renderGateSummary($('gate-summary'), state.event, (p) => form.focusField(p));
}

// ---- STEP 4 ------------------------------------------------------------

function renderStep4Gate() {
  $('page-url').value = state.event.meta.page_url ?? '';
  const r = canFinalize(state.event);
  const box = $('gate-final');
  const p = gateProgress(state.event);
  if (r.ok) {
    box.replaceChildren(h('p', { class: 'st st-confirmed' }, `✓ 必須項目はすべて確認済みです（${p.done}/${p.total}）。「確認済みの内容で生成する」を押せます。生成しても公開はされません。`));
  } else {
    box.replaceChildren(
      h('p', { class: 'st st-needs_review' }, `！ まだ確定できません。必須確認 ${p.total} 項目中 ${p.done} 項目が確認済みです。下書きとしてなら生成できます。`),
      h('ul', {}, r.blockers.map((b) => h('li', {}, `${b.label}：${b.message}`))),
      h('button', { type: 'button', class: 'btn-link', 'data-goto': '3' }, '確認画面（STEP 3）に戻る'),
    );
  }
  $('gen-final').disabled = !r.ok;
  $('gen-final').setAttribute('aria-describedby', 'gate-final');
}

$('page-url').addEventListener('change', (e) => {
  state.event.meta.page_url = e.target.value.trim();
  state.outputs = null;
  save();
});

function generate(draft) {
  if (!draft) {
    state.event.meta.workflow = { state: 'generated', generated_at: new Date().toISOString(), approved_by: '', approved_at: null, published_at: null, published_url: '' };
    save();
  }
  state.outputs = buildOutputs(state.event, { draft });
  renderStep4($('step4-output'), state.outputs);
  $('to-step5').disabled = false;
  updateStepper();
  announce(draft ? '下書きを生成しました。' : '生成が完了しました。まだ公開されていません。公開前に上長の承認を受けてください。');
  $('step4-output').querySelector('h3')?.setAttribute('tabindex', '-1');
  $('step4-output').querySelector('h3')?.focus();
}

$('gen-draft').addEventListener('click', () => generate(true));
$('gen-final').addEventListener('click', async () => {
  const r = canFinalize(state.event);
  if (!r.ok) { renderStep4Gate(); return; }
  // 必須でない項目の未確認数
  let unconfirmed = 0;
  const walk = (o) => {
    if (o && typeof o === 'object') {
      if ('value' in o && 'confirmed' in o) { if (reviewState(o) === 'needs_review') unconfirmed += 1; return; }
      Object.values(o).forEach(walk);
    }
  };
  walk(state.event);
  const ok = await confirmDialog(unconfirmed
    ? `必須項目はすべて確認済みです。ただし、必須でない項目のうち ${unconfirmed} 件が「要確認」のままです。これらもHP・SNSに表示されます。生成しますか？\n（生成しても公開はされません。公開前に上長の承認が必要です）`
    : '確認済みの内容で生成します。よろしいですか？\n（生成しても公開はされません。公開前に上長の承認が必要です）');
  if (!ok) return;
  state.event.meta.finalized = true;
  state.event.meta.finalized_at = new Date().toISOString();
  save();
  generate(false);
});

$('to-step5').addEventListener('click', () => goto(5));

// ---- STEP 5：承認・公開の記録（このシステムは公開しない。記録だけを残す） ----

function renderWorkflow() {
  const box = $('workflow-panel');
  const ev = state.event;
  const wf = ev.meta.workflow ?? { state: 'draft' };
  const draftOut = state.outputs?.draft;
  const stateText = draftOut ? '下書き（確定前のため、承認・公開の対象ではありません）' : WORKFLOW_STATES[wf.state] ?? wf.state;
  const rows = [
    h('p', { class: `st ${wf.state === 'published' ? 'st-confirmed' : 'st-needs_review'}` }, `現在の状態：${stateText}`),
    h('p', { class: 'help' }, 'このシステムはHP・SNSへの公開を行いません。生成が完了しても公開されたことにはなりません。上長の承認を受けてから、担当者がCMS・各SNSで公開し、ここに記録を残してください。'),
  ];
  if (!draftOut && wf.generated_at) rows.push(h('p', {}, `生成日時：${wf.generated_at}`));
  if (!draftOut && wf.state === 'generated') {
    const nId = 'wf-approver';
    const dId = 'wf-approved-at';
    const name = h('input', { id: nId, type: 'text', autocomplete: 'name' });
    const date = h('input', { id: dId, type: 'text', placeholder: '例：2026-10-01' });
    const err = h('p', { class: 'err', hidden: true });
    rows.push(h('div', { class: 'fld' }, h('label', { for: nId }, '承認した人（上長）の名前'), name),
      h('div', { class: 'fld' }, h('label', { for: dId }, '承認日'), date), err,
      h('div', { class: 'fld-actions' }, h('button', {
        type: 'button', class: 'btn-primary',
        onclick: () => {
          if (!name.value.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date.value.trim())) {
            err.textContent = 'エラー：承認した人の名前と承認日（例：2026-10-01）を入力してください。';
            err.hidden = false;
            name.focus();
            return;
          }
          Object.assign(ev.meta.workflow, { state: 'approved', approved_by: name.value.trim(), approved_at: date.value.trim() });
          afterWorkflowChange('承認を記録しました。公開は担当者がCMS・各SNSで行ってください。');
        },
      }, '承認を記録する')));
  }
  if (!draftOut && wf.state === 'approved') {
    rows.push(h('p', {}, `承認：${wf.approved_by}（${wf.approved_at}）`));
    const dId = 'wf-published-at';
    const uId = 'wf-published-url';
    const date = h('input', { id: dId, type: 'text', placeholder: '例：2026-10-02' });
    const url = h('input', { id: uId, type: 'url', placeholder: 'https://' });
    const err = h('p', { class: 'err', hidden: true });
    rows.push(h('div', { class: 'fld' }, h('label', { for: dId }, '公開日（CMSで公開した日）'), date),
      h('div', { class: 'fld' }, h('label', { for: uId }, '公開したページのURL'), url), err,
      h('div', { class: 'fld-actions' }, h('button', {
        type: 'button', class: 'btn-primary',
        onclick: () => {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date.value.trim())) {
            err.textContent = 'エラー：公開日（例：2026-10-02）を入力してください。';
            err.hidden = false;
            date.focus();
            return;
          }
          Object.assign(ev.meta.workflow, { state: 'published', published_at: date.value.trim(), published_url: url.value.trim() });
          afterWorkflowChange('公開の記録を残しました。');
        },
      }, '公開を記録する')));
  }
  if (!draftOut && wf.state === 'published') {
    rows.push(h('p', {}, `承認：${wf.approved_by}（${wf.approved_at}）　公開：${wf.published_at}${wf.published_url ? `　${wf.published_url}` : ''}`));
  }
  box.replaceChildren(...rows);
}

function afterWorkflowChange(msg) {
  save();
  state.outputs = buildOutputs(state.event, { draft: false }); // event.json の出力に記録を反映
  renderWorkflow();
  renderStep5($('step5-output'), state.outputs);
  announce(msg);
}

// ---- 確認ダイアログ ------------------------------------------------------

function confirmDialog(message) {
  const dlg = $('confirm-dialog');
  $('confirm-dialog-body').replaceChildren(...String(message).split('\n').map((l) => h('p', {}, l)));
  return new Promise((resolve) => {
    const done = (v) => {
      dlg.close();
      $('confirm-ok').removeEventListener('click', onOk);
      $('confirm-cancel').removeEventListener('click', onCancel);
      dlg.removeEventListener('cancel', onCancel);
      resolve(v);
    };
    const onOk = () => done(true);
    const onCancel = () => done(false);
    $('confirm-ok').addEventListener('click', onOk);
    $('confirm-cancel').addEventListener('click', onCancel);
    dlg.addEventListener('cancel', onCancel);
    dlg.showModal();
    $('confirm-cancel').focus();
  });
}

// ---- 起動 --------------------------------------------------------------

if (loadSaved()) $('resume-btn').hidden = false;
goto(1, { focus: false });
window.addEventListener('resize', updateStepper);
