/*
 * なかまわけ の 問題データ
 * ------------------------------------------------------------
 * ★ 問題を増やす・直すとき
 *   NAKAMA_QUESTIONS に { ... } を1つ足します。
 *
 *   id      : 半角英字の名前（ほかと重ならないように）
 *   group   : 分類のなかま（いきもの／たべもの／のりもの／ばしょ／みにつける）。
 *             1回のプレイでは できるだけ ちがう group から出します
 *   text    : 画面に出す問題文（短い ひらがな）
 *   say     : 読み上げる文。text と 同じ言葉にする（漢字まじりのほうが自然に読まれます）
 *   tags    : この問題の「なかま」の条件（NAKAMA_ITEMS の tags の言葉）
 *   answers : 正解の絵。2つ以上 書く（名前の丸暗記にならないよう、毎回 ちがう絵が出ます）
 *   wrongs  : 不正解の絵。2たく なら1つ、3たく なら2つ えらばれます（2つ以上 書く）
 *
 *   正解が2つにならないように、answers は tags をすべて持ち、
 *   wrongs は tags をすべては持たない ようにしてください。
 *   パソコンで「node tools/check-data.js」を実行すると、自動で確認できます。
 *
 * ★ 絵を増やす・差し替えるとき
 *   NAKAMA_ITEMS に { ... } を足します。
 *   vehicle : のりものゲームの絵を使うとき、その id（vehicles.js）
 *   svg     : 自作の絵（横長 320×160）
 *   image   : 画像ファイルを使うとき（リポジトリの images フォルダに入れて 'images/inu.png' のように書く）
 */

function nkSvg(inner) {
  return `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
}

var NAKAMA_ITEMS = {
  // ----- のりもの（のりものゲームの絵を使う） -----
  train: { name: 'でんしゃ', say: '電車', vehicle: 'yamanote', image: '', tags: ['vehicle', 'rail'] },
  shinkansen: { name: 'しんかんせん', say: '新幹線', vehicle: 'hayabusa', image: '', tags: ['vehicle', 'rail'] },
  sl: { name: 'エスエル', say: 'エスエル', vehicle: 'sl', image: '', tags: ['vehicle', 'rail'] },
  bus: { name: 'バス', say: 'バス', vehicle: 'bus', image: '', tags: ['vehicle', 'road'] },
  truck: { name: 'トラック', say: 'トラック', vehicle: 'truck', image: '', tags: ['vehicle', 'road', 'work'] },
  shobosha: { name: 'しょうぼうしゃ', say: '消防車', vehicle: 'shobosha', image: '', tags: ['vehicle', 'road', 'work', 'siren'] },
  kyukyusha: { name: 'きゅうきゅうしゃ', say: '救急車', vehicle: 'kyukyusha', image: '', tags: ['vehicle', 'road', 'work', 'siren'] },
  patocar: { name: 'パトカー', say: 'パトカー', vehicle: 'patocar', image: '', tags: ['vehicle', 'road', 'work', 'siren'] },
  shovel: { name: 'ショベルカー', say: 'ショベルカー', vehicle: 'shovel', image: '', tags: ['vehicle', 'work'] },
  gomi: { name: 'ごみしゅうしゅうしゃ', say: 'ゴミしゅうしゅうしゃ', vehicle: 'gomi', image: '', tags: ['vehicle', 'road', 'work'] },
  dump: { name: 'ダンプカー', say: 'ダンプカー', vehicle: 'dump', image: '', tags: ['vehicle', 'road', 'work'] },
  airplane: { name: 'ひこうき', say: '飛行機', vehicle: 'airplane', image: '', tags: ['vehicle', 'sky'] },
  helicopter: { name: 'ヘリコプター', say: 'ヘリコプター', vehicle: 'helicopter', image: '', tags: ['vehicle', 'sky'] },
  ship: { name: 'ふね', say: '船', vehicle: 'ferry', image: '', tags: ['vehicle', 'onwater'] },
  bicycle: { name: 'じてんしゃ', say: '自転車', vehicle: 'bicycle', image: '', tags: ['vehicle', 'road'] },

  // ----- 自作の絵 -----
  car: {
    name: 'くるま', say: 'くるま', image: '', tags: ['vehicle', 'road'],
    svg: nkSvg(`<rect x="20" y="138" width="280" height="6" rx="3" fill="#b3b8bf"/>
  <path d="M40,112 C40,98 48,92 62,90 L92,86 L118,60 C124,54 132,52 142,52 L206,52 C218,52 226,56 232,64 L252,88 L272,92 C282,94 286,100 286,110 L286,114 C286,119 282,122 276,122 L50,122 C44,122 40,118 40,112 Z" fill="#ff5a5f" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
  <path d="M126,62 L170,62 L170,86 L104,86 Z" fill="#a8d8f0"/><path d="M178,62 L206,62 C214,62 220,66 224,72 L236,86 L178,86 Z" fill="#a8d8f0"/>
  <circle cx="279" cy="100" r="5" fill="#fff6c8"/>
  <circle cx="92" cy="122" r="18" fill="#2b2b2b"/><circle cx="92" cy="122" r="8" fill="#c9ced6"/>
  <circle cx="236" cy="122" r="18" fill="#2b2b2b"/><circle cx="236" cy="122" r="8" fill="#c9ced6"/>`)
  },
  dog: {
    name: 'いぬ', say: '犬', image: '', tags: ['animal'],
    svg: nkSvg(`<rect x="40" y="142" width="240" height="5" rx="2" fill="#d8dde3"/>
  <path d="M96,92 C76,80 72,62 80,54" stroke="#d9a066" stroke-width="11" fill="none" stroke-linecap="round"/>
  <rect x="104" y="106" width="16" height="36" rx="7" fill="#c48a52"/><rect x="128" y="108" width="16" height="34" rx="7" fill="#c48a52"/>
  <rect x="174" y="108" width="16" height="34" rx="7" fill="#c48a52"/><rect x="196" y="106" width="16" height="36" rx="7" fill="#c48a52"/>
  <ellipse cx="156" cy="98" rx="64" ry="28" fill="#d9a066"/>
  <path d="M196,92 L214,102" stroke="#e0303a" stroke-width="8" stroke-linecap="round"/>
  <circle cx="224" cy="70" r="32" fill="#d9a066"/>
  <ellipse cx="206" cy="72" rx="11" ry="22" fill="#8a5a2b" transform="rotate(18 206 72)"/>
  <ellipse cx="250" cy="84" rx="17" ry="12" fill="#f2d3b0"/>
  <circle cx="264" cy="80" r="6" fill="#2b2b2b"/><circle cx="234" cy="62" r="5" fill="#2b2b2b"/>
  <path d="M248,92 q6,6 13,0" stroke="#2b2b2b" stroke-width="3" fill="none" stroke-linecap="round"/>`)
  },
  cat: {
    name: 'ねこ', say: '猫', image: '', tags: ['animal'],
    svg: nkSvg(`<path d="M204,128 C240,122 244,90 228,82" stroke="#f5a35a" stroke-width="11" fill="none" stroke-linecap="round"/>
  <ellipse cx="160" cy="114" rx="46" ry="34" fill="#f5a35a"/>
  <ellipse cx="146" cy="146" rx="13" ry="7" fill="#f5a35a"/><ellipse cx="174" cy="146" rx="13" ry="7" fill="#f5a35a"/>
  <path d="M126,46 L132,12 L156,34 Z M194,46 L188,12 L164,34 Z" fill="#f5a35a"/>
  <path d="M133,38 L136,22 L148,33 Z M187,38 L184,22 L172,33 Z" fill="#ffb3c1"/>
  <circle cx="160" cy="62" r="38" fill="#f5a35a"/>
  <path d="M146,30 L150,42 M160,26 L160,40 M174,30 L170,42" stroke="#d9772e" stroke-width="4" stroke-linecap="round"/>
  <ellipse cx="146" cy="60" rx="5" ry="7" fill="#2b2b2b"/><ellipse cx="174" cy="60" rx="5" ry="7" fill="#2b2b2b"/>
  <path d="M155,72 L165,72 L160,78 Z" fill="#ff8aa0"/>
  <path d="M160,78 q-6,8 -13,2 M160,78 q6,8 13,2" stroke="#2b2b2b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  <path d="M130,72 L108,68 M130,78 L108,82 M190,72 L212,68 M190,78 L212,82" stroke="#6b4b2b" stroke-width="2" stroke-linecap="round"/>`)
  },
  rabbit: {
    name: 'うさぎ', say: 'うさぎ', image: '', tags: ['animal'],
    svg: nkSvg(`<ellipse cx="144" cy="36" rx="12" ry="32" fill="#fff" stroke="#c9ced6" stroke-width="3"/>
  <ellipse cx="176" cy="36" rx="12" ry="32" fill="#fff" stroke="#c9ced6" stroke-width="3"/>
  <ellipse cx="144" cy="38" rx="5" ry="22" fill="#ffc2cf"/><ellipse cx="176" cy="38" rx="5" ry="22" fill="#ffc2cf"/>
  <ellipse cx="160" cy="130" rx="42" ry="24" fill="#fff" stroke="#c9ced6" stroke-width="3"/>
  <circle cx="160" cy="86" r="34" fill="#fff" stroke="#c9ced6" stroke-width="3"/>
  <circle cx="147" cy="82" r="5" fill="#2b2b2b"/><circle cx="173" cy="82" r="5" fill="#2b2b2b"/>
  <circle cx="138" cy="96" r="6" fill="#ffc2cf"/><circle cx="182" cy="96" r="6" fill="#ffc2cf"/>
  <path d="M156,92 L164,92 L160,97 Z" fill="#ff8aa0"/>
  <path d="M160,97 q-5,6 -10,1 M160,97 q5,6 10,1" stroke="#2b2b2b" stroke-width="2.5" fill="none" stroke-linecap="round"/>`)
  },
  elephant: {
    name: 'ぞう', say: '象', image: '', tags: ['animal'],
    svg: nkSvg(`<rect x="40" y="142" width="240" height="5" rx="2" fill="#d8dde3"/>
  <path d="M74,84 C62,92 62,104 66,112" stroke="#8a9cb2" stroke-width="5" fill="none" stroke-linecap="round"/>
  <rect x="88" y="108" width="22" height="34" rx="8" fill="#8a9cb2"/><rect x="116" y="110" width="22" height="32" rx="8" fill="#8a9cb2"/>
  <rect x="160" y="110" width="22" height="32" rx="8" fill="#8a9cb2"/><rect x="186" y="108" width="22" height="34" rx="8" fill="#8a9cb2"/>
  <ellipse cx="146" cy="88" rx="74" ry="40" fill="#9fb0c4"/>
  <circle cx="222" cy="68" r="36" fill="#9fb0c4"/>
  <path d="M250,76 C268,96 268,118 254,136" stroke="#9fb0c4" stroke-width="18" fill="none" stroke-linecap="round"/>
  <ellipse cx="202" cy="70" rx="22" ry="30" fill="#8a9cb2"/>
  <path d="M238,96 q10,8 20,2" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round"/>
  <circle cx="232" cy="58" r="5" fill="#2b2b2b"/>`)
  },
  bird: {
    name: 'とり', say: '鳥', image: '', tags: ['animal', 'sky'],
    svg: nkSvg(`<path d="M118,86 L84,70 L90,98 Z" fill="#2f7fd0"/>
  <ellipse cx="160" cy="88" rx="46" ry="30" fill="#4aa3e8"/>
  <ellipse cx="172" cy="98" rx="28" ry="16" fill="#d6ecfb"/>
  <circle cx="206" cy="70" r="25" fill="#4aa3e8"/>
  <path d="M226,64 L252,71 L226,79 Z" fill="#ffb13b"/>
  <circle cx="212" cy="64" r="4.5" fill="#2b2b2b"/>
  <path d="M130,82 C142,32 190,34 190,74 Z" fill="#2f7fd0"/>
  <path d="M150,118 L146,134 M170,118 L170,134" stroke="#ffb13b" stroke-width="4" stroke-linecap="round"/>`)
  },
  fish: {
    name: 'さかな', say: '魚', image: '', tags: ['animal', 'inwater', 'food'],
    svg: nkSvg(`<circle cx="262" cy="46" r="6" fill="none" stroke="#7cc4f2" stroke-width="3"/><circle cx="276" cy="28" r="4" fill="none" stroke="#7cc4f2" stroke-width="3"/>
  <path d="M90,80 L52,50 L58,80 L52,110 Z" fill="#ff8a3d"/>
  <path d="M152,50 L172,28 L184,54 Z" fill="#ff8a3d"/>
  <path d="M86,80 C116,38 206,38 244,80 C206,122 116,122 86,80 Z" fill="#ffa25a" stroke="#e0782a" stroke-width="3"/>
  <path d="M130,56 C120,72 120,88 130,104 M156,50 C146,70 146,90 156,110" stroke="#fff" stroke-width="4" fill="none" opacity=".7"/>
  <circle cx="212" cy="72" r="9" fill="#fff"/><circle cx="214" cy="72" r="5" fill="#2b2b2b"/>
  <path d="M236,86 q-6,4 -12,2" stroke="#8a3d10" stroke-width="3" fill="none" stroke-linecap="round"/>`)
  },
  apple: {
    name: 'りんご', say: 'りんご', image: '', tags: ['food', 'fruit'],
    svg: nkSvg(`<path d="M160,52 C136,36 96,48 98,90 C100,126 132,148 160,136 C188,148 220,126 222,90 C224,48 184,36 160,52 Z" fill="#e53935"/>
  <path d="M160,54 L164,26" stroke="#6b4423" stroke-width="7" stroke-linecap="round"/>
  <path d="M168,36 C184,18 206,24 208,30 C198,44 180,46 168,36 Z" fill="#43a047"/>
  <ellipse cx="128" cy="82" rx="8" ry="16" fill="#fff" opacity=".45"/>`)
  },
  banana: {
    name: 'バナナ', say: 'バナナ', image: '', tags: ['food', 'fruit'],
    svg: nkSvg(`<path d="M78,58 C96,124 204,142 254,88 C260,82 258,74 248,78 C202,110 120,102 94,52 C90,44 76,48 78,58 Z" fill="#ffd23f" stroke="#d9a400" stroke-width="3"/>
  <path d="M100,70 C130,106 190,116 236,94" stroke="#f0b400" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M80,56 L72,40" stroke="#6b4423" stroke-width="7" stroke-linecap="round"/>
  <circle cx="252" cy="84" r="4" fill="#6b4423"/>`)
  },
  onigiri: {
    name: 'おにぎり', say: 'おにぎり', image: '', tags: ['food'],
    svg: nkSvg(`<path d="M160,26 C178,26 240,110 236,126 C232,142 88,142 84,126 C80,110 142,26 160,26 Z" fill="#fff" stroke="#c9ced6" stroke-width="3"/>
  <rect x="128" y="98" width="64" height="44" rx="5" fill="#2b3a2b"/>
  <circle cx="150" cy="62" r="2.5" fill="#e6e6e6"/><circle cx="172" cy="74" r="2.5" fill="#e6e6e6"/><circle cx="136" cy="84" r="2.5" fill="#e6e6e6"/>`)
  },
  // ----- 分類問題のために 追加した絵 -----
  yacht: {
    name: 'ヨット', say: 'ヨット', image: '', tags: ['vehicle', 'onwater'],
    svg: nkSvg(`<path d="M0,128 Q20,118 40,128 T80,128 T120,128 T160,128 T200,128 T240,128 T280,128 T320,128 L320,160 L0,160 Z" fill="#5bb4e5"/>
  <path d="M86,110 L244,110 L222,134 L106,134 Z" fill="#e0303a"/>
  <rect x="160" y="16" width="6" height="96" fill="#8a6a4a"/>
  <path d="M158,24 L158,104 L96,104 Z" fill="#fff" stroke="#c9ced6" stroke-width="3" stroke-linejoin="round"/>
  <path d="M168,34 L168,104 L220,104 Z" fill="#ffd23f" stroke="#e0a800" stroke-width="3" stroke-linejoin="round"/>
  <path d="M166,16 L190,22 L166,28 Z" fill="#2f8be0"/>`)
  },
  whale: {
    name: 'くじら', say: 'くじら', image: '', tags: ['animal', 'inwater'],
    svg: nkSvg(`<path d="M0,140 Q20,132 40,140 T80,140 T120,140 T160,140 T200,140 T240,140 T280,140 T320,140 L320,160 L0,160 Z" fill="#a8d8f0"/>
  <path d="M200,52 C198,36 190,28 180,24 M200,52 L200,26 M200,52 C202,34 210,28 222,24" stroke="#7cc4f2" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M66,100 L30,76 L38,102 L28,126 Z" fill="#3b7dd8"/>
  <path d="M62,100 C62,62 120,52 180,56 C236,60 264,82 262,106 C260,126 230,136 180,136 L94,136 C74,136 62,120 62,100 Z" fill="#3b7dd8"/>
  <path d="M104,120 C136,132 212,134 252,114 C248,128 222,136 180,136 L104,136 Z" fill="#d6ecfb"/>
  <circle cx="220" cy="90" r="7" fill="#fff"/><circle cx="221" cy="90" r="4" fill="#1a2a4f"/>
  <path d="M232,108 q10,6 20,-2" stroke="#1a2a4f" stroke-width="3" fill="none" stroke-linecap="round"/>`)
  },
  strawberry: {
    name: 'いちご', say: 'いちご', image: '', tags: ['food', 'fruit'],
    svg: nkSvg(`<path d="M160,52 C122,40 96,60 100,88 C104,118 140,146 160,148 C180,146 216,118 220,88 C224,60 198,40 160,52 Z" fill="#e53950"/>
  ${[[130, 76], [160, 70], [190, 76], [120, 100], [150, 98], [178, 100], [204, 98], [140, 122], [168, 124], [186, 118]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3" ry="4.5" fill="#ffe27a"/>`).join('')}
  <path d="M160,54 L138,34 L150,50 L126,46 L148,58 L160,40 L172,58 L194,46 L170,50 L182,34 Z" fill="#43a047"/>
  <path d="M160,42 L162,24" stroke="#43a047" stroke-width="5" stroke-linecap="round"/>`)
  },
  carrot: {
    name: 'にんじん', say: 'にんじん', image: '', tags: ['food', 'vegetable'],
    svg: nkSvg(`<g transform="rotate(-28 160 80)">
    <path d="M84,76 C60,60 50,56 40,60 M84,80 C58,80 46,86 40,94 M84,84 C64,98 60,106 60,116" stroke="#43a047" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M80,80 C80,60 100,56 120,58 L252,76 C260,78 260,82 252,84 L120,102 C100,104 80,100 80,80 Z" fill="#ff8a1f"/>
    <path d="M128,68 L140,70 M156,92 L170,90 M188,74 L200,76 M214,86 L224,85" stroke="#d96a00" stroke-width="4" stroke-linecap="round"/>
  </g>`)
  },
  tomato: {
    name: 'トマト', say: 'トマト', image: '', tags: ['food', 'vegetable', 'fruit'], // くだもの と まちがえやすいので 果物の問題では使わない
    svg: nkSvg(`<ellipse cx="160" cy="94" rx="64" ry="54" fill="#e53935"/>
  <ellipse cx="132" cy="80" rx="10" ry="16" fill="#fff" opacity=".4"/>
  <path d="M160,46 L146,30 L154,48 L130,42 L150,54 L136,62 L158,56 L160,68 L162,56 L184,62 L170,54 L190,42 L166,48 L174,30 Z" fill="#43a047"/>`)
  },
  shirt: {
    name: 'シャツ', say: 'シャツ', image: '', tags: ['clothes', 'wear'],
    svg: nkSvg(`<path d="M112,36 L140,26 C146,40 174,40 180,26 L208,36 L240,68 L216,88 L204,78 L204,142 L116,142 L116,78 L104,88 L80,68 Z" fill="#2f8be0" stroke="#1f5fae" stroke-width="3" stroke-linejoin="round"/>
  <path d="M140,26 C146,40 174,40 180,26" fill="none" stroke="#1f5fae" stroke-width="3"/>
  <circle cx="160" cy="94" r="16" fill="#ffd23f"/>`)
  },
  dress: {
    name: 'ワンピース', say: 'ワンピース', image: '', tags: ['clothes', 'wear'],
    svg: nkSvg(`<path d="M136,22 L184,22 L182,54 C198,70 226,122 236,146 L84,146 C94,122 122,70 138,54 Z" fill="#ff7ac6" stroke="#d94f9c" stroke-width="3" stroke-linejoin="round"/>
  <path d="M144,22 C150,36 170,36 176,22" fill="#fff"/>
  <rect x="128" y="58" width="64" height="9" rx="4" fill="#fff"/>
  ${[[132, 96], [170, 90], [150, 118], [196, 118], [118, 128], [182, 136]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5" fill="#fff"/>`).join('')}`)
  },
  pants: {
    name: 'ズボン', say: 'ズボン', image: '', tags: ['clothes', 'wear'],
    svg: nkSvg(`<path d="M112,22 L208,22 L218,146 L174,146 L160,62 L146,146 L102,146 Z" fill="#3b5998" stroke="#27407a" stroke-width="3" stroke-linejoin="round"/>
  <rect x="112" y="22" width="96" height="13" fill="#27407a"/>
  <path d="M160,36 L160,62" stroke="#27407a" stroke-width="3"/>`)
  },
  hat: {
    name: 'ぼうし', say: '帽子', image: '', tags: ['headwear', 'wear'],
    svg: nkSvg(`<ellipse cx="160" cy="114" rx="98" ry="16" fill="#ffd23f" stroke="#e0a800" stroke-width="3"/>
  <path d="M98,112 C98,62 126,38 160,38 C194,38 222,62 222,112 Z" fill="#ffd23f" stroke="#e0a800" stroke-width="3"/>
  <rect x="100" y="92" width="120" height="13" fill="#e0303a"/>`)
  },
  helmet: {
    name: 'ヘルメット', say: 'ヘルメット', image: '', tags: ['headwear', 'wear'],
    svg: nkSvg(`<path d="M92,112 C92,58 124,34 160,34 C196,34 228,58 228,112 Z" fill="#fbfbfb" stroke="#b9c0c9" stroke-width="3"/>
  <rect x="152" y="36" width="16" height="76" rx="6" fill="#e6e9ee"/>
  <path d="M76,112 L244,112 C252,112 252,124 244,124 L76,124 C68,124 68,112 76,112 Z" fill="#fbfbfb" stroke="#b9c0c9" stroke-width="3"/>
  <path d="M118,74 h12 v-12 h10 v12 h12 v10 h-12 v12 h-10 v-12 h-12 z" fill="#36c275"/>`)
  },
  milk: {
    name: 'ぎゅうにゅう', say: '牛乳', image: '', tags: ['drink'],
    svg: nkSvg(`<path d="M126,48 L160,20 L194,48 Z" fill="#e6e9ee" stroke="#9aa1ab" stroke-width="3" stroke-linejoin="round"/>
  <rect x="126" y="48" width="68" height="98" fill="#fff" stroke="#9aa1ab" stroke-width="3"/>
  <rect x="126" y="84" width="68" height="32" fill="#2f8be0"/>
  <ellipse cx="146" cy="66" rx="8" ry="6" fill="#2b2b2b"/><ellipse cx="176" cy="130" rx="9" ry="6" fill="#2b2b2b"/>`)
  },
  juice: {
    name: 'ジュース', say: 'ジュース', image: '', tags: ['drink'],
    svg: nkSvg(`<path d="M176,18 L166,108" stroke="#e0303a" stroke-width="7" stroke-linecap="round"/>
  <path d="M122,40 L198,40 L186,146 L134,146 Z" fill="#eef7ff" stroke="#9aa1ab" stroke-width="3" stroke-linejoin="round"/>
  <path d="M126,70 L194,70 L186,142 L134,142 Z" fill="#ff9a1f"/>
  <circle cx="198" cy="42" r="15" fill="#ffb13b" stroke="#ff8a1f" stroke-width="3"/>
  <path d="M198,30 L198,54 M186,42 L210,42" stroke="#ff8a1f" stroke-width="2"/>`)
  }
};


var NAKAMA_QUESTIONS = [
  // ----- いきもの -----
  { id: 'doubutsu', group: 'いきもの', text: 'どうぶつは どれ？', say: '動物は、どれ？', tags: ['animal'],
    answers: ['dog', 'cat', 'rabbit', 'elephant'], wrongs: ['train', 'car', 'apple', 'banana', 'bus', 'airplane', 'shirt'] },
  { id: 'mizunonaka', group: 'いきもの', text: 'みずの なかに すむのは どれ？', say: '水の中に住むのは、どれ？', tags: ['inwater'],
    answers: ['fish', 'whale'], wrongs: ['dog', 'cat', 'rabbit', 'bird', 'elephant'] },

  // ----- たべもの -----
  { id: 'tabemono', group: 'たべもの', text: 'たべものは どれ？', say: '食べ物は、どれ？', tags: ['food'],
    answers: ['apple', 'banana', 'onigiri', 'strawberry', 'carrot', 'tomato'], wrongs: ['car', 'dog', 'bus', 'train', 'cat', 'shirt', 'hat'] },
  { id: 'kudamono', group: 'たべもの', text: 'くだものは どれ？', say: '果物は、どれ？', tags: ['fruit'],
    answers: ['apple', 'banana', 'strawberry'], wrongs: ['car', 'dog', 'train', 'cat', 'bus', 'onigiri'] },
  { id: 'yasai', group: 'たべもの', text: 'やさいは どれ？', say: '野菜は、どれ？', tags: ['vegetable'],
    answers: ['carrot', 'tomato'], wrongs: ['car', 'dog', 'train', 'cat', 'bus', 'rabbit'] },
  { id: 'nomimono', group: 'たべもの', text: 'のみものは どれ？', say: '飲み物は、どれ？', tags: ['drink'],
    answers: ['milk', 'juice'], wrongs: ['car', 'dog', 'bus', 'cat', 'train', 'hat'] },

  // ----- のりもの -----
  { id: 'norimono', group: 'のりもの', text: 'のりものは どれ？', say: '乗り物は、どれ？', tags: ['vehicle'],
    answers: ['train', 'bus', 'airplane', 'ship', 'bicycle', 'car', 'shinkansen', 'helicopter'], wrongs: ['dog', 'cat', 'apple', 'banana', 'rabbit', 'elephant', 'shirt'] },
  { id: 'hataraku', group: 'のりもの', text: 'はたらく くるまは どれ？', say: '働く車は、どれ？', tags: ['work'],
    answers: ['shobosha', 'kyukyusha', 'patocar', 'shovel', 'gomi', 'dump'], wrongs: ['elephant', 'apple', 'dog', 'banana', 'cat', 'rabbit'] },
  { id: 'siren', group: 'のりもの', text: 'サイレンが なるのは どれ？', say: 'サイレンが鳴るのは、どれ？', tags: ['siren'],
    answers: ['shobosha', 'kyukyusha', 'patocar'], wrongs: ['bus', 'bicycle', 'car', 'ship', 'train', 'dump'] },

  // ----- ばしょ（どこを すすむ？） -----
  { id: 'sora', group: 'ばしょ', text: 'そらを とぶのは どれ？', say: '空を飛ぶのは、どれ？', tags: ['sky'],
    answers: ['airplane', 'helicopter', 'bird'], wrongs: ['ship', 'bicycle', 'bus', 'train', 'car', 'dog', 'cat'] },
  { id: 'mizunoue', group: 'ばしょ', text: 'みずの うえを すすむのは どれ？', say: '水の上を進むのは、どれ？', tags: ['onwater'],
    answers: ['ship', 'yacht'], wrongs: ['bus', 'train', 'car', 'truck', 'bicycle'] },
  { id: 'senro', group: 'ばしょ', text: 'せんろを はしるのは どれ？', say: '線路を走るのは、どれ？', tags: ['rail'],
    answers: ['train', 'shinkansen', 'sl'], wrongs: ['bus', 'car', 'ship', 'airplane', 'truck', 'bicycle'] },
  { id: 'michi', group: 'ばしょ', text: 'みちを はしるのは どれ？', say: '道を走るのは、どれ？', tags: ['road'],
    answers: ['car', 'bus', 'truck'], wrongs: ['ship', 'airplane', 'yacht', 'helicopter'] },

  // ----- みにつける もの -----
  { id: 'fuku', group: 'みにつける', text: 'ふくは どれ？', say: '服は、どれ？', tags: ['clothes'],
    answers: ['shirt', 'dress', 'pants'], wrongs: ['car', 'dog', 'apple', 'bus', 'cat', 'banana'] },
  { id: 'kaburu', group: 'みにつける', text: 'あたまに かぶるのは どれ？', say: '頭にかぶるのは、どれ？', tags: ['headwear'],
    answers: ['hat', 'helmet'], wrongs: ['car', 'dog', 'apple', 'bus', 'cat', 'banana'] }
];
