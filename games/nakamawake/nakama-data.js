/*
 * なかまわけ の 問題データ
 * ------------------------------------------------------------
 * ★ 問題を増やす・直すとき
 *   NAKAMA_QUESTIONS に { ... } を1つ足します。
 *
 *   id      : 半角英字の名前（ほかと重ならないように）
 *   text    : 画面に出す問題文（短い ひらがな）
 *   say     : 読み上げる文（漢字まじりのほうが自然に読まれます）
 *   tags    : この問題の「なかま」の条件（NAKAMA_ITEMS の tags の言葉）
 *   answers : 正解の絵。1回の問題では このうち1つが出ます
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
  train: { name: 'でんしゃ', say: '電車', vehicle: 'yamanote', image: '', tags: ['vehicle', 'train', 'rail'] },
  shinkansen: { name: 'しんかんせん', say: '新幹線', vehicle: 'hayabusa', image: '', tags: ['vehicle', 'train', 'rail'] },
  bus: { name: 'バス', say: 'バス', vehicle: 'bus', image: '', tags: ['vehicle', 'car', 'road'] },
  truck: { name: 'トラック', say: 'トラック', vehicle: 'truck', image: '', tags: ['vehicle', 'car', 'road', 'work'] },
  shobosha: { name: 'しょうぼうしゃ', say: '消防車', vehicle: 'shobosha', image: '', tags: ['vehicle', 'car', 'road', 'work', 'siren'] },
  kyukyusha: { name: 'きゅうきゅうしゃ', say: '救急車', vehicle: 'kyukyusha', image: '', tags: ['vehicle', 'car', 'road', 'work', 'siren'] },
  patocar: { name: 'パトカー', say: 'パトカー', vehicle: 'patocar', image: '', tags: ['vehicle', 'car', 'road', 'work', 'siren'] },
  shovel: { name: 'ショベルカー', say: 'ショベルカー', vehicle: 'shovel', image: '', tags: ['vehicle', 'car', 'work'] },
  airplane: { name: 'ひこうき', say: '飛行機', vehicle: 'airplane', image: '', tags: ['vehicle', 'sky', 'airplane'] },
  helicopter: { name: 'ヘリコプター', say: 'ヘリコプター', vehicle: 'helicopter', image: '', tags: ['vehicle', 'sky'] },
  ship: { name: 'ふね', say: '船', vehicle: 'ferry', image: '', tags: ['vehicle', 'water', 'ship'] },
  bicycle: { name: 'じてんしゃ', say: '自転車', vehicle: 'bicycle', image: '', tags: ['vehicle', 'road'] },

  // ----- 自作の絵 -----
  car: {
    name: 'くるま', say: 'くるま', image: '', tags: ['vehicle', 'car', 'road'],
    svg: nkSvg(`<rect x="20" y="138" width="280" height="6" rx="3" fill="#b3b8bf"/>
  <path d="M40,112 C40,98 48,92 62,90 L92,86 L118,60 C124,54 132,52 142,52 L206,52 C218,52 226,56 232,64 L252,88 L272,92 C282,94 286,100 286,110 L286,114 C286,119 282,122 276,122 L50,122 C44,122 40,118 40,112 Z" fill="#ff5a5f" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
  <path d="M126,62 L170,62 L170,86 L104,86 Z" fill="#a8d8f0"/><path d="M178,62 L206,62 C214,62 220,66 224,72 L236,86 L178,86 Z" fill="#a8d8f0"/>
  <circle cx="279" cy="100" r="5" fill="#fff6c8"/>
  <circle cx="92" cy="122" r="18" fill="#2b2b2b"/><circle cx="92" cy="122" r="8" fill="#c9ced6"/>
  <circle cx="236" cy="122" r="18" fill="#2b2b2b"/><circle cx="236" cy="122" r="8" fill="#c9ced6"/>`)
  },
  dog: {
    name: 'いぬ', say: '犬', image: '', tags: ['animal', 'bark'],
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
    name: 'ねこ', say: '猫', image: '', tags: ['animal', 'meow'],
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
    name: 'ぞう', say: '象', image: '', tags: ['animal', 'longnose'],
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
    name: 'とり', say: '鳥', image: '', tags: ['animal', 'bird', 'sky'],
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
    name: 'さかな', say: '魚', image: '', tags: ['animal', 'fish', 'water', 'food'],
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
  }
};

var NAKAMA_QUESTIONS = [
  { id: 'densha', text: 'でんしゃは どれ？', say: '電車は、どれ？', tags: ['train'],
    answers: ['train'], wrongs: ['car', 'bus', 'ship', 'airplane', 'bicycle', 'truck'] },
  { id: 'kuruma', text: 'くるまは どれ？', say: 'くるまは、どれ？', tags: ['car'],
    answers: ['car'], wrongs: ['train', 'ship', 'airplane', 'bicycle'] },
  { id: 'fune', text: 'ふねは どれ？', say: '船は、どれ？', tags: ['ship'],
    answers: ['ship'], wrongs: ['train', 'car', 'airplane', 'bus'] },
  { id: 'hikouki', text: 'ひこうきは どれ？', say: '飛行機は、どれ？', tags: ['airplane'],
    answers: ['airplane'], wrongs: ['ship', 'train', 'bus', 'car'] },
  { id: 'sora', text: 'そらを とぶのは どれ？', say: '空を飛ぶのは、どれ？', tags: ['sky'],
    answers: ['airplane', 'helicopter', 'bird'], wrongs: ['bus', 'bicycle', 'ship', 'train', 'car', 'dog', 'cat'] },
  { id: 'soranori', text: 'そらを とぶ のりものは どれ？', say: '空を飛ぶ乗り物は、どれ？', tags: ['sky', 'vehicle'],
    answers: ['airplane', 'helicopter'], wrongs: ['bus', 'train', 'ship', 'car', 'bicycle'] },
  { id: 'mizu', text: 'みずの うえを すすむのは どれ？', say: '水の上を進むのは、どれ？', tags: ['water'],
    answers: ['ship'], wrongs: ['train', 'truck', 'car', 'bus'] },
  { id: 'senro', text: 'せんろを はしるのは どれ？', say: '線路を走るのは、どれ？', tags: ['rail'],
    answers: ['train', 'shinkansen'], wrongs: ['bus', 'car', 'ship', 'airplane', 'truck'] },
  { id: 'norimono', text: 'のりものは どれ？', say: '乗り物は、どれ？', tags: ['vehicle'],
    answers: ['train', 'bus', 'airplane', 'ship', 'bicycle', 'car'], wrongs: ['dog', 'cat', 'apple', 'banana', 'rabbit', 'elephant'] },
  { id: 'hataraku', text: 'はたらく くるまは どれ？', say: '働く車は、どれ？', tags: ['work'],
    answers: ['shobosha', 'kyukyusha', 'patocar', 'shovel'], wrongs: ['cat', 'apple', 'dog', 'banana', 'rabbit'] },
  { id: 'siren', text: 'サイレンが なるのは どれ？', say: 'サイレンが鳴るのは、どれ？', tags: ['siren'],
    answers: ['shobosha', 'kyukyusha', 'patocar'], wrongs: ['bus', 'bicycle', 'car', 'ship', 'truck'] },
  { id: 'doubutsu', text: 'どうぶつは どれ？', say: '動物は、どれ？', tags: ['animal'],
    answers: ['dog', 'cat', 'rabbit', 'elephant'], wrongs: ['car', 'airplane', 'apple', 'bus', 'train', 'banana'] },
  { id: 'wanwan', text: 'ワンワンと なくのは どれ？', say: 'ワンワンと鳴くのは、どれ？', tags: ['bark'],
    answers: ['dog'], wrongs: ['cat', 'elephant', 'rabbit', 'car'] },
  { id: 'nyaa', text: 'ニャーと なくのは どれ？', say: 'ニャーと鳴くのは、どれ？', tags: ['meow'],
    answers: ['cat'], wrongs: ['dog', 'elephant', 'rabbit', 'bus'] },
  { id: 'hana', text: 'はなが ながいのは どれ？', say: '鼻が長いのは、どれ？', tags: ['longnose'],
    answers: ['elephant'], wrongs: ['dog', 'cat', 'rabbit'] },
  { id: 'tori', text: 'とりは どれ？', say: '鳥は、どれ？', tags: ['bird'],
    answers: ['bird'], wrongs: ['dog', 'cat', 'fish', 'rabbit'] },
  { id: 'sakana', text: 'さかなは どれ？', say: '魚は、どれ？', tags: ['fish'],
    answers: ['fish'], wrongs: ['dog', 'cat', 'bird', 'car'] },
  { id: 'tabemono', text: 'たべものは どれ？', say: '食べ物は、どれ？', tags: ['food'],
    answers: ['apple', 'banana', 'onigiri'], wrongs: ['cat', 'bus', 'dog', 'train', 'car'] },
  { id: 'kudamono', text: 'くだものは どれ？', say: '果物は、どれ？', tags: ['fruit'],
    answers: ['apple', 'banana'], wrongs: ['dog', 'car', 'train', 'cat', 'onigiri'] }
];
