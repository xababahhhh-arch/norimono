// HP・テキスト・SNS・alt の生成（fixture 11種）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateHP } from '../js/generate/hp.js';
import { generateText } from '../js/generate/text.js';
import { generateSns, generateAllSns, xLength, X_LIMIT, MSG_NO_PROFILE, MSG_NO_PROGRAM } from '../js/generate/sns.js';
import { allAlts, flyerAlt } from '../js/generate/alt.js';
import { BANNED_PHRASES } from '../js/core/phrases.js';
import { field } from '../js/core/field.js';
import { loadFixture, fixtureNames, parse } from './helpers.mjs';

const hp = (name, opts = {}) => {
  const ev = typeof name === 'string' ? loadFixture(name) : name;
  const r = generateHP(ev, { mode: 'page', ...opts });
  return { ...r, doc: parse(r.html) };
};
const sectionIds = (doc) => [...doc.querySelectorAll('section[id]')].map((s) => s.id);

test('HP：基本の並び順（状態→チラシ→概要→出演→プログラム→日時→会場→料金…→更新履歴）', () => {
  const { doc } = hp('11_performer_change');
  const ids = sectionIds(doc);
  const order = ['ev-status', 'ev-overview', 'ev-performers', 'ev-program', 'ev-datetime', 'ev-venue', 'ev-price', 'ev-target', 'ev-sales', 'ev-tickets', 'ev-organizer', 'ev-contact', 'ev-updates'];
  const pos = order.map((id) => ids.indexOf(id));
  assert.ok(pos.every((p) => p >= 0), `欠けているセクション：${order.filter((_, i) => pos[i] < 0)}`);
  assert.deepEqual([...pos].sort((a, b) => a - b), pos);
});

test('1. 通常クラシック：time要素・ruby・lang・チラシへのリンク', () => {
  const { doc, draft } = hp('01_classic_recital');
  assert.equal(draft, false);
  assert.equal(doc.querySelector('h1').textContent, '春風ことね ピアノ・リサイタル');
  assert.ok(doc.querySelector('time[datetime="2026-07-04T14:00+09:00"]'));
  assert.equal(doc.querySelector('ruby rt').textContent, 'はるかぜことね');
  assert.equal(doc.querySelector('[lang="en"]').textContent, 'Kotone Harukaze');
  const links = [...doc.querySelectorAll('.ev-flyers a')].map((a) => a.textContent);
  assert.deepEqual(links, ['チラシ表面（PDF）を開く', 'チラシ裏面（PDF）を開く']);
  assert.ok(doc.querySelector('abbr[title]'), 'Pコードに abbr');
  assert.equal(doc.querySelectorAll('table').length, 0, '表をレイアウトに使わない');
  assert.ok(doc.querySelector('#ev-program h2 + h3'), 'プログラムの部ごとの見出し');
});

test('2. 複数出演：全員を表示、曲目なしは「プログラム」を出さない', () => {
  const { doc } = hp('02_multi_performer');
  assert.equal(doc.querySelectorAll('.ev-performers > li').length, 4);
  assert.match(doc.querySelector('#ev-performers').textContent, /西川 そら（サックス・ゲスト）/);
  assert.match(doc.querySelector('#ev-program').textContent, /曲目は当日発表します/);
  assert.equal(doc.querySelectorAll('#ev-program li').length, 0);
});

test('3. 0歳から：年齢・膝上鑑賞・ベビーカー・2回公演', () => {
  const { doc } = hp('03_family_0sai');
  const t = doc.querySelector('#ev-target').textContent;
  assert.match(t, /0歳から入場できます/);
  assert.match(t, /膝上鑑賞無料/);
  assert.match(doc.querySelector('#ev-accessibility').textContent, /ベビーカー置き場/);
  assert.equal(doc.querySelectorAll('.ev-dates li').length, 2);
  assert.match(doc.querySelector('#ev-glossary').textContent, /膝上鑑賞/);
});

test('4. ワークショップ：開場・チケット欄を出さず、申込方法を出す', () => {
  const { doc } = hp('04_workshop');
  const ids = sectionIds(doc);
  assert.ok(!ids.includes('ev-tickets'));
  assert.ok(!ids.includes('ev-sales'));
  assert.ok(ids.includes('ev-application'));
  assert.doesNotMatch(doc.querySelector('#ev-datetime').textContent, /開場/);
  assert.match(doc.querySelector('#ev-datetime').textContent, /開始 10:00／終了 12:00/);
  assert.match(doc.querySelector('#ev-application a').textContent, /申込フォームを開く（外部サイト）/);
  assert.equal(doc.querySelector('#ev-performers h2').textContent, '講師');
});

test('5. 複数回公演：回ごとの販売状況を文字で表示', () => {
  const { doc } = hp('05_multi_session');
  const items = [...doc.querySelectorAll('.ev-dates li')].map((l) => l.textContent);
  assert.equal(items.length, 3);
  assert.match(items[0], /残りわずか/);
  assert.match(items[2], /完売/);
  assert.match(doc.querySelector('#ev-status').textContent, /2026年10月18日（日） 14:00の回：✕ 完売/);
});

test('6. 無料イベント：「無料」表示・発売日欄なし', () => {
  const { doc } = hp('06_free_event');
  assert.match(doc.querySelector('#ev-price').textContent, /入場無料（申込不要）/);
  assert.ok(!sectionIds(doc).includes('ev-sales'));
  assert.equal(doc.querySelector('[lang="en"] ').textContent.trim().length > 0, true);
  assert.ok([...doc.querySelectorAll('cite span[lang="en"]')].some((s) => s.textContent === 'Amazing Grace'), '欧文の曲名に lang');
});

test('7. 参加者募集：応募資格・応募方法・期間', () => {
  const { doc } = hp('07_recruitment');
  assert.match(doc.querySelector('#ev-target').textContent, /応募資格/);
  assert.equal(doc.querySelector('#ev-application h2').textContent, '応募方法');
  assert.match(doc.querySelector('#ev-datetime').textContent, /期間：2026年8月1日（土）〜2026年8月31日（月）/);
  assert.ok(!sectionIds(doc).includes('ev-performers'));
});

test('8. オープンデー：小イベントの一覧', () => {
  const { doc } = hp('08_open_day');
  assert.equal(doc.querySelector('#ev-program h2').textContent, '催しの内容');
  assert.equal(doc.querySelectorAll('.ev-sub-events li').length, 3);
  assert.ok(doc.querySelector('.ev-sub-events time[datetime="2026-11-03T10:30+09:00"]'));
});

test('9. 完売：状態を記号＋文字で冒頭に表示し、購入を促さない', () => {
  const { doc } = hp('09_sold_out');
  const badge = doc.querySelector('.ev-status-badge').textContent;
  assert.match(badge, /✕ 予定枚数終了/);
  assert.match(doc.querySelector('#ev-tickets').textContent, /予定枚数終了のため、チケットの販売は行っていません/);
  const text = generateText(loadFixture('09_sold_out')).text;
  assert.match(text, /販売・受付状況：予定枚数終了/);
});

test('10. 受付終了：更新履歴（2026-07-04「定員に達したため電話受付は実施しません」）', () => {
  const { doc } = hp('10_registration_closed');
  assert.match(doc.querySelector('.ev-status-badge').textContent, /受付終了/);
  const ups = [...doc.querySelectorAll('#ev-updates li')].map((l) => l.textContent);
  assert.equal(ups[0], '2026年7月4日（土）　定員に達したため電話受付は実施しません', '新しい順');
  assert.ok(doc.querySelector('#ev-updates time[datetime="2026-07-04"]'));
  assert.match(doc.querySelector('#ev-application').textContent, /受付は終了しました/);
});

test('11. 出演者変更：冒頭の状態欄と更新履歴の両方に表示', () => {
  const { doc } = hp('11_performer_change');
  assert.match(doc.querySelector('#ev-status').textContent, /【出演者変更】出演を予定していた星野あかり/);
  assert.match(doc.querySelector('#ev-updates').textContent, /月島ゆう（ピアノ）が出演します/);
  assert.match(doc.querySelector('#ev-organizer').textContent, /共催さくらプラザ（架空）/);
  assert.match(doc.querySelector('#ev-organizer').textContent, /助成サンプル文化財団/);
});

test('下書き：未確認の値に［要確認］、欠落に「情報なし」を表示', () => {
  const ev = loadFixture('01_classic_recital', { confirmed: false });
  const { doc, draft } = hp(ev);
  assert.equal(draft, true);
  assert.match(doc.querySelector('.ev-draft').textContent, /このまま公開しないでください/);
  assert.match(doc.querySelector('h1').textContent, /［要確認］/);
  ev.venue.venue = field(null);
  assert.match(hp(ev).doc.querySelector('#ev-venue').textContent, /会場：情報なし（要確認）/);
});

test('HTMLエスケープ：入力のタグを実行可能な形で出力しない', () => {
  const ev = loadFixture('01_classic_recital');
  ev.basic.title = field('<script>alert(1)</script>', { confirmed: true });
  ev.links.items[0].url = field('javascript:alert(1)', { confirmed: true });
  const r = generateHP(ev, { mode: 'fragment', draft: false });
  assert.ok(!r.html.includes('<script>'));
  assert.ok(!r.html.includes('href="javascript:'));
});

test('HP・テキストに入力資料にない情報を追加しない（未入力の項目は出ない）', () => {
  const ev = loadFixture('12_exhibition');
  const { doc } = hp(ev);
  const ids = sectionIds(doc);
  for (const id of ['ev-performers', 'ev-program', 'ev-accessibility', 'ev-notes', 'ev-tickets', 'ev-sales', 'ev-updates', 'ev-links']) {
    assert.ok(!ids.includes(id), `${id} は情報がないので出さない`);
  }
  assert.doesNotMatch(doc.body.textContent, /開演|開場/);
});

test('すべての fixture で全9投稿を生成（成功または不足メッセージ）', () => {
  for (const n of fixtureNames()) {
    const posts = generateAllSns(loadFixture(n));
    assert.equal(posts.length, 9);
    for (const p of posts) assert.ok(p.ok || p.message, `${n} ${p.platform}${p.kind}`);
  }
});

test('SNS：プロフィールなし→「出演者プロフィール情報を追加してください」', () => {
  const r = generateSns(loadFixture('04_workshop'), 'x', 'B');
  assert.equal(r.ok, false);
  assert.equal(r.message, MSG_NO_PROFILE);
  assert.equal(r.text, '');
});

test('SNS：プログラムなし→「プログラム情報が登録されていません」', () => {
  for (const pf of ['x', 'facebook', 'instagram']) {
    const r = generateSns(loadFixture('02_multi_performer'), pf, 'C');
    assert.equal(r.message, MSG_NO_PROGRAM);
  }
});

test('SNS：媒体ごとに構成が異なる（同じ文章の長さ違いではない）', () => {
  const ev = loadFixture('01_classic_recital');
  for (const k of ['A', 'B', 'C']) {
    const [x, fb, ig] = ['x', 'facebook', 'instagram'].map((p) => generateSns(ev, p, k).text);
    assert.notEqual(x.split('\n')[0], fb.split('\n')[0]);
    assert.notEqual(fb.split('\n')[0], ig.split('\n')[0]);
    assert.ok(ig.split('\n').filter((l) => l === '').length >= 3, 'Instagram は空行でリズムを作る');
    assert.match(ig, /#さくらプラザ/);
    assert.match(ig, /プロフィールのリンク/);
    assert.match(fb, /■/);
  }
});

test('SNS：X は 280（重み付き）以内、日時とURLを必ず含む', () => {
  for (const n of fixtureNames()) {
    const ev = loadFixture(n);
    for (const k of ['A', 'B', 'C']) {
      const r = generateSns(ev, 'x', k, { pageUrl: 'https://example.jp/event/x.html' });
      if (!r.ok) continue;
      assert.ok(xLength(r.text) <= X_LIMIT, `${n} X${k} ${xLength(r.text)}`);
      assert.match(r.text, /https:\/\/example\.jp\/event\/x\.html/);
      assert.match(r.text, /\d+\/\d+\(.\)/);
    }
  }
});

test('SNS：X の長いプログラムは「ほか（全N曲）」で省略（事実のみ）', () => {
  const ev = loadFixture('01_classic_recital');
  for (let i = 0; i < 12; i++) ev.program.works.items.push({ id: `z${i}`, composer: field('サンプル作曲家', { confirmed: true }), work: field(`とても長い作品名の練習曲 第${i + 1}番 ハ長調`, { confirmed: true }), section: field(null), notes: field(null) });
  const r = generateSns(ev, 'x', 'C');
  assert.ok(xLength(r.text) <= X_LIMIT);
  assert.match(r.text, /ほか（全16曲）/);
});

test('SNS：禁止表現を生成しない／資料にない誇張表現は警告', () => {
  for (const n of fixtureNames()) {
    for (const p of generateAllSns(loadFixture(n))) {
      for (const w of BANNED_PHRASES) assert.ok(!p.text.includes(w), `${n} ${p.platform}${p.kind} に「${w}」`);
    }
  }
  const ev = loadFixture('01_classic_recital');
  ev.basic.catchphrase = field('必見のリサイタル', { confirmed: true });
  // 資料（catchphrase）にある語はそのまま使うので警告しない
  assert.equal(generateSns(ev, 'instagram', 'A').warnings.filter((w) => w.includes('裏付け')).length, 0);
});

test('SNS：完売・受付終了では購入・申込を促さない', () => {
  const x = generateSns(loadFixture('09_sold_out'), 'x', 'A').text;
  assert.match(x, /【予定枚数終了】/);
  assert.match(x, /完売しました/);
  assert.doesNotMatch(x, /発売|申込/);
  const fb = generateSns(loadFixture('10_registration_closed'), 'facebook', 'A').text;
  assert.match(fb, /受付は終了しました/);
  assert.doesNotMatch(fb, /■申込/);
});

test('SNS：出演者変更を A・B に明記', () => {
  const ev = loadFixture('11_performer_change');
  for (const k of ['A', 'B']) for (const p of ['x', 'facebook', 'instagram']) {
    assert.match(generateSns(ev, p, k).text, /出演者が変更になりました（10月1日更新）/);
  }
});

test('SNS：HPのURL未入力は置き換え用の表示と警告', () => {
  const r = generateSns(loadFixture('02_multi_performer'), 'x', 'A');
  assert.match(r.text, /［HPページのURL］/);
  assert.ok(r.warnings.some((w) => w.includes('URLが未入力')));
});

test('代替テキスト：事実だけで作り、見た目を推測しない', () => {
  const ev = loadFixture('01_classic_recital');
  assert.equal(flyerAlt(ev, 'front'), '「春風ことね ピアノ・リサイタル」のチラシ表面。2026年7月4日（土）、戸塚区民文化センター さくらプラザ ホール。内容は本文に記載しています。');
  const alts = allAlts(ev).map((a) => a.target);
  assert.deepEqual(alts, ['チラシ表面', 'チラシ裏面', 'Instagram投稿画像']);
});
