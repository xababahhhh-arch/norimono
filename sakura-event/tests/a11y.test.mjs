// AAA対応チェック：自動検査が機能すること、fixture の生成HTMLが自動検査を通ること
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateHP, PAGE_CSS, PALETTE, CONTRAST_PAIRS } from '../js/generate/hp.js';
import { runA11yChecks, reportText, contrastRatio } from '../js/a11y/check.js';
import { loadFixture, fixtureNames, parse } from './helpers.mjs';

const check = (html, opts) => runA11yChecks(parse(html), opts);
const byId = (rep, id) => rep.auto.find((r) => r.id === id);

test('配色はすべて 7:1 以上', () => {
  for (const [fg, bg, label] of CONTRAST_PAIRS) {
    assert.ok(contrastRatio(PALETTE[fg], PALETTE[bg]) >= 7, label);
  }
  assert.equal(contrastRatio('#000000', '#ffffff').toFixed(0), '21');
});

test('全 fixture：確認用ページ・CMS断片とも自動検査に不合格なし', () => {
  for (const n of fixtureNames()) {
    const ev = loadFixture(n);
    for (const mode of ['page', 'fragment']) {
      const r = generateHP(ev, { mode });
      const rep = check(r.html, { mode, css: mode === 'page' ? PAGE_CSS : '', draft: r.draft });
      const fails = rep.auto.filter((x) => x.result === 'fail' || x.result === 'warn');
      assert.deepEqual(fails, [], `${n} ${mode}`);
      assert.equal(rep.manual.length, 12, '人による確認項目を必ず出す');
    }
  }
});

test('不備を検出する：見出し飛び越し・alt なし・曖昧なリンク・lang なし欧文・table', () => {
  const html = `<!doctype html><html><body><main><article class="sakura-event"><h1>T</h1><h3>x</h3>
    <img src="a.jpg"><a href="https://a.example">こちら</a><a href="https://b.example">こちら</a>
    <ul><li>Take Five</li></ul><table><tr><td>1</td></tr></table><p class="ev-status-badge">●</p></article></main></body></html>`;
  const rep = check(html, { mode: 'page', css: '' });
  for (const id of ['A01', 'A02', 'A04', 'A07', 'A08', 'A10', 'A11', 'A12', 'A13', 'A15', 'A16', 'A17', 'A18', 'A23']) {
    assert.equal(byId(rep, id).result, 'fail', id);
  }
});

test('下書きは「情報なし」「要確認」の残存を注意として報告', () => {
  const ev = loadFixture('01_classic_recital', { confirmed: false });
  const r = generateHP(ev, { mode: 'page' });
  const rep = check(r.html, { mode: 'page', css: PAGE_CSS, draft: true });
  assert.equal(byId(rep, 'A21').result, 'warn');
});

test('報告書は「AAA適合」と断定せず、自動と人の確認を分ける', () => {
  const ev = loadFixture('01_classic_recital');
  const r = generateHP(ev, { mode: 'page' });
  const txt = reportText(check(r.html, { mode: 'page', css: PAGE_CSS }), { title: 'T' });
  assert.match(txt, /AAA対応チェック/);
  assert.match(txt, /「AAA適合」を示すものではありません/);
  assert.match(txt, /■自動検査/);
  assert.match(txt, /■人による確認が必要な項目/);
  assert.doesNotMatch(txt.replace(/「AAA適合」を示すものではありません/, ''), /AAA適合/);
});
