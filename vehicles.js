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
 *   say   : 読み上げる言葉（ひらがなにすると正しく読まれやすい）
 *   color : 問題文の名前の色
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
    id: 'hayabusa', name: 'はやぶさ', say: 'はやぶさ', color: '#00a07a', image: '',
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
    id: 'komachi', name: 'こまち', say: 'こまち', color: '#c4172c', image: '',
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
    id: 'doctoryellow', name: 'ドクターイエロー', say: 'ドクターイエロー', color: '#d9a400', image: '',
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
    id: 'n700s', name: 'N700S', say: 'えぬ ななひゃく えす', color: '#1646a0', image: '',
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
    id: 'romancecar', name: 'ロマンスカー', say: 'ロマンスカー', color: '#e2502f', image: '',
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
    id: 'keikyu', name: 'けいきゅう', say: 'けいきゅう', color: '#e5171f', image: '',
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
    id: 'patocar', name: 'パトカー', say: 'パトカー', color: '#2a2f38', image: '',
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
    id: 'shobosha', name: 'しょうぼうしゃ', say: 'しょうぼうしゃ', color: '#e60f1e', image: '',
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
    id: 'kyukyusha', name: 'きゅうきゅうしゃ', say: 'きゅうきゅうしゃ', color: '#e0303a', image: '',
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
    id: 'bus', name: 'バス', say: 'バス', color: '#1f9d55', image: '',
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
    id: 'shovel', name: 'ショベルカー', say: 'ショベルカー', color: '#e0a000', image: '',
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
    id: 'gomi', name: 'ごみしゅうしゅうしゃ', say: 'ごみしゅうしゅうしゃ', color: '#2a7fd4', image: '',
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
