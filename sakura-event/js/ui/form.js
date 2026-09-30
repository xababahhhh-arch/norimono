// STEP 3：抽出されたイベント情報の確認・修正フォーム。
// スキーマ定義（GROUPS）から自動で作る。状態は記号＋文字＋色で示す（色だけに頼らない）。
import { h, nextId, announce } from './dom.js';
import { GROUPS, STATUSES, UPDATE_TYPES, pathOf, isVisibleFor, eventType, createListItem } from '../core/schema.js';
import { getPath, setValue, confirmField, reviewState, REVIEW_LABELS, has, str, methodLabel } from '../core/field.js';
import { weekdayCheck, formatIssues, gateChecks, gateProgress } from '../core/validate.js';
import { weekdayOf, isIsoDate, todayIso } from '../core/dates.js';

const PLACEHOLDER = { date: '例：2026-07-04', time: '例：14:00', tel: '例：045-000-0000', url: 'https://', email: 'name@example.jp', number: '例：3000' };

export function createReviewForm(root, getEvent, onChange, options = {}) {
  const refreshers = new Map(); // path → () => void
  const inputs = new Map(); // path → input id

  function parseInput(def, raw) {
    const t = raw.trim();
    if (t === '') return null;
    if (def.type === 'number') {
      const n = Number(t.replace(/[,，円]/g, ''));
      return Number.isFinite(n) ? n : t;
    }
    return t;
  }

  // 確信度の数値は表示しない（正しさの保証ではないため）。出典・抽出根拠・確認が必要な理由を文章で示す。
  function sourceText(f) {
    if (!f || (f.value === null && !f.source_text) || f.value === '') return '';
    if (f.origin === 'manual') return '';
    const parts = [];
    if (f.source_file) parts.push(`出典：${f.source_file}`);
    if (f.source_page) parts.push(`${f.source_page}ページ`);
    if (f.source_text) parts.push(`原文「${f.source_text}」`);
    return parts.join(' ');
  }
  function basisText(f) {
    if (!f) return '';
    if (f.origin === 'manual' && has(f)) return '抽出根拠：担当者が入力・修正した値';
    return f.basis && (has(f) || f.reasons?.length) ? `抽出根拠：${f.basis}${f.origin === 'inferred' ? '（推定を含みます）' : ''}` : '';
  }
  function reasonsText(f) {
    if (!f || f.confirmed) return '';
    const rs = [...(f.reasons ?? [])];
    if (!rs.length && has(f) && f.origin !== 'manual') rs.push('チラシから自動で取り出した値です。原文と照らし合わせてください');
    return rs.length ? `確認が必要な理由：${rs.join('。')}` : '';
  }

  function fieldRow(def, path, ctx = {}) {
    const ev = getEvent();
    const id = nextId('fld');
    const stId = `${id}-st`;
    const srcId = `${id}-src`;
    const errId = `${id}-err`;
    const helpId = `${id}-help`;
    const f = getPath(ev, path);
    inputs.set(path, id);

    const label = h('label', { for: id }, def.label, def.required ? h('span', { class: 'req' }, '（必須確認）') : null);
    let input;
    if (def.type === 'select') {
      input = h('select', { id }, Object.entries(def.options).map(([v, l]) => h('option', { value: v, selected: f.value === v }, l)));
    } else if (def.type === 'textarea') {
      input = h('textarea', { id, rows: 3 });
      input.value = f.value ?? '';
    } else {
      const type = { url: 'url', tel: 'tel', email: 'email' }[def.type] ?? 'text';
      input = h('input', {
        id, type, placeholder: PLACEHOLDER[def.type] ?? null,
        inputmode: def.type === 'number' ? 'numeric' : def.type === 'time' || def.type === 'date' ? 'numeric' : null,
        autocomplete: 'off', lang: def.lang ?? null,
      });
      input.value = f.value ?? '';
    }
    const whyId = `${id}-why`;
    input.setAttribute('aria-describedby', [stId, errId, whyId, srcId, def.help ? helpId : null].filter(Boolean).join(' '));

    const status = h('p', { id: stId, class: 'st' });
    const err = h('p', { id: errId, class: 'err' });
    const src = h('p', { id: srcId, class: 'src' });
    const basis = h('p', { class: 'basis' });
    const method = h('p', { class: 'method' });
    const why = h('p', { class: 'why', id: `${id}-why` });
    const help = def.help ? h('p', { id: helpId, class: 'help' }, def.help) : null;
    const computed = h('p', { class: 'computed' });
    const btn = h('button', { type: 'button', class: 'btn-confirm' });

    const refresh = () => {
      const cur = getPath(getEvent(), path);
      const st = reviewState(cur);
      const lbl = REVIEW_LABELS[st];
      status.className = `st st-${st}`;
      status.textContent = `${lbl.mark} ${lbl.label}`;
      src.textContent = sourceText(cur);
      src.hidden = !src.textContent;
      basis.textContent = basisText(cur);
      basis.hidden = !basis.textContent;
      const ml = methodLabel(cur);
      method.textContent = ml ? `取得方法：${ml}` : '';
      method.hidden = !ml;
      method.className = `method method-${cur.origin === 'manual' ? 'manual' : cur.source_method ?? 'none'}`;
      why.textContent = reasonsText(cur);
      why.hidden = !why.textContent;
      btn.textContent = cur.confirmed ? '確認を取り消す' : has(cur) ? '確認済みにする' : '該当なしとして確認';
      // 必須でない空欄は確認不要（ボタンを出さない）
      btn.hidden = !def.required && !has(cur) && !cur.confirmed;
      btn.setAttribute('aria-describedby', stId);
      // エラー
      const errors = [];
      for (const i of formatIssues(getEvent())) if (i.path === path) errors.push(`${i.message}　${i.suggestion}`);
      if (ctx.weekdayOf) {
        const item = ctx.weekdayOf();
        const wc = weekdayCheck(item);
        if (['mismatch', 'invalid_weekday'].includes(wc.status)) errors.push(`${wc.message}　${wc.suggestion}`);
        computed.textContent = isIsoDate(str(item.date)) ? `日付から計算した曜日：${weekdayOf(str(item.date))}` : '';
      }
      if (def.required && cur.confirmed && !has(cur) && ['title', 'venue', 'name'].includes(def.key)) {
        errors.push('エラー：この項目は空のまま確認済みにできません。　値を入力してください。');
      }
      err.textContent = errors.join('\n');
      err.hidden = errors.length === 0;
      if (errors.length) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    };
    refreshers.set(path, refresh);

    const commit = () => {
      const cur = getPath(getEvent(), path);
      const changed = setValue(cur, parseInput(def, input.value));
      if (changed) onChange({ path, structural: def.key === 'event_type' });
    };
    input.addEventListener(def.type === 'select' ? 'change' : 'change', commit);
    // 項目を選ぶと、チラシのプレビューで取得元を表示する
    input.addEventListener('focus', () => options.onFocusField?.(getPath(getEvent(), path)));
    if (def.type !== 'select') input.addEventListener('input', () => { /* 入力中は確定しない（change で反映） */ });
    btn.addEventListener('click', () => {
      commit();
      const cur = getPath(getEvent(), path);
      confirmField(cur, !cur.confirmed);
      announce(`${def.label}：${REVIEW_LABELS[reviewState(cur)].label}`);
      onChange({ path, structural: false });
    });

    refresh();
    return h('div', { class: `fld fld-${def.type}`, dataset: { path } },
      label, help, input, computed, status, method, err, why, src, basis, h('div', { class: 'fld-actions' }, btn));
  }

  function listBlock(def, path, type) {
    const ev = getEvent();
    const lst = getPath(ev, path);
    const legendBase = def.itemLabel ?? def.label;
    const wrap = h('div', { class: 'list', dataset: { path } });
    const headId = nextId('lh');
    wrap.append(h('h4', { id: headId }, def.label, def.required ? h('span', { class: 'req' }, '（必須確認）') : null));
    if (!lst.items.length) {
      wrap.append(h('p', { class: `st ${lst.none_confirmed ? 'st-confirmed_empty' : 'st-missing'}` }, lst.none_confirmed ? '✓ 確認済み（該当なし）' : '－ 情報なし'));
    }
    lst.items.forEach((item, i) => {
      const fs = h('fieldset', { class: 'list-item' }, h('legend', {}, `${legendBase} ${i + 1}`));
      for (const d of def.fields) {
        if (!isVisibleFor(d, type)) continue;
        const ctx = {};
        if (path === 'schedule.dates' && d.key === 'weekday_on_flyer') ctx.weekdayOf = () => getPath(getEvent(), path).items[i];
        fs.append(fieldRow(d, `${path}.items.${i}.${d.key}`, ctx));
      }
      if (path === 'schedule.dates') {
        const sel = h('select', { id: nextId('ss') }, h('option', { value: '' }, '（全体と同じ）'), Object.entries(STATUSES).map(([k, v]) => h('option', { value: k, selected: item.status === k }, v.label)));
        sel.addEventListener('change', () => { item.status = sel.value || null; onChange({ path, structural: false }); });
        fs.append(h('div', { class: 'fld' }, h('label', { for: sel.id }, 'この回の販売・受付状況'), sel));
      }
      fs.append(h('div', { class: 'fld-actions' }, h('button', {
        type: 'button', class: 'btn-secondary',
        onclick: () => { lst.items.splice(i, 1); onChange({ path, structural: true }); announce(`${legendBase} ${i + 1} を削除しました。`); },
      }, `${legendBase} ${i + 1} を削除`)));
      wrap.append(fs);
    });
    const actions = h('div', { class: 'fld-actions' },
      h('button', {
        type: 'button', class: 'btn-secondary',
        onclick: () => {
          const item = createListItem(def, def.key.slice(0, 1));
          if (path === 'schedule.dates') item.status = null;
          lst.items.push(item);
          lst.none_confirmed = false;
          onChange({ path, structural: true, focusPath: `${path}.items.${lst.items.length - 1}.${def.fields[0].key}` });
          announce(`${legendBase}を追加しました。`);
        },
      }, `${legendBase}を追加`));
    if (!lst.items.length) {
      actions.append(h('button', {
        type: 'button', class: 'btn-confirm',
        onclick: () => { lst.none_confirmed = !lst.none_confirmed; onChange({ path, structural: true }); announce(`${def.label}：${lst.none_confirmed ? '該当なしとして確認しました' : '確認を取り消しました'}`); },
      }, lst.none_confirmed ? '確認を取り消す' : '該当なしとして確認'));
    }
    wrap.append(actions);
    inputs.set(path, headId);
    return wrap;
  }

  function statusBlock() {
    const ev = getEvent();
    const box = h('section', { class: 'group', 'aria-labelledby': 'grp-status' }, h('h3', { id: 'grp-status' }, '販売・受付状況と更新履歴'),
      h('p', { class: 'help' }, 'イベントの内容とは別に管理します。公開後に状況が変わったらここを更新してください。'));
    const selId = nextId('status');
    const sel = h('select', { id: selId }, Object.entries(STATUSES).map(([k, v]) => h('option', { value: k, selected: ev.status.code === k }, v.label)));
    const lblId = nextId('status-label');
    const lbl = h('input', { id: lblId, type: 'text', placeholder: '例：予定枚数終了', 'aria-describedby': `${lblId}-help` });
    lbl.value = ev.status.label ?? '';
    const addHist = h('input', { id: nextId('hist'), type: 'checkbox', checked: true });
    sel.addEventListener('change', () => {
      const prev = ev.status.code;
      ev.status.code = sel.value;
      ev.status.updated_at = todayIso();
      if (addHist.checked && prev !== sel.value) {
        ev.updates.items.push({ id: nextId('u'), date: todayIso(), type: 'status', text: `販売・受付状況を「${STATUSES[sel.value].label}」に変更しました。` });
      }
      onChange({ path: 'status', structural: true });
      announce(`販売・受付状況を「${STATUSES[sel.value].label}」にしました。`);
    });
    lbl.addEventListener('change', () => { ev.status.label = lbl.value.trim(); onChange({ path: 'status', structural: false }); });
    box.append(
      h('div', { class: 'fld' }, h('label', { for: selId }, '販売・受付状況'), sel),
      h('div', { class: 'fld' }, h('label', { for: addHist.id }, addHist, ' 状況を変えたら更新履歴にも記録する')),
      h('div', { class: 'fld' }, h('label', { for: lblId }, '表示する文言（任意）'), h('p', { id: `${lblId}-help`, class: 'help' }, '空欄なら標準の文言を表示します。'), lbl),
    );
    // 更新履歴
    const list = h('div', { class: 'list' }, h('h4', {}, '更新履歴'));
    ev.updates.items.forEach((u, i) => {
      const fs = h('fieldset', { class: 'list-item' }, h('legend', {}, `履歴 ${i + 1}`));
      const dId = nextId('ud');
      const tId = nextId('ut');
      const xId = nextId('ux');
      const d = h('input', { id: dId, type: 'text', placeholder: PLACEHOLDER.date });
      d.value = u.date;
      const t = h('select', { id: tId }, Object.entries(UPDATE_TYPES).map(([k, v]) => h('option', { value: k, selected: u.type === k }, v)));
      const x = h('textarea', { id: xId, rows: 2 });
      x.value = u.text;
      d.addEventListener('change', () => { u.date = d.value.trim(); onChange({ path: 'updates', structural: false }); });
      t.addEventListener('change', () => { u.type = t.value; onChange({ path: 'updates', structural: false }); });
      x.addEventListener('change', () => { u.text = x.value.trim(); onChange({ path: 'updates', structural: false }); });
      const dErr = !u.date || isIsoDate(u.date) ? null : h('p', { class: 'err' }, `エラー：「${u.date}」は日付の形式ではありません　「2026-07-04」の形で入力してください。`);
      fs.append(
        h('div', { class: 'fld' }, h('label', { for: dId }, '日付'), d, dErr),
        h('div', { class: 'fld' }, h('label', { for: tId }, '種類'), t),
        h('div', { class: 'fld' }, h('label', { for: xId }, '内容'), x),
        h('div', { class: 'fld-actions' }, h('button', { type: 'button', class: 'btn-secondary', onclick: () => { ev.updates.items.splice(i, 1); onChange({ path: 'updates', structural: true }); announce(`履歴 ${i + 1} を削除しました。`); } }, `履歴 ${i + 1} を削除`)),
      );
      list.append(fs);
    });
    list.append(h('div', { class: 'fld-actions' }, h('button', {
      type: 'button', class: 'btn-secondary',
      onclick: () => { ev.updates.items.push({ id: nextId('u'), date: todayIso(), type: 'notice', text: '' }); onChange({ path: 'updates', structural: true }); announce('履歴を追加しました。'); },
    }, '履歴を追加')));
    box.append(list);
    return box;
  }

  function reviewItemsBlock() {
    const ev = getEvent();
    const items = ev.meta?.review_items ?? [];
    if (!items.length) return null;
    const box = h('section', { class: 'group review-items', 'aria-labelledby': 'grp-review' },
      h('h3', { id: 'grp-review' }, '判断が必要な記載（自動では項目に入れなかったもの）'),
      h('p', { class: 'help' }, 'チラシの原文です。必要なら該当する項目に入力し、確認したら「対応済みにする」を押してください。「対応が必要」の記載が残っていると確定できません。'));
    const ul = h('ul', { class: 'review-list' });
    items.forEach((it) => {
      const btn = h('button', { type: 'button', class: 'btn-confirm' }, it.resolved ? '未対応に戻す' : '対応済みにする');
      btn.addEventListener('click', () => {
        it.resolved = !it.resolved;
        announce(`${it.topic}：${it.resolved ? '対応済みにしました' : '未対応に戻しました'}`);
        onChange({ path: 'meta.review_items', structural: true });
      });
      ul.append(h('li', {},
        h('p', {}, h('strong', {}, `${it.resolved ? '✓ 対応済み' : it.blocking ? '！ 対応が必要' : '－ 参考'}　${it.topic}`)),
        h('blockquote', {}, `原文：${it.text}`, it.page ? `（${it.file ?? ''} ${it.page}ページ）` : ''),
        h('p', { class: 'why' }, `理由：${it.reason}`),
        h('div', { class: 'fld-actions' }, btn,
          it.file && options.onFocusField ? h('button', { type: 'button', class: 'btn-secondary', onclick: () => options.onFocusField({ source_file: it.file, source_page: it.page, source_bbox: it.bbox }) }, 'チラシで位置を見る') : null)));
    });
    box.append(ul);
    inputs.set('meta.review_items', 'grp-review');
    return box;
  }

  function render(focusPath) {
    refreshers.clear();
    inputs.clear();
    const ev = getEvent();
    const type = eventType(ev);
    root.replaceChildren();
    const rib = reviewItemsBlock();
    if (rib) root.append(rib);
    for (const g of GROUPS) {
      if (!isVisibleFor(g, type)) continue;
      const gid = `grp-${g.id}`;
      const sec = h('section', { class: 'group', 'aria-labelledby': gid }, h('h3', { id: gid }, g.label));
      for (const def of g.fields) {
        if (!isVisibleFor(def, type)) continue;
        const p = pathOf(g, def);
        sec.append(def.kind === 'list' ? listBlock(def, p, type) : fieldRow(def, p));
      }
      root.append(sec);
      if (g.id === 'classification') root.append(statusBlock());
    }
    if (focusPath) focusField(focusPath);
  }

  function refreshAll() {
    for (const r of refreshers.values()) r();
  }

  function focusField(path) {
    let p = path;
    while (p && !inputs.has(p)) p = p.split('.').slice(0, -1).join('.');
    const id = inputs.get(p);
    const el = id && document.getElementById(id);
    if (el) {
      if (/^H[1-6]$/.test(el.tagName)) el.setAttribute('tabindex', '-1');
      el.focus();
      el.scrollIntoView({ block: 'center' });
    }
  }

  return { render, refreshAll, focusField };
}

/** 確認の進み具合と、確定を妨げている項目の一覧 */
export function renderGateSummary(root, ev, onJump) {
  const prog = gateProgress(ev);
  const gate = gateChecks(ev).filter((c) => !c.na);
  const fmt = formatIssues(ev);
  const pending = gate.filter((c) => !c.ok);
  root.replaceChildren(
    h('p', { class: 'gate-progress' }, `必須確認：${prog.total} 項目中 ${prog.done} 項目 確認済み`),
    h('progress', { max: prog.total, value: prog.done, 'aria-label': '必須確認の進み具合' }),
    pending.length || fmt.length
      ? h('ul', { class: 'gate-list' },
        pending.map((c) => h('li', {}, h('span', { class: 'st st-needs_review' }, '！'), ` ${c.label}：${c.message} `,
          h('button', { type: 'button', class: 'btn-link', onclick: () => onJump(c.path) }, `${c.label}へ移動`))),
        fmt.map((i) => h('li', {}, h('span', { class: 'st st-error' }, '✕'), ` ${i.message} `,
          h('button', { type: 'button', class: 'btn-link', onclick: () => onJump(i.path) }, `${i.label}へ移動`))))
      : h('p', { class: 'st st-confirmed' }, '✓ 必須項目はすべて確認済みです。STEP 4 で生成できます。'),
  );
}
