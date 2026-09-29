/*
 * のりもの データ
 * ------------------------------------------------------------
 * ★ 画像を差し替えたいとき
 *   1. images フォルダに画像を入れる（例: images/hayabusa.png）
 *   2. 下の一覧で、その乗り物の image: "" を
 *        image: "images/hayabusa.png"
 *      のように書きかえる
 *   image が空（""）のときは、自作のイラスト（SVG）が表示されます。
 *
 * ★ 乗り物を増やしたいとき
 *   一覧の { ... } を1つコピーして、id / name / say / color / image を変えます。
 *   （イラストがない場合は image に画像ファイルを指定してください）
 *
 *   id    : 半角英字の名前（ほかと重ならないように）
 *   name  : 画面に表示する名前
 *   say   : iPhoneが読み上げる言葉。漢字のほうがアクセントが自然になりますが、
 *           辞書にない組み合わせで「〜車」を「くるま」と読むものは、ひらがな・カタカナにします
 *           （例: ゴミしゅうしゅうしゃ、ハシゴシャ）。消防車・救急車のような ふつうの言葉は 漢字のままでOK。
 *           ひらがなの「せいかい」「きゅうきゅう」は 伸ばさずに読まれるので 漢字にします。
 *           ただし ひらがなだけだと言葉の区切りをまちがえることがあります
 *           （例:「えのでん」→「え・の・で・ん」）。そのときは漢字やカタカナにします（例: 江ノ電、ゴヒャッ系）
 *   color : 問題文の名前の色
 *   group : なかま（下の GROUPS のどれか）… ずかんの見出しと「むずかしさ」で使います
 *   sound : 乗り物の本物の音のファイル（例: 'sounds/kyukyusha.mp3'）。空なら音なし。
 *           ※ アプリの設定画面から、その場で録音して登録することもできます
 */

// ---- イラスト用の小さな部品 ----------------------------------

function trainSVG(o) {
  const clip = 'clip-' + o.id;
  let wins = '';
  for (let x = o.winStart; x <= o.winEnd; x += o.winGap) {
    wins += `<rect x="${x}" y="${o.winY}" width="${o.winW}" height="${o.winH}" rx="3" fill="${o.winColor || '#1f2c45'}"/>`;
  }
  const stripes = (o.stripes || [])
    .map(([y, h, c]) => `<rect x="-20" y="${y}" width="360" height="${h}" fill="${c}"/>`)
    .join('');
  return `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><clipPath id="${clip}"><path d="${o.body}"/></clipPath></defs>
  <rect x="0" y="140" width="320" height="5" rx="2" fill="#9aa1ab"/>
  <rect x="10" y="124" width="70" height="12" rx="5" fill="#3d4450"/>
  <rect x="190" y="124" width="70" height="12" rx="5" fill="#3d4450"/>
  <circle cx="28" cy="134" r="7" fill="#2a2f38"/><circle cx="62" cy="134" r="7" fill="#2a2f38"/>
  <circle cx="208" cy="134" r="7" fill="#2a2f38"/><circle cx="242" cy="134" r="7" fill="#2a2f38"/>
  ${o.before || ''}
  <g clip-path="url(#${clip})">
    <rect x="-20" y="0" width="360" height="160" fill="${o.bottom}"/>
    <rect x="-20" y="0" width="360" height="${o.split}" fill="${o.top}"/>
    ${stripes}
    ${wins}
    ${o.inside || ''}
  </g>
  <path d="${o.body}" fill="none" stroke="rgba(0,0,0,.22)" stroke-width="2"/>
  ${o.after || ''}
</svg>`;
}

function wheel(x, y, r) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#2b2b2b"/>` +
         `<circle cx="${x}" cy="${y}" r="${r * 0.45}" fill="#c9ced6"/>`;
}

const ROAD = `<rect x="0" y="138" width="320" height="6" rx="3" fill="#b3b8bf"/>`;

// ---- のりもの一覧 --------------------------------------------

var VEHICLES = [
  {
    id: 'hayabusa', name: 'はやぶさ', say: 'はやぶさ', color: '#00a07a', image: '', group: 'shinkansen', sound: '',
    svg: trainSVG({
      id: 'hayabusa',
      body: 'M-10,52 L140,52 C200,52 238,70 272,96 C290,109 304,116 306,121 C307,124 305,126 300,126 L-10,126 Z',
      top: '#00a37a', bottom: '#f4f6f8', split: 86,
      stripes: [[86, 5, '#f06ea9']],
      winY: 64, winW: 11, winH: 10, winStart: 8, winEnd: 130, winGap: 20,
      inside: '<path d="M168,58 C194,62 212,70 226,80 L190,80 C184,72 176,64 168,58 Z" fill="#1d2b44"/>' +
              '<ellipse cx="292" cy="116" rx="6" ry="3" fill="#fff6c8"/>'
    })
  },
  {
    id: 'komachi', name: 'こまち', say: 'こまち', color: '#c4172c', image: '', group: 'shinkansen', sound: '',
    svg: trainSVG({
      id: 'komachi',
      body: 'M-10,52 L165,52 C212,52 244,70 270,94 C288,110 304,117 308,121 C309,124 306,126 300,126 L-10,126 Z',
      top: '#c4172c', bottom: '#f4f6f8', split: 84,
      stripes: [[84, 4, '#aab0b8']],
      winY: 64, winW: 11, winH: 10, winStart: 8, winEnd: 150, winGap: 20,
      inside: '<path d="M190,58 C212,62 228,70 238,80 L208,80 C202,72 196,64 190,58 Z" fill="#1d2b44"/>' +
              '<ellipse cx="294" cy="116" rx="6" ry="3" fill="#fff6c8"/>'
    })
  },
  {
    id: 'doctoryellow', name: 'ドクターイエロー', say: 'ドクターイエロー', color: '#d9a400', image: '', group: 'shinkansen', sound: '',
    svg: trainSVG({
      id: 'doctoryellow',
      body: 'M-10,50 L160,50 C195,50 214,62 232,80 C248,96 272,102 298,108 C310,111 310,122 302,126 L-10,126 Z',
      top: '#ffd200', bottom: '#ffd200', split: 50,
      stripes: [[88, 9, '#1c56a8']],
      winY: 62, winW: 11, winH: 10, winStart: 8, winEnd: 150, winGap: 20,
      inside: '<path d="M178,54 C196,58 208,66 218,76 L188,76 C185,68 182,60 178,54 Z" fill="#1d2b44"/>' +
              '<ellipse cx="296" cy="114" rx="6" ry="3" fill="#fff"/>'
    })
  },
  {
    id: 'n700s', name: 'N700S', say: 'エヌななひゃくエス', color: '#1646a0', image: '', group: 'shinkansen', sound: '',
    svg: trainSVG({
      id: 'n700s',
      body: 'M-10,50 L150,50 C190,50 214,64 234,84 C250,100 278,106 300,112 C310,115 309,124 301,126 L-10,126 Z',
      top: '#f7f8fa', bottom: '#f7f8fa', split: 50,
      stripes: [[90, 8, '#1646a0'], [101, 3, '#1646a0']],
      winY: 64, winW: 11, winH: 10, winStart: 8, winEnd: 140, winGap: 20, winColor: '#2a3550',
      inside: '<path d="M170,54 C190,58 204,66 214,78 L182,78 C180,70 176,62 170,54 Z" fill="#1d2b44"/>' +
              '<ellipse cx="296" cy="117" rx="6" ry="3" fill="#fff6c8"/>'
    })
  },
  {
    id: 'romancecar', name: 'ロマンスカー', say: 'ロマンスカー', color: '#e2502f', image: '', group: 'train', sound: '',
    svg: trainSVG({
      id: 'romancecar',
      body: 'M-10,40 L230,40 C268,40 290,56 300,86 C305,102 306,116 304,126 L-10,126 Z',
      top: '#e2502f', bottom: '#e2502f', split: 40,
      stripes: [[100, 3, '#ffffff'], [112, 20, '#5b5f66']],
      winY: 56, winW: 30, winH: 24, winStart: 4, winEnd: 200, winGap: 40, winColor: '#26314a',
      before: '<path d="M200,44 C204,30 222,25 244,25 C258,25 266,32 268,48 L200,48 Z" fill="#e2502f" stroke="rgba(0,0,0,.22)" stroke-width="2"/>' +
              '<path d="M226,30 L252,30 C258,31 262,35 263,40 L226,40 Z" fill="#26314a"/>',
      inside: '<path d="M244,50 C272,54 290,68 297,92 L250,92 Z" fill="#26314a"/>' +
              '<path d="M256,56 C270,60 280,66 285,74 L258,74 Z" fill="#4c5d80"/>' +
              '<ellipse cx="298" cy="104" rx="4" ry="3" fill="#fff6c8"/>'
    })
  },
  {
    id: 'keikyu', name: 'けいきゅう', say: '京急', color: '#e5171f', image: '', group: 'train', sound: '',
    svg: trainSVG({
      id: 'keikyu',
      body: 'M-10,42 L284,42 C294,42 298,46 300,54 L306,118 C306,123 303,126 298,126 L-10,126 Z',
      top: '#e5171f', bottom: '#e5171f', split: 42,
      stripes: [[57, 28, '#ffffff']],
      winY: 61, winW: 24, winH: 19, winStart: 6, winEnd: 250, winGap: 38, winColor: '#26314a',
      before: '<path d="M110,42 L130,24 L150,42 M118,24 L142,24" stroke="#555" stroke-width="3" fill="none" stroke-linecap="round"/>',
      inside: '<path d="M286,58 L300,58 L303,84 L289,84 Z" fill="#26314a"/>' +
              '<rect x="42" y="88" width="3" height="36" fill="#b0101a"/><rect x="156" y="88" width="3" height="36" fill="#b0101a"/>' +
              '<circle cx="299" cy="102" r="4" fill="#fff6c8"/>'
    })
  },
  {
    id: 'patocar', name: 'パトカー', say: 'パトカー', color: '#2a2f38', image: '', group: 'emergency', sound: '',
    svg: `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><clipPath id="clip-patocar"><path d="M18,104 C18,92 26,86 40,84 L92,80 L124,56 C130,52 138,50 150,50 L212,50 C224,50 232,54 240,62 L260,82 L292,88 C302,90 306,96 306,106 L306,114 C306,119 302,122 296,122 L26,122 C21,122 18,118 18,112 Z"/></clipPath></defs>
  ${ROAD}
  <rect x="152" y="38" width="48" height="13" rx="5" fill="#ff2a2a"/>
  <rect x="166" y="41" width="20" height="6" rx="3" fill="#ffb3b3"/>
  <g clip-path="url(#clip-patocar)">
    <rect x="0" y="0" width="320" height="160" fill="#1f2226"/>
    <rect x="0" y="0" width="320" height="98" fill="#fbfbfb"/>
    <path d="M132,58 L178,58 L178,82 L108,82 Z" fill="#a8d8f0"/>
    <path d="M186,58 L214,58 C222,58 228,62 234,68 L248,82 L186,82 Z" fill="#a8d8f0"/>
    <rect x="181" y="56" width="3" height="60" fill="#c9ced6"/>
    <ellipse cx="300" cy="96" rx="5" ry="4" fill="#ffe27a"/>
    <rect x="18" y="92" width="7" height="8" fill="#ff3b3b"/>
  </g>
  <path d="M18,104 C18,92 26,86 40,84 L92,80 L124,56 C130,52 138,50 150,50 L212,50 C224,50 232,54 240,62 L260,82 L292,88 C302,90 306,96 306,106 L306,114 C306,119 302,122 296,122 L26,122 C21,122 18,118 18,112 Z" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
  <circle cx="240" cy="88" r="7" fill="#f2c200"/>
  ${wheel(76, 122, 18)}${wheel(250, 122, 18)}
</svg>`
  },
  {
    id: 'shobosha', name: 'しょうぼうしゃ', say: '消防車', color: '#e60f1e', image: '', group: 'emergency', sound: '',
    svg: `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  ${ROAD}
  <rect x="14" y="62" width="212" height="58" rx="6" fill="#e60f1e"/>
  <rect x="26" y="70" width="52" height="34" rx="4" fill="#c40a17"/>
  <rect x="86" y="70" width="52" height="34" rx="4" fill="#c40a17"/>
  <rect x="146" y="70" width="52" height="34" rx="4" fill="#c40a17"/>
  <path d="M222,48 L270,48 C284,48 290,56 294,70 L302,100 L302,120 L222,120 Z" fill="#e60f1e"/>
  <path d="M232,56 L270,56 C278,56 282,62 285,72 L290,86 L232,86 Z" fill="#a8d8f0"/>
  <rect x="14" y="108" width="288" height="5" fill="#ffffff"/>
  <rect x="286" y="112" width="20" height="9" rx="3" fill="#9aa1ab"/>
  <circle cx="297" cy="96" r="4" fill="#fff6c8"/>
  <rect x="44" y="50" width="8" height="12" fill="#8c939c"/><rect x="180" y="50" width="8" height="12" fill="#8c939c"/>
  <g fill="#b9c0c9">
    <rect x="16" y="36" width="222" height="5" rx="2"/>
    <rect x="16" y="47" width="222" height="5" rx="2"/>
    ${Array.from({ length: 16 }, (_, i) => `<rect x="${22 + i * 14}" y="38" width="4" height="12"/>`).join('')}
  </g>
  <rect x="248" y="38" width="26" height="10" rx="4" fill="#ff2a2a"/>
  ${wheel(62, 122, 17)}${wheel(108, 122, 17)}${wheel(262, 122, 17)}
</svg>`
  },
  {
    id: 'kyukyusha', name: 'きゅうきゅうしゃ', say: '救急車', color: '#e0303a', image: '', group: 'emergency', sound: '',
    svg: `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><clipPath id="clip-kyukyusha"><path d="M16,48 C16,42 20,38 28,38 L214,38 C226,38 232,42 238,50 L262,80 L292,86 C302,88 306,94 306,104 L306,114 C306,119 302,122 296,122 L24,122 C19,122 16,118 16,112 Z"/></clipPath></defs>
  ${ROAD}
  <rect x="104" y="28" width="44" height="11" rx="5" fill="#ff2a2a"/>
  <rect x="200" y="30" width="18" height="9" rx="4" fill="#ff2a2a"/>
  <g clip-path="url(#clip-kyukyusha)">
    <rect x="0" y="0" width="320" height="160" fill="#fbfbfb"/>
    <rect x="0" y="90" width="320" height="8" fill="#e0303a"/>
    <rect x="0" y="101" width="320" height="3" fill="#f39a3d"/>
    <rect x="28" y="50" width="54" height="26" rx="4" fill="#d6e6f0"/>
    <rect x="150" y="50" width="46" height="30" rx="4" fill="#a8d8f0"/>
    <path d="M206,50 L228,50 L252,80 L206,80 Z" fill="#a8d8f0"/>
    <rect x="200" y="46" width="3" height="70" fill="#d4d8de"/>
    <ellipse cx="300" cy="100" rx="5" ry="4" fill="#ffe27a"/>
  </g>
  <path d="M16,48 C16,42 20,38 28,38 L214,38 C226,38 232,42 238,50 L262,80 L292,86 C302,88 306,94 306,104 L306,114 C306,119 302,122 296,122 L24,122 C19,122 16,118 16,112 Z" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
  ${wheel(70, 122, 17)}${wheel(252, 122, 17)}
</svg>`
  },
  {
    id: 'bus', name: 'バス', say: 'バス', color: '#1f9d55', image: '', group: 'car', sound: '',
    svg: `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs><clipPath id="clip-bus"><rect x="12" y="36" width="296" height="86" rx="14"/></clipPath></defs>
  ${ROAD}
  <g clip-path="url(#clip-bus)">
    <rect x="0" y="0" width="320" height="160" fill="#fafafa"/>
    <rect x="0" y="92" width="320" height="40" fill="#1f9d55"/>
    <rect x="0" y="36" width="320" height="6" fill="#d7dde3"/>
    ${[24, 64, 104, 144, 184].map(x => `<rect x="${x}" y="50" width="34" height="32" rx="5" fill="#2f4a6b"/>`).join('')}
    <rect x="228" y="48" width="30" height="74" rx="4" fill="#3c5a7c"/>
    <rect x="242" y="50" width="2" height="70" fill="#9fb3c8"/>
    <rect x="272" y="46" width="32" height="50" rx="6" fill="#2f4a6b"/>
    <rect x="278" y="40" width="24" height="5" rx="2" fill="#ffb13b"/>
    <circle cx="300" cy="108" r="4" fill="#fff6c8"/>
  </g>
  <rect x="12" y="36" width="296" height="86" rx="14" fill="none" stroke="rgba(0,0,0,.22)" stroke-width="2"/>
  ${wheel(70, 122, 17)}${wheel(214, 122, 17)}
</svg>`
  },
  {
    id: 'shovel', name: 'ショベルカー', say: 'ショベルカー', color: '#e0a000', image: '', group: 'work', sound: '',
    svg: `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="0" y="140" width="320" height="6" rx="3" fill="#b89b72"/>
  <rect x="26" y="108" width="196" height="32" rx="16" fill="#3b3b3b"/>
  ${[44, 76, 108, 140, 172, 204].map(x => `<circle cx="${x}" cy="124" r="9" fill="#777"/>`).join('')}
  <rect x="44" y="98" width="164" height="12" fill="#555"/>
  <rect x="34" y="70" width="22" height="32" rx="5" fill="#e0a800"/>
  <rect x="46" y="66" width="150" height="36" rx="6" fill="#ffc21a"/>
  <path d="M112,24 L166,24 C174,24 178,28 178,36 L178,68 L112,68 Z" fill="#ffc21a"/>
  <path d="M120,32 L168,32 L170,62 L120,62 Z" fill="#a8d8f0"/>
  <path d="M172,86 L234,22 L256,34 L194,98 Z" fill="#ffc21a"/>
  <line x1="180" y1="80" x2="228" y2="40" stroke="#9aa3ad" stroke-width="6" stroke-linecap="round"/>
  <path d="M236,24 L256,32 L298,96 L282,104 Z" fill="#f5b400"/>
  <path d="M274,96 L308,94 L306,118 C300,132 282,134 270,124 Z" fill="#d9a200"/>
  <path d="M270,124 L266,132 M280,130 L278,138 M292,130 L292,138" stroke="#666" stroke-width="4" stroke-linecap="round"/>
  <circle cx="245" cy="29" r="6" fill="#666"/><circle cx="290" cy="100" r="6" fill="#666"/><circle cx="183" cy="92" r="6" fill="#666"/>
</svg>`
  },
  {
    id: 'gomi', name: 'ごみしゅうしゅうしゃ', say: 'ゴミしゅうしゅうしゃ', color: '#2a7fd4', image: '', group: 'work', sound: '',
    svg: `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  ${ROAD}
  <rect x="20" y="110" width="280" height="8" fill="#3d4450"/>
  <rect x="42" y="44" width="176" height="70" rx="8" fill="#2a7fd4"/>
  <path d="M42,92 C80,78 120,104 160,90 C190,80 206,86 218,90 L218,100 C200,94 186,92 160,102 C120,116 80,90 42,104 Z" fill="#ffffff"/>
  <path d="M10,66 L46,50 L46,114 L16,114 C12,114 8,110 8,106 Z" fill="#9aa4ae"/>
  <path d="M14,88 L40,80 L40,106 L16,106 Z" fill="#4a4f55"/>
  <path d="M222,56 L264,56 C278,56 286,64 290,76 L300,100 L300,120 L222,120 Z" fill="#f2f5f7" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
  <path d="M232,64 L264,64 C272,64 276,70 279,78 L284,90 L232,90 Z" fill="#a8d8f0"/>
  <rect x="222" y="98" width="78" height="6" fill="#2a7fd4"/>
  <rect x="240" y="48" width="16" height="8" rx="3" fill="#ffb13b"/>
  <circle cx="296" cy="110" r="4" fill="#fff6c8"/>
  ${wheel(80, 122, 17)}${wheel(170, 122, 17)}${wheel(262, 122, 17)}
</svg>`
  }
];

// ---- なかま（ずかんの見出し・設定のまとめて切りかえ） ----------

var GROUPS = [
  { id: 'shinkansen', name: 'しんかんせん' },
  { id: 'train', name: 'でんしゃ' },
  { id: 'emergency', name: 'たすけるくるま' },
  { id: 'work', name: 'はたらくくるま' },
  { id: 'car', name: 'まちのくるま' },
  { id: 'sky', name: 'そらの のりもの' },
  { id: 'sea', name: 'うみの のりもの' }
];

// ---- Ver.3 で追加した 50 の のりもの ---------------------------

function svgBox(inner) {
  return `<svg viewBox="0 0 320 160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
}
const SKY = '#a8d8f0';
function panto(x) {
  return `<path d="M${x},42 L${x + 20},24 L${x + 40},42 M${x + 8},24 L${x + 32},24" stroke="#555" stroke-width="3" fill="none" stroke-linecap="round"/>`;
}
// トラックの運転席（右向き、x から x+82）
function cab(x, color, stripe) {
  return `<path d="M${x},52 L${x + 50},52 C${x + 64},52 ${x + 70},60 ${x + 74},72 L${x + 82},100 L${x + 82},120 L${x},120 Z" fill="${color}" stroke="rgba(0,0,0,.18)" stroke-width="2"/>` +
    `<path d="M${x + 10},60 L${x + 50},60 C${x + 58},60 ${x + 62},66 ${x + 65},76 L${x + 70},90 L${x + 10},90 Z" fill="${SKY}"/>` +
    (stripe ? `<rect x="${x}" y="98" width="82" height="6" fill="${stripe}"/>` : '') +
    `<rect x="${x + 66}" y="112" width="20" height="9" rx="3" fill="#9aa1ab"/><circle cx="${x + 77}" cy="106" r="4" fill="#fff6c8"/>`;
}
// キャタピラ
function tracks(x, w) {
  let s = `<rect x="${x}" y="110" width="${w}" height="30" rx="15" fill="#3b3b3b"/>`;
  for (let cx = x + 16; cx <= x + w - 14; cx += 28) s += `<circle cx="${cx}" cy="125" r="8" fill="#777"/>`;
  return s;
}
// JRの通勤電車（銀色の車体に 線の色の帯）
function jrSVG(id, band) {
  const doors = [48, 112, 176, 240].map((x) => `<rect x="${x}" y="54" width="16" height="70" fill="#c3c8cf"/><rect x="${x + 3}" y="60" width="10" height="22" rx="2" fill="#2b3548"/>`).join('');
  return trainSVG({
    id, body: 'M-10,42 L296,42 C302,42 305,45 305,50 L305,120 C305,124 303,126 299,126 L-10,126 Z',
    top: '#d5d9df', bottom: '#d5d9df', split: 42,
    stripes: [[44, 6, band], [92, 8, band]],
    winY: 60, winW: 34, winH: 22, winStart: 6, winEnd: 198, winGap: 64, winColor: '#2b3548',
    before: panto(120),
    inside: doors + `<rect x="276" y="42" width="40" height="84" fill="#2b2f36"/><rect x="282" y="56" width="20" height="28" rx="3" fill="#45587a"/>` +
      `<rect x="276" y="92" width="40" height="8" fill="${band}"/><circle cx="296" cy="110" r="4" fill="#fff6c8"/>`
  });
}
// ヘリコプター
function heliSVG(body, stripe) {
  return svgBox(`
  <rect x="30" y="24" width="250" height="5" rx="2" fill="#555"/><rect x="150" y="26" width="8" height="18" fill="#555"/>
  <path d="M40,74 L130,78 L130,90 L40,86 Z" fill="${body}" stroke="rgba(0,0,0,.18)" stroke-width="2"/>
  <path d="M28,58 L44,62 L48,86 L36,88 Z" fill="${body}" stroke="rgba(0,0,0,.18)" stroke-width="2"/>
  <circle cx="34" cy="72" r="13" fill="none" stroke="#777" stroke-width="3"/>
  <path d="M120,70 C120,52 150,42 190,42 C236,42 270,62 272,90 C274,110 256,118 226,118 L150,118 C130,118 120,104 120,90 Z" fill="${body}" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
  ${stripe ? `<path d="M121,96 L272,96 L270,106 L124,106 Z" fill="${stripe}"/>` : ''}
  <path d="M200,50 C232,50 256,64 262,86 L206,86 Z" fill="${SKY}"/>
  <rect x="150" y="58" width="36" height="26" rx="5" fill="${SKY}"/>
  <path d="M140,118 L140,134 M240,118 L240,134" stroke="#555" stroke-width="5"/>
  <rect x="112" y="132" width="164" height="6" rx="3" fill="#555"/>`);
}

VEHICLES.push(
  // ===== しんかんせん =====
  {
    id: 'kagayaki', name: 'かがやき', say: 'かがやき', color: '#1f5fae', image: '', group: 'shinkansen', sound: '',
    svg: trainSVG({
      id: 'kagayaki',
      body: 'M-10,50 L180,50 C225,50 262,72 290,100 C302,112 308,118 306,124 L300,126 L-10,126 Z',
      top: '#1f5fae', bottom: '#f5f3ee', split: 82, stripes: [[82, 4, '#c07a3a']],
      winY: 62, winW: 11, winH: 10, winStart: 8, winEnd: 150, winGap: 20, winColor: '#0e2548',
      inside: '<path d="M196,56 C218,60 234,68 246,80 L212,80 C208,72 202,62 196,56 Z" fill="#0e2548"/><ellipse cx="294" cy="116" rx="6" ry="3" fill="#fff6c8"/>'
    })
  },
  {
    id: 'tsubasa', name: 'つばさ', say: 'つばさ', color: '#7a3f98', image: '', group: 'shinkansen', sound: '',
    svg: trainSVG({
      id: 'tsubasa',
      body: 'M-10,52 L170,52 C214,52 244,70 270,94 C288,110 304,117 308,121 C309,124 306,126 300,126 L-10,126 Z',
      top: '#e8eaee', bottom: '#e8eaee', split: 52, stripes: [[80, 8, '#7a3f98'], [88, 4, '#f2b705']],
      winY: 64, winW: 11, winH: 10, winStart: 8, winEnd: 150, winGap: 20,
      inside: '<path d="M192,58 C214,62 228,70 238,80 L208,80 C202,72 198,64 192,58 Z" fill="#1d2b44"/><ellipse cx="294" cy="116" rx="6" ry="3" fill="#fff6c8"/>'
    })
  },
  {
    id: 'yamabiko', name: 'やまびこ', say: 'やまびこ', color: '#3f4c8f', image: '', group: 'shinkansen', sound: '',
    svg: trainSVG({
      id: 'yamabiko',
      body: 'M-10,52 L200,52 C236,52 262,66 284,90 C298,106 306,116 306,122 C306,125 304,126 300,126 L-10,126 Z',
      top: '#3f4c8f', bottom: '#f4f6f8', split: 84, stripes: [[84, 4, '#e86a9a']],
      winY: 64, winW: 11, winH: 10, winStart: 8, winEnd: 170, winGap: 20, winColor: '#141c3d',
      inside: '<path d="M214,58 C234,62 248,70 258,82 L228,82 C224,74 220,64 214,58 Z" fill="#141c3d"/><ellipse cx="296" cy="116" rx="6" ry="3" fill="#fff6c8"/>'
    })
  },
  {
    id: 'nozomi', name: 'のぞみ', say: 'のぞみ', color: '#1846a3', image: '', group: 'shinkansen', sound: '',
    svg: trainSVG({
      id: 'nozomi',
      body: 'M-10,50 L160,50 C195,50 214,62 232,80 C248,96 272,102 298,108 C310,111 310,122 302,126 L-10,126 Z',
      top: '#f7f8fa', bottom: '#f7f8fa', split: 50, stripes: [[88, 7, '#1846a3'], [98, 2, '#1846a3']],
      winY: 62, winW: 11, winH: 10, winStart: 8, winEnd: 150, winGap: 20, winColor: '#2a3550',
      inside: '<path d="M178,54 C196,58 208,66 218,76 L188,76 C185,68 182,60 178,54 Z" fill="#1d2b44"/><ellipse cx="296" cy="114" rx="6" ry="3" fill="#fff6c8"/>'
    })
  },
  {
    id: 'kamome', name: 'かもめ', say: 'かもめ', color: '#d2232a', image: '', group: 'shinkansen', sound: '',
    svg: trainSVG({
      id: 'kamome',
      body: 'M-10,50 L150,50 C190,50 214,64 234,84 C250,100 278,106 300,112 C310,115 309,124 301,126 L-10,126 Z',
      top: '#f7f8fa', bottom: '#f7f8fa', split: 50, stripes: [[90, 7, '#d2232a'], [99, 2, '#b8912e']],
      winY: 64, winW: 11, winH: 10, winStart: 8, winEnd: 140, winGap: 20, winColor: '#2a3550',
      inside: '<path d="M170,54 C190,58 204,66 214,78 L182,78 C180,70 176,62 170,54 Z" fill="#1d2b44"/><ellipse cx="296" cy="117" rx="6" ry="3" fill="#fff6c8"/>'
    })
  },
  {
    id: 's500', name: '500けい', say: 'ゴヒャッ系', color: '#4a5a78', image: '', group: 'shinkansen', sound: '',
    svg: trainSVG({
      id: 's500',
      body: 'M-10,56 L110,56 C190,56 250,74 300,104 C312,112 310,122 300,124 L-10,126 Z',
      top: '#8a96a3', bottom: '#dfe3e8', split: 82, stripes: [[82, 6, '#1d2b5a']],
      winY: 64, winW: 10, winH: 9, winStart: 6, winEnd: 100, winGap: 18, winColor: '#1d2b5a',
      inside: '<path d="M140,60 C170,62 192,68 206,76 L150,76 Z" fill="#1d2b5a"/><ellipse cx="298" cy="114" rx="6" ry="3" fill="#fff6c8"/>'
    })
  },
  {
    id: 's0', name: '0けい', say: 'ゼロ系', color: '#1a4fa0', image: '', group: 'shinkansen', sound: '',
    svg: trainSVG({
      id: 's0',
      body: 'M-10,50 L200,50 C240,50 262,62 276,82 C288,100 302,110 302,120 L298,126 L-10,126 Z',
      top: '#f6f4ec', bottom: '#f6f4ec', split: 50, stripes: [[60, 20, '#1a4fa0'], [106, 30, '#1a4fa0']],
      winY: 64, winW: 12, winH: 12, winStart: 8, winEnd: 190, winGap: 22, winColor: '#dfe8f5',
      inside: '<path d="M214,56 C232,60 246,68 256,80 L222,80 Z" fill="#0e2c5c"/><circle cx="292" cy="106" r="7" fill="#fffbe0" stroke="#c9ced6" stroke-width="2"/>'
    })
  },

  // ===== でんしゃ =====
  { id: 'yamanote', name: 'やまのてせん', say: 'やまのてせん', color: '#5aa02c', image: '', group: 'train', sound: '', svg: jrSVG('yamanote', '#80c241') },
  { id: 'keihintohoku', name: 'けいひんとうほくせん', say: '京浜東北線', color: '#0096d6', image: '', group: 'train', sound: '', svg: jrSVG('keihintohoku', '#00b2e5') },
  { id: 'chuo', name: 'ちゅうおうせん', say: '中央線', color: '#f15a22', image: '', group: 'train', sound: '', svg: jrSVG('chuo', '#f15a22') },
  { id: 'sobu', name: 'そうぶせん', say: '総武線', color: '#d9a400', image: '', group: 'train', sound: '', svg: jrSVG('sobu', '#ffd400') },
  {
    id: 'ginza', name: 'ぎんざせん', say: '銀座線', color: '#f39700', image: '', group: 'train', sound: '',
    svg: trainSVG({
      id: 'ginza',
      body: 'M-10,44 L262,44 C290,44 302,58 304,80 L306,118 C306,123 303,126 298,126 L-10,126 Z',
      top: '#ffb400', bottom: '#ffb400', split: 44, stripes: [[100, 3, '#8a5a2b']],
      winY: 58, winW: 30, winH: 26, winStart: 6, winEnd: 220, winGap: 44, winColor: '#2b3548',
      before: panto(110),
      inside: '<path d="M270,54 C288,58 298,70 300,86 L272,86 Z" fill="#2b3548"/><circle cx="298" cy="104" r="5" fill="#fff6c8"/>'
    })
  },
  {
    id: 'marunouchi', name: 'まるのうちせん', say: '丸ノ内線', color: '#e60012', image: '', group: 'train', sound: '',
    svg: trainSVG({
      id: 'marunouchi',
      body: 'M-10,44 L256,44 C286,44 302,60 305,86 L306,118 C306,123 303,126 298,126 L-10,126 Z',
      top: '#e60012', bottom: '#e60012', split: 44,
      winY: 56, winW: 30, winH: 26, winStart: 6, winEnd: 220, winGap: 44, winColor: '#2b3548',
      before: panto(110),
      inside: '<path d="M-10,98 Q20,86 50,98 T110,98 T170,98 T230,98 T290,98 T350,98" stroke="#fff" stroke-width="4" fill="none"/>' +
        '<path d="M-10,106 Q20,94 50,106 T110,106 T170,106 T230,106 T290,106 T350,106" stroke="#c9ced6" stroke-width="3" fill="none"/>' +
        '<path d="M266,52 C290,56 300,70 302,88 L268,88 Z" fill="#2b3548"/><circle cx="300" cy="116" r="4" fill="#fff6c8"/>'
    })
  },
  {
    id: 'sunrise', name: 'サンライズ', say: 'サンライズ', color: '#b0282c', image: '', group: 'train', sound: '',
    svg: trainSVG({
      id: 'sunrise',
      body: 'M-10,38 L250,38 C276,38 292,50 300,70 L306,118 C306,123 303,126 298,126 L-10,126 Z',
      top: '#eee3c7', bottom: '#b0282c', split: 84, stripes: [[84, 3, '#c9a24a'], [110, 2, '#c9a24a']],
      winY: 52, winW: 22, winH: 18, winStart: 8, winEnd: 230, winGap: 30, winColor: '#3a3a4a',
      inside: [8, 38, 68, 98, 128, 158, 188, 218].map((x) => `<rect x="${x}" y="90" width="22" height="16" rx="3" fill="#3a2020"/>`).join('') +
        '<path d="M258,46 C280,50 294,60 298,76 L260,76 Z" fill="#3a3a4a"/><circle cx="300" cy="100" r="4" fill="#fff6c8"/>'
    })
  },
  {
    id: 'sl', name: 'エスエル', say: 'エスエル', color: '#2b2b2b', image: '', group: 'train', sound: '',
    svg: svgBox(`
  <rect x="0" y="140" width="320" height="5" rx="2" fill="#9aa1ab"/>
  <circle cx="232" cy="10" r="12" fill="#e9edf2"/><circle cx="250" cy="20" r="9" fill="#e9edf2"/><circle cx="214" cy="18" r="8" fill="#eef1f5"/>
  <rect x="222" y="30" width="18" height="30" fill="#2b2b2b"/><rect x="218" y="26" width="26" height="8" rx="2" fill="#2b2b2b"/>
  <rect x="176" y="46" width="22" height="16" rx="8" fill="#2b2b2b"/>
  <rect x="112" y="58" width="190" height="52" rx="24" fill="#2b2b2b"/>
  <circle cx="300" cy="84" r="16" fill="#3a3a3a" stroke="#c9a24a" stroke-width="3"/>
  <circle cx="300" cy="72" r="5" fill="#fff6c8"/>
  <path d="M30,36 L112,36 L112,112 L30,112 Z" fill="#2b2b2b"/><rect x="24" y="30" width="96" height="10" rx="3" fill="#1a1a1a"/>
  <rect x="44" y="48" width="26" height="26" rx="3" fill="#f2c94c"/><rect x="78" y="48" width="22" height="26" rx="3" fill="#f2c94c"/>
  <rect x="30" y="100" width="286" height="12" fill="#c0262d"/>
  <path d="M296,112 L316,136 L284,136 Z" fill="#555"/>
  ${[80, 140, 200, 250].map((x) => `<circle cx="${x}" cy="124" r="${x > 240 ? 12 : 17}" fill="#c0262d" stroke="#1a1a1a" stroke-width="4"/><circle cx="${x}" cy="124" r="4" fill="#1a1a1a"/>`).join('')}
  <rect x="80" y="118" width="120" height="6" rx="3" fill="#c9ced6"/>`)
  },
  {
    id: 'nex', name: 'なりたエクスプレス', say: '成田エクスプレス', color: '#c8102e', image: '', group: 'train', sound: '',
    svg: trainSVG({
      id: 'nex',
      body: 'M-10,44 L240,44 C272,44 294,62 302,92 L306,120 C306,124 303,126 298,126 L-10,126 Z',
      top: '#c8102e', bottom: '#f6f7f9', split: 52, stripes: [[56, 28, '#1c1c1c'], [110, 20, '#8a9098']],
      winY: 60, winW: 30, winH: 20, winStart: 8, winEnd: 200, winGap: 40, winColor: '#3a4a66',
      inside: '<path d="M246,52 C274,56 292,70 298,92 L250,92 Z" fill="#1c1c1c"/><path d="M268,94 L304,94 L305,104 L268,104 Z" fill="#c8102e"/><circle cx="300" cy="112" r="4" fill="#fff6c8"/>'
    })
  },
  {
    id: 'spaciax', name: 'スペーシアエックス', say: 'スペーシアエックス', color: '#1a2a4f', image: '', group: 'train', sound: '',
    svg: trainSVG({
      id: 'spaciax',
      body: 'M-10,44 L230,44 C270,44 296,64 304,98 L306,120 C306,124 303,126 298,126 L-10,126 Z',
      top: '#f4f1ea', bottom: '#f4f1ea', split: 44, stripes: [[104, 4, '#1a2a4f'], [110, 2, '#c9a24a']],
      winY: 58, winW: 30, winH: 24, winStart: 8, winEnd: 200, winGap: 40, winColor: '#1a2a4f',
      inside: '<path d="M238,50 C274,56 296,74 302,100 L244,100 Z" fill="#1a2a4f"/>' +
        '<path d="M256,64 l8,-5 8,5 v9 l-8,5 -8,-5 z M274,70 l8,-5 8,5 v9 l-8,5 -8,-5 z M258,84 l8,-5 8,5 v9 l-8,5 -8,-5 z" fill="#2f4575" stroke="#c9a24a" stroke-width="1.5"/>'
    })
  },
  {
    id: 'laview', name: 'ラビュー', say: 'ラビュー', color: '#6c7a89', image: '', group: 'train', sound: '',
    svg: trainSVG({
      id: 'laview',
      body: 'M-10,40 L220,40 C275,40 306,70 306,110 L304,126 L-10,126 Z',
      top: '#cfd4da', bottom: '#cfd4da', split: 40,
      winY: 50, winW: 38, winH: 50, winStart: 6, winEnd: 180, winGap: 48, winColor: '#34405a',
      inside: '<path d="M226,46 C276,52 302,78 304,108 L232,108 Z" fill="#34405a"/><path d="M240,54 C270,60 288,74 294,92 L244,92 Z" fill="#4e5f82"/><circle cx="302" cy="116" r="4" fill="#fff6c8"/>'
    })
  },
  {
    id: 'azusa', name: 'あずさ', say: 'あずさ', color: '#6b3fa0', image: '', group: 'train', sound: '',
    svg: trainSVG({
      id: 'azusa',
      body: 'M-10,44 L250,44 C280,44 296,58 302,84 L306,120 C306,124 303,126 298,126 L-10,126 Z',
      top: '#f6f7f9', bottom: '#f6f7f9', split: 44, stripes: [[92, 6, '#6b3fa0'], [99, 2, '#e3b43b'], [112, 20, '#6e737a']],
      winY: 60, winW: 30, winH: 20, winStart: 8, winEnd: 210, winGap: 40, winColor: '#2b3548',
      inside: '<path d="M252,50 C280,54 296,66 300,88 L254,88 Z" fill="#2b2f36"/><path d="M270,88 L304,88 L305,98 L270,98 Z" fill="#6b3fa0"/><circle cx="300" cy="106" r="4" fill="#fff6c8"/>'
    })
  },
  {
    id: 'yurikamome', name: 'ゆりかもめ', say: 'ゆりかもめ', color: '#1e6fd9', image: '', group: 'train', sound: '',
    svg: trainSVG({
      id: 'yurikamome',
      body: 'M-10,46 L262,46 C290,46 304,60 306,86 L306,118 C306,123 303,126 298,126 L-10,126 Z',
      top: '#f6f7f9', bottom: '#f6f7f9', split: 46, stripes: [[90, 8, '#1e6fd9'], [100, 3, '#7cc4f2']],
      winY: 58, winW: 30, winH: 24, winStart: 8, winEnd: 220, winGap: 42, winColor: '#2b3548',
      inside: '<path d="M264,54 C290,58 302,72 304,88 L266,88 Z" fill="#2b3548"/><circle cx="300" cy="112" r="4" fill="#fff6c8"/>'
    })
  },
  {
    id: 'enoden', name: 'えのでん', say: '江ノ電', color: '#2e7d4f', image: '', group: 'train', sound: '',
    svg: trainSVG({
      id: 'enoden',
      body: 'M-10,44 L290,44 C300,44 304,50 304,58 L304,120 C304,124 302,126 298,126 L-10,126 Z',
      top: '#f2e7c9', bottom: '#2e7d4f', split: 88, stripes: [[44, 6, '#2e7d4f']],
      winY: 58, winW: 26, winH: 22, winStart: 8, winEnd: 240, winGap: 36, winColor: '#2b3548',
      before: panto(130),
      inside: '<rect x="280" y="58" width="18" height="24" rx="3" fill="#2b3548"/><circle cx="296" cy="104" r="5" fill="#fff6c8"/>'
    })
  },
  {
    id: 'romen', name: 'ろめんでんしゃ', say: '路面電車', color: '#f08a24', image: '', group: 'train', sound: '',
    svg: trainSVG({
      id: 'romen',
      body: 'M44,44 L276,44 C290,44 296,50 298,58 L302,118 C302,123 299,126 294,126 L36,126 C31,126 28,123 28,118 L32,58 C34,50 38,44 44,44 Z',
      top: '#fff5d6', bottom: '#f08a24', split: 90,
      winY: 58, winW: 30, winH: 24, winStart: 44, winEnd: 240, winGap: 40, winColor: '#2b3548',
      before: panto(140),
      inside: '<rect x="276" y="58" width="18" height="26" rx="3" fill="#2b3548"/><rect x="34" y="58" width="12" height="26" rx="3" fill="#2b3548"/><circle cx="294" cy="106" r="5" fill="#fff6c8"/>'
    })
  },
  {
    id: 'monorail', name: 'モノレール', say: 'モノレール', color: '#1f6fb2', image: '', group: 'train', sound: '',
    svg: svgBox(`
  <rect x="0" y="112" width="320" height="18" fill="#b8bec6"/><rect x="140" y="130" width="30" height="30" fill="#c9ced6"/>
  <path d="M10,50 L262,50 C292,50 306,66 306,90 L306,110 C306,114 303,116 298,116 L10,116 Z" fill="#f6f7f9" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
  <rect x="10" y="94" width="296" height="8" fill="#1f6fb2"/><rect x="10" y="104" width="296" height="4" fill="#3fb34f"/>
  ${[20, 66, 112, 158, 204].map((x) => `<rect x="${x}" y="62" width="34" height="24" rx="4" fill="#2b3548"/>`).join('')}
  <path d="M256,58 C284,62 300,72 302,88 L256,88 Z" fill="#2b3548"/>`)
  },
  {
    id: 'kamotsu', name: 'かもつれっしゃ', say: '貨物列車', color: '#1f4e9c', image: '', group: 'train', sound: '',
    svg: svgBox(`
  <rect x="0" y="140" width="320" height="5" rx="2" fill="#9aa1ab"/>
  <rect x="0" y="108" width="176" height="12" fill="#444"/>
  <rect x="0" y="58" width="84" height="50" rx="2" fill="#a9533f"/><rect x="88" y="58" width="84" height="50" rx="2" fill="#2f7fd4"/>
  ${[10, 30, 50, 70, 98, 118, 138, 158].map((x) => `<rect x="${x}" y="62" width="3" height="42" fill="rgba(0,0,0,.18)"/>`).join('')}
  <circle cx="30" cy="128" r="9" fill="#2a2f38"/><circle cx="150" cy="128" r="9" fill="#2a2f38"/>
  <path d="M184,48 L296,48 C302,48 306,52 306,58 L306,118 L184,118 Z" fill="#1f4e9c" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
  <rect x="184" y="84" width="122" height="8" fill="#c9ced6"/>
  <rect x="284" y="56" width="18" height="22" rx="3" fill="#2b3548"/><rect x="198" y="58" width="20" height="16" rx="2" fill="#2b3548"/>
  ${panto(214).replace(/42/g, '48').replace(/24/g, '30')}
  <circle cx="302" cy="104" r="4" fill="#fff6c8"/>
  <rect x="190" y="118" width="110" height="10" rx="4" fill="#3d4450"/>
  ${[204, 226, 262, 284].map((x) => `<circle cx="${x}" cy="132" r="8" fill="#2a2f38"/>`).join('')}`)
  },
  {
    id: 'hinotori', name: 'ひのとり', say: 'ヒノトリ', color: '#a0141e', image: '', group: 'train', sound: '',
    svg: trainSVG({
      id: 'hinotori',
      body: 'M-10,42 L230,42 C272,42 300,64 306,98 L306,120 C306,124 303,126 298,126 L-10,126 Z',
      top: '#a0141e', bottom: '#a0141e', split: 42, stripes: [[96, 3, '#d9b36c']],
      winY: 56, winW: 34, winH: 28, winStart: 8, winEnd: 200, winGap: 44, winColor: '#241018',
      inside: '<path d="M236,48 C274,54 298,74 304,100 L240,100 Z" fill="#241018"/><path d="M250,56 C276,62 290,72 296,86 L252,86 Z" fill="#4a2a36"/><circle cx="302" cy="110" r="4" fill="#fff6c8"/>'
    })
  },

  // ===== たすけるくるま =====
  {
    id: 'shirobai', name: 'しろバイ', say: '白バイ', color: '#2a2f38', image: '', group: 'emergency', sound: '',
    svg: svgBox(`${ROAD}
  <path d="M40,106 L146,112" stroke="#c9ced6" stroke-width="7" stroke-linecap="round"/>
  <circle cx="76" cy="110" r="28" fill="#2b2b2b"/><circle cx="76" cy="110" r="16" fill="#c9ced6"/><circle cx="76" cy="110" r="5" fill="#6b7280"/>
  <circle cx="244" cy="110" r="28" fill="#2b2b2b"/><circle cx="244" cy="110" r="16" fill="#c9ced6"/><circle cx="244" cy="110" r="5" fill="#6b7280"/>
  <path d="M76,110 L142,102" stroke="#6b7280" stroke-width="9" stroke-linecap="round"/>
  <rect x="128" y="86" width="64" height="28" rx="8" fill="#4b5563"/>
  <path d="M244,110 L222,62" stroke="#9aa1ab" stroke-width="8" stroke-linecap="round"/>
  <path d="M222,94 C230,80 258,80 268,94" stroke="#fbfbfb" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M58,60 L58,32" stroke="#9aa1ab" stroke-width="3"/><rect x="51" y="22" width="14" height="12" rx="3" fill="#ff2a2a"/>
  <path d="M214,58 L222,32 C238,32 248,44 252,64 Z" fill="#bfe3f5" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
  <rect x="44" y="60" width="52" height="36" rx="7" fill="#fbfbfb" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
  <rect x="50" y="66" width="12" height="8" rx="2" fill="#ff2a2a"/>
  <path d="M96,80 L130,66 C150,56 186,54 206,62 C224,52 252,60 260,82 L250,96 L214,94 L198,88 L134,90 L100,92 Z" fill="#fbfbfb" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
  <path d="M96,78 C108,66 124,62 140,64 L136,72 L100,82 Z" fill="#2b2b2b"/>
  <path d="M150,72 L196,70" stroke="#2f6fd0" stroke-width="4" stroke-linecap="round"/>
  <path d="M208,60 L230,56" stroke="#2b2b2b" stroke-width="5" stroke-linecap="round"/>
  <rect x="246" y="66" width="14" height="9" rx="3" fill="#ff2a2a"/>
  <circle cx="256" cy="84" r="5" fill="#fff6c8" stroke="#9aa1ab" stroke-width="2"/>`)
  },
  {
    id: 'hashigo', name: 'はしごしゃ', say: 'ハシゴシャ', color: '#e60f1e', image: '', group: 'emergency', sound: '',
    svg: svgBox(`${ROAD}
  <rect x="14" y="70" width="212" height="50" rx="6" fill="#e60f1e"/>
  <rect x="14" y="106" width="212" height="5" fill="#fff"/>
  ${cab(222, '#e60f1e', '#ffffff')}
  <rect x="248" y="42" width="24" height="10" rx="4" fill="#ff2a2a"/>
  <rect x="60" y="60" width="46" height="14" rx="4" fill="#9aa1ab"/>
  <g transform="translate(0,12) rotate(-14 84 60)">
    <rect x="84" y="50" width="186" height="5" fill="#c9ced6"/><rect x="84" y="64" width="186" height="5" fill="#c9ced6"/>
    ${Array.from({ length: 13 }, (_, i) => `<rect x="${90 + i * 14}" y="52" width="4" height="14" fill="#c9ced6"/>`).join('')}
    <rect x="266" y="40" width="26" height="30" rx="3" fill="#ffffff" stroke="#e60f1e" stroke-width="4"/>
  </g>
  ${wheel(62, 122, 17)}${wheel(108, 122, 17)}${wheel(262, 122, 17)}`)
  },

  // ===== はたらくくるま =====
  {
    id: 'yubin', name: 'ゆうびんしゃ', say: 'ゆうびんしゃ', color: '#e60012', image: '', group: 'work', sound: '',
    svg: svgBox(`${ROAD}
  <path d="M20,50 C20,44 24,40 32,40 L200,40 C212,40 220,44 226,52 L250,82 L290,88 C300,90 304,96 304,106 L304,114 C304,119 300,122 294,122 L28,122 C23,122 20,118 20,112 Z" fill="#e60012" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
  <rect x="20" y="98" width="284" height="6" fill="#fff"/>
  <path d="M194,52 L216,52 L240,82 L194,82 Z" fill="${SKY}"/>
  <circle cx="110" cy="72" r="20" fill="#fff"/>
  <path d="M98,62 L122,62 M98,70 L122,70 M110,70 L110,86" stroke="#e60012" stroke-width="5"/>
  <circle cx="298" cy="100" r="4" fill="#fff6c8"/>
  ${wheel(70, 122, 17)}${wheel(246, 122, 17)}`)
  },
  {
    id: 'truck', name: 'トラック', say: 'トラック', color: '#2a7fd4', image: '', group: 'work', sound: '',
    svg: svgBox(`${ROAD}
  <rect x="20" y="110" width="280" height="8" fill="#3d4450"/>
  <rect x="16" y="38" width="200" height="76" rx="4" fill="#e6e9ee" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
  <rect x="16" y="98" width="200" height="6" fill="#2a7fd4"/>
  ${cab(220, '#2a7fd4')}
  ${wheel(62, 122, 17)}${wheel(170, 122, 17)}${wheel(262, 122, 17)}`)
  },
  {
    id: 'tanklorry', name: 'タンクローリー', say: 'タンクローリー', color: '#f08a24', image: '', group: 'work', sound: '',
    svg: svgBox(`${ROAD}
  <rect x="20" y="104" width="280" height="10" fill="#3d4450"/>
  <rect x="14" y="46" width="204" height="60" rx="30" fill="#dfe3e8" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
  <rect x="14" y="74" width="204" height="8" fill="#f08a24"/>
  <rect x="60" y="38" width="30" height="10" rx="3" fill="#9aa1ab"/><rect x="140" y="38" width="30" height="10" rx="3" fill="#9aa1ab"/>
  ${cab(222, '#ffffff', '#f08a24')}
  ${wheel(52, 122, 16)}${wheel(90, 122, 16)}${wheel(170, 122, 16)}${wheel(262, 122, 17)}`)
  },
  {
    id: 'mixer', name: 'ミキサーしゃ', say: 'ミキサーしゃ', color: '#e0503a', image: '', group: 'work', sound: '',
    svg: svgBox(`${ROAD}
  <rect x="20" y="106" width="280" height="10" fill="#3d4450"/>
  <g transform="rotate(-12 120 76)">
    <ellipse cx="120" cy="76" rx="100" ry="38" fill="#f6f7f9" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
    <path d="M40,50 L70,104 M84,40 L114,112 M128,38 L158,112 M172,42 L200,100" stroke="#e0503a" stroke-width="10" stroke-linecap="round"/>
  </g>
  <path d="M10,64 L28,48 L34,84 Z" fill="#9aa1ab"/>
  ${cab(222, '#ffffff', '#e0503a')}
  ${wheel(62, 122, 17)}${wheel(104, 122, 17)}${wheel(262, 122, 17)}`)
  },
  {
    id: 'dump', name: 'ダンプカー', say: 'ダンプカー', color: '#e08a00', image: '', group: 'work', sound: '',
    svg: svgBox(`${ROAD}
  <rect x="18" y="104" width="282" height="9" fill="#3d4450"/>
  <path d="M34,60 C62,34 150,30 196,58 Z" fill="#9a6a3a"/>
  <circle cx="80" cy="46" r="7" fill="#8a5a2b"/><circle cx="130" cy="40" r="8" fill="#8a5a2b"/><circle cx="168" cy="48" r="6" fill="#8a5a2b"/>
  <path d="M16,56 L212,56 L212,106 L30,106 C22,106 16,100 16,92 Z" fill="#f5a300" stroke="rgba(0,0,0,.22)" stroke-width="2"/>
  <rect x="16" y="56" width="196" height="7" fill="#d98c00"/>
  ${[56, 96, 136, 176].map((x) => `<rect x="${x}" y="63" width="6" height="43" fill="#d98c00"/>`).join('')}
  <rect x="204" y="38" width="10" height="68" fill="#d98c00"/>
  <path d="M204,38 L258,38 C262,38 264,40 264,44 L264,48 L204,48 Z" fill="#d98c00"/>
  ${cab(216, '#f5a300')}
  ${wheel(56, 122, 17)}${wheel(98, 122, 17)}${wheel(260, 122, 17)}`)
  },
  {
    id: 'crane', name: 'クレーンしゃ', say: 'クレーンしゃ', color: '#e0a000', image: '', group: 'work', sound: '',
    svg: svgBox(`${ROAD}
  <rect x="20" y="88" width="280" height="30" rx="6" fill="#ffc21a" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
  <rect x="20" y="104" width="280" height="4" fill="#fff"/>
  <path d="M190,50 L232,50 C240,50 244,56 244,64 L244,90 L190,90 Z" fill="#fbfbfb" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
  <rect x="198" y="56" width="38" height="24" rx="3" fill="${SKY}"/>
  <g transform="rotate(-20 60 80)">
    <rect x="60" y="70" width="200" height="18" rx="3" fill="#ffc21a" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
    <rect x="60" y="74" width="140" height="10" fill="#e0a800"/>
  </g>
  <line x1="249" y1="20" x2="249" y2="62" stroke="#444" stroke-width="2"/>
  <path d="M242,62 L256,62 L252,72 C252,80 242,80 242,74" stroke="#444" stroke-width="4" fill="none"/>
  ${wheel(60, 122, 18)}${wheel(110, 122, 18)}${wheel(210, 122, 18)}${wheel(260, 122, 18)}`)
  },
  {
    id: 'bulldozer', name: 'ブルドーザー', say: 'ブルドーザー', color: '#e0a000', image: '', group: 'work', sound: '',
    svg: svgBox(`<rect x="0" y="140" width="320" height="6" rx="3" fill="#b89b72"/>
  ${tracks(30, 200)}
  <rect x="40" y="70" width="180" height="42" rx="6" fill="#ffc21a"/>
  <path d="M80,24 L146,24 C154,24 158,28 158,36 L158,72 L80,72 Z" fill="#ffc21a"/>
  <rect x="88" y="32" width="62" height="32" rx="3" fill="${SKY}"/>
  <rect x="192" y="44" width="8" height="28" fill="#555"/>
  <path d="M214,86 L250,96" stroke="#9aa3ad" stroke-width="8" stroke-linecap="round"/>
  <path d="M252,56 C268,70 272,110 262,140 L300,140 L304,56 Z" fill="#e0a800" stroke="rgba(0,0,0,.25)" stroke-width="2"/>`)
  },
  {
    id: 'roadroller', name: 'ロードローラー', say: 'ロードローラー', color: '#e07a00', image: '', group: 'work', sound: '',
    svg: svgBox(`<rect x="0" y="138" width="320" height="6" rx="3" fill="#6b6f76"/>
  <rect x="40" y="70" width="220" height="40" rx="8" fill="#ff9a1f"/>
  <path d="M70,24 L150,24 L150,34 L70,34 Z" fill="#ff9a1f"/>
  <path d="M76,34 L80,70 M144,34 L140,70" stroke="#555" stroke-width="5"/>
  <rect x="96" y="50" width="30" height="20" rx="3" fill="#555"/>
  <circle cx="246" cy="104" r="36" fill="#8a9098" stroke="#555" stroke-width="4"/><circle cx="246" cy="104" r="10" fill="#555"/>
  <rect x="220" y="62" width="52" height="10" rx="3" fill="#ff9a1f"/>
  ${wheel(84, 116, 24)}`)
  },
  {
    id: 'forklift', name: 'フォークリフト', say: 'フォークリフト', color: '#e07a00', image: '', group: 'work', sound: '',
    svg: svgBox(`${ROAD}
  <path d="M40,80 L200,80 L200,120 L40,120 C34,120 30,116 30,110 L30,90 C30,84 34,80 40,80 Z" fill="#ff9a1f" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
  <rect x="40" y="62" width="60" height="22" rx="6" fill="#555"/>
  <path d="M90,80 L100,24 L180,24 L196,80" stroke="#444" stroke-width="6" fill="none"/>
  <rect x="120" y="54" width="30" height="26" rx="4" fill="#2b2b2b"/>
  <rect x="200" y="18" width="10" height="112" fill="#555"/><rect x="214" y="18" width="10" height="112" fill="#666"/>
  <rect x="224" y="118" width="76" height="6" fill="#444"/>
  <rect x="230" y="70" width="64" height="46" fill="#d9a066" stroke="#a8743e" stroke-width="3"/>
  <path d="M230,93 L294,93 M262,70 L262,116" stroke="#a8743e" stroke-width="3"/>
  ${wheel(70, 124, 16)}${wheel(176, 124, 16)}`)
  },
  {
    id: 'tractor', name: 'トラクター', say: 'トラクター', color: '#2e8b3a', image: '', group: 'work', sound: '',
    svg: svgBox(`<rect x="0" y="140" width="320" height="6" rx="3" fill="#b89b72"/>
  <path d="M110,74 L270,74 C282,74 290,82 290,94 L290,116 L110,116 Z" fill="#2e9d4a" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
  <rect x="250" y="82" width="36" height="6" fill="#1c6b30"/><rect x="250" y="94" width="36" height="6" fill="#1c6b30"/>
  <rect x="230" y="38" width="8" height="36" fill="#555"/>
  <path d="M60,20 L150,20 L150,28 L60,28 Z" fill="#2e9d4a"/>
  <path d="M68,28 L68,80 M144,28 L144,74" stroke="#444" stroke-width="5"/>
  <rect x="80" y="34" width="56" height="40" rx="3" fill="${SKY}" opacity=".7"/>
  <circle cx="80" cy="104" r="40" fill="#2b2b2b"/><circle cx="80" cy="104" r="20" fill="#f2c200"/>
  <circle cx="254" cy="120" r="22" fill="#2b2b2b"/><circle cx="254" cy="120" r="10" fill="#f2c200"/>`)
  },
  {
    id: 'carrier', name: 'キャリアカー', say: 'キャリアカー', color: '#2a7fd4', image: '', group: 'work', sound: '',
    svg: svgBox(`${ROAD}
  <rect x="10" y="104" width="220" height="8" fill="#555"/><rect x="10" y="62" width="220" height="6" fill="#555"/>
  <path d="M14,62 L14,104 M120,62 L120,104 M224,62 L224,104" stroke="#555" stroke-width="5"/>
  ${[[20, 70, '#ff5a5f'], [118, 70, '#36c275'], [20, 28, '#ffd23f'], [118, 28, '#b36bff']].map(([x, y, c]) =>
    `<path d="M${x},${y + 30} C${x},${y + 18} ${x + 6},${y + 16} ${x + 18},${y + 14} L${x + 30},${y + 2} L${x + 70},${y + 2} L${x + 84},${y + 16} C${x + 96},${y + 18} ${x + 100},${y + 22} ${x + 100},${y + 30} Z" fill="${c}"/>` +
    `<circle cx="${x + 22}" cy="${y + 30}" r="7" fill="#2b2b2b"/><circle cx="${x + 78}" cy="${y + 30}" r="7" fill="#2b2b2b"/>`).join('')}
  ${cab(230, '#2a7fd4')}
  ${wheel(50, 122, 15)}${wheel(90, 122, 15)}${wheel(190, 122, 15)}${wheel(268, 122, 16)}`)
  },

  // ===== まちのくるま =====
  {
    id: 'taxi', name: 'タクシー', say: 'タクシー', color: '#1f2a5a', image: '', group: 'car', sound: '',
    svg: svgBox(`${ROAD}
  <rect x="152" y="32" width="34" height="12" rx="4" fill="#ffb13b"/>
  <path d="M18,106 C18,94 24,88 38,86 L70,82 L104,50 C110,46 118,44 130,44 L220,44 C232,44 240,50 246,58 L266,82 L292,88 C302,90 306,96 306,106 L306,114 C306,119 302,122 296,122 L26,122 C21,122 18,118 18,112 Z" fill="#1f2a5a" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
  <path d="M112,54 L166,54 L166,80 L86,80 Z" fill="${SKY}"/><path d="M174,54 L226,54 C232,54 236,58 240,62 L254,80 L174,80 Z" fill="${SKY}"/>
  <rect x="18" y="98" width="288" height="4" fill="#c9a24a"/>
  <circle cx="300" cy="96" r="5" fill="#ffe27a"/>
  ${wheel(76, 122, 18)}${wheel(250, 122, 18)}`)
  },
  {
    id: 'doubledecker', name: 'にかいだてバス', say: '二階建てバス', color: '#d32f2f', image: '', group: 'car', sound: '',
    svg: svgBox(`${ROAD}
  <rect x="14" y="12" width="292" height="110" rx="14" fill="#d32f2f" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
  ${[26, 76, 126, 176, 226].map((x) => `<rect x="${x}" y="22" width="40" height="30" rx="5" fill="#2f4a6b"/>`).join('')}
  <rect x="276" y="22" width="26" height="30" rx="5" fill="#2f4a6b"/>
  ${[26, 76, 126, 176].map((x) => `<rect x="${x}" y="64" width="40" height="28" rx="5" fill="#2f4a6b"/>`).join('')}
  <rect x="230" y="62" width="30" height="58" rx="4" fill="#3c5a7c"/>
  <rect x="274" y="62" width="30" height="36" rx="5" fill="#2f4a6b"/>
  <rect x="14" y="56" width="292" height="4" fill="#ffd23f"/>
  <circle cx="300" cy="110" r="4" fill="#fff6c8"/>
  ${wheel(70, 122, 17)}${wheel(214, 122, 17)}`)
  },
  {
    id: 'kindergarten', name: 'ようちえんバス', say: '幼稚園バス', color: '#e0a000', image: '', group: 'car', sound: '',
    svg: svgBox(`${ROAD}
  <path d="M34,40 L250,40 C280,40 300,58 304,86 L306,112 C306,118 302,122 296,122 L34,122 C26,122 22,118 22,112 L22,52 C22,44 26,40 34,40 Z" fill="#ffd23f" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
  ${[36, 84, 132, 180].map((x) => `<rect x="${x}" y="52" width="40" height="32" rx="12" fill="#2f4a6b"/>`).join('')}
  <path d="M236,52 C266,54 288,66 294,86 L236,86 Z" fill="#2f4a6b"/>
  <rect x="22" y="94" width="284" height="6" fill="#ff8a3d"/>
  <circle cx="300" cy="108" r="4" fill="#fff6c8"/>
  ${wheel(76, 122, 17)}${wheel(240, 122, 17)}`)
  },
  {
    id: 'bicycle', name: 'じてんしゃ', say: '自転車', color: '#2f8be0', image: '', group: 'car', sound: '',
    svg: svgBox(`${ROAD}
  ${[86, 234].map((x) => `<circle cx="${x}" cy="104" r="34" fill="none" stroke="#2b2b2b" stroke-width="7"/><circle cx="${x}" cy="104" r="4" fill="#555"/>` +
    [0, 30, 60, 90, 120, 150].map((a) => `<line x1="${x + 30 * Math.cos(a * Math.PI / 180)}" y1="${104 + 30 * Math.sin(a * Math.PI / 180)}" x2="${x - 30 * Math.cos(a * Math.PI / 180)}" y2="${104 - 30 * Math.sin(a * Math.PI / 180)}" stroke="#aaa" stroke-width="1.5"/>`).join('')).join('')}
  <path d="M86,104 L130,56 L216,56 L160,104 Z M130,56 L124,40 M160,104 L124,40 M216,56 L234,104" stroke="#2f8be0" stroke-width="7" fill="none" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M110,38 L138,38" stroke="#2b2b2b" stroke-width="8" stroke-linecap="round"/>
  <path d="M216,56 L210,34 L226,30" stroke="#555" stroke-width="5" fill="none" stroke-linecap="round"/>
  <circle cx="160" cy="104" r="9" fill="#555"/>`)
  },
  {
    id: 'motorbike', name: 'バイク', say: 'バイク', color: '#e0303a', image: '', group: 'car', sound: '',
    svg: svgBox(`${ROAD}
  <circle cx="84" cy="108" r="28" fill="#2b2b2b"/><circle cx="84" cy="108" r="12" fill="#c9ced6"/>
  <circle cx="240" cy="108" r="28" fill="#2b2b2b"/><circle cx="240" cy="108" r="12" fill="#c9ced6"/>
  <path d="M84,108 L124,92 L186,92" stroke="#8a9098" stroke-width="7" fill="none"/>
  <path d="M120,74 L178,70 C198,68 206,80 202,96 L140,100 Z" fill="#e0303a"/>
  <path d="M60,78 C80,70 110,70 128,76 L124,84 L64,86 Z" fill="#2b2b2b"/>
  <path d="M202,70 L240,108" stroke="#8a9098" stroke-width="7"/>
  <path d="M196,58 L214,54 L222,68" stroke="#2b2b2b" stroke-width="6" fill="none" stroke-linecap="round"/>
  <circle cx="220" cy="74" r="7" fill="#fff6c8" stroke="#555" stroke-width="2"/>
  <rect x="140" y="98" width="44" height="18" rx="5" fill="#666"/>`)
  },

  // ===== そらの のりもの =====
  {
    id: 'airplane', name: 'ひこうき', say: '飛行機', color: '#2f6fd0', image: '', group: 'sky', sound: '',
    svg: svgBox(`
  <ellipse cx="60" cy="130" rx="40" ry="12" fill="#eef4fa"/><ellipse cx="260" cy="30" rx="36" ry="10" fill="#eef4fa"/>
  <path d="M26,60 L50,60 L78,86 L40,88 Z" fill="#2f6fd0"/>
  <path d="M20,90 C20,76 30,72 60,72 L260,72 C290,72 308,84 310,94 C308,102 290,108 260,108 L50,108 C30,108 20,100 20,90 Z" fill="#fbfbfb" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
  <path d="M286,78 C296,80 304,86 306,92 L288,90 Z" fill="#2b3548"/>
  ${Array.from({ length: 11 }, (_, i) => `<circle cx="${80 + i * 18}" cy="86" r="4" fill="#2b3548"/>`).join('')}
  <rect x="20" y="98" width="280" height="4" fill="#2f6fd0"/>
  <path d="M130,100 L200,100 L150,138 L126,138 Z" fill="#c9ced6" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
  <rect x="150" y="112" width="34" height="14" rx="7" fill="#8a9098"/>
  <path d="M40,96 L80,96 L60,112 L44,112 Z" fill="#c9ced6"/>`)
  },
  {
    id: 'helicopter', name: 'ヘリコプター', say: 'ヘリコプター', color: '#2f8be0', image: '', group: 'sky', sound: '',
    svg: heliSVG('#2f8be0', '#ffd23f')
  },
  {
    id: 'doctorheli', name: 'ドクターヘリ', say: 'ドクターヘリ', color: '#e0303a', image: '', group: 'sky', sound: '',
    svg: heliSVG('#fbfbfb', '#e0303a')
  },
  {
    id: 'rocket', name: 'ロケット', say: 'ロケット', color: '#e0503a', image: '', group: 'sky', sound: '',
    svg: svgBox(`
  <circle cx="40" cy="30" r="3" fill="#ffd23f"/><circle cx="280" cy="130" r="3" fill="#ffd23f"/><circle cx="90" cy="130" r="2" fill="#ffd23f"/>
  <g transform="rotate(-25 160 80)">
    <path d="M40,80 C20,66 8,72 0,80 C8,88 20,94 40,80 Z" fill="#ff9a1f"/>
    <path d="M44,80 C30,72 22,74 16,80 C22,86 30,88 44,80 Z" fill="#ffd23f"/>
    <path d="M50,62 L240,62 C270,62 292,72 300,80 C292,88 270,98 240,98 L50,98 Z" fill="#fbfbfb" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
    <path d="M240,62 C270,62 292,72 300,80 C292,88 270,98 240,98 Z" fill="#e0503a"/>
    <path d="M50,62 L90,62 L60,36 L40,36 Z M50,98 L90,98 L60,124 L40,124 Z" fill="#e0503a"/>
    <circle cx="190" cy="80" r="10" fill="${SKY}" stroke="#8a9098" stroke-width="3"/>
    <rect x="44" y="62" width="10" height="36" fill="#8a9098"/>
  </g>`)
  },
  {
    id: 'ropeway', name: 'ロープウェイ', say: 'ロープウェイ', color: '#e0303a', image: '', group: 'sky', sound: '',
    svg: svgBox(`
  <path d="M0,160 L70,90 L120,130 L200,60 L320,160 Z" fill="#9fd49a"/>
  <line x1="0" y1="10" x2="320" y2="50" stroke="#555" stroke-width="3"/>
  <line x1="160" y1="30" x2="160" y2="56" stroke="#555" stroke-width="4"/>
  <path d="M110,56 L210,56 C218,56 222,60 222,68 L222,118 C222,126 218,130 210,130 L110,130 C102,130 98,126 98,118 L98,68 C98,60 102,56 110,56 Z" fill="#e0303a" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
  <rect x="108" y="66" width="104" height="36" rx="6" fill="${SKY}"/>
  <line x1="160" y1="66" x2="160" y2="102" stroke="#e0303a" stroke-width="4"/>`)
  },

  // ===== うみの のりもの =====
  {
    id: 'ferry', name: 'フェリー', say: 'フェリー', color: '#1f6fb2', image: '', group: 'sea', sound: '',
    svg: svgBox(`
  <path d="M40,40 L150,40 L150,56 L40,56 Z M30,56 L230,56 L230,76 L30,76 Z" fill="#fbfbfb" stroke="rgba(0,0,0,.2)" stroke-width="2"/>
  ${Array.from({ length: 9 }, (_, i) => `<rect x="${40 + i * 20}" y="61" width="12" height="9" rx="2" fill="#2b3548"/>`).join('')}
  <rect x="100" y="16" width="26" height="24" fill="#e0303a"/><rect x="100" y="16" width="26" height="6" fill="#2b2b2b"/>
  <path d="M10,76 L300,76 L280,118 L28,118 Z" fill="#1f4e9c"/>
  <rect x="14" y="84" width="284" height="6" fill="#fbfbfb"/>
  ${Array.from({ length: 12 }, (_, i) => `<circle cx="${40 + i * 20}" cy="102" r="3" fill="#fbfbfb"/>`).join('')}
  <path d="M0,122 Q20,112 40,122 T80,122 T120,122 T160,122 T200,122 T240,122 T280,122 T320,122 L320,160 L0,160 Z" fill="#5bb4e5"/>`)
  },
  {
    id: 'submarine', name: 'せんすいかん', say: '潜水艦', color: '#4a5a6a', image: '', group: 'sea', sound: '',
    svg: svgBox(`
  <rect x="0" y="20" width="320" height="140" fill="#d6eefb"/>
  <path d="M0,20 Q20,10 40,20 T80,20 T120,20 T160,20 T200,20 T240,20 T280,20 T320,20 L320,0 L0,0 Z" fill="#fff"/>
  <path d="M40,96 C40,76 70,70 110,70 L250,70 C286,70 306,84 306,96 C306,110 286,122 250,122 L110,122 C70,122 40,116 40,96 Z" fill="#4a5a6a" stroke="rgba(0,0,0,.25)" stroke-width="2"/>
  <path d="M150,70 L160,40 L206,40 L212,70 Z" fill="#4a5a6a"/>
  <path d="M190,40 L190,22 L204,22" stroke="#4a5a6a" stroke-width="5" fill="none"/>
  <path d="M40,96 L18,76 L22,96 L18,116 Z" fill="#3a4856"/>
  ${[120, 160, 200, 240].map((x) => `<circle cx="${x}" cy="94" r="6" fill="#ffd23f"/>`).join('')}
  <circle cx="30" cy="60" r="5" fill="none" stroke="#fff" stroke-width="2"/><circle cx="20" cy="46" r="3" fill="none" stroke="#fff" stroke-width="2"/>`)
  }
);
